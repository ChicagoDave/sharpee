# Plan — ADR-159: Persistent User Identity for Multi-User Rooms

**Created**: 2026-04-25
**ADR**: `docs/architecture/adrs/adr-159-persistent-user-identity.md`
**Overall scope**: Ship identity continuity — persistent `(username, secret)` credentials
stored server-side as argon2id hashes — so a user can rejoin any room from any device
by presenting the same username + secret. All 6 acceptance criteria (AC-1 through AC-6)
land in Phases 1–5. One-shot cutover: no two-phase rollout, no legacy-token compat
path. The server admin coordinates disruption to running games when this ships.
**Bounded contexts touched**: Server persistence (identities table + participants FK),
server HTTP (identity create/reclaim routes + rate limiting), server WS hello frame,
browser client (identity-creation flow, reclaim flow, "Show my identity" panel), ADR-156
documentation surface.
**Key domain language**: identity, secret, username, warm-reconnect, cold-reclaim,
bad\_credentials, unknown\_identity.

---

## Phases

### Phase 1: Identity persistence layer — schema + repository + callsite cascade
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Persistence boundary + downstream cascade. Greenfield posture —
  `identities` table and `participants.identity_id` are part of the schema from the
  start; any pre-existing dev/test DB is wiped at deploy. Because `participants.identity_id`
  is `NOT NULL` from the start, every participant-creating callsite (HTTP routes,
  WS handlers, tests, mocks) must require an identity_id in this phase.
- **Entry state**: Server builds clean. Schema has no identities concept; participants
  is created with no FK to identity.
- **Deliverable**:
  - Schema: modify `0001_initial_schema.sql` in place (greenfield — no separate
    migration ladder). Schema additions:
    - `identities` table with `(identity_id PK, username, secret_hash, created_at,
      last_seen_at, deleted_at NULL)`.
    - `participants.identity_id TEXT NOT NULL REFERENCES identities(identity_id)`.
    - `CREATE UNIQUE INDEX idx_identities_username_lower ON identities(LOWER(username))`.
    - `deleted_at` column included now (used by Phase 7's admin script — no separate
      migration needed later).
  - `ParticipantsRepository` signatures updated: `createOrReconnect` and `createWithId`
    require `identity_id`. Reconnect path is unchanged in spirit — token still routes
    the reconnect, identity_id is required only on initial creation.
  - Production callers updated: `create-room.ts` and `join-room.ts` accept an identity_id
    parameter in their request bodies and forward it to the participants repo. These
    routes are not yet end-to-end callable from a client (Phase 2 ships the hash service
    and identity creation routes), but the schema and contract are correct.
  - Test cascade: `participants.test.ts`, `rooms.test.ts`, and ~11 WS test files
    (`tests/ws/*.test.ts`) updated. Tests that need a participant first create an
    identity via the repository.
  - `tools/server/src/repositories/identities.ts` — `IdentitiesRepository` interface +
    factory; methods: `create(username, secretHash)`, `findByUsername(username)` (filters
    out `deleted_at IS NOT NULL`), `findById(identity_id)`, `softDelete(identity_id)`
    (sets `deleted_at` and nulls dependent participant rows — see note below).
    Returns `Identity` domain record `{ identity_id, username, created_at, last_seen_at }`.
    Never returns or accepts plaintext secret.
  - `tools/server/src/repositories/types.ts` — add `Identity` type. Add `identity_id:
    string` (NOT NULL) to `Participant`.
  - Note on FK + soft-delete: with `identity_id NOT NULL`, `softDelete` cannot null
    `participants.identity_id`. The soft-delete path either (a) leaves participants
    pointing at the soft-deleted identity (FK is satisfied; `findByUsername` filter
    keeps the identity unreachable) or (b) anonymizes participants by reassigning to
    a sentinel "deleted" identity. Phase 7 picks one; Phase 1's repository surface is
    `softDelete(identity_id)` either way.
  - Integration tests in `tools/server/tests/repositories/identities.test.ts`:
    - Create returns correct record (AC-1 shape).
    - Duplicate LOWER(username) throws UNIQUE constraint (AC-1 uniqueness).
    - `findByUsername` is case-insensitive.
    - `softDelete` sets `deleted_at`; subsequent `findByUsername` returns null.
- **AC coverage**: AC-1 (username uniqueness enforcement), AC-6 (repo never stores
  plaintext — verified structurally because only `secretHash` is accepted).
- **Integration Reality**: SQLite is an owned dependency. Tests must exercise real
  better-sqlite3 against an in-memory DB created by `runMigrations`. No stubs.
- **Exit state**: Schema applies cleanly to a fresh DB; repository layer compiles;
  integration tests green.
- **Status**: CURRENT

---

### Phase 2: Hash service + identity HTTP routes + per-IP rate limiting
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Identity lifecycle — create and reclaim. Hash service is the only place
  argon2id is called; every other layer receives or compares hashes, never raw secrets.
- **Entry state**: Phase 1 complete; `IdentitiesRepository` is wired into the server's
  dependency graph (`tools/server/src/index.ts` / app setup).
- **Deliverable**:
  - Add `argon2` to `tools/server/package.json` dependencies.
  - `tools/server/src/auth/hash-service.ts` — `HashService` interface with `hash(secret)
    → Promise<string>` and `verify(secret, hash) → Promise<boolean>`. Production
    impl uses argon2id with ADR-specified defaults. Testable via a fast stub impl.
  - `tools/server/src/http/routes/create-identity.ts` — `POST /api/identities`:
    validates username (`[A-Za-z0-9_-]+`, 3–32 chars); checks uniqueness;
    generates `identity_id` (UUIDv4) + `secret` (UUIDv4); calls `hash(secret)`;
    inserts via `IdentitiesRepository.create`; returns `{ identity_id, username, secret }`.
    Returns 409 on duplicate username (AC-1).
  - `tools/server/src/http/routes/reclaim-identity.ts` — `POST /api/identities/reclaim`:
    body `{ username, secret }`; looks up by username; `verify(secret, hash)`; on match
    returns `{ identity_id, username }`; on mismatch returns 401 `bad_credentials`; on
    unknown username returns 404 `unknown_identity` (AC-5).
  - `tools/server/src/http/middleware/rate-limit.ts` — per-IP sliding-window rate limiter,
    10 attempts/min. Applied to both identity routes. Uses an in-process Map (no Redis
    dependency — per ADR scope). Returns 429 with `Retry-After` header.
  - Route registration in `tools/server/src/http/app.ts`.
  - Unit tests for `HashService` (AC-6 — hashes are non-empty, not equal to plaintext,
    verify returns false for wrong secret).
  - Integration tests for both routes: happy path, duplicate username 409, wrong secret
    401, unknown username 404, rate-limit 429.
- **AC coverage**: AC-1 (create uniqueness), AC-5 (error code discrimination), AC-6
  (argon2id, hash ≠ plaintext verified in tests).
- **Integration Reality**: `POST /api/identities` must be tested against the real Hono
  app + real SQLite + real argon2 (not a stub HashService). One real-path test per route
  is the minimum; fast tests may use a stub HashService as a supplement, each pointing
  to the real-path test as its backing.
- **Exit state**: `POST /api/identities` and `POST /api/identities/reclaim` respond
  correctly; rate limit enforced; hash service does not store plaintext in DB (verified
  by reading the row after create and checking `secret_hash != secret`).

---

### Phase 3: WS hello frame — `(username, secret)` cutover
- **Tier**: Small
- **Budget**: ~150 tool calls
- **Domain focus**: WS hello contract change — the most load-bearing seam in the system.
  One-shot cutover: the hello frame carries `(username, secret)` from now on. There is
  no legacy-token branch.
- **Entry state**: Phase 2 complete; `IdentitiesRepository` and `HashService` are
  injectable; identity create/reclaim routes are green.
- **Deliverable**:
  - `tools/server/src/wire/browser-server.ts` — `ClientMsg` hello variant becomes
    `{ kind: 'hello'; username: string; secret: string }`. Old token-shaped hello is
    removed. (Note: this file is imported by the browser client build — change must
    remain Node-type-free.)
  - `tools/server/src/ws/handlers/hello.ts` — `handleHello` now: looks up identity by
    username; calls `HashService.verify`; on success looks up `participants` row for
    `(identity_id, room_id)`; if none exists, creates one with `display_name = username`;
    resolves to participant. On hash mismatch: `error(bad_credentials)` + close. On
    unknown username: `error(unknown_identity)` + close.
  - `HelloDeps` gains `identities: IdentitiesRepository` and `hashService: HashService`.
    Drop the legacy token-resolution dependency if present.
  - Existing WS hello tests are updated or replaced — they're the AC-7 coverage that
    no longer exists, so the test deletion is part of the cutover.
  - New integration tests in `tools/server/tests/ws/hello-identity.test.ts`:
    - Valid `(username, secret)` hello creates participant + responds with `welcome` (AC-2).
    - Same identity reconnects to same room → same `participant_id` returned (AC-2).
    - Wrong secret → `bad_credentials` close (AC-5).
    - Unknown username → `unknown_identity` close (AC-5).
  - `tools/server/src/http/routes/join-room.ts` — already takes identity_id from
    Phase 1; in Phase 3 we revisit whether the HTTP route is still needed at all,
    or whether the WS hello path creating participants on first connect is sufficient.
- **AC coverage**: AC-2 (warm reconnect via identity), AC-5 (error codes in WS hello).
- **Integration Reality**: WS hello tests must drive a real `ws.WebSocket` against the
  real Hono+WS server. The existing WS test harness pattern (`tools/server/tests/ws/`)
  must be used or extended — no fake WS or mock socket.
- **Exit state**: Hello frame requires `(username, secret)`; legacy code paths and
  tests are removed; four identity-path scenarios are green.

---

### Phase 4: Client identity-creation flow
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: First-visit UI — the moment a new user creates a persistent identity.
  This is where the "save your secret" gate lives and where the UX promise is made
  explicit.
- **Entry state**: Phase 2 complete (create-identity HTTP route live); Phase 3 complete
  (WS hello identity path live); browser client (`tools/server/client/`) can be built
  and served.
- **Deliverable**:
  - `tools/server/client/src/identity/` — new module:
    - `identity-store.ts` — reads/writes `sharpee:identity` key in `localStorage`.
      Exports `getStoredIdentity(): { username, secret } | null` and
      `storeIdentity(username, secret): void`.
    - `create-identity-flow.tsx` — modal or inline UI triggered when:
      (a) `getStoredIdentity()` returns null AND (b) user has chosen to create a new
      identity (not reclaim, not skip). Steps: enter username → submit to
      `POST /api/identities` → on success, display secret with copy-to-clipboard and
      "Save this — we cannot recover it for you" confirmation gate → on confirm,
      `storeIdentity` → close flow → proceed to WS hello using identity credentials.
    - Handles 409 (duplicate username) with inline "username taken" error.
  - ADR-156 amendment note: creation-flow entry point is wired into the room-join
    page before the WS connection opens. Exact wiring depends on ADR-156's current
    page structure — read the relevant client component before implementing.
  - Component tests (or Playwright smoke tests if the project uses them): happy-path
    creation, duplicate username error display, secret copy-to-clipboard, confirmation
    gate blocks proceeding until acknowledged.
- **AC coverage**: AC-1 (creation UX + duplicate error display), AC-6 (secret displayed
  to user for safekeeping — UX proof that "we cannot recover it"), AC-4 partial (secret
  is shown with copy-to-clipboard immediately after creation).
- **Exit state**: A user visiting a room for the first time sees the identity-creation
  prompt; after choosing a username and acknowledging the secret, the secret is in
  `localStorage` and the WS hello uses `(username, secret)`.

---

### Phase 5: Client reclaim flow + "Show my identity" panel
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Cold-reclaim path and ongoing identity awareness. Two flows share
  the same credential pair; the panel covers AC-4 and the reclaim path covers AC-3.
- **Entry state**: Phase 4 complete; `identity-store.ts` exists; WS hello identity path
  is live.
- **Deliverable**:
  - `tools/server/client/src/identity/reclaim-identity-flow.tsx` — triggered when
    `getStoredIdentity()` returns null and user chooses "I already have an identity."
    Steps: enter username + secret → submit to `POST /api/identities/reclaim` → on
    success, `storeIdentity` → proceed to WS hello; on 401 `bad_credentials`, show
    "Incorrect credentials" error; on 404 `unknown_identity`, show "No identity with
    that username" error (AC-3, AC-5 client-side display).
  - `tools/server/client/src/identity/identity-panel.tsx` — "Show my identity" panel
    (accessible from a persistent UI affordance, e.g. settings/account menu):
    - Displays `username` from `localStorage`.
    - Displays `secret` with copy-to-clipboard (AC-4).
    - "Download as file" button — triggers download of `{ username, secret }` as
      `sharpee-identity.json` (AC-4).
    - No QR code — deferred per ADR.
  - Component tests: reclaim happy path, bad\_credentials display, identity panel
    copy-to-clipboard, download generates correct JSON shape.
- **AC coverage**: AC-3 (cold reclaim restores identity + prior room memberships
  become reachable), AC-4 (show identity panel with copy + download), AC-5
  (error display for bad\_credentials / unknown\_identity in reclaim UI).
- **Exit state**: A user on a fresh device can reclaim their identity; the "Show my
  identity" panel is accessible from any room; AC-3 and AC-4 are demonstrably met.

---

### Phase 6: ADR-156 amendment (documentation)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Architecture documentation — record that ADR-156 (Multiuser Browser
  Client) now owns the identity-creation, reclaim, and "Show my identity" UI surfaces
  defined by ADR-159.
- **Entry state**: Phases 4 and 5 complete; actual client components exist and are wired.
- **Deliverable**:
  - `docs/architecture/adrs/adr-156-multiuser-browser-client.md` — new section:
    "Identity UI Surfaces (ADR-159)." Documents:
    - Where identity-creation flow is triggered (before WS hello on first visit).
    - Where reclaim flow is accessible.
    - Where "Show my identity" panel lives.
    - That `sharpee:identity` `localStorage` key is owned by the client layer.
    - Cross-reference to ADR-159 for the server-side contract.
  - Session summary update noting the amendment.
- **AC coverage**: None directly — this is a documentation deliverable that satisfies
  the "ADR-156 must be amended" constraint from ADR-159's Consequences section.
- **Exit state**: ADR-156 references the three UI surfaces; a future developer reading
  ADR-156 alone has enough context to locate the client code and understand the
  localStorage contract.

---

### Phase 7: Admin delete-identity script
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Identity lifecycle — soft deletion by a server admin. Not a
  runtime/user feature; a maintenance tool.
- **Entry state**: Phase 1 complete (`IdentitiesRepository.softDelete` method exists).
  (This phase can run in parallel with Phases 4–6 if needed.)
- **Deliverable**:
  - `tools/server/scripts/delete-identity.ts` — CLI script:
    - Accepts `--username <name>` flag.
    - Opens the production DB (path from environment or `--db` flag).
    - Calls `IdentitiesRepository.softDelete` (already in the repo since Phase 1):
      sets `deleted_at` on the identity. Decides at this phase whether to additionally
      reassign dependent participants to a sentinel "deleted" identity for display, or
      leave them pointing at the soft-deleted row (FK still satisfied).
    - Prints affected participant count and confirms "identity soft-deleted."
    - Refuses to run without explicit `--confirm` flag.
  - Integration test: soft delete sets `deleted_at`; identity is unreachable via
    `findByUsername`; participants either still resolve via a sentinel or are
    visibly anonymized in the UI (chosen behavior verified).
- **AC coverage**: Supports ADR-159 Resolved Implementation Choice #4 (admin delete
  script). No direct AC number, but this is an explicit ADR deliverable.
- **Exit state**: `node scripts/delete-identity.js --username bob --confirm` runs
  without error against a seeded test DB; identity row is soft-deleted; participant
  display behavior matches the chosen anonymization policy.

---

## Integration Reality Statement (applies to all phases)

The server's DB (better-sqlite3) and WS layer are **owned dependencies** — this
repository ships them. Per CLAUDE.md's Integration Reality rule:

- Every phase that touches DB logic must include at least one test that exercises
  real better-sqlite3 against a real (in-memory) DB populated by `runMigrations`.
  No mocked DB permitted as the acceptance gate.
- Every phase that touches WS hello must include at least one test that drives a
  real `ws.WebSocket` against the real Hono+WS server. No mock socket as the
  acceptance gate.
- The argon2 hash service must have at least one test using the real `argon2` npm
  package (not a stub) to verify that hashes are not equal to plaintext and that
  `verify` returns false for wrong secrets.

---

## AC Coverage Matrix

| AC    | Phase(s)        | How verified                                              |
|-------|-----------------|-----------------------------------------------------------|
| AC-1  | 1, 2, 4         | DB unique constraint (Ph1), route 409 (Ph2), UI (Ph4)    |
| AC-2  | 3               | WS hello identity path integration test                  |
| AC-3  | 5               | Reclaim flow component test + manual verification         |
| AC-4  | 4, 5            | Secret shown at creation (Ph4); panel copy+download (Ph5) |
| AC-5  | 2, 3, 5         | Route error codes (Ph2), WS close codes (Ph3), UI (Ph5)  |
| AC-6  | 1, 2            | Repo never accepts plaintext (Ph1 structural); hash unit test (Ph2) |
