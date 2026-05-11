# ADR-175: Zifmia — Multi-User Product Surface and Rebuild

## Status: ACCEPTED

## Date: 2026-05-10 (drafted, reviewed, accepted same day)

## Builds on

- **ADR-161** — Persistent Identity Model (`{id, handle, passcode}`).
- **ADR-163** — Channel-Service Platform. The wire shape, the
  `@sharpee/channel-service` package, the platform standard channels,
  the capability handshake, and re-emission identity.
- **ADR-164** — Stateless Multi-User Server. Engine in-process Node,
  per-room state lives entirely in the save blob, three server-sourced
  channels (`chat` / `presence` / `command_echo`), transcript stored
  as a world-model capability, mid-session join via transcript replay.
- **ADR-165** — Renderer Architecture. The consumer-side
  `Renderer` / `ChannelRenderer` contract; the multi-user web client
  uses the same architecture as single-bundle surfaces — only the
  transport differs.
- **ADR-174** — Decoration and Prose Pipeline. The engine-internal
  prose pipeline produces clean `ITextBlock[]` inputs into
  channel-service, which is the source of `main` (and other text
  channels) for Zifmia.

## Replaces (forward-looking)

- The legacy `tools/server/` implementation, preserved on the
  `legacy/tools-server` branch and removed from `main` per ADR-164.
  This ADR specifies the rebuild that takes its place.

## Carries forward unchanged

- ADR-161 identity contract.
- Save-blob v3 format from ADR-164 Decision 7.
- HTTP route surface from the legacy server (identity, room create,
  room list — minus the long-running `/connect` WS endpoint, which
  becomes a stateless WS endpoint per ADR-164).
- CAPTCHA wiring from `docs/zifmia/deployment.md` (Turnstile by
  default; hCaptcha and Friendly via the same shape).

## Context

ADR-163, ADR-164, and ADR-165 settle the technical architecture for
stateless multi-user Sharpee end to end: the wire, the server, and
the consumer. None of them name or scope a **product**. They do not
specify a deploy primitive, a v1 feature surface, an
implementation directory, or which open questions get product
answers (saves UX, transcript truncation, lease mechanism).

Two changes in this session enable the product-level decision:

1. ADR-174 merged on `main`, completing the prose pipeline
   migration. Channel-service now has clean inputs for `main` and
   the other text-channels — no text-service compatibility path
   remains.
2. The `zifmia` brand was freed: `packages/zifmia/` was renamed to
   `packages/interpreter/`, the npm name became
   `@sharpee/interpreter`, and the Tauri productName / Rust crate
   name moved with it (commit `3b8bba6a`). The brand "Zifmia" is now
   reserved for the multi-user product.

This ADR claims the brand, locks the v1 product surface, specifies
where the implementation lives, and resolves the three open
questions ADR-164 deferred to "the implementation plan."

## Decision

**Zifmia is the multi-user web product. It ships as a single Docker
image, deploys via `docker compose up`, runs the Sharpee engine
in-process per ADR-164, and exposes a v1 surface scoped to
"watching IF together" — admin-installed stories, room-scoped
participants sharing a single PC, no MPIF, no user-uploaded
bundles.** Implementation lives at `tools/zifmia/`. Saves are
named, the transcript window caps at 1000 turns, and the per-room
turn lease is an in-process queue (SQLite) or Postgres advisory
lock (Postgres).

Eight constituent decisions follow.

### 1. Brand: "Zifmia" is the multi-user product

The multi-user web product is **Zifmia**. The brand surfaces in:

- The npm package name: `@sharpee/zifmia` (currently free; can be
  re-claimed on publish).
- The Docker image name: `sharpee/zifmia` (registry TBD —
  Docker Hub the default).
- Player UX: "Zifmia rooms," "powered by Zifmia," etc.
- Operator-facing docs: `docs/zifmia/` (the directory exists; its
  current content is the legacy multi-user install / deploy guides
  and gets rewritten under this ADR).

**Brand recapture note.** The previous Zifmia (Tauri single-player
runner) was renamed to `@sharpee/interpreter` in this same session.
Pre-2026-05-10 references to "Zifmia" in historical ADRs and
session logs describe the legacy Tauri product; they remain
accurate as historical record. From this ADR forward, "Zifmia"
without qualifier means the multi-user web product.

### 2. Implementation location: `tools/zifmia/`

The rebuild lives at `tools/zifmia/`, not `packages/zifmia/`. The
distinction:

- `packages/` holds **published libraries** consumed by other
  packages and applications. The interpreter (legacy Tauri) is a
  package because it is consumed by `@sharpee/sharpee` and exposes
  React components.
- `tools/` holds **deployable applications**. Zifmia is a Docker
  image, not a published JS module. It depends on
  `@sharpee/sharpee` and `@sharpee/channel-service` the way any
  external application would.

This also avoids namespace collision with `packages/interpreter/`.

The legacy `tools/server/` directory (preserved on
`legacy/tools-server`) is the reference for HTTP routes, identity
helpers, CAPTCHA verification, Playwright e2e patterns, and admin
flows. Salvageable subsystems port forward; the per-turn execution
loop, sandbox, and engine-state code are replaced by ADR-164's
stateless model.

### 3. Single Docker image is the deploy primitive

A single Docker image ships:

- The Node HTTP/WS server (the tools/zifmia entry point).
- The in-process Sharpee engine + admin-installed `.sharpee` story
  bundles (mounted from a volume).
- An embedded SQLite database (default) or a Postgres adapter
  (env-selected) — see Decision 7.
- The static web client, built and served from the same container
  on the same port.

Operators run `docker compose up` after dropping their env file in
place. No external services required for v1. TLS is the operator's
responsibility via reverse proxy (Caddy / nginx — already covered
by the existing `docs/zifmia/deployment.md`).

Rationale: ADR-164 §1 puts the engine in-process. Splitting the
HTTP server, the engine, the DB, and the web client into separate
containers would re-introduce coordination overhead this
architecture explicitly removed. Horizontal scaling (ADR-164
invariant: any worker can serve any room's next turn) is achieved
by running multiple Zifmia containers behind a load balancer with
Postgres as the shared store — not by splitting one logical
service into multiple containers.

**State inventory.** "Stateless" in ADR-164 / Zifmia means the
engine holds no in-memory world between turns — it does **not**
mean the server is stateless. The server is the authoritative
state holder. The storage adapter (SQLite by default, Postgres
optional) carries:

| Persistent state (in the DB; survives container restart) | Source |
|---|---|
| Identities (`id`, `handle`, passcode hash) | ADR-161 |
| Rooms metadata (`id`, `story_id`, `title`, `created_at`, `public`, `created_by`, …) | Zifmia |
| Save blobs (each is a `world.toJSON()` containing world state **and** transcript) | ADR-164 §4 |
| Named-save pointers (`label`, `room_id`, `at_turn`, `created_at`) | Decision 5 |
| Chat history (per-room append log) | ADR-164 §3 |
| Audit log (admin actions: install/upgrade/remove story, room kill, identity reset) | Decision 4 |
| Story library metadata (`story_id`, `version`, `title`, `ifid`, `installed_at`, `installed_by`) | Decision 4 |
| Story bundles (the `.sharpee` files themselves — stored as DB blobs, not on the container filesystem) | Decision 4 |

| Ephemeral state (in-memory only; discarded on restart) | Notes |
|---|---|
| Current presence roster (who's connected to which room) | Reconstructed on reconnect via WS hello |
| Current lock holder per room (who's typing) | Cleared on restart; clients re-acquire on next focus |
| Active WS subscriptions | TCP-level; reconnect on drop |
| In-flight `WorldModel` during a turn | ADR-164 invariant — discarded after `produceTurnPacket` returns |
| HTTP request-scoped per-turn state (lease holder, etc.) | Released at request end |

The client holds **no authoritative state**. Browser-side state
is render-only: a snapshot of received channel values, renderer-
local UI flags (which save slot is highlighted, scroll position),
and form input buffers. A browser refresh is recovered entirely
by `GET /rooms/:id/state` (HTTP) + a fresh WS subscription
(Decision 9). No client-side cache survives a logout.

### 4. v1 product surface

Zifmia v1 is **"watching IF together"** — all participants in a
room share a single player character (PC) and observe the same
prose stream. This is distinct from MPIF (multi-player IF) where
each participant controls a separate PC; MPIF is a different
product class with its own engine and wire requirements and is
not in Sharpee's roadmap. Surfaces:

- **Public lobby**: list of joinable rooms, scoped to this
  instance (not federated).
- **Room creation**: any identified user creates a room with a
  story selection; admin-only gate optional via env.
- **Room participation**: join, observe, command (lock-on-typing
  per Decision 9), chat, leave.
- **Identity**: per ADR-161 — `{id, handle, passcode}` triple.
- **Save management**: per-room named-save list (Decision 5).
- **Story library**: admin-installed `.sharpee` bundles only.
- **Admin pages**: install / upgrade / remove story bundles, view
  active rooms, kill a room, view audit log.

**Out of scope for v1:**

- DMs / per-participant whispers (ADR-164 Q-A: room-scoped only).
- User-uploaded story bundles (ADR-164 §1: trust boundary rests on
  admin-installed stories).
- Federation across instances.
- MPIF (multi-player IF) — separate product, separate stack.
- OAuth (passcode-only auth in v1; OAuth a v1+ decision).

### 5. Saves UX: named saves over per-turn blobs

Resolves ADR-164 open question "Saves UX."

Under ADR-164's stateless model, every turn produces a save. The
player-facing "Save" button **names** a blob that already exists.
Restore picks one of N named blobs to roll back to.

**Storage shape (in the DB — per Decision 3 state inventory):**

- Per-turn blob stream lives in a `save_blobs` table (or
  equivalent), one row per turn keyed on `(room_id, turn)`. Each
  row carries the `world.toJSON()` payload (world state +
  transcript per ADR-164 §4) for that turn. This is the only
  per-room engine-state surface that survives a container
  restart.
- Named saves live in a `named_saves` table: `(save_id, room_id,
  at_turn, label, created_at, created_by)`. Each row is a pointer
  into the `save_blobs` stream — never a copy of the blob.
- A periodic compaction job may garbage-collect `save_blobs` rows
  that have no `named_saves` reference and are older than the
  transcript window (Decision 6: 1000 turns). Tuning concern, not
  architectural.

Rationale: every IF player expects named saves. "Rewind N turns"
is mechanically easier under stateless but breaks the player's
mental model. The pointer-layer implementation costs almost
nothing on top of what ADR-164 already stores; the underlying
per-turn blobs power both modes if a future "rewind" UX is
added.

### 6. Transcript truncation: 1000-turn rolling window

Resolves ADR-164 open question "Long-session transcript
truncation."

The in-blob transcript caps at **1000 turns**; older entries roll
off the front as new turns are appended. Mid-session join replays
only the in-blob window.

Rationale: ADR-164 §Negative consequences puts ~1 KB/turn after
gzip. A 1000-turn cap caps the per-room blob at ~1 MB plus world
state — within the acceptable size band the ADR identified.
Marathon sessions beyond 1000 turns prioritize current state over
full backscroll; a player joining mid-marathon sees the last ~1000
turns of context, which is more than any human reader will absorb
in one sitting.

Truncation semantics: a turn-counter side-channel (already in the
world's scoring capability) tracks the absolute turn number. The
in-blob transcript carries `[turn N-999 .. turn N]`. If a future
ADR adds a separate cold-storage transcript table for
audit / archive purposes, it lives outside the save blob.

### 7. Lease mechanism: in-process queue (SQLite) or Postgres advisory lock (Postgres)

Resolves ADR-164 open question "Lease implementation."

ADR-164 §Single writer per room per turn requires an exclusive
lease on the room while a turn executes. The mechanism switches
by storage adapter:

- **SQLite adapter** (default, single-container): in-process
  async queue keyed by room id. SQLite cannot horizontal-scale, so
  cross-process lease is moot.
- **Postgres adapter** (multi-container): Postgres advisory lock
  (`pg_try_advisory_lock(room_id)`). Cross-container, cheap, no
  separate lock table. Released on transaction end.

The lease abstraction is a small interface
(`acquireRoomLease(roomId): Promise<Release>`); the adapter
implements it. Switching adapters is an env change + admin
migration step.

### 8. Save format: v3 (no change)

ADR-164 Decision 7 already locked save-blob v3. Zifmia v1 reads
and writes v3 saves. v2 saves load with empty transcript per
ADR-164 AC-4 — applies to admin upgrades from a legacy server
backup, if any. No v3 → v4 bump is contemplated for Zifmia v1.

### 9. Transport split: HTTP request/response is the default; WebSocket is reserved for chat and command-line lock

ADR-164 §"Wire framing" left the choice open: "JSON-encoded
CmgtPacket and TurnPacket over WebSocket. (Wire shape is
transport-agnostic per ADR-163; HTTP request-response can carry
single-room turns if a future client prefers it.)" This ADR
picks: **HTTP for request/response operations; WebSocket strictly
for the real-time channels that need server push or peer
coordination — chat and lock-on-typing.**

**HTTP (request-initiator awaits a response from the server):**

| Operation | Method + path | Request | Response |
|---|---|---|---|
| Identity sign-in | `POST /identity/login` | `{handle, passcode}` | `{id, handle, sessionToken}` |
| Room create | `POST /rooms` | `{storyId, title, public?}` | `{roomId, ...}` |
| Room list | `GET /rooms` | — | `Room[]` |
| Mid-session state load | `GET /rooms/:id/state` | — | `{cmgt, transcript[], currentValues}` |
| **Turn submission** | `POST /rooms/:id/command` | `{text}` | `TurnPacket` (the submitter receives the turn result here) |
| Save name | `POST /rooms/:id/saves` | `{label, atTurn}` | `{saveId, ...}` |
| Save restore | `POST /rooms/:id/restore` | `{saveId}` | `TurnPacket` (the post-restore current state) |
| Save list | `GET /rooms/:id/saves` | — | `Save[]` |
| Story install | `POST /admin/stories` | bundle upload | `{storyId, version}` |
| Story upgrade / remove | `PUT/DELETE /admin/stories/:id` | — | `{ok}` |
| Audit log | `GET /admin/audit` | — | `AuditEntry[]` |

The HTTP turn submission is what makes ADR-164's per-turn write
ordering tractable: the submitter holds the request open while
the server runs the load-execute-snapshot-DB-commit sequence and
returns the resulting `TurnPacket`. No correlation IDs, no
out-of-band match-up between a WS submit and a WS reply — the
HTTP response IS the turn result.

**WebSocket (server-pushed live events + bidirectional
coordination):**

A connected participant maintains a single WS subscription per
room. Message kinds carried over WS:

| Kind | Direction | Payload | Purpose |
|---|---|---|---|
| `chat:send` | client → server | `{ text: string }` | participant sends a chat message; identity comes from the WS session token |
| `chat:message` | server → client | `{ from: handle, text: string, ts: number }` | broadcast of a chat message to all room subscribers |
| `lock:acquire` | client → server | `{}` (empty object required on the wire; server ignores extra fields) | participant claims the command line (about to type a turn) |
| `lock:release` | client → server | `{}` (empty object required on the wire; server ignores extra fields) | participant abandons the command line without submitting |
| `lock:state` | server → client | `{ holder?: handle, since?: number }` | current lock holder; broadcast on change OR sent directly to a contender on `lock:acquire` collision (see contention below) |
| `presence:update` | server → client | `{ roster: Array<{ id, handle, joinedAt: number }> }` | full roster broadcast on every change (delta-based replaced with full-roster for v1 simplicity; renderers diff client-side if needed) |
| `turn:broadcast` | server → client | `TurnPacket` (per ADR-163 §3) | the `TurnPacket` produced by another participant's HTTP `POST /command`, fanned out to all *other* subscribers |
| `command_echo` | server → client | `{ actor_handle: handle, text: string, ts: number }` (per ADR-164 §3) | broadcast of every command to all subscribers, so observers see what the typer typed even before the engine resolves it |

**Lock-on-typing semantics** (resolves the prior brainstorm's
sketch):

1. Participant A focuses the input field → client sends
   `lock:acquire` → server checks no other lock is held → server
   broadcasts `lock:state {holder: A.id, since: ts}`.
   - **Contention path:** if a lock IS already held when
     `lock:acquire` arrives from B, the server responds to B
     **directly** (not a broadcast) with `lock:state {holder,
     since}` reflecting the current holder. B's UI updates from
     that directed reply the same way it would from a passive
     broadcast. There is no `lock:denied` frame and no
     queueing — lock acquisition is idempotent under contention,
     first writer wins, late requesters learn the current state.
2. Other participants' clients render their input fields as
   read-only with a "A is typing…" indicator.
3. A submits → HTTP `POST /command` → server runs the turn → A
   gets the `TurnPacket` back as the HTTP response → server
   broadcasts the same packet via WS as `turn:broadcast` to all
   *other* subscribers → server broadcasts `lock:state {holder:
   null}`.
4. If A abandons (closes the input field, navigates away, or
   disconnects), client sends `lock:release` (or the WS
   disconnect triggers an implicit release) → server broadcasts
   `lock:state {holder: null}`.
5. If A's command throws inside the engine (failure path — see
   "Failure semantics" below), the server still broadcasts
   `lock:state {holder: null}` so other participants are not
   trapped behind a stuck "A is typing…" indicator. A's failed
   submission gets an HTTP error response (Decision 9 §Failure
   semantics) but the lock release is independent.

The lock is **advisory**, not enforced server-side: a participant
who races a `POST /command` past the lock-state broadcast just
"jumps the line." The server runs the turn correctly because the
load-execute-snapshot path is idempotent at the lease layer
(ADR-164 single-writer-per-room invariant). The lock is a UI
coordination signal, not a security boundary.

**Failure semantics on the wire.**

Three failure shapes the HTTP and WS contracts pin explicitly so
the client implementer does not have to guess:

| Failure | HTTP shape | Wire side-effects |
|---|---|---|
| Bad credentials on `POST /identity/login` | `401 { error: 'invalid_credentials' }` | None. Same body for "no such handle" and "wrong passcode" — the server does not distinguish (security-conscious default). Rate limiting and brute-force protection are operator-deploy concerns handled at the reverse proxy per `docs/zifmia/deployment.md`. |
| Malformed `.sharpee` upload on `POST /admin/stories` | `422 { error: 'invalid_bundle', detail: 'bad_structure' \| 'bad_signature' \| 'missing_ifid' \| 'unsupported_format' }` | None. Validation order is structure → signature → IFID → format version; first failure short-circuits. The library row is not partial-written; the bundle blob is discarded. |
| Engine throws during `POST /rooms/:id/command` | `500 { error: 'turn_failed', turn_id?: number }` | No save commit (consistent with ADR-164 §6); transcript unchanged; **no** `turn:broadcast` to other subscribers; **lock released** via `lock:state {holder: null}` broadcast (per lock semantics §5 above). Subsequent commands re-execute from the prior baseline. |

These are the three failure shapes the v1 contract pins. Other
failures (lease unavailable, story bundle missing from DB at
turn time, network hiccup mid-request) follow standard HTTP
conventions (`409`, `404`, transport errors); their precise
shape belongs to the implementation plan.

**Why this split.**

- HTTP turn submission keeps the request/response correlation
  trivial. The submitter sees their command's effect synchronously,
  matching every existing IF client's mental model.
- HTTP is loadbalancer-friendly: every operation is
  **session-stateless** (no sticky session, no in-memory request
  context required to serve it). Each request carries its
  identity token; each turn execution loads the room's save blob
  from the storage adapter, runs, snapshots back. Multiple
  Zifmia containers behind a load balancer can serve the same
  room as long as the lease (Decision 7) coordinates writes and
  the storage adapter is shared (Postgres). The DB *is* the
  state; the request handler holds none of its own.
- WS is reserved for things that genuinely need it: chat
  (bidirectional, low-latency), lock state (broadcast push),
  presence (broadcast push), turn broadcast to *non-submitters*
  (server push — the only way they learn of a turn they didn't
  initiate).
- The CMGT manifest and transcript replay live on
  `GET /rooms/:id/state`, not on WS connect. A client can refresh
  the page (full HTTP cycle) and recover its state without any WS
  ceremony; the WS reconnect is then "subscribe to live events
  starting now."

**What this excludes:**

- The submitter does **not** receive their own turn via WS. They
  get it via the HTTP response. The WS `turn:broadcast` excludes
  the submitter (or the client deduplicates by `turn_id`).
- The CMGT manifest is **not** sent on WS connect. It is part of
  the HTTP `GET /rooms/:id/state` response.
- The transcript replay (mid-session join) is **not** a WS
  payload. It is part of the HTTP `GET /rooms/:id/state` response.
- WS is **not** an alternate command path. A client that tries to
  send a `command:submit` over WS gets an error; commands go
  through HTTP only.

This refines ADR-164's "TurnPacket over WebSocket" framing without
contradicting any of its invariants. The wire shapes (CMGT,
TurnPacket, CommandPacket per ADR-163) are unchanged; only their
transport bindings are pinned per operation type.

**URL surface versioning.** The HTTP routes in the table above
ship without a `/v1/` prefix. The v1 URL surface **is** the
contract: changing any path or response body shape after v1
acceptance is a breaking change requiring an ADR. A future v2
introduces routes under `/v2/` and freezes the v1 routes for the
deprecation window the v2 ADR specifies; old clients keep
working on v1 routes until the operator opts to remove them.
This avoids the prefix tax in v1 while leaving the v2 evolution
path explicit. Same applies to WS message kinds: the kinds
listed above are the v1 contract; new kinds are additive (old
clients ignore unknown kinds), shape changes to existing kinds
are breaking.

## Invariants

- **Stateless per-turn lifecycle.** Per ADR-164. A worker that
  retains a `WorldModel` reference past the end of a turn is a
  bug.
- **Channel-I/O wire is the only narrative path.** Engine
  → channel-service → wire → renderer. No alternate text path
  reaches the client. Per ADR-163.
- **Renderer-local UI state never persists and never appears on
  the wire.** Per ADR-165.
- **Brand "Zifmia" describes the multi-user product going
  forward.** Legacy Tauri references in historical commits and
  ADRs remain accurate-as-of-then.
- **Single Docker image is the deploy unit for v1.** Operators
  run one container per logical instance. Horizontal scaling
  swaps SQLite for Postgres and runs N containers behind a load
  balancer; no service-decomposition of the single image.
- **Admin-installed stories only.** No public user-uploaded
  bundles. The trust boundary that lets ADR-164 run the engine
  in-process rests on this.
- **HTTP for request/response; WebSocket only for chat and
  command-line lock.** Per Decision 9. A code path that submits
  turns over WS, or pushes CMGT / transcript over WS connect, is
  a bug. The WS is a fan-out channel + chat + lock — never the
  command path.
- **Server holds all authoritative state in the storage
  adapter.** Per Decision 3 state inventory. The client holds
  **no** authoritative state — browser data is render-only and
  is fully recoverable from `GET /rooms/:id/state`. Ephemeral
  server-side state (presence, lock holder, active connections)
  is discarded on container restart and reconstructed on demand.
  "Stateless" in this ADR and ADR-164 means the engine holds no
  in-memory world between turns; it does not mean the server is
  stateless.

## Acceptance Criteria

1. **AC-1 — Single-container deploy.** A fresh Docker host runs
   `docker compose up` (admin provides one env file) and reaches a
   working `/health` endpoint within 30s on a 2-vCPU VM. Operator
   can install a story bundle via the admin UI without touching
   the container's filesystem directly.

2. **AC-2 — Two-user end-to-end.** Two browsers join the same
   room, see each other in `presence`, see commands echo via
   `command_echo`, exchange chat via `chat`, and observe identical
   narrative via `main`. Re-runs the ADR-164 AC-10 against the
   Zifmia client.

3. **AC-3 — WS reconnect non-event.** Mid-session
   disconnect / reconnect produces a CMGT + transcript replay
   (per ADR-164 AC-9) with no lost packets observable to the
   reconnected client.

4. **AC-4 — Crash recovery.** Force-kill the container mid-turn;
   restart; reconnect from the same browser. The room loads;
   the missed turn either (a) was DB-committed and replays via
   the transcript, or (b) was not committed and the player's
   re-issued command runs from the prior save. No duplicate
   turn, no lost room.

5. **AC-5 — Story install / upgrade / remove.** Admin uploads a
   `.sharpee` bundle through the admin UI; the server validates
   the bundle (signature / IFID / structure), makes it joinable
   in the lobby. Upgrade replaces the bundle: rooms in-flight
   under the old bundle finish under the old version (saves are
   pinned to the bundle that produced them); new rooms use the
   new version. Remove blocks new rooms; existing rooms continue
   until their participants leave.

6. **AC-6 — Save lifecycle.** Player clicks "Save," names the
   slot. Reloads later; correct world state restored. Save
   persists across container restart. Save survives admin
   upgrade if the bundle was not upgraded; if the bundle was
   upgraded, the save remains tied to the prior bundle version
   (per AC-5) until the operator opts in to migrating saves.

7. **AC-7 — Transcript truncation.** A 1500-turn session caps the
   in-blob transcript at 1000 entries. Mid-session join replays
   the most-recent 1000 entries. Save blob remains under the
   per-room budget.

8. **AC-8 — Adapter swap.** A Zifmia instance migrates from
   SQLite to Postgres via a documented admin step (single command
   or admin UI button). Existing rooms transfer; identities
   transfer; saves transfer. Post-migration the same instance
   serves the same rooms.

9. **AC-9 — Transport split.** Network-trace assertion: a single
   HTTP `POST /rooms/:id/command` returns the submitter's
   `TurnPacket` and triggers a WS `turn:broadcast` to *other*
   subscribers only. The submitter's WS connection sees no
   `turn:broadcast` for that turn. WS carries only `chat:*`,
   `lock:*`, `presence:update`, `turn:broadcast`, and
   `command_echo` message kinds. Sending a `command:submit` over
   WS returns a protocol-error frame.

10. **AC-10 — Lock-on-typing.** Participant A focuses input
    → all other participants see their inputs go read-only with
    "A is typing…" within 200ms. A disconnects without
    submitting → all others see input re-enabled within 1s
    (implicit release on WS close). A submits → all others see
    the turn result via WS broadcast and the input re-enabled
    after.

11. **AC-11 — Identity rejection.** `POST /identity/login` with
    a wrong passcode returns `401 { error: 'invalid_credentials'
    }`. `POST` with a handle that does not exist returns the
    same body — the server does not distinguish. Repeated
    failures from the same source IP are throttled at the
    reverse proxy (operator-deploy concern); the application
    returns 401 every time and does not lock the account.

12. **AC-12 — Bundle validation.** `POST /admin/stories` with a
    truncated `.sharpee` returns `422 { error: 'invalid_bundle',
    detail: 'bad_structure' }`. Same endpoint with a valid
    structure but missing IFID returns `detail: 'missing_ifid'`;
    with a v2-format bundle returns `detail:
    'unsupported_format'`. Validation order is
    structure → signature → IFID → format version; the first
    failure short-circuits. After the failure, the story library
    row count and the bundle-blob count are unchanged from
    before the request.

13. **AC-13 — Engine-throw recovery.** Force a story bug whose
    `executeTurn` throws during A's command. Assert: A's HTTP
    response is `500 { error: 'turn_failed', turn_id?: ... }`;
    the room's save row is unchanged; no `turn:broadcast` is
    emitted; a `lock:state { holder: null }` IS broadcast (so
    B's input re-enables); the next command from A or B
    executes correctly from the prior baseline (ADR-164 §6
    crash semantics inherited at the request boundary).

14. **AC-14 — Performance baseline.** Per-turn cost (HTTP
    `POST /command` request received → response sent) for the
    Dungeo story executing `look` completes in **under 100 ms
    p95** on a 2-vCPU container with SQLite, **inheriting and
    extending ADR-164 AC-7's <50 ms in-process engine-loop
    baseline**. The ~50 ms headroom over ADR-164's number
    accounts for HTTP framing, identity validation, and DB
    commit. This is a regression-tracking baseline, not a hard
    ceiling — recorded in the implementation plan and revisited
    if real-world deployments hit it.

## Consequences

**Positive:**

- **Brand consolidation.** "Zifmia" finally maps to one product.
  The Tauri rename in this session was the prerequisite.
- **Single-container deploy keeps the operator surface tiny.**
  One env file, one `docker compose up`. The deploy story scales
  down to a hobbyist with a $5 VPS.
- **Inherits ADR-164's stateless story.** Trivial horizontal
  scaling (when Postgres is selected), automatic crash recovery,
  no per-room subprocess RAM.
- **Inherits ADR-165 renderer architecture.** The Zifmia web
  client is a `Renderer` instance configured for the multi-user
  transport. Same code paths as single-bundle surfaces; only the
  transport differs.
- **Clean rebuild.** No legacy WS protocol baggage. The
  `legacy/tools-server` branch is reference, not a starting
  point.

**Negative:**

- **Brand confusion in legacy docs.** Pre-2026-05-10 references
  to "Zifmia" describe the deferred Tauri product. Doc readers
  must check dates. This ADR documents the recapture as a
  permanent record.
- **Single-container coupling.** Scaling to many simultaneous
  rooms within one container is bounded by container CPU.
  Operators who exceed that need Postgres + multiple containers.
  A 2-vCPU container handles ~50 active rooms comfortably (rough
  estimate; AC-1 sets the baseline for tuning).
- **Story upload deferred to v2.** Admins must upload bundles via
  the admin UI; users cannot publish their own to the public
  instance. Acceptable v1 trade-off per ADR-164 trust boundary,
  but a known limitation for a "story-sharing" public deploy.
- **No federation.** Each Zifmia instance is its own island. A
  user with accounts on three instances has three identities.
  Federation is a v2+ design.

**Reversibility:**

- **Deploy.** Switching Docker → Kubernetes (or vice versa) is
  mechanical: the container is the unit, the env file is the
  config.
- **Adapter.** SQLite ↔ Postgres swap is implementation-level
  (per AC-8); the schema is small.
- **Brand.** Re-renaming "Zifmia" again is a string rewrite plus
  container / npm publish redirect. Avoid in v1; doing it
  immediately would waste this session's free-up work.
- **Single-container.** Splitting into multiple containers (e.g.,
  separate static-asset CDN, separate auth service) is a v2
  decision; v1 keeping it monolithic is the smaller blast-radius
  default.

## Resolved Implementation Choices

- **Implementation directory**: `tools/zifmia/`.
- **Deploy unit**: single Docker image.
- **Default storage adapter**: SQLite. Postgres optional via env.
- **Saves UX**: named saves over per-turn blobs.
- **Transcript window**: 1000 turns, rolling.
- **Lease**: in-process queue (SQLite) or Postgres advisory lock
  (Postgres).
- **Save format**: v3 (per ADR-164 — no change).
- **Auth**: passcode-only in v1 (per ADR-161). OAuth deferred.
- **CAPTCHA**: Turnstile default, hCaptcha / Friendly via same
  shape (carries forward from existing
  `docs/zifmia/deployment.md`).
- **Web client framework**: React (default — matches
  `packages/platform-browser/`, matches the legacy tools/server
  client). Final framework decision belongs to the implementation
  plan.

## Open Questions for Implementation

- **Story upload UX.** Admin UI uploads via the same flow as
  install? Or "upload to staging" → "promote to library" with a
  validation gate in between? Trade-off: simpler admin vs.
  validation safety net. Recommend the staging gate.
- **Worker pool sizing.** Number of concurrent in-process turn
  workers per container. Default to `os.cpus().length - 1` for
  v1; tune via env.
- **Admin UI surface.** Bundled with the player UI (one app,
  role-gated routes) or served on a separate admin port (cleaner
  blast radius, harder for operators to expose by accident)?
  Default to bundled for v1; separate-port is a v2 hardening
  option.
- **Web client framework alternative.** React is the safe
  default. Vanilla web components are a credible alternative —
  smaller bundle, and they let story authors customize the
  rendering layer without React knowledge (Sharpee's principle
  is that platform UI defaults ship a working baseline that
  authors can override per-story; a heavyweight framework
  raises the override bar). Decide in the implementation plan
  after the renderer skeleton spike.
- **Save migration on bundle upgrade (AC-5 / AC-6 trade-off).**
  AC-5 says rooms pin to the bundle they were created under.
  Saves follow. Open: does the admin get a "migrate this room's
  saves to the new bundle version" button (with a "may break"
  warning), or is that strictly a v2 feature? Recommend v2.
- **Audit log scope.** What does the admin audit log capture?
  Story install / upgrade / remove are obvious. Player
  identity-change events (passcode resets), room creation, and
  room kills are likely. Player commands are out (privacy + log
  size). Detail belongs to the implementation plan.

## Constrains Future Sessions

- **"Zifmia" is the multi-user product brand.** Don't reuse it
  for any other product. The Tauri runner that previously held
  the name is now `@sharpee/interpreter`.
- **v1 ships single-container.** Multi-container introduces
  Postgres + lease changes that are explicitly v1+ decisions.
  A future ADR can change this; this ADR locks v1.
- **No user-uploaded stories in v1.** The admin-installed trust
  boundary is the security model. A future ADR that opens public
  uploads must reintroduce the worker-boundary discussion ADR-164
  §1 deferred.
- **Saves UX is named.** Changing it (rewind, time-travel) is an
  ADR-level decision. The named-saves implementation is a thin
  pointer layer over per-turn blobs; the underlying storage
  supports both modes.
- **Implementation lives at `tools/zifmia/`.** Moving it to
  `packages/zifmia/` would re-introduce the namespace collision
  this session resolved.
- **Single Docker image is the deploy unit.** Splitting services
  (separate static-asset CDN, auth service, admin service)
  requires an ADR.
- **HTTP is the command path.** Adding a WebSocket-based
  command-submit path (e.g., for "even lower latency" or "to
  avoid HTTP overhead") requires an ADR. The HTTP request /
  response correlation is load-bearing for the submitter UX and
  the load-balancer story; collapsing it into WS reintroduces the
  correlation-by-id complexity that motivated this split.
- **WebSocket payloads are limited.** Adding a new WS message
  kind (beyond chat, lock, presence, turn broadcast,
  command_echo) requires an ADR. The "WS for everything live"
  drift this split prevents is exactly the failure mode that
  produced ADR-156's four-phase state machine.

## References

- ADR-161: Persistent Identity Model.
- ADR-163: Channel-Service Platform.
- ADR-164: Stateless Multi-User Server.
- ADR-165: Renderer Architecture.
- ADR-174: Decoration and Prose Pipeline (just shipped — provides
  Zifmia's clean prose-flow inputs).
- `docs/zifmia/install-guide.md` — legacy multi-user install
  guide; rewrite under this ADR's terms (Docker image, Zifmia
  branding, ADR-164 architecture).
- `docs/zifmia/deployment.md` — legacy public deploy guide;
  carries forward with brand updates and Zifmia-specific paths.
- `docs/zifmia/config-reference.md`, `backup-restore.md`,
  `upgrade-guide.md` — same: rewrite under this ADR.
- `legacy/tools-server` branch — pre-stateless implementation.
  Reference for HTTP routes, identity helpers, CAPTCHA wiring,
  Playwright e2e patterns. Not a starting point for the rebuild.
- `docs/brainstorm/stateless-multiuser/overview.md` — the
  2026-04-28 brainstorm that produced ADR-163 / ADR-164.
- `spikes/channel-io/` — the renderer spike validating ADR-165.

## Session

2026-05-10 main — ADR-174 merged earlier this session; the
`packages/zifmia` → `packages/interpreter` rename (commit
`3b8bba6a`) freed the Zifmia brand for this product. David asked
Claude to draft this ADR before deciding whether a full
brainstorm is needed. The draft assumes ADR-163 / ADR-164 / ADR-165
as binding substrate and adds the product-level decisions on top.

Status remains PROPOSAL pending David's review. Likely review
points: (a) v1 surface scope — too aggressive or too minimal? (b)
single-container default vs. compose-of-services — is Postgres
behind a separate container an explicit v1 expectation or a v2
add? (c) saves UX (Decision 5) and transcript window (Decision
6) — both resolved here, but resolution is product-opinion not
architecture-derivable. (d) framework choice for the web client —
React default vs. vanilla web components.

**2026-05-10 (post-initial-draft):** David reviewed the draft and
flagged that the transport split was implicit. ADR-164 left it
open ("HTTP can carry single-room turns if a future client
prefers it"); the v1 product picks. Decision 9 added: HTTP for
request/response operations (turn submission included), WebSocket
strictly for chat (bidirectional), command-line lock (the
lock-on-typing coordination), presence push, and turn broadcast
to *non-submitters*. Submitters receive their own turn result via
the HTTP `POST /command` response — never via WS. Two new
acceptance criteria (AC-9 transport split, AC-10 lock-on-typing)
and two new constraints (HTTP-is-command-path, WS-payloads-
limited) follow. Lock-on-typing semantics fully sketched (request
on input focus, broadcast lock state, implicit release on
disconnect, advisory not enforced).

**2026-05-10 (state-on-server clarification):** David flagged
that the "stateless" framing inherited from ADR-164 risked
suggesting the server is stateless overall. Decision 3 expanded
with an explicit state inventory (persistent: identities, rooms,
save blobs, named-save pointers, chat, audit log, story library
metadata, story bundles themselves — all in the DB; ephemeral:
presence roster, lock holder, in-flight WorldModel, etc.).
Decision 5 (saves) explicitly committed the per-turn blob stream
and named-save pointers to two DB tables (`save_blobs` and
`named_saves`). Story bundle row in the state inventory tightened
to "DB blobs only, not container filesystem" — eliminates the
file-system / DB ambiguity the first draft left open. New
invariant added: server holds all authoritative state, client
holds none.

**2026-05-10 (scenario folding):** ADR review ran in single-ADR
mode; the per-ADR checklist passed 11/14 with three NEEDS WORK /
PARTIAL items. David asked the gaps to be expressed as scenarios
(matching the existing AC-shape) rather than checklist items.
Five scenarios surfaced; all five folded into the ADR:

1. WS payloads — the WS message-kinds table in Decision 9
   gained a Payload column with shapes for every message kind.
2. Lock contention — the lock-on-typing flow in Decision 9
   gained a step 1a covering `lock:acquire` arriving when a lock
   is already held (server responds directly to the contender
   with current `lock:state`; no denial frame, no queueing).
3. Identity rejection — pinned as `AC-11` and as a row in the
   new "Failure semantics on the wire" subsection of Decision 9.
4. Bundle validation — pinned as `AC-12` and as a row in
   Failure semantics.
5. Engine-throw recovery — pinned as `AC-13` and as a row in
   Failure semantics, including the lock-release-on-throw step
   (lock semantics step 5 added).

Failure semantics now form their own subsection in Decision 9
covering the three failure shapes the v1 contract pins
explicitly so client implementers do not guess. Other failures
(lease unavailable, bundle missing at turn time) follow standard
HTTP conventions and defer to the implementation plan.

**2026-05-10 (polish + acceptance):** Re-review passed 14/14
with four non-blocking polish notes. All four folded:

1. **API versioning.** Decision 9 gained a "URL surface
   versioning" paragraph: v1 ships without `/v1/` prefix, the
   listed routes ARE the v1 contract, v2 introduces `/v2/` and
   freezes v1. Same rule for WS message kinds.
2. **Performance budget.** New `AC-14` pins per-turn HTTP cost
   at <100 ms p95 on a 2-vCPU SQLite container for Dungeo
   `look`, explicitly inheriting and extending ADR-164 AC-7's
   <50 ms in-process baseline. ~50 ms headroom for HTTP framing
   / identity validation / DB commit.
3. **Memory-note citations.** Two opaque internal references
   (`multiuser_vs_multiplayer`, `web_client_author_customizable`)
   replaced with inline reasoning so cold readers can follow
   without access to private memory.
4. **Empty-payload representation.** WS table tightened:
   `lock:acquire` and `lock:release` payloads now read "`{}`
   (empty object required on the wire; server ignores extra
   fields)" — pins the wire shape and the server's
   forward-compatibility tolerance.

Status flipped from PROPOSAL to ACCEPTED. The implementation
plan can now begin against the 14 ACs.
