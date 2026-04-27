# Plan — ADR-161: Identity Model `(Id, Handle, passcode)` with Download/Upload Portability

**Created**: 2026-04-26
**Status**: COMPLETE — all phases A–F shipped on 2026-04-26 (commits `fea27717` → `14968ea4`). AC-1 through AC-9 delivered.
**ADR**: [`docs/architecture/adrs/adr-161-identity-id-handle-passcode.md`](../../architecture/adrs/adr-161-identity-id-handle-passcode.md) (ACCEPTED)
**Supersedes**: [`plan-20260425-adr-159-identity.md`](./plan-20260425-adr-159-identity.md)
**Requirements doc**: [`requirements-identity-2026-04-26.md`](./requirements-identity-2026-04-26.md)

**Overall scope**: Replace the shipped Phase 1–3 identity work (commit
`bf6fe52c`) with the `(Id, Handle, passcode)` model. Close the auth gap on
HTTP room routes. Replace the paste-reclaim UX with download/upload CSV.
Add user-driven erase. Soften the App-level gate to button-level gating.
All AC-1..AC-8 from ADR-161 land in Phases A–F.

**Bounded contexts touched**: server schema + repositories; server HTTP
(identity routes; room routes; new upload/erase routes); server WS hello
vocabulary; server connection lifecycle (erase-driven close); browser client
storage layer; browser client identity setup panel; browser client identity
management panel; browser client Landing button gating; roster/room-list
Handle display.

**Key domain language**: Id (Crockford base32, 8 chars, `XXXX-XXXX`),
Handle (1–12 alpha, case-insensitive uniqueness), passcode (EFF word-pair),
upload-as-claim, hard-erase, button-level gate, roster Handle display.

**Cutover posture**: greenfield, one-shot, no migration ladder. Per
[`feedback_no_backcompat_server_lifecycle`](../../../../.claude/projects/-Users-david-repos-sharpee/memory/feedback_no_backcompat_server_lifecycle.md):
the server admin coordinates disruption; schema/wire/credential changes
ship as a single replacement.

---

## Pre-Phase: Revert uncommitted client work

**Tier**: Trivial
**Budget**: ~30 tool calls
**Domain focus**: clean slate. The local-uncommitted Phase 4 client work
(see Files-to-revert below) was written under ADR-159's model and diverges
enough from ADR-161 that surgical edits will be more confusing than
rebuilding from the new contracts.

**Files to revert** (all uncommitted, on `main`):

- `tools/server/client/src/App.tsx` — App-level hard gate is wrong per R11.
- `tools/server/client/src/App.test.tsx` — same.
- `tools/server/client/src/identity/identity-store.ts` — field names wrong (will rebuild in Phase D with the three-field shape).
- `tools/server/client/src/identity/identity-store.test.ts` — same.
- `tools/server/client/src/identity/create-identity-flow.tsx` — Stage 2 secret-display modal goes away entirely.
- `tools/server/client/src/identity/create-identity-flow.test.tsx` — same.
- `tools/server/client/src/types/api.ts` — added types are reclaim-shaped (now obsolete) and `identity_id` additions are obsolete; revert to pre-session shape.
- `tools/server/client/src/api/http.ts` — `createIdentity` / `reclaimIdentity` helpers are obsolete.
- `tools/server/client/src/components/CreateRoomModal.tsx` — half-edit (`identityProvider` prop, `CreateRoomRequest` import) is wrong direction.

**Files NOT to revert** (these stay):

- `docs/work/multiuser/requirements-identity-2026-04-26.md` (this session's output, signed off).
- `docs/architecture/adrs/adr-161-identity-id-handle-passcode.md` (ACCEPTED).
- `docs/work/multiuser/plan-2026-04-26-id-handle-passcode.md` (this file).

**Method**: `git checkout -- <each file>` for tracked files; `git rm` for
the few files that were created in this session and have no committed
prior state (the `identity/` folder).

**Exit state**: working tree contains only the three new docs above; the
server still has Phase 1–3 commits; client typecheck has the same single
pre-existing error (`useWebSocket.ts:107` token-shape mismatch — now
reclassified as a Phase B side-effect because the cleanup happens when the
WS hello vocabulary changes).

---

## Phase A: Schema + repository rename + format generators

**Tier**: Large
**Budget**: ~400 tool calls
**Domain focus**: persistence boundary; rename + format change ripple
through every callsite that touches identity. This is the foundation phase;
B and C cannot start until repositories speak `(id, handle, passcode_hash)`.

**Entry state**: Phase 1–3 commit (`bf6fe52c`) on main. Pre-Phase revert
done. Server typechecks except for the pre-existing client-side
`useWebSocket.ts:107` error.

**Deliverable**:

- **Schema** — modify `tools/server/migrations/0001_initial_schema.sql` in
  place (greenfield):
  - `identities` table: `identity_id → id` (PK, TEXT, format
    `^[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}$`); `username → handle`;
    `secret_hash → passcode_hash`. Drop `deleted_at`.
  - `idx_identities_username_lower → idx_identities_handle_lower`.
  - `participants.identity_id` FK still references `identities.id` (column
    name on participants stays — it's a sensible FK descriptor); drop
    `participants.display_name` (Handle replaces it).

- **Crockford Id generator** —
  `tools/server/src/identity/id-generator.ts`:
  - `generateId(): string` returns 8 random Crockford-base32 symbols
    (alphabet `0-9A-HJ-KM-NP-TV-Z`, no I/L/O/U), formatted `XXXX-XXXX`.
  - `isWellFormedId(s: string): boolean` validates the format, after
    uppercase normalization.
  - Unit tests assert: alphabet excludes confusables; output is uppercase;
    output matches the regex; ~10⁵ samples show no obvious clustering.

- **EFF passcode generator** —
  `tools/server/src/identity/passcode-generator.ts`:
  - Static asset `tools/server/src/identity/eff-large-wordlist.txt` (7,776
    words, one per line, lowercase). Loaded once at module init.
  - `generatePasscode(): string` returns two random words, `-`-separated.
  - Unit test asserts: output matches `^[a-z]+-[a-z]+$`; both words come
    from the wordlist; ~10⁴ samples cover at least 99% of the wordlist
    (sanity check on randomness).

- **`IdentitiesRepository`** rename + reshape
  (`tools/server/src/repositories/identities.ts`):
  - Methods: `create({handle, passcode_hash}) → Identity`;
    `findByHandle(handle)`; `findById(id)`; `findHashByHandle(handle) →
    {id, passcode_hash} | null` (the only auth surface that returns the
    hash); `touchLastSeen(id)`; `delete(id)` (hard delete; replaces
    `softDelete` from Phase 1).
  - `Identity` type: `{ id, handle, created_at, last_seen_at }` (no
    deleted_at, no plaintext passcode).

- **`ParticipantsRepository`** updates: rename references where they're
  named for the old vocabulary; `display_name` parameter dropped from
  `createOrReconnect` and `createWithId`; participants now derive their
  display from the joined identity's `handle`.

- **WS handler `hello.ts`** — vocabulary rename: accepts
  `{ kind: 'hello', handle, passcode }`; calls `findHashByHandle` →
  `verify(passcode, hash)` → resolves to `id`. Close codes:
  `4000 hello_required`; `4001 unknown_handle`; `4004 room_closed`;
  `4006 bad_passcode`. Behavior identical to Phase 3, names changed.

- **HTTP route `create-identity.ts`** — body becomes `{ handle }`. Server:
  validates Handle (1–12 alpha, case-insensitive uniqueness — pre-check +
  UNIQUE-fallback); generates `Id` (with collision retry up to 3 attempts);
  generates `passcode`; argon2id-hashes the passcode; inserts row; returns
  `(id, handle, passcode)` 201.

- **HTTP route `reclaim-identity.ts`** — **deleted** in this phase. The
  client has no caller after Phase 4 client work was reverted, so removal
  is safe. Phase C ships its replacement (`/upload`).

- **Wiring** — `src/index.ts`, `src/http/app.ts`, `tests/helpers/test-app.ts`,
  `tests/helpers/test-server.ts` updated for the new repository shape.

- **Test cascade** — every `tests/repositories/identities.test.ts`,
  `tests/repositories/participants.test.ts`, `tests/rooms/succession.test.ts`,
  `tests/http/create-identity.test.ts`, `tests/http/identity-rate-limit.test.ts`,
  `tests/http/list-rooms.test.ts`, `tests/http/resolve-code.test.ts`,
  `tests/ws/*.test.ts`, and `tests/helpers/test-server.ts` updated for the
  new vocabulary, generator behaviour, and removed `display_name`.
  `tests/http/reclaim-identity.test.ts` is **deleted**.

- **New tests**:
  - `tests/identity/id-generator.test.ts` — alphabet correctness, format,
    no confusables in 10⁵ samples.
  - `tests/identity/passcode-generator.test.ts` — both words in wordlist;
    sample coverage; format.
  - Updated `tests/repositories/identities.test.ts` with delete (hard) and
    Handle case-insensitive resolution + canonical-case preservation.

**AC coverage**: AC-1 (Handle uniqueness), AC-6 (DB never stores plaintext —
verified by reading the row after create and asserting `passcode_hash`
starts with `$argon2id$`), AC-7 (erase frees the Handle — repo-level test:
create-delete-create-with-same-handle succeeds with a different `Id`).

**Integration Reality**: better-sqlite3 against in-memory DB populated by
`runMigrations`. Real argon2id verify in at least one create-identity
end-to-end test. Real `ws.WebSocket` in WS hello tests. No mocks at the
acceptance gate.

**Exit state**: server typecheck clean for the server package; all 56
existing identity-related tests carry their assertions over to the new
vocabulary; all generators have unit tests; reclaim route + tests are
gone; the schema + repository layer is the canonical source for the new
identity shape.

**Status**: DONE (commit `fea27717`)

---

## Phase B: Auth-uniform HTTP room routes

**Tier**: Medium
**Budget**: ~250 tool calls
**Domain focus**: close the auth gap on `POST /api/rooms` and
`POST /api/rooms/:id/join`. Both currently take a bare `identity_id`; both
must take `(handle, passcode)` and verify via the hash service.

**Entry state**: Phase A complete; `findHashByHandle` available;
participants no longer require `display_name`.

**Deliverable**:

- **`POST /api/rooms`** body change: replace `identity_id` with
  `handle` + `passcode`. Validation order:
  1. Body parses
  2. Required-field check on `handle`, `passcode`, `story_slug`, `title`
  3. CAPTCHA verify (existing)
  4. `findHashByHandle(handle)` → 404 `unknown_handle` if missing
  5. `verify(passcode, hash)` → 401 `bad_passcode` if mismatch
  6. Story lookup, room creation, participant-with-id-ref insert
- **`POST /api/rooms/:id/join`** body change: same — `(handle, passcode)`,
  drop `display_name`. Same validation order, plus the existing room
  lookup.
- **Wire types** — `src/wire/browser-server.ts` and any client-side
  hand-mirrored types in `tools/server/client/src/types/api.ts` updated
  to the new request bodies. (Client modal/Landing wiring lands in Phase D.)
- **Test cascade**: `tests/http/create-room.test.ts`,
  `tests/http/join-room.test.ts`, plus any helper that constructs request
  bodies (`tests/helpers/test-app.ts`, `tests/helpers/test-server.ts`)
  switch to `(handle, passcode)`. New tests:
  - `bad_passcode` 401 on create-room.
  - `unknown_handle` 404 on create-room.
  - same pair on join-room.
  - existing happy-path tests continue to pass after credential update.

**AC coverage**: AC-5 (distinct error codes per failure mode for
create-room and join-room — `unknown_handle` 404 / `bad_passcode` 401).

**Integration Reality**: real Hono app + real SQLite + real argon2 on at
least one happy-path test per route, asserting the participant row's
`identity_id` references the resolved server-internal `id`.

**Exit state**: room creation and join require credentials; no path that
takes a bare `id` exists; the auth gap from ADR-159 is closed.

**Status**: DONE (commit `4d73f8d2`)

---

## Phase C: Upload + erase routes

**Tier**: Medium
**Budget**: ~300 tool calls
**Domain focus**: identity portability and lifecycle endpoint surface. The
two new routes complete the lifecycle: create → upload → erase.

**Entry state**: Phases A and B complete.

**Deliverable**:

- **`POST /api/identities/upload`** —
  `tools/server/src/http/routes/upload-identity.ts`:
  - Body `{ id, handle, passcode }`.
  - Format pre-check on `id` (regex), 400 `malformed_id`.
  - Format pre-check on `handle` (1–12 alpha), 400 `invalid_handle`.
  - Server-side decision matrix (mirrors ADR-161):
    1. `findById(id)` and `findByHandle(handle)`:
       - both null → register new `(id, handle, passcode_hash)`, 201,
         return `{ id, handle, passcode_hash_present: true }` (response
         body shape: `{ id, handle }`).
       - id-row exists, handle-row exists, same row, `verify(passcode)`
         → 200 `{ id, handle }`.
       - id-row exists, handle-row exists, same row, hash mismatch →
         401 `bad_passcode`.
       - id-row exists, no handle match → 409 `id_mismatch`.
       - id-row exists, handle-row exists, different rows → 409
         `id_mismatch`.
       - no id-row, handle-row exists → 409 `handle_taken`.
  - Per-IP rate limit (existing limiter) — 10/min, shared bucket with
    `/api/identities` and `/api/identities/erase`.

- **`POST /api/identities/erase`** —
  `tools/server/src/http/routes/erase-identity.ts`:
  - Body `{ handle, passcode }`.
  - `findHashByHandle(handle)` → 404 `unknown_handle` if missing.
  - `verify(passcode, hash)` → 401 `bad_passcode` if mismatch.
  - Resolve to `id`; emit a server-side event (or call a registered hook)
    that closes any active WS connections bound to this `id` with code
    `4007 identity_erased` (mechanism: a connection registry keyed by
    `id`; existing `WsDeps.connections` may already track this — confirm
    in implementation; if not, this phase grows by ~50 tool calls to add
    the registry).
  - `deps.identities.delete(id)` (hard).
  - Return 200 `{ erased: true }`.

- **`POST /api/identities` rate-limit bucket** updated to share with
  `/upload` and `/erase` so a single per-IP limit applies to all three
  identity-shape endpoints.

- **`HttpError` codes added**: `malformed_id` (400), `invalid_handle`
  (400 — also used by create-identity in Phase A), `handle_taken` (409
  — already present in Phase A's create-identity), `id_mismatch` (409),
  `bad_passcode` (401 — already used by hello and Phase B).

- **New tests**:
  - `tests/http/upload-identity.test.ts` — one test per matrix row,
    plus malformed-CSV / malformed-Id / handle-validation rejections.
    Includes a real-argon2 happy-path test (matrix row 1) and a
    real-argon2 wrong-passcode test (row 2).
  - `tests/http/erase-identity.test.ts` — happy path; `unknown_handle`;
    `bad_passcode`; post-erase `findByHandle` returns null; post-erase
    Handle is creatable again with a different `Id`.
  - `tests/http/identity-rate-limit.test.ts` — extend to assert the
    shared bucket across all three identity routes.
  - `tests/ws/erase-disconnect.test.ts` — a WS connected via hello;
    server-side erase closes the socket with `4007 identity_erased`.

**AC coverage**: AC-3 (upload restores prior room memberships — verified
by upload-then-WS-hello-then-presence-event-arrives integration test),
AC-7 (erase frees the Handle — repo + HTTP test), AC-5 (distinct error
codes for `bad_passcode`, `handle_taken`, `id_mismatch`,
`unknown_handle`).

**Integration Reality**: real Hono + real SQLite + real argon2 for at
least one happy-path test on each new route; real `ws.WebSocket` for the
erase-disconnect test (no mock socket).

**Exit state**: identity lifecycle is fully exposed on the server —
create, upload, erase. Reclaim is gone. Live WS connections terminate
correctly on erase.

**Status**: DONE (commit `ea7960bd`)

---

## Phase D: Client first-visit screen + button-level gating

**Tier**: Large
**Budget**: ~400 tool calls
**Domain focus**: client UX restart. The first-visit panel is the entry
point; Landing remains visible to unidentified users (R11) but Create Room
and Enter Room buttons are disabled until identity exists. WS hello on
the client side is rebuilt with the new vocabulary.

**Entry state**: Phases A, B, C complete; server contracts are stable.

**Deliverable**:

- **`tools/server/client/src/identity/identity-store.ts` (new — replaces
  reverted file)**:
  - `StoredIdentity = { id, handle, passcode }` (three fields).
  - `getStoredIdentity()`, `storeIdentity(triple)`, `clearStoredIdentity()`.
  - localStorage key `sharpee:identity` (unchanged).
  - Cross-tab `storage`-event subscription helper:
    `subscribeToIdentityChanges(callback)` — fires when another tab
    erases or uploads.
  - Tests cover the three-field shape, malformed-JSON rejection, missing
    fields, the cross-tab notification pathway, and storage-exception
    swallowing.

- **`tools/server/client/src/identity/csv.ts` (new)**:
  - `parseIdentityCsv(text): { id, handle, passcode } | { error }` — single
    row, three fields, no header. Trims whitespace. Rejects extra
    columns, missing fields, malformed `Id` (regex check), out-of-spec
    Handle.
  - `formatIdentityCsv(identity): string` — for download. Three fields,
    comma-separated, single row, no trailing newline (or one — pick
    convention; default: trailing `\n`).
  - Unit tests cover the round-trip, every rejection class, and the
    file-shape conventions.

- **`tools/server/client/src/identity/identity-setup-panel.tsx` (new)**:
  - First-visit panel rendered when `getStoredIdentity()` is null.
  - Two side-by-side affordances: **Create Identity** (form: Handle
    text input → `POST /api/identities`) and **Upload Identity (CSV)**
    (file picker → parse → `POST /api/identities/upload`).
  - On either success: `storeIdentity({id, handle, passcode})`, invoke
    `onIdentityEstablished` to unlock the parent.
  - Inline errors per failure mode: client-side validation; server
    `handle_taken`, `bad_passcode`, `id_mismatch`, `malformed_id`,
    `invalid_handle`, network error.
  - **No "save your secret" copy gate** — the user has the file via
    download (Phase E) when they need it.
  - Tests: happy path Create; happy path Upload (matrix row 1 — same
    identity); Upload row 2 (`bad_passcode`) inline error; Upload row 5
    (`handle_taken`) inline error; client-side malformed CSV rejection;
    network error fallback.

- **Landing button gating**:
  - `Landing.tsx` accepts `identity: StoredIdentity | null` from App.
    When null: Create Room button is disabled with a tooltip /
    descriptive label ("Set up your identity first"); per-row Enter
    button is disabled the same way. The page itself renders normally —
    rooms list, story list, Handle display in roster previews.
  - `App.tsx` no longer hard-gates. App holds
    `identity: StoredIdentity | null` state, renders `IdentitySetupPanel`
    in a banner / above-the-fold position when null, renders Landing /
    Room **always**, and passes `identity` down so action buttons can
    gate themselves.
  - Update `Landing.test.tsx` (button-disabled assertions when
    `identity={null}`) and `App.test.tsx` (gate-as-banner, not
    page-replacement).

- **API helpers** (`api/http.ts`):
  - `createIdentity({handle})` → `(id, handle, passcode)`.
  - `uploadIdentity({id, handle, passcode})` → `(id, handle)`.
  - `eraseIdentity({handle, passcode})` → `(erased: true)` (referenced in
    Phase E but the helper lands here).

- **Type updates** (`types/api.ts`):
  - `CreateIdentityRequest` = `{ handle }`.
  - `CreateIdentityResponse` = `{ id, handle, passcode }`.
  - `UploadIdentityRequest` = `{ id, handle, passcode }`.
  - `UploadIdentityResponse` = `{ id, handle }`.
  - `EraseIdentityRequest` = `{ handle, passcode }`.
  - `EraseIdentityResponse` = `{ erased: true }`.
  - `CreateRoomRequest` and `JoinRoomRequest` — replace `identity_id` /
    `display_name` with `handle` + `passcode`.

- **`CreateRoomModal.tsx` / `PasscodeModal.tsx`** updates:
  - Read identity via `getStoredIdentity()` at submit (gate-style — App
    has already ensured non-null when the button was clickable, but a
    defensive null-check returns a form-level alert "Identity unavailable —
    reload").
  - Send `(handle, passcode)` in the body.
  - Drop `display_name` field (PasscodeModal had this; it's gone — the
    Handle is the display name).
  - Tests updated: seed identity in `beforeEach`; assert request bodies
    carry credentials.

- **`useWebSocket.ts`**: send `{ kind: 'hello', handle, passcode }` from
  the stored identity. Fixes the build break that's been outstanding
  since Phase 3.

**AC coverage**: AC-1 (Handle uniqueness UX — duplicate inline error
display in the Create form), AC-3 (cold reclaim via Upload — UI test
covers the flow: localStorage empty → upload → identity stored →
unlock), AC-4 partial (the file format is round-trippable; the download
itself is in Phase E), AC-8 (button-level gating — unidentified user
sees Landing with disabled Create / Enter buttons).

**Exit state**: a fresh-browser user can land, browse Landing, set up
identity (create or upload), then create a room or join one. WS hello
sends the new vocabulary. The build is clean.

**Status**: DONE (commit `e9739abe`)

---

## Phase E: Identity panel — download + erase

**Tier**: Medium
**Budget**: ~200 tool calls
**Domain focus**: post-setup identity management. A persistent UI
affordance lets the user export their credentials (download) or destroy
them (erase).

**Entry state**: Phase D complete; `identity-store.ts`, `csv.ts`, and
the API helpers are in place.

**Deliverable**:

- **`tools/server/client/src/identity/identity-panel.tsx` (new)**:
  - Renders the user's `Handle` (only).
  - **Download identity** button — triggers a blob download of
    `sharpee-identity.csv` with `formatIdentityCsv(stored)`. The browser
    save-as dialog handles location. The Id and passcode are fetchable
    from the file but **never rendered to the DOM** (defends against
    casual screenshot-leak; the user sees only the Handle in the panel).
  - **Erase identity** button — opens a confirmation modal: user must
    type their Handle exactly to enable the destructive action. On
    confirm: `POST /api/identities/erase`, on success
    `clearStoredIdentity()`, return App to the unidentified state.
  - Inline error display for `bad_passcode` (file became corrupt) and
    network error.

- **Persistent UI affordance**: a settings menu / account icon in the
  header (or wherever `ThemePicker` currently lives) opens the panel.
  Exact placement is a UI detail — open the panel inline or as a side
  drawer; pick during implementation review.

- **App integration**: when an erase succeeds, App receives the cleared
  identity state and re-renders with the `IdentitySetupPanel` shown
  (R8 + R9 — back to first-visit shape).

- **Cross-tab erase**: the `storage` event from another tab erasing
  fires the `subscribeToIdentityChanges` listener installed in Phase D;
  App re-reads `getStoredIdentity()`, sees null, re-renders gated.

- **Tests**:
  - Download produces a blob whose CSV content round-trips through
    `parseIdentityCsv`.
  - Erase confirmation modal blocks the destructive action until the
    Handle matches.
  - Successful erase clears localStorage and notifies App.
  - `bad_passcode` (server says credentials don't match — should be
    impossible given the in-memory triple is what we're sending, but the
    error path renders correctly).
  - Cross-tab erase: simulate a `storage` event with `null`; assert the
    App re-renders gated.

**AC coverage**: AC-4 (download produces a CSV with the spec'd
format), AC-7 (erase is irreversible at the client; client returns to
unidentified state).

**Exit state**: identity management is complete. Users can self-serve
download (for portability) and erase (for departure).

**Status**: DONE (commit `14968ea4`)

---

## Phase F: Roster + room-list Handle display + cleanup

**Tier**: Small
**Budget**: ~150 tool calls
**Domain focus**: tail cleanup. With Handle being globally unique and
public, surface it where currently we showed only `display_name` (now
removed) or `participant_count` (now `participants[]` of Handles).

**Entry state**: Phase D complete (Handle is in identity flow); Phase E
complete (download/erase work). All API contracts are stable.

**Deliverable**:

- **Server-side**: `GET /api/rooms` response `RoomSummary` adds
  `participants: { handle: string }[]` (or extends the existing
  `participant_count`-only shape — pick during implementation; the
  cleaner option is to expose the participants list and let the client
  derive count). Update `tests/http/list-rooms.test.ts`.
- **Client-side**: `ActiveRoomsList` shows participant Handles inline
  with each room row (or a compact roster-preview affordance — UI
  detail). `Roster` component (in-room) shows Handle as the
  participant's identity, not a separate `display_name`.
- **Cleanup pass**: search for any lingering references to `username`,
  `secret`, `display_name`, `identity_id`, or `reclaim` in code,
  comments, or docs and update. Update ADR-156 (Multiuser Browser
  Client) with a section pointing to ADR-161 for identity surfaces.
- **Update session summary template / examples** if they reference the
  old vocabulary anywhere.

**AC coverage**: AC-8 final (unidentified user sees Handles in roster
and room rows).

**Exit state**: vocabulary is fully migrated; UI surfaces all use
Handle. ADR-156 is amended with the identity UI surface map.

**Status**: DONE (commit `14968ea4`; wire-type extraction `tools/server/src/wire/http-api.ts` was added as a Phase F prerequisite per rule 7b)

---

## Integration Reality Statement (applies to all phases)

The server's DB (better-sqlite3), WS layer, and argon2 hashing are
**owned dependencies** — this repository ships them. Per CLAUDE.md's
Integration Reality rule:

- Every phase that touches DB logic includes at least one test that
  exercises real better-sqlite3 against a real (in-memory) DB populated
  by `runMigrations`. No mocked DB at the acceptance gate.
- Every phase that touches WS hello includes at least one test that
  drives a real `ws.WebSocket` against the real Hono+WS server. No mock
  socket.
- The argon2 hash service has at least one test using the real `argon2`
  npm package (not a stub) on every route that hashes or verifies.
- The Crockford Id generator and EFF passcode generator have unit tests
  using the real generators (no determinism stubs at the acceptance
  gate).

---

## AC Coverage Matrix

| AC    | Phase(s)        | How verified                                                                          |
|-------|-----------------|---------------------------------------------------------------------------------------|
| AC-1  | A, D            | DB UNIQUE index + 409 `handle_taken` route response (Ph A); inline error display (Ph D) |
| AC-2  | A               | WS hello identity path integration test (warm reconnect yields same `participant_id`)  |
| AC-3  | C, D            | Upload route happy path (Ph C); upload-then-WS-hello flow (Ph D)                       |
| AC-4  | C, E            | CSV format round-trip in `csv.ts` tests (Ph D — the parser + formatter ship in D); download blob test (Ph E) |
| AC-5  | A, B, C         | `unknown_handle` 404 / `bad_passcode` 401 on identity routes (Ph A); same on room routes (Ph B); `handle_taken` / `id_mismatch` on upload (Ph C) |
| AC-6  | A               | DB row inspection: `passcode_hash` starts with `$argon2id$` and is not equal to plaintext |
| AC-7  | A, C, E         | Repo-level create-delete-create-with-same-handle (Ph A); HTTP erase route (Ph C); client erase + return-to-unidentified (Ph E) |
| AC-8  | D, F            | Button-disabled assertions in `Landing.test.tsx` (Ph D); roster Handle display (Ph F)  |

---

## Resolved Implementation Choices (locked 2026-04-26)

ADR-161's seven deferred items resolved by adopting the proposed defaults:

1. **Erase confirmation UX** — user types their Handle to confirm. Phase E.
2. **Erase + hosted rooms** — existing successor logic transfers; if no
   successor, room dissolves via the PH-grace eventual-close path. Phase C.
3. **Erase + live connections** — server closes all WS connections bound to
   the erased `id` with close code `4007 identity_erased` immediately.
   Phase C.
4. **Handle minimum length** — **3** chars. Validation lives in
   `create-identity`, `upload-identity` (server) and the
   `IdentitySetupPanel` pre-check (client). Phase A + Phase D.
5. **Upload `handle_taken` message** — standard envelope; no extra opacity.
   Phase C.
6. **Migration story** — greenfield wipe; the dev/test DB is recreated at
   deploy time. Phase A.
7. **Two-tab erase coordination** — `storage` event listener; no polling
   fallback. Phase D ships `subscribeToIdentityChanges(callback)`. Phase E
   uses it.

---

## Phase Tier Totals

| Phase | Tier   | Budget        |
|-------|--------|---------------|
| Pre   | Trivial | ~30 calls    |
| A     | Large   | ~400 calls   |
| B     | Medium  | ~250 calls   |
| C     | Medium  | ~300 calls   |
| D     | Large   | ~400 calls   |
| E     | Medium  | ~200 calls   |
| F     | Small   | ~150 calls   |
| **Total** | — | **~1,730 calls** |

This is across multiple sessions — each phase is independently sessionable.
The critical path is A → B → C → D → E → F. B and C can run in parallel
after A if multiple sessions are available.
