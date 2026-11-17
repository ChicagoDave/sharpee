# Identity & Room Access — Revised Requirements (2026-04-26)

**Status**: Captured from interactive session 2026-04-26. Awaiting sign-off
before any ADR/plan rewrite.

**Scope**: This document supersedes the implicit requirements driving
[ADR-159](../../architecture/adrs/adr-159-persistent-user-identity.md) and
[plan-20260425-adr-159-identity.md](./plan-20260425-adr-159-identity.md).
Phases 1–3 of that plan have shipped (commit `bf6fe52c`); Phase 4 is in
progress and locally uncommitted. The new requirements force a substantive
revision of the shipped server work and a redesign of the in-flight client
work.

---

## Vocabulary Map

| Phase 1–3 (shipped)     | Revised (this doc) | Notes                                                                     |
|-------------------------|--------------------|---------------------------------------------------------------------------|
| `identity_id` (UUIDv4)  | `Id`               | Short, human-readable, Crockford-base32 8-char with dash: `XYNC-4FJ3`     |
| `username`              | `Handle`           | Up to 12 alpha; replaces both `username` (login) and `display_name` (UI)  |
| `display_name`          | `Handle`           | Collapsed into `Handle` — same human shows under same Handle in every room |
| `secret` (UUIDv4)       | `passcode`         | Two random EFF-wordlist words, `-`-separated: `correct-horse`             |

The vocabulary change applies everywhere: schema columns, type names,
HTTP/WS wire fields, UI copy, error codes (`bad_credentials` → `bad_passcode`,
`unknown_identity` → `unknown_handle` or similar — to be decided per-route in
the ADR).

---

## Requirements

| #   | Statement                                                                                                                                                                                                            |
|-----|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| R1  | Every user has a unique identity = `(Id, Handle, passcode)`. `Handle` is user-chosen, unique, and public (the only identity field shown to other users). `Id` and `passcode` are server-generated.                   |
| R2  | The room creator is the host (current Primary Host role — unchanged).                                                                                                                                                |
| R3  | The full identity `(Id, Handle, passcode)` lives in browser `localStorage`. Once set, only the `Handle` is shown in normal UI; `Id` and `passcode` are not surfaced unless the user explicitly downloads.            |
| R4  | Cross-device flow is **download identity / upload identity** as a file. There is no paste-Handle-and-passcode reclaim modal.                                                                                          |
| R5  | The download/upload file is **CSV, no header, three values**, column order `Id, Handle, passcode`.                                                                                                                   |
| R6  | Upload validation: malformed CSV or malformed `Id` → error. If the uploaded `Handle` already exists on the server but the `(Id, passcode)` don't match the server's record → error. If all three match an existing record → accepted (the user adopts that identity on this device). |
| R7  | Upload of an `Id` and `Handle` the server has never seen → **accepted**, registered as a new server-side identity.                                                                                                   |
| R8  | Erase: clears **both** `localStorage` and the server-side identity row. Irreversible. The freed `Handle` becomes claimable by someone else.                                                                          |
| R9  | The identity gate is the first screen — before the user can perform Create Room or Join Room actions, they must establish an identity.                                                                                |
| R10 | Identity is also persisted server-side in the database (`(Id, Handle, hashed-passcode)` at minimum, by parallel with the current `identities` table).                                                                |
| R11 | A user without an identity can still **view** the Landing surface — the room list and participant list. Participants are now identifiable by `Handle`. The unidentified user simply cannot Create or Join a room until they establish an identity. |

---

## Field Formats

### `Id` — short identifier
- **Alphabet**: Crockford base32 — `0-9` + `A-Z` minus `I`, `L`, `O`, `U`. 32 symbols, no confusable pairs.
- **Length**: 8 symbols, formatted as 4 + `-` + 4. Example: `XYNC-4FJ3`.
- **Case**: uppercase canonically. Comparison is case-insensitive (uppercase normalization on input).
- **Space**: 32⁸ = ~1.1 trillion. Collision on generate is vanishingly rare; generator still retries on the (admittedly improbable) UNIQUE constraint hit.
- **Server-generated** at create-identity time and on upload-of-new (R7).

### `Handle` — display + login
- **Alphabet**: alpha only (a-z + A-Z). No digits, no underscore, no hyphen, no spaces.
- **Length**: **3–12 characters** (locked 2026-04-26 — matches old `username` minimum).
- **Case**: case preserved at creation; uniqueness check is case-insensitive (`Alice` and `alice` collide).
- **User-chosen** at create-identity time. Server validates and rejects on conflict.

### `passcode` — secret credential
- **Generator source**: [EFF Large Wordlist for Passphrases](https://www.eff.org/dice) — 7,776 words, all lowercase, dictionary-friendly. Ships with the server as a static asset.
- **Format**: two words joined by `-`, e.g. `correct-horse`.
- **Space**: 7,776² ≈ 60.5 million combinations. Plenty for an honest user; not adequate as the *sole* defense against brute-force from a stolen credentials file, but the credentials file is itself a possession factor (you have to have stolen the CSV) and the per-IP rate limiter from Phase 2 still applies.
- **Storage**: argon2id hash (unchanged from Phase 2 — `secret_hash` column renamed to `passcode_hash`).
- **Server-generated** at create-identity time and on upload-of-new.

### CSV file
- 3 columns, in order: `Id`, `Handle`, `passcode`.
- No header row.
- Single data row.
- Comma separator. RFC-4180-shaped (no quoting needed because none of the fields can contain `,` or `"` by their own format constraints).
- Client filename suggestion: `sharpee-identity.csv`.

---

## Upload Decision Matrix

For `POST /api/identities/upload` with `(Id, Handle, passcode)`:

| Server has `Id`? | Server has `Handle`? | Records match same row? | Passcode verifies? | Outcome                                                                    |
|------------------|----------------------|-------------------------|--------------------|----------------------------------------------------------------------------|
| Yes              | Yes                  | Yes                     | Yes                | **Accept** — user adopts this identity on this device                       |
| Yes              | Yes                  | Yes                     | No                 | **Reject** — `bad_passcode` (file has been edited or is from a different system) |
| Yes              | Yes                  | No (different rows)     | —                  | **Reject** — anomalous; the server's `Id` and `Handle` belong to different identities (should be impossible if both columns are unique-indexed; reject as `id_mismatch`) |
| Yes              | No                   | —                       | —                  | **Reject** — `id_mismatch` (Id collision is anomalous; either tamper or DB inconsistency) |
| No               | Yes                  | —                       | —                  | **Reject** — `handle_taken` (per R6, Handle is held by a different identity) |
| No               | No                   | —                       | —                  | **Accept** — new registration; insert `(Id, Handle, passcode_hash)` (R7)    |

---

## Implications for Already-Shipped Work

### ADR-159 (architecture/adrs/adr-159)
Substantively obsolete. Recommend writing a new ADR (ADR-160 or higher) that
**supersedes** ADR-159. ADR-159 stays in the file system as historical record
but its vocabulary and UX no longer reflect the system.

### `identities` schema (`tools/server/migrations/0001_initial_schema.sql`)
- Rename: `identity_id` → `id`, `username` → `handle`, `secret_hash` → `passcode_hash`.
- Drop: `deleted_at` column. Erase is now hard-delete (R8 + R11 — no soft-delete behavior remains).
- Add: format check on `id` (Crockford-8-with-dash) — at the application layer, not as a DB constraint. SQLite CHECK constraint optional.
- `participants.identity_id FK` → `participants.id_ref` (or similar; the FK target is renamed too).

### Phase 1–3 server code
- `IdentitiesRepository`: rename methods and fields; `findByUsername` → `findByHandle`; `findHashByUsername` → `findHashByHandle`; etc. Drop `softDelete`; replace with hard `delete`.
- `HashService`: unchanged behaviorally. The thing it hashes is now called `passcode` instead of `secret`.
- `POST /api/identities`: body becomes `{ handle }`. Server generates `Id` (with collision retry) and `passcode` (no retry needed — passcode is not unique-keyed). Response: `(id, handle, passcode)`.
- `POST /api/identities/reclaim`: **removed**. Replaced by:
- `POST /api/identities/upload`: new route. Body `{ id, handle, passcode }`. Per the decision matrix above.
- `POST /api/identities/erase`: new route. Authenticated by `(handle, passcode)`. Hard-deletes the identity row (R8). Open: cascading effects on rooms — see TBDs below.
- `POST /api/rooms`: body switches from `identity_id` to `(handle, passcode)`. Server resolves via `findHashByHandle` + `verify`. **This closes the auth gap** flagged in the prior analysis (today the route only `findById`'s the identity without verifying credentials).
- `POST /api/rooms/:id/join`: same change.
- `WS hello`: vocabulary rename only — `(username, secret)` → `(handle, passcode)`. Behavior identical.

### Phase 4 client (in progress, uncommitted)

What exists locally:
- `src/identity/identity-store.ts` + tests — uses the right localStorage key (`sharpee:identity`), but the stored shape is `{username, secret}`. **Needs revision** to `{Id, Handle, passcode}`.
- `src/identity/create-identity-flow.tsx` + tests — Stage 2 ("Save your secret") modal is wrong: with download-as-CSV being the recovery model (R4), there is no need to display the passcode with a one-time copy gate. The flow becomes much simpler: user types Handle, server returns the triple, client stores it silently, gate unlocks.
- `src/types/api.ts` — needs the new request/response shapes.
- `src/api/http.ts` — `createIdentity` / `reclaimIdentity` helpers replace the latter with `uploadIdentity` and `eraseIdentity`.
- `src/App.tsx` — the **App-level hard gate is wrong** per R11. Must revert; gating moves to the Create Room / Enter Room **buttons** on Landing, not to Landing itself.
- `src/App.test.tsx` — same; revise.
- `src/hooks/useWebSocket.ts` — still needs the rename to send `(handle, passcode)` on the WS hello frame.

What's needed new:
- A first-visit "Identity setup" screen / inline panel offering **Create Identity** and **Upload Identity (CSV)** as the two affordances.
- Download-identity affordance (settings panel, or any always-accessible UI surface).
- Erase-identity affordance (settings panel, with a confirmation gate).
- Roster / room-list display update — show participant `Handle` (R11).

---

## Open Questions / TBDs

These do not block the requirements doc but must be decided before code lands:

1. **Erase confirmation UX** — typed-`DELETE` gate? Double-confirm modal? What's the right friction?
2. **Erase + live connections** — when a user erases, are their active WS connections terminated immediately (force-kick), or do existing connections continue until natural disconnect?
3. **Erase + hosted rooms** — if the erased identity is the Primary Host of one or more rooms, what happens? Existing successor logic transfers the role, but there's an open question of whether the room itself should be dissolved (its host is gone) or persist with a successor.
4. **Handle minimum length** — spec says "up to 12 alpha"; minimum is 1 by default. Set a higher floor? (3? — would match the prior `username` minimum.)
5. **Migration story** — Phases 1–3 shipped on `main` but presumably not yet to a long-running production deployment. If true, schema can be wiped and the rename + format change happens cleanly. If a production server is already populated, a one-shot migration is needed.
6. **WS error code rename** — `unknown_identity` → ? `bad_credentials` → `bad_passcode`?
7. **Upload error UX** — surface the decision-matrix outcomes (`handle_taken`, `bad_passcode`, `id_mismatch`, `malformed_csv`) inline on the upload screen with distinct copy.

---

## Path Forward (Proposed)

1. **Sign off on this requirements doc.** (Awaiting your read.)
2. **Resolve TBDs 1–7** above, or explicitly defer some of them with `[deferred]` placeholders.
3. **Write ADR-160 — Identity model (Id, Handle, passcode) with download/upload portability**, formally superseding ADR-159.
4. **Write a fresh plan**: `docs/work/multiuser/plan-2026-04-26-id-handle-passcode.md`, decomposing the work into phases. Likely shape:
   - Phase A: Schema + repository rename & format change (server, breaking).
   - Phase B: Auth-uniform HTTP route rewrite (`create-room`, `join-room` switch to `(handle, passcode)`).
   - Phase C: Upload + erase routes (new server functionality).
   - Phase D: Client first-visit screen with Create Identity + Upload Identity affordances; gate Create Room / Enter Room buttons on Landing.
   - Phase E: Client identity panel with download + erase.
   - Phase F: Roster Handle display + any UI cleanup.
5. **Decide on the existing uncommitted Phase 4 work**: amend in place against the new requirements, or revert and start fresh under the new plan. (Recommendation: revert. The shape diverges enough that surgical edits will be more confusing than rebuilding from the new ADR.)

The shipped server commit (`bf6fe52c`) does not need to be reverted — the rename and format change can land as a new commit on top, with tests updated in the same commit.
