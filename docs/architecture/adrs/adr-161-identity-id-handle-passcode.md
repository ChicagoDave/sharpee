# ADR-161: Identity Model — `(Id, Handle, passcode)` with Download/Upload Portability

## Status: ACCEPTED

## Date: 2026-04-26

## Supersedes

- **ADR-159** (Persistent User Identity for Multi-User Rooms) — replaces in full.
  ADR-159 stays in the file system as historical context. Its vocabulary
  (`identity_id`, `username`, `secret`), its UX (paste-to-reclaim), and its
  HTTP auth surface (route accepts bare `identity_id`) no longer reflect
  the system.

## Relates to

- **ADR-153** (Multiuser Sharpee Server) — the per-room participant token model
  this ADR continues to build on.
- **ADR-156** (Multiuser Browser Client) — owns the client UI; will gain
  sections for first-visit identity setup, identity panel (download/erase),
  and Handle display in the roster.
- **ADR-160** (Engine-State Continuity) — independent. Identity is the
  precondition; engine-state continuity decides what world a returning
  identity sees.

## Context

ADR-159 introduced persistent user identity to solve "same human across
visits." Phases 1–3 of the implementing plan shipped (commit `bf6fe52c`):
schema, repositories, hash service, identity HTTP routes, per-IP rate
limiter, and WS hello cutover.

In capturing requirements for the in-flight client work (Phase 4), several
things came into focus that ADR-159 does not handle correctly:

1. **Two collapsing concepts.** The system today distinguishes `username`
   (unique login) from `display_name` (per-room, mutable, can collide). For
   a small IF community this is over-modeled. A single `Handle` —
   user-chosen, unique, public — is sufficient.
2. **Reclaim UX is wrong.** ADR-159 prescribes a paste-Handle-and-passcode
   modal for cross-device reclaim. The user-stated requirement is
   **download identity / upload identity** as a file. The two flows have
   different failure modes, different validation, and different UI
   surfaces.
3. **Auth gap on HTTP routes.** `POST /api/rooms` and `POST /api/rooms/:id/join`
   accept `identity_id` from the request body and only `findById` it — no
   credential verification. WS hello (also Phase 3) auths with
   `(username, secret)` properly via the hash service. Two auth models for
   one logical operation. If `identity_id` ever leaks (logs, devtools,
   error messages), an attacker can act as the user.
4. **Erase is user-driven, not admin-only.** ADR-159 deferred deletion to a
   Phase 7 admin script with soft-delete semantics. The user-stated
   requirement is that the user themselves can erase, and erase is
   **irreversible** at both client and server — the freed Handle is
   immediately claimable.
5. **Identity formats need to be readable.** UUIDv4 for both `identity_id`
   and `secret` is opaque. A user inspecting a downloaded CSV cannot tell
   whether the file is corrupted or whether two CSVs are for the same
   identity. The new requirement is **human-readable** formats: a short
   Crockford-base32 Id, a word-pair passcode.
6. **Gate semantics.** ADR-159 gates the entire client behind identity
   creation. The requirement is that an unidentified visitor can still
   browse the room list (and see participants by Handle); the gate is on
   *actions* (Create Room, Join Room) not on viewing.

This ADR resolves all six.

## Decision

### Identity shape

An identity is a triple `(Id, Handle, passcode)`:

- **`Id`** — server-generated, short, human-readable. Crockford base32 (32
  symbols: `0-9` + `A-Z` minus `I`, `L`, `O`, `U` — no confusable pairs).
  8 symbols formatted `XXXX-XXXX`. Example: `XYNC-4FJ3`. ~1.1 trillion
  combinations. Server retries on UNIQUE collision (statistically rare).
- **`Handle`** — user-chosen, unique, public. **3–12 alphabetic
  characters** (a-z + A-Z, no digits, no separators, no whitespace).
  Comparison is case-insensitive; case is preserved for display. Replaces
  both `username` and `display_name` from ADR-159 — the same human appears
  under the same Handle in every room they join.
- **`passcode`** — server-generated. Two words from the [EFF Large
  Wordlist](https://www.eff.org/dice) (7,776 words), `-`-separated.
  Example: `correct-horse`. ~60 million combinations. Hashed with argon2id
  for storage (the `HashService` from ADR-159 carries forward unchanged in
  behavior; what it hashes is now called `passcode` instead of `secret`).

### Server-side storage

```sql
CREATE TABLE identities (
  id              TEXT PRIMARY KEY,             -- 'XXXX-XXXX'
  handle          TEXT NOT NULL,                -- preserved-case
  passcode_hash   TEXT NOT NULL,                -- argon2id
  created_at      TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_identities_handle_lower ON identities(LOWER(handle));
```

No `deleted_at`. Erase is hard-delete (R8 in
[requirements-identity-2026-04-26](../../work/multiuser/requirements-identity-2026-04-26.md)).

`participants` references `identities.id` via a renamed FK column:

```sql
ALTER TABLE participants
  RENAME COLUMN identity_id TO id_ref;  -- (greenfield wipe; this is illustrative)
```

`participants.display_name` is **removed** — the participant's display name
is the joined identity's `handle`. Existing per-room display columns
(`tier`, `muted`, `is_successor`, `connected`) remain.

### Client-side storage

`localStorage` key `sharpee:identity` (unchanged from ADR-159) holds the
JSON triple `{ id, handle, passcode }`. All three are needed because the
HTTP and WS contracts (below) take credentials, not opaque ids.

### Identity lifecycle

**Create** (first visit, no localStorage, user picks "Create identity"):

1. User types Handle.
2. Client `POST /api/identities { handle }`.
3. Server validates Handle (1–12 alpha, case-insensitive uniqueness),
   generates `Id` (Crockford-8 with retry on UNIQUE collision), generates
   `passcode` (EFF word-pair), `argon2id(passcode)` → row insert.
4. Server returns `(id, handle, passcode)` once.
5. Client writes the triple to localStorage. **No "save your secret" copy
   gate** — recovery is via download/upload (below), not memorization.

**Upload** (first visit, no localStorage, user picks "Upload identity"):

1. User selects a CSV file.
2. Client parses: 1 row, 3 fields (`Id, Handle, passcode`), no header.
   Malformed → inline client error.
3. Client validates `Id` matches `^[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}$`
   (Crockford base32, after uppercase normalization). Mismatch → inline error.
4. Client `POST /api/identities/upload { id, handle, passcode }`.
5. Server applies the **upload decision matrix**:

   | Server has Id? | Server has Handle? | Same row? | Passcode verifies? | Outcome |
   |---|---|---|---|---|
   | Yes | Yes | Yes | Yes | **200** — adopt this identity on this device |
   | Yes | Yes | Yes | No | **401 `bad_passcode`** |
   | Yes | Yes | No | — | **409 `id_mismatch`** (anomalous; both columns are unique-indexed) |
   | Yes | No | — | — | **409 `id_mismatch`** |
   | No | Yes | — | — | **409 `handle_taken`** |
   | No | No | — | — | **201** — register new `(Id, Handle, passcode_hash)` |

6. On 200/201 client writes the triple to localStorage; gate unlocks.

**Resolve** (warm, every WS connect): WS hello carries
`{ kind: 'hello', handle, passcode }`. Server `findHashByHandle` →
`hashService.verify(passcode, hash)` → resolves to internal `id`. Same
behavior as Phase 3, vocabulary renamed.

**Erase** (user-driven):

1. User invokes Erase from the identity panel; confirmation gate (proposed:
   type your Handle to confirm — see Open Questions).
2. Client `POST /api/identities/erase { handle, passcode }`.
3. Server `findHashByHandle` → `verify(passcode, hash)` → on success,
   `DELETE FROM identities WHERE id = ?` (cascade per FK behavior — see
   Open Question on hosted rooms).
4. All active WS connections bound to this Id are closed with code
   `4007 identity_erased`.
5. Client clears localStorage and returns to the unidentified state. Other
   tabs in the same browser detect via the `storage` event and follow.

The Handle is freed at step 3; another user can claim it via Create.

### Authentication uniformity

**All identity-bearing requests carry `(handle, passcode)`. `Id` is a
server-internal handle that never appears in request bodies.** The auth
gap from ADR-159 is closed:

| Endpoint | Body |
|---|---|
| `POST /api/identities` | `{ handle }` (creation — no passcode yet) |
| `POST /api/identities/upload` | `{ id, handle, passcode }` (the user has these from a prior session) |
| `POST /api/identities/erase` | `{ handle, passcode }` |
| `POST /api/rooms` | `{ handle, passcode, story_slug, title, captcha_token? }` (was: `identity_id`) |
| `POST /api/rooms/:id/join` | `{ handle, passcode, captcha_token? }` (was: `identity_id`, `display_name`) |
| `WS hello` | `{ kind: 'hello', handle, passcode }` (vocab rename only) |

`display_name` is removed from `POST /api/rooms/:id/join` — Handle is the
display name (R1).

Per-IP rate limiting (Phase 2's `createRateLimiter`) extends to cover
`/upload` and `/erase`. The room-creation routes' captcha gate is
unchanged.

### Gate semantics

The unidentified user can **view** Landing — the room list, story list,
participant Handles in each room. The unidentified user **cannot** Create
or Join a room. Concretely:

- The Create Room button is disabled (and offers a "set up your identity
  first" affordance — typically a banner above the page or a focus shift
  to the identity setup panel).
- The Enter Room button on each row is disabled with the same affordance.
- The Identity Setup panel is the first-visit screen and offers exactly
  two actions: **Create Identity** and **Upload Identity (CSV)**.

### Identity Panel (post-setup)

A persistent UI affordance (settings menu / account icon) opens an
identity panel showing:

- Current Handle (the Id and passcode are shown only on download).
- **Download identity** button — generates `sharpee-identity.csv` (no
  header, three fields in `Id, Handle, passcode` order, comma-separated)
  and triggers a browser download.
- **Erase identity** button — opens the confirmation gate, then performs
  the erase flow above.

## Acceptance Criteria

- **AC-1**: Handle uniqueness is enforced — concurrent creates with the
  same Handle resolve to one success and one `409 handle_taken`. Verified
  by DB UNIQUE index + repository pre-check + race-fallback.
- **AC-2**: Two visits from the same browser to the same room resolve to
  the same `participant_id`. (Behavior unchanged from Phase 3, vocabulary
  rename only.)
- **AC-3**: A user on a fresh browser uploads their CSV and enters a
  previously-joined room as the same `participant_id`. Verified by
  upload-then-WS-hello integration test.
- **AC-4**: From the identity panel, the user downloads their CSV; the
  file's three fields are exactly `Id, Handle, passcode`, no header. The
  passcode in the CSV is the plaintext (not the hash).
- **AC-5**: All server-side credential failures return distinct codes:
  `handle_taken` (409) for create / upload-when-Handle-occupied;
  `bad_passcode` (401) for upload-and-erase mismatches and WS hello;
  `unknown_handle` (404) for paths where the Handle is not in the
  database; `id_mismatch` (409) for upload anomalies.
- **AC-6**: The DB never stores a plaintext passcode. The `passcode_hash`
  column is verified by an integration test that reads the row after
  create and asserts `passcode_hash != passcode` and `passcode_hash`
  starts with `$argon2id$`.
- **AC-7**: Erase is irreversible. After `POST /api/identities/erase`,
  `findByHandle(handle)` returns null and the same Handle can be created
  again with a different `Id` and `passcode`.
- **AC-8**: An unidentified user can load Landing and see the room list
  with participant Handles, but the Create Room button and per-row Enter
  buttons are disabled.

## Constrains Future Sessions

- **`(Id, Handle, passcode)` is the canonical identity tuple.** Any new
  identity-bearing request, message, or storage location uses these names
  and these formats. Do not reintroduce `username`, `secret`, or
  `identity_id` in user-facing surfaces.
- **The `identities` table is a stable interface for admin tooling.**
  Do not rename `id`, `handle`, or `passcode_hash` columns without
  coordinating with any out-of-band admin scripts that read them.
- **Auth uniformity.** Any new HTTP or WS route that operates on a
  specific identity must take `(handle, passcode)` and verify via the
  hash service. Do not add a new route that takes a bare `Id`.
- **Erase is hard-delete.** Soft-delete is not part of this model. If a
  future requirement needs "deactivated but recoverable" semantics, that
  is a new ADR, not a quiet schema addition.
- **Greenfield posture for cutover.** Per the no-backcompat-server-lifecycle
  principle, the schema rename + format change ships as a one-shot wipe
  of any pre-existing dev/test database. No migration ladder, no
  legacy-token grandfathering. The server admin coordinates disruption.

## Resolved Implementation Choices

The seven items deferred from this ADR's draft were resolved
2026-04-26 by adopting the proposed defaults:

1. **Erase confirmation UX** — user types their **Handle** to confirm.
2. **Erase + hosted rooms** — existing successor logic runs. If a
   successor was nominated, they take over; if no successor configured,
   the room dissolves via the existing PH-grace eventual-close path.
3. **Erase + live connections** — server closes all WS connections
   bound to this `id` with close code `4007 identity_erased`
   immediately upon successful erase.
4. **Handle minimum length** — **3** characters. Matches the prior
   `username` minimum and blocks single-character trolling while
   leaving room for short Handles (e.g. `bob`). Validation lives in
   the create-identity and upload-identity routes plus a client-side
   pre-check.
5. **Upload `handle_taken` message verbosity** — the standard envelope
   form `{ code: "handle_taken", detail: "that Handle is already in
   use" }`. No special opacity (Handle enumeration is already trivial
   via `POST /api/identities`'s 409 path; layering opacity here buys
   nothing).
6. **Migration story** — **greenfield wipe**. Per the
   no-backcompat-server-lifecycle principle, schema/wire/credential
   changes are one-shot cutovers. Any pre-existing dev/test SQLite DB
   is wiped at deploy time. No migration ladder.
7. **Two-tab erase coordination** — `storage` event listener is
   sufficient. No polling fallback. The client's
   `subscribeToIdentityChanges(callback)` helper (Phase D) wires this.

## Cutover

This is a one-shot replacement. The shipped server commit (`bf6fe52c`) is
not reverted; the rename + format change + new routes land as one or
more new commits on top. Any pre-existing dev/test SQLite DB is wiped at
deploy time. The in-flight uncommitted Phase 4 client work (App-level
gate, Phase 4.1–4.4 partial) is reverted; the new client work follows
the plan that supersedes
[plan-20260425-adr-159-identity.md](../../work/multiuser/plan-20260425-adr-159-identity.md).

The new plan, pending sign-off on this ADR, will be written to
`docs/work/multiuser/plan-2026-04-26-id-handle-passcode.md` with the
phasing proposed in the requirements doc:

- **A** — Schema + repository rename & format change (server, breaking).
- **B** — Auth-uniform HTTP route rewrite (`create-room`, `join-room`).
- **C** — Upload + erase routes.
- **D** — Client first-visit screen with Create Identity + Upload
  Identity affordances; gate Create Room / Enter Room buttons.
- **E** — Client identity panel with download + erase.
- **F** — Roster Handle display + cleanup.

## Session

Captured 2026-04-26. Requirements doc:
[docs/work/multiuser/requirements-identity-2026-04-26.md](../../work/multiuser/requirements-identity-2026-04-26.md).
