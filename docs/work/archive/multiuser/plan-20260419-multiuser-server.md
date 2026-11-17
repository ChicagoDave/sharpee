# Implementation Plan: Multiuser Sharpee Server

**Created**: 2026-04-19
**ADR**: `docs/architecture/adrs/adr-153-multiuser-sharpee-server.md`
**Brainstorm**: `docs/brainstorm/multiuser/overview.md`
**Code location**: `tools/server/` (next to `tools/vscode-ext/`)
**Overall scope**: Build a multiuser server that lets browser clients share a Sharpee game engine session with lock-on-typing, real-time live preview, room-scoped saves, cascading role succession, mute moderation, idle recycle, and Docker deployment — all wired to a Deno subprocess sandbox running the engine with `--allow-none`.

---

## Phase Overview

| # | Name | Tier | ADR Decisions | AC |
|---|------|------|--------------|-----|
| 0 | Package Scaffolding | Small | 14, 15 | — |
| 1 | SQLite Schema and Repository Layer | Medium | 10, 11, 15 | — |
| 2 | HTTP Layer — Room Creation, Join, CAPTCHA | Medium | 3, 4, 15 | — |
| 3 | WebSocket Presence — Connect, Reconnect, Broadcast Skeleton | Medium | 4, 7, 15 | AC1 (partial) |
| 4 | Deno Sandbox Integration — Engine Subprocess and Turn Execution | Large | 1, 2, 15 | AC1, AC7 |
| 5 | Lock-on-Typing — Arbitration, Live Preview, AFK Release | Large | 7 | AC1 |
| 6 | Save and Restore — Blob Routing, Event Log, Wire Format | Medium | 2, 10, 11 | AC2 |
| 7 | Role Hierarchy and Cascading Succession | Large | 5, 6, 11 | AC3 |
| 8 | Chat, DMs, and Recording Transparency | Medium | 8, 11 | — |
| 9 | Moderation — Mute, Visibility, and Persistence | Small | 9, 11 | AC5 |
| 10 | Room Lifecycle — Pin, Delete, Idle Recycle | Medium | 3, 12 | AC4, AC6 |
| 11 | Error Envelope and Crash Recovery | Small | 1, 2 | AC7 |
| 12 | Docker Packaging and docker-compose | Small | 14 | AC8 |
| 13 | Operator Documentation | Small | — | AC9 |

---

## Phase 0: Package Scaffolding

**Goal**: Lay the skeleton of `tools/server/` with all config files, directory structure, migration runner bootstrap, and Deno entry point stub. Nothing is functional; nothing can be run. The scaffold passes `tsc --noEmit` with zero errors.

### Files Created

```
tools/server/
├── package.json                          # Node package: name "sharpee-server", deps: hono, ws, better-sqlite3, @hono/node-server
├── tsconfig.json                         # TS config: target ES2022, module ESNext, strict, paths for @sharpee/*
├── .env.example                          # Documented env var template (PORT, DB_PATH, STORIES_DIR, CAPTCHA_*)
├── deno.json                             # Deno config for the sandbox entry point (importMap, permissions guidance comments)
├── Dockerfile                            # Multi-stage: builder (Node+tsc), runtime (Node+Deno binary, slim)
├── docker-compose.yml                    # Reference compose: volumes /data/db, /data/stories, /etc/sharpee-platform.yaml
├── sharpee-platform.yaml.example         # Operator config template: port, rooms.idle_recycle_days, captcha.*
├── migrations/
│   └── 0001_initial_schema.sql           # Full 5-table schema (stub — will be finalized in Phase 1)
├── src/
│   ├── index.ts                          # Entry point: imports Hono app, wires ws, starts listening — stub
│   ├── config.ts                         # Loads sharpee-platform.yaml + env vars, exports typed Config object
│   ├── db/
│   │   ├── connection.ts                 # Opens better-sqlite3 connection, sets WAL mode, runs migration runner
│   │   └── migrate.ts                    # Forward-only migration runner: reads migrations/*.sql, tracks schema_migrations
│   ├── repositories/
│   │   ├── types.ts                      # Shared types: Room, Participant, SessionEvent, Save, Tier, EventKind
│   │   ├── rooms.ts                      # RoomsRepository stub (interface only, no impl)
│   │   ├── participants.ts               # ParticipantsRepository stub
│   │   ├── session-events.ts             # SessionEventsRepository stub
│   │   ├── saves.ts                      # SavesRepository stub
│   │   └── config-repo.ts               # ConfigRepository stub
│   ├── sandbox/
│   │   └── deno-entry.ts                 # Deno subprocess entry point stub — imports @sharpee/engine, message loop comment
│   ├── wire/
│   │   ├── server-sandbox.ts             # TypeScript types: Init, Ready, Command, Output, SaveReq, SaveResp, Restore, Restored, Heartbeat, Error, Cancel, Shutdown, Exited
│   │   └── browser-server.ts             # TypeScript types: ClientMsg, ServerMsg, Tier, RoomSnapshot, ParticipantSummary, TextBlock
│   ├── http/
│   │   └── app.ts                        # Hono app factory stub — no routes yet
│   └── ws/
│       └── server.ts                     # ws Server factory stub — no handlers yet
└── tests/
    └── helpers/
        └── test-db.ts                    # Creates in-memory better-sqlite3 db + runs migrations — for unit tests
```

### Sharpee Packages Imported

None yet. `@sharpee/core` is referenced in `wire/server-sandbox.ts` import comments but not yet wired.

### ADR Decisions Covered

- **Decision 14**: Dockerfile multi-stage structure, docker-compose.yml volumes and port conventions established
- **Decision 15**: `package.json` dependencies (hono, ws, better-sqlite3, @hono/node-server) established; deno.json stub for sandbox

### Acceptance Criteria Contributed To

None — this phase produces no runnable system.

### Definition of Done

- `cd tools/server && npm install && npx tsc --noEmit` exits 0
- `docker build -t sharpee-server .` completes without error (produces a valid image even though the server does nothing yet)
- Migration runner reads `migrations/0001_initial_schema.sql` (even if it is currently empty) without crashing
- All stub files exist at the paths listed above
- `deno.json` is present and syntactically valid

### Tests Required

- No behavioral tests yet
- `tests/helpers/test-db.ts` must successfully open an in-memory SQLite database and return a connection without throwing — verified by a single smoke test (`tests/db/smoke.test.ts`)

---

## Phase 1: SQLite Schema and Repository Layer

**Goal**: Implement the full 5-table schema and all repository methods behind the ADR-defined interfaces. This is the persistence foundation every subsequent phase depends on. No HTTP, no WebSocket, no sandbox — pure DB.

### Files Created / Modified

```
migrations/
└── 0001_initial_schema.sql    # Full schema (finalize from stub)

src/repositories/
├── types.ts                   # Finalize all domain types: Room, Participant, SessionEvent, Save, Tier, EventKind, EventPayload union
├── rooms.ts                   # RoomsRepository full implementation
├── participants.ts             # ParticipantsRepository full implementation
├── session-events.ts           # SessionEventsRepository full implementation
├── saves.ts                    # SavesRepository full implementation
└── config-repo.ts             # ConfigRepository full implementation

tests/repositories/
├── rooms.test.ts
├── participants.test.ts
├── session-events.test.ts
├── saves.test.ts
└── config-repo.test.ts
```

### Schema Detail (0001_initial_schema.sql)

```sql
CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    room_id      TEXT PRIMARY KEY,
    join_code    TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    story_slug   TEXT NOT NULL,
    pinned       INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMP NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    primary_host_id TEXT  -- FK to participants; nullable on create, set after first participant
);

CREATE TABLE participants (
    participant_id  TEXT PRIMARY KEY,
    room_id         TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    token           TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    tier            TEXT NOT NULL DEFAULT 'participant',
    muted           INTEGER NOT NULL DEFAULT 0,
    connected       INTEGER NOT NULL DEFAULT 0,
    joined_at       TIMESTAMP NOT NULL,
    is_successor    INTEGER NOT NULL DEFAULT 0  -- exactly one per room should be 1
);

CREATE TABLE session_events (
    event_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id        TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    participant_id TEXT,   -- nullable for system/lifecycle events
    ts             TIMESTAMP NOT NULL,
    kind           TEXT NOT NULL,
    payload        TEXT NOT NULL  -- JSON
);
CREATE INDEX idx_session_events_room_ts ON session_events(room_id, ts);

CREATE TABLE saves (
    save_id    TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
    actor_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    blob       BLOB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### Repository Method Coverage (per ADR-153 interfaces)

**RoomsRepository**
- `create(input)` — inserts room row; generates UUID room_id and join code
- `findById(room_id)` — returns Room or null
- `findByJoinCode(code)` — returns Room or null
- `updateLastActivity(room_id, ts)` — updates `last_activity_at`
- `setPinned(room_id, pinned)` — sets pinned flag
- `delete(room_id)` — single `BEGIN IMMEDIATE` transaction: deletes room, cascades all child rows (participants, session_events, saves), releases join code pool (join code becomes available by virtue of the row being gone)
- `listRecycleCandidates(now, idle_days)` — returns rooms where `last_activity_at < now - idle_days` and `pinned = 0`

**ParticipantsRepository**
- `createOrReconnect(input)` — upsert on token: if token exists, updates `connected=1` and `display_name`; if new, inserts with `joined_at=now`
- `findById(participant_id)` — returns Participant or null
- `findByToken(token)` — returns Participant or null
- `setTier(participant_id, tier, actor_id)` — updates `tier` field
- `setMuted(participant_id, muted, actor_id)` — updates `muted` flag
- `setConnected(participant_id, connected)` — updates `connected` flag
- `listForRoom(room_id)` — returns all participants for a room ordered by `joined_at`
- `earliestConnectedParticipant(room_id)` — returns earliest-joined still-connected Participant (for succession chain)

**SessionEventsRepository**
- `append(input)` — inserts one row; returns `event_id`
- `listForRoom(room_id, opts)` — returns events filtered by `since_event_id`, `limit`, `kinds`

**SavesRepository**
- `create(input)` — inserts save row; generates UUID save_id
- `findById(save_id)` — returns Save (including blob) or null
- `listForRoom(room_id)` — returns Save summaries (no blob) for a room

**ConfigRepository**
- `get(key)` — returns string value or null
- `set(key, value)` — upserts config row

### Atomicity Verified

The room delete cascade uses `BEGIN IMMEDIATE ... COMMIT` and is tested as an atomic operation: a simulated mid-transaction failure must leave all rows intact (test uses a SAVEPOINT trick to verify rollback).

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 10**: Room-scoped saves; `saves` table; opaque blobs; auto-named shape established in the `SavesRepository.create` signature
- **Decision 11**: `session_events` schema exactly as specified in the ADR; all `kind` values enumerated in `EventKind` type; `EventPayload` union typed
- **Decision 15**: `better-sqlite3` driver; raw parameterized SQL; repository pattern; no ORM; `schema_migrations` table tracked by migration runner

### Acceptance Criteria Contributed To

None directly — this phase has no HTTP or WebSocket surface. It is required by every subsequent AC.

### Definition of Done

- All repository methods are implemented and the unit tests pass
- The room-delete cascade test demonstrates atomicity: inserts room + participants + events + saves, calls `rooms.delete()`, asserts zero rows remain across all child tables in a single `expect` block
- No SQL string concatenation exists anywhere — every query uses `?` or named params

### Tests Required

Each repository gets a test file using the in-memory DB helper from Phase 0. Required test cases:

**rooms.test.ts**
- `create` inserts a room and returns it
- `findById` returns null for unknown id
- `findByJoinCode` resolves the code
- `listRecycleCandidates` returns unpinned rooms past the threshold and excludes pinned rooms with the same age
- `delete` cascade: all child rows gone in one call; join code is freed (a subsequent `findByJoinCode` returns null)

**participants.test.ts**
- `createOrReconnect` with new token creates participant with `tier=participant`
- `createOrReconnect` with existing token sets `connected=1`
- `setTier` changes tier; `findById` reflects the change
- `setMuted` persists across a fresh `findById`
- `earliestConnectedParticipant` returns the correct participant when multiple are connected with different `joined_at` values; returns null when none are connected

**session-events.test.ts**
- `append` returns an incrementing `event_id`
- `listForRoom` with `since_event_id` returns only later events
- `listForRoom` with `kinds` filter returns only matching kinds

**saves.test.ts**
- `create` stores the blob; `findById` returns the same bytes
- `listForRoom` does not include blob bytes (summary only)
- Cascade: saves disappear when room is deleted (tested via `rooms.delete`)

**config-repo.test.ts**
- `get` returns null for unknown key
- `set` then `get` round-trips the value
- `set` on existing key updates it

---

## Phase 2: HTTP Layer — Room Creation, Join, and CAPTCHA

**Goal**: Implement all HTTP endpoints needed to create a room, join a room by code, and resolve a join code from a URL. Issue durable session tokens. Integrate CAPTCHA verification. No WebSocket yet — after this phase a human can POST to `/api/rooms` and receive a token and room_id back, and GET `/r/:code` returns a JSON room summary.

### Files Created / Modified

```
src/http/
├── app.ts                        # Hono app wired with all routes from this phase
├── routes/
│   ├── create-room.ts            # POST /api/rooms
│   ├── join-room.ts              # POST /api/rooms/:room_id/join (by room_id, after resolving code)
│   ├── resolve-code.ts           # GET /r/:code — resolves join code to room_id + story metadata
│   └── list-stories.ts          # GET /api/stories — scans STORIES_DIR, returns available story slugs
├── middleware/
│   ├── captcha.ts               # CAPTCHA verification middleware (Turnstile / hCaptcha; provider from config)
│   └── error-envelope.ts        # Catches Hono HTTPException and unknown errors; shapes unified error JSON
└── tokens.ts                    # Token generation (crypto.randomUUID), scoping, and validation utilities

src/stories/
└── scanner.ts                   # Scans STORIES_DIR for *.sharpee files; returns { slug, title?, path }[]

tests/http/
├── create-room.test.ts
├── join-room.test.ts
├── resolve-code.test.ts
└── list-stories.test.ts
```

### Endpoint Contracts

**POST /api/rooms**

Request body:
```json
{
  "story_slug": "zork",
  "title": "Beta test for Zephyr v0.3",   // optional; auto-generated if absent
  "display_name": "Alice",
  "captcha_token": "<provider-token>"
}
```

Response 201:
```json
{
  "room_id": "<uuid>",
  "join_code": "XYZB-3F56",
  "join_url": "https://{host}/r/XYZB-3F56",
  "token": "<durable-session-token>",
  "tier": "primary_host",
  "participant_id": "<uuid>"
}
```

- Verifies CAPTCHA before touching the DB
- Inserts room; inserts participant with `tier=primary_host`; updates `rooms.primary_host_id`; appends `lifecycle(created)` and `join(reconnect=false)` events — all in one transaction
- On CAPTCHA failure: 400 with `{ code: "captcha_failed", detail: "..." }` — no room row created, no token issued (tests N-5)

**GET /r/:code**

Response 200:
```json
{
  "room_id": "<uuid>",
  "title": "Beta test for Zephyr v0.3",
  "story_slug": "zork",
  "pinned": false
}
```

Response 404 if code is not found.

**POST /api/rooms/:room_id/join**

Request body:
```json
{
  "display_name": "Bob",
  "captcha_token": "<provider-token>"
}
```

Response 200:
```json
{
  "participant_id": "<uuid>",
  "token": "<durable-session-token>",
  "tier": "participant"
}
```

- Issues a fresh token if none presented; if `token` header is present and matches a participant in this room, reconnects them instead
- Appends `join` event to session log
- Updates `rooms.last_activity_at`

**GET /api/stories**

Response 200:
```json
{ "stories": [{ "slug": "zork", "title": "Zork I", "path": "/data/stories/zork.sharpee" }] }
```

### Token Scoping

Tokens are `crypto.randomUUID()` strings. They are stored in the `participants.token` column. The browser stores them in `localStorage` keyed by the room URL path (`/r/XYZB-3F56`). The server finds a participant by token on reconnect — no JWT, no signing.

### Error Envelope Format

All 4xx and 5xx responses from every route have this shape:
```json
{ "code": "<machine_readable_string>", "detail": "<human readable>" }
```

This format is enforced by `middleware/error-envelope.ts` and is the same shape used by the WebSocket `ServerMsg { kind: 'error' }` (implemented in Phase 3+).

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 3**: Room creation, join code issuance, join URL format, open room creation, CAPTCHA requirement
- **Decision 4**: Durable session token issued on first join; no user accounts; token stored in localStorage (documented in API response); reconnect-via-token path implemented
- **Decision 15**: Hono routes; unified error envelope established here for consistency with WebSocket errors

### Acceptance Criteria Contributed To

- **AC1** (partial): Room creation and join code resolution are prerequisites for the two-user smoke test
- **AC4** (partial): Join-code release logic is established in `rooms.delete`

### Definition of Done

- `curl -X POST localhost:3000/api/rooms` with valid body and a stubbed CAPTCHA returns 201 with a token
- `curl localhost:3000/r/XYZB-3F56` resolves the code to room metadata
- CAPTCHA middleware can be switched to a stub/bypass mode via an env var (`CAPTCHA_BYPASS=1`) for local development and testing
- Error envelope shape is consistent across all routes

### Tests Required

**create-room.test.ts**
- Happy path: valid body + stub CAPTCHA → 201 with room_id, token, join_code
- Missing display_name → 400
- Unknown story_slug → 400
- Invalid CAPTCHA token → 400; no room in DB
- Auto-generated title when title is omitted

**join-room.test.ts**
- Happy path: new participant → 200 with participant_id and token
- Unknown room_id → 404
- Reconnect with valid token → 200, same participant_id
- Token from a different room → 401

**resolve-code.test.ts**
- Valid code → 200 with room metadata
- Unknown code → 404
- Deleted room code → 404

**list-stories.test.ts**
- Scans a temp directory with two `.sharpee` files; returns both
- Empty directory → empty array

---

## Phase 3: WebSocket Presence — Connect, Reconnect, and Broadcast Skeleton

**Goal**: Wire up the `ws` server under Hono. Implement participant connection, `hello` → `welcome` handshake, presence broadcast, and the per-room connection registry. At the end of this phase, two browser tabs can open WebSocket connections to the same room, each receives a `welcome` message, and both receive a `presence` push when the other connects or disconnects.

### Files Created / Modified

```
src/ws/
├── server.ts                    # Creates ws.Server, attaches to Hono's Node HTTP server; routes upgrade requests by path /ws/:room_id
├── connection-manager.ts        # Per-room WebSocket registry: Map<room_id, Set<ClientConnection>>; broadcast helpers
├── handlers/
│   ├── hello.ts                 # Handles ClientMsg { kind: 'hello' }; validates token; sends welcome or room_closed
│   └── presence.ts             # Handles connect/disconnect lifecycle; broadcasts presence pushes
└── room-snapshot.ts             # Builds RoomSnapshot from DB state (participants, lock holder, saves, pinned, last_activity_at)

src/http/routes/
└── ws-upgrade.ts               # Hono route that hands the HTTP upgrade to ws.Server

tests/ws/
├── hello.test.ts
└── presence.test.ts
```

### Protocol Detail

On WebSocket connect, the client immediately sends:
```json
{ "kind": "hello", "token": "<stored-token>" }
```

Server validates token against `ParticipantsRepository.findByToken`. If the token's room_id does not match the URL `:room_id`, responds:
```json
{ "kind": "error", "code": "token_room_mismatch", "detail": "..." }
```
and closes the socket.

On success, server responds:
```json
{
  "kind": "welcome",
  "participant_id": "...",
  "room": { /* RoomSnapshot */ },
  "participants": [ /* ParticipantSummary[] */ ]
}
```

Then broadcasts to all other connections in the room:
```json
{ "kind": "presence", "participant_id": "...", "connected": true }
```

On socket close, server calls `setConnected(false)`, removes from connection registry, broadcasts:
```json
{ "kind": "presence", "participant_id": "...", "connected": false }
```

Appends `leave(reason=disconnect)` event to session log.

On `hello` with a token whose room has been deleted, server sends:
```json
{ "kind": "room_closed", "reason": "deleted" }
```
and closes the socket. This is the N-4 negative path.

### Connection Registry

`connection-manager.ts` maintains:
- `Map<room_id, Map<participant_id, WebSocket>>` — the live connections
- `broadcast(room_id, msg)` — sends to all connections in a room
- `send(participant_id, msg)` — sends to one participant
- `getConnectedCount(room_id)` — used by succession logic in Phase 7

No rooms are created here — this is a runtime-only cache of active WebSocket objects.

### RoomSnapshot shape (from ADR-153 ServerMsg `welcome`)

```typescript
interface RoomSnapshot {
  room_id: string;
  title: string;
  story_slug: string;
  join_code: string;
  join_url: string;
  pinned: boolean;
  last_activity_at: string;
  lock_holder_id: string | null;   // null at this phase; will be populated in Phase 5
  saves: SaveSummary[];            // empty at this phase; populated in Phase 6
}
```

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 4**: Reconnect-with-token path implemented over WebSocket; client re-derives view from RoomSnapshot on reconnect
- **Decision 7** (partial): Lock holder field in RoomSnapshot established (null); lock protocol will be layered in Phase 5
- **Decision 15**: Bare `ws` library; no Socket.IO; per-room broadcast written directly

### Acceptance Criteria Contributed To

- **AC1** (partial): Two participants can connect and see each other's presence — prerequisite for the two-user smoke test
- **AC5** (partial): Participant list in `welcome` and `presence` pushes are prerequisites for mute indicator display

### Definition of Done

- Two browser tabs open WebSocket connections to the same room; each tab's console shows the other's `presence` message on connect and disconnect
- `hello` with a deleted room's token receives `room_closed` and the socket closes
- `hello` with a mismatched token (token from room A, connecting to room B's WebSocket URL) receives `error` and closes
- Connection registry is cleaned up on disconnect (no memory leak on repeated connect/disconnect)

### Tests Required

**hello.test.ts**
- Valid token → `welcome` message with correct participant_id and RoomSnapshot
- Invalid/unknown token → `error` + close
- Token from wrong room → `error` + close
- Deleted room token → `room_closed` + close (N-4)

**presence.test.ts**
- Second participant connecting to a room causes the first to receive `presence { connected: true }`
- Participant disconnect causes remaining participant to receive `presence { connected: false }`
- Session event log has `leave` row after disconnect

---

## Phase 4: Deno Sandbox Integration — Engine Subprocess and Turn Execution

**Goal**: Spawn a Deno subprocess per room, implement the full server↔sandbox Runtime Host Interface, and deliver a complete turn cycle: client submits a command, server sends COMMAND to sandbox, sandbox runs the engine, returns OUTPUT, server broadcasts `story_output` to all room participants. At the end of this phase, two users can watch a story respond to commands.

### Files Created / Modified

```
src/sandbox/
├── sandbox-process.ts           # Spawns Deno subprocess; manages stdio framing; emits typed events
├── sandbox-registry.ts          # Map<room_id, SandboxProcess>; spawn, lookup, teardown
├── message-framing.ts           # Newline-delimited JSON read/write over stdio; handles partial reads
└── deno-entry.ts               # (This file) Full implementation of the Deno sandbox entry point:
                                 #   - reads INIT from stdin
                                 #   - dynamically imports story bundle
                                 #   - instantiates @sharpee/engine GameEngine
                                 #   - loops: reads COMMAND/SAVE/RESTORE/SHUTDOWN; writes OUTPUT/SAVED/RESTORED/EXITED/ERROR/HEARTBEAT

src/ws/handlers/
└── submit-command.ts           # Handles ClientMsg { kind: 'submit_command' }; routes to sandbox; broadcasts story_output

src/rooms/
└── room-manager.ts             # Coordinates room lifecycle: create → spawn sandbox; teardown on room close

tests/sandbox/
├── message-framing.test.ts
├── sandbox-process.test.ts
└── turn-execution.test.ts
```

### Deno Entry Point (`deno-entry.ts`) Logic

```
1. Read one INIT line from stdin
2. Validate protocol version field
3. dynamic import(story_file) — loads .sharpee bundle
4. Instantiate GameEngine with the loaded story
5. Write READY { story_metadata: { title, author, version } }
6. Loop:
   a. Read one message line from stdin
   b. COMMAND → execute turn; write OUTPUT; append to event log via sandbox-side event emit
   c. SAVE → engine.save(); write SAVED { blob_b64: base64(blob) }
   d. RESTORE → engine.restore(fromBase64(blob_b64)); write RESTORED { text_blocks }
   e. SHUTDOWN → write EXITED { reason: 'shutdown' }; process.exit(0)
   f. CANCEL → discard pending turn (if supported by engine API)
7. On unhandled throw in turn loop: write ERROR { phase, detail }; write EXITED { reason: 'crash' }; exit(1)
```

The sandbox process runs with no filesystem, no network (Deno's `--allow-none` equivalent — achieved by launching Deno without any `--allow-*` flags). The only I/O is stdio.

### Spawn Invocation (from sandbox-process.ts)

```typescript
const proc = Deno.spawn('deno', {
  args: ['run', '--no-prompt', path_to_deno_entry, story_file_path],
  stdin: 'piped',
  stdout: 'piped',
  stderr: 'piped'
});
// server-side: proc is a child_process.ChildProcess (Node spawn, not Deno.spawn)
```

Actually from the server (Node), the invocation is:
```typescript
import { spawn } from 'node:child_process';
const proc = spawn('deno', ['run', '--no-prompt', DENO_ENTRY_PATH, story_file_path], {
  stdio: ['pipe', 'pipe', 'pipe']
});
```

### Server-Side Turn Cycle

On `submit_command` from WebSocket:
1. Verify lock holder is the sender (Phase 5 will enforce this; for now, accept any Command Entrant)
2. Generate `turn_id = crypto.randomUUID()`
3. Send `COMMAND { kind: 'COMMAND', turn_id, input, actor: participant_id }` to sandbox
4. Await `OUTPUT` message (with timeout)
5. Append `command` event to session log
6. Append `output` event to session log
7. Broadcast `story_output { turn_id, text_blocks, events }` to all room connections
8. Update `rooms.last_activity_at`

### Sandbox Crash Handling (N-1 negative path)

`sandbox-process.ts` listens for `close` event on the subprocess. If the subprocess exits without having written an `EXITED` message, it is treated as a crash:
- Server broadcasts `{ kind: 'error', code: 'runtime_crash', detail: 'The story runtime crashed. Restore from the last save to continue.' }`
- `sandbox-registry` marks the room's sandbox as `crashed`
- The room remains in the DB; participants stay connected; the room can still RESTORE from a save
- Server process does not crash — this satisfies **AC7**

### Sharpee Packages Imported

- `@sharpee/engine` — imported **inside `deno-entry.ts` only**; the server process does NOT import it
- `@sharpee/core` — imported in `wire/server-sandbox.ts` for `TextBlock` and `DomainEvent` types; both server and sandbox import this

### ADR Decisions Covered

- **Decision 1**: Server-side engine execution; Deno subprocess per room; `--allow-none` (no `--allow-*` flags passed); stdio message-passing boundary
- **Decision 2**: No filesystem access in story runtime; save/restore routes through server (SAVE/RESTORE messages, not file I/O)
- **Decision 15**: `@sharpee/engine` at the sandbox seam; `@sharpee/core` at both ends; Zifmia is not imported

### Acceptance Criteria Contributed To

- **AC1**: Complete path from browser command to story output to both browsers — this is the "two users see the same output" smoke test
- **AC7**: Sandbox crash recovery — server detects EXITED, notifies room, does not crash

### Definition of Done

- `node dist/cli/sharpee.js --play` equivalent: two WebSocket clients can connect to a room, one submits "look", both receive `story_output` with the room description
- Killing the Deno subprocess externally causes the server to broadcast `runtime_crash` within 5 seconds and keep the server process running
- Turn ID round-trips: `story_output.turn_id` matches the `COMMAND.turn_id` sent to the sandbox

### Tests Required

**message-framing.test.ts**
- Partial line buffering: two partial chunks assemble into one complete JSON object
- Multiple messages on one read are split correctly
- Malformed JSON line emits an error event

**sandbox-process.test.ts**
- Spawns a minimal Deno script that writes READY and then EXITED; server receives both events
- Subprocess exit without EXITED is treated as crash; crash event fires

**turn-execution.test.ts** (integration-level — uses a stub Deno entry that echoes fixed OUTPUT)
- submit_command → story_output broadcast to all connected clients
- command and output events appended to session log
- Turn timeout (sandbox silent for too long) emits error to room

---

## Phase 5: Lock-on-Typing — Arbitration, Live Preview, and AFK Release

**Goal**: Implement the lock-on-typing input model in full: first-keystroke lock acquisition, server-side arbitration on race, `draft_frame` broadcast to all room participants, AFK 60-second auto-release, empty-input release, voluntary release, and Co-Host force-release. Commands can only be submitted by the current lock holder.

### Files Created / Modified

```
src/ws/
├── lock-manager.ts             # Per-room lock state: holder_id, acquired_at, last_keystroke_at, draft_seq
├── afk-timer.ts               # Manages per-room AFK countdown timers (Node setInterval, cleared on lock release)

src/ws/handlers/
├── draft-delta.ts              # Handles ClientMsg { kind: 'draft_delta' }; acquires lock if free; broadcasts draft_frame; updates last_keystroke_at
├── release-lock.ts             # Handles ClientMsg { kind: 'release_lock' }; releases if holder; broadcasts lock_state
└── force-release.ts            # Handles ClientMsg { kind: 'force_release' }; Co-Host/PH only; appends role event; broadcasts lock_state

src/ws/handlers/submit-command.ts   # Modified: add lock guard — reject if sender is not lock holder

tests/ws/
├── lock-manager.test.ts
├── draft-delta.test.ts
├── afk-timer.test.ts
└── force-release.test.ts
```

### Lock State (in-memory, per room)

```typescript
interface LockState {
  holder_id: string | null;
  acquired_at: number | null;        // Date.now()
  last_keystroke_at: number | null;
  draft_seq: number;
}
```

Lock state is in-memory only. It is not persisted — draft keystrokes are not in the event log. On server restart, all locks are implicitly released (reconnect `welcome` carries `lock_holder_id: null`).

### Lock Acquisition Protocol

1. Client sends `draft_delta { seq: N, text: "t" }` (first keystroke)
2. Server checks `lockState.holder_id`:
   - If null: acquire lock for sender; update `holder_id`, `acquired_at`, `last_keystroke_at = now`; broadcast `lock_state { holder_id }` to all; broadcast `draft_frame { typist_id, seq, text }` to all
   - If sender is already holder: update `last_keystroke_at`; broadcast `draft_frame` to all
   - If another participant holds the lock: send `lock_state { holder_id: existing_holder }` back to sender only — client resets its local input to empty and shows "{name} got there first" indicator (B-1)
3. If `draft_delta` arrives with a `seq` older than `draft_seq` on the server: ignore silently (N-7)

### AFK Release

`afk-timer.ts` runs a per-room `setInterval(60_000)`. On each tick, if `lock_holder_id !== null` and `Date.now() - last_keystroke_at >= 60_000`:
- Release lock: `holder_id = null`
- Broadcast `lock_state { holder_id: null }`
- Append `role(force_release, actor=system)` to event log

### Empty-Input and Submission Release

- `release_lock` message: holder clears their field, server releases, broadcasts `lock_state { holder_id: null }`
- `submit_command`: after OUTPUT is received and broadcast, server releases lock and broadcasts `lock_state { holder_id: null }`

### Force-Release

`force_release` from a Co-Host or Primary Host:
- Check sender tier is `co_host` or `primary_host`
- If not: respond with `error { code: 'insufficient_authority', ... }`
- If yes: release lock; broadcast `lock_state { holder_id: null }`; append `role(force_release)` event with actor_id and target participant_id

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 7**: Lock engages on first keystroke; releases on submission, empty input, 60s AFK, or Co-Host force-release; live preview via `draft_frame` to all participants; keystrokes not persisted; AFK timeout hard-coded at 60s

### Acceptance Criteria Contributed To

- **AC1**: The full two-user smoke test requires live keystroke preview (User B watches User A's keystrokes streaming in real time); lock transfer on empty-input release; both users seeing the same story output after submission

### Definition of Done

- User A types; User B receives `draft_frame` messages in real time
- User A clears their field; `lock_state { holder_id: null }` is broadcast; User B's input is re-enabled
- Lock race: two clients send `draft_delta` simultaneously within a few milliseconds; exactly one receives the lock; the other receives `lock_state` with the winner's id and resets locally
- AFK test: with test timer hooks (`__setMockClock`), advancing 60s causes lock release and `lock_state` broadcast
- Force-release by a Participant (not Co-Host) is rejected with `error`

### Tests Required

**lock-manager.test.ts**
- Initial state: holder_id is null
- First `draft_delta` from eligible participant acquires lock
- Second `draft_delta` from a different participant while lock is held: returns holder_id of current holder
- Lock releases on empty text
- Lock releases on submission

**draft-delta.test.ts** (B-1, B-2 boundary tests)
- Two clients send draft_delta within 50ms: server arbitrates by timestamp; loser gets lock_state with winner's id
- AFK timeout (mock clock): 60s idle → lock released, lock_state broadcast

**afk-timer.test.ts**
- Timer ticks; if holder is null, nothing fires
- Timer ticks; holder present; last_keystroke_at is 61s ago → release fires
- Timer ticks; holder present; last_keystroke_at is 59s ago → no release

**force-release.test.ts**
- Co-Host force-releases lock: lock_state broadcast, role event logged with actor + target
- Participant attempts force-release: error response, lock unchanged

---

## Phase 6: Save and Restore — Blob Routing, Event Log, and Wire Format

**Goal**: Implement the full save/restore cycle: browser sends `save`, server routes SAVE to sandbox, sandbox returns SAVED blob, server persists to SQLite, broadcasts `save_created` to all participants. Then `restore`: server fetches blob, routes RESTORE to sandbox, broadcasts `restored` to all. Includes session event log entries for both operations.

### Files Created / Modified

```
src/ws/handlers/
├── save.ts             # Handles ClientMsg { kind: 'save' }; authority check; routes to sandbox; persists; broadcasts
└── restore.ts          # Handles ClientMsg { kind: 'restore' }; authority check; fetches blob; routes to sandbox; broadcasts

tests/ws/
├── save.test.ts
└── restore.test.ts
```

### Save Cycle

1. Client sends `{ kind: 'save' }`
2. Server checks sender tier is `command_entrant`, `co_host`, or `primary_host` — otherwise `error { code: 'insufficient_authority' }`
3. Generate `save_id = crypto.randomUUID()`; compute auto-name `{story-slug} — T{turn#} — {ISO-timestamp}`
4. Send `SAVE { kind: 'SAVE', save_id }` to sandbox
5. Sandbox returns `SAVED { save_id, blob_b64 }`
6. Decode base64 → Buffer
7. **In one transaction**: `saves.create({ room_id, actor_id, name, blob })` + `session_events.append({ kind: 'save', payload: { save_id, save_name } })`
8. Broadcast `save_created { save_id, name, actor_id, ts }` to all participants
9. Update `rooms.last_activity_at`

The transaction in step 7 satisfies the atomicity requirement stated in ADR-153: the event log row and the save row are created together, so the event log can never reference a save_id that does not exist.

### Restore Cycle

1. Client sends `{ kind: 'restore', save_id }`
2. Authority check: same as save
3. `saves.findById(save_id)` — if null: `error { code: 'save_not_found' }`
4. Verify save belongs to this room (compare `save.room_id === room_id`)
5. Send `RESTORE { save_id, blob_b64: base64(save.blob) }` to sandbox
6. Sandbox returns `RESTORED { save_id, text_blocks }`
7. Append `session_events({ kind: 'restore', payload: { save_id } })`
8. Broadcast `restored { save_id, text_blocks, actor_id }` to all participants
9. Clear any in-flight lock state (the game state just changed; any in-flight draft is now stale)

### Sharpee Packages Imported

- `@sharpee/core` — `TextBlock` type used in the `restored` broadcast payload

### ADR Decisions Covered

- **Decision 2**: Save/restore routes through server (opaque blob); story code never touches disk
- **Decision 10**: Room-scoped saves; auto-naming scheme; command-entrant authority level; saves persisted as opaque blobs in SQLite WAL
- **Decision 11**: `save` and `restore` event kinds appended to session log; atomicity of save_create + event_append

### Acceptance Criteria Contributed To

- **AC2**: Full save/restore round-trip: Command Entrant saves, save appears in list, participant reconnects, restore returns prior state with `RESTORED` text block

### Definition of Done

- Two-user room: User A saves; both users receive `save_created`; User B disconnects and reconnects; User B sees the save in `RoomSnapshot.saves`; User B restores; both users receive `restored` with the prior-state text
- Save blob round-trip: `SAVED.blob_b64` → decoded → stored → fetched → re-encoded → `RESTORE.blob_b64` matches the original
- A Participant (not Command Entrant) attempting to save receives `error { code: 'insufficient_authority' }` and no save is created

### Tests Required

**save.test.ts**
- Valid Command Entrant saves: save row created, event row created (atomically), save_created broadcast
- Participant save attempt: error, no save row, no event row
- Transaction atomicity: simulate SQLite error during event append; save row must be absent (use an in-memory DB that is set to fail on the second write)

**restore.test.ts**
- Valid restore: RESTORE message sent to sandbox stub, restored broadcast to all clients
- Unknown save_id: error response
- Save from a different room: error (save_room mismatch)
- After restore: lock state is cleared (lock_state broadcast with holder_id null)

---

## Phase 7: Role Hierarchy and Cascading Succession

**Goal**: Implement all promotion and demotion operations, the cascading succession invariant, the 5-minute Primary Host grace timer, and the nomination-on-first-join rule. This is the most complex phase — succession has multiple triggers and the atomicity requirement is strict.

### Files Created / Modified

```
src/ws/handlers/
├── promote.ts           # Handles ClientMsg { kind: 'promote' }; authority checks; promotes tier; broadcasts role_change
├── demote.ts            # Handles ClientMsg { kind: 'demote' }; PH-only enforcement; broadcasts role_change
└── nominate-successor.ts  # Handles ClientMsg { kind: 'nominate_successor' }; updates is_successor; broadcasts successor push

src/rooms/
├── succession.ts        # Cascading succession state machine: performSuccession(room_id); one atomic transaction
└── ph-grace-timer.ts    # Per-room grace timer: 5 minutes after PH disconnects; triggers succession

tests/rooms/
├── succession.test.ts   # Table-driven test of every succession path
└── ph-grace-timer.test.ts

tests/ws/
├── promote.test.ts
└── demote.test.ts
```

### Promotion Authority Rules (per ADR-153 Decision 5)

| Actor tier | Can promote to |
|-----------|---------------|
| `primary_host` | `co_host` (and `command_entrant` directly) |
| `co_host` | `command_entrant` only |
| `command_entrant` | nobody |
| `participant` | nobody |

Promotion of a Participant directly to `co_host` is allowed for Primary Host (skips the intermediate tier).

### Demotion Authority Rule

Only the `primary_host` can demote anyone. A Co-Host attempting to demote receives `error { code: 'insufficient_authority' }`.

### Succession State Machine (`succession.ts`)

`performSuccession(room_id)` executes in a single `BEGIN IMMEDIATE` transaction:

1. Find the participant where `is_successor = 1` (the designated Co-Host)
2. Update their tier to `primary_host`; update `rooms.primary_host_id` to their participant_id; clear `is_successor`
3. Call `participants.earliestConnectedParticipant(room_id)` — exclude the newly promoted PH
4. If found: set their tier to `co_host`; set `is_successor = 1`
5. Append a single `role` event: `{ op: 'promote', target: old_successor, to_tier: 'primary_host' }` and a second `role` event: `{ op: 'promote', target: new_co_host, to_tier: 'co_host' }` and a third `role` event: `{ op: 'nominate', target: new_co_host }`
6. All of the above is one transaction — `COMMIT`
7. After commit (outside transaction): broadcast `role_change` for promoted PH, `role_change` for new Co-Host, `successor` for new designated successor

Step 7 happening outside the transaction satisfies the ADR's atomicity requirement: "a crash mid-DB-transaction must roll back cleanly; a crash mid-broadcast is tolerable — clients re-sync on reconnect via `welcome`."

### First-Join Auto-Nomination

In `presence.ts` (from Phase 3), on first successful `hello` when a second participant joins a room that has no designated successor (`is_successor = 0` for all participants):
- Set `participants.is_successor = 1` for the joining participant
- Broadcast `{ kind: 'successor', participant_id: new_successor_id }` to Primary Host

### Grace Timer (`ph-grace-timer.ts`)

On Primary Host disconnect (`presence.ts` detects tier = primary_host, connected = false):
- Start a 5-minute `setTimeout` per room
- Cancel the timer if the PH reconnects before it fires (`hello` with PH's token)
- On timer fire: call `performSuccession(room_id)` if the PH is still disconnected
- Original PH reconnecting after succession: `hello` resolves them as a `participant` (their `tier` in DB is now `participant` — succession changed it)

### PH Grace Timer Boundary Test (B-3)

At T+4m59s no succession should have fired; at T+5m01s succession must have fired. Tested via `__setMockClock` in `ph-grace-timer.test.ts`.

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 5**: Four-tier hierarchy; strict one-level-down promotion; PH-only demotion at every tier
- **Decision 6**: Cascading succession invariant; auto-nomination on first join; 5-minute PH grace timer; original PH rejoins as Participant; succession chain refill to co_host from earliest connected Participant

### Acceptance Criteria Contributed To

- **AC3**: 3-user room, PH closes browser, 5 minutes later successor is promoted atomically, original PH reconnects as Participant, earliest Participant becomes new Co-Host successor

### Definition of Done

- PH disconnects; 5 minutes later the designated Co-Host is now `primary_host` in the DB; earliest connected Participant is now `co_host` with `is_successor = 1`; event log has exactly 3 role events
- PH reconnects after succession: `welcome` shows them as `tier: participant`
- Co-Host attempts to demote: `error { code: 'insufficient_authority' }`

### Tests Required

**succession.test.ts** (table-driven)
- PH + designated Co-Host + 1 Participant: succession promotes Co-Host to PH, Participant to Co-Host successor
- PH + designated Co-Host + 0 Participants: succession promotes Co-Host to PH; no successor available (is_successor stays 0 on all)
- PH + designated Co-Host + Participant (disconnected) + Participant (connected): `earliestConnectedParticipant` returns the connected one
- PH has no designated successor (is_successor = 0 for all): succession is a no-op (no one to promote — documented edge case, log warning)
- All mutations are in one transaction: simulate commit failure after the first `setTier`; verify DB state is unchanged

**ph-grace-timer.test.ts** (B-3 boundary)
- PH disconnects; at T=299s (mock), no succession event in DB
- PH disconnects; at T=301s (mock), succession event in DB
- PH disconnects; PH reconnects before 5m; timer cancels; no succession event

**promote.test.ts**
- PH promotes Participant to co_host: role_change broadcast, event logged
- PH promotes Participant directly to co_host (skipping command_entrant): valid
- Co-Host promotes Participant to command_entrant: valid
- Co-Host attempts to promote to co_host: error
- Command Entrant attempts any promotion: error
- Attempting to promote a participant from a different room: error

**demote.test.ts**
- PH demotes co_host: valid; role_change broadcast
- Co-Host attempts demote: error
- PH demotes participant who is not in this room: error

---

## Phase 8: Chat, DMs, and Recording Transparency

**Goal**: Implement room-wide chat, Primary Host ↔ Co-Host private DMs, session log integration for both, the recording-transparency notice on join, and the persistent REC indicator data in the `welcome` message.

### Files Created / Modified

```
src/ws/handlers/
├── chat.ts              # Handles ClientMsg { kind: 'chat' }; mute check; appends event; broadcasts chat push
└── dm.ts               # Handles ClientMsg { kind: 'dm' }; axis check (PH↔Co-Host only); mute check; appends dm event; delivers to both endpoints

src/ws/
└── recording-notice.ts  # Returns the recording-transparency notice string; injected into welcome flow

tests/ws/
├── chat.test.ts
└── dm.test.ts
```

### Chat Rules

- Any participant (all tiers) can send chat regardless of role — except if muted
- Muted participant attempts to send chat: `error { code: 'muted', detail: 'You have been muted.' }` — no event logged, no broadcast
- On success: append `session_events({ kind: 'chat', payload: { text } })`; broadcast `chat { event_id, from, text, ts }` to all room connections
- Update `rooms.last_activity_at`

### DM Rules

Sender is `primary_host`, recipient is any `co_host`: valid.
Sender is any `co_host`, recipient is `primary_host`: valid.
Any other combination: `error { code: 'dm_axis_violation', detail: 'Direct messages are only available between the Primary Host and Co-Hosts.' }`

On success: append `session_events({ kind: 'dm', payload: { to_participant_id, text } })`; send `dm { event_id, from, to, text, ts }` to sender AND to recipient only (not broadcast to all).

Muted Co-Host attempting to send DM receives `error { code: 'muted' }`.

### Recording Transparency Notice

On `hello` → `welcome` handshake, the server includes a `recording_notice` field in the `welcome` message:

```json
{
  "kind": "welcome",
  "participant_id": "...",
  "room": { ... },
  "participants": [...],
  "recording_notice": "This session is recorded. Every command, chat message, direct message, and role change is logged for the lifetime of this room. This includes Direct Messages between the Primary Host and Co-Hosts."
}
```

The client is expected to display this notice once (on first join or on reconnect) and show a persistent "REC" indicator. The `recording_notice` field is always present in `welcome` — whether or not to suppress it after the first view is the client's concern.

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 8**: Single room chat channel; all tiers send freely; PH↔Co-Host DMs only; no Co-Host↔Co-Host DMs; no Participant DMs; DMs persisted to event log; recording transparency notice; persistent REC indicator
- **Decision 11**: `chat` and `dm` event kinds appended to session log with participant_id; DMs cascade-delete with room

### Acceptance Criteria Contributed To

- Prerequisite for **AC5**: mute visibility in chat requires chat to be implemented

### Definition of Done

- Two users in a room can exchange chat messages; both see `chat` pushes with `event_id` and `ts`
- Co-Host sends DM to Primary Host; only those two participants receive `dm` push; other participants do not receive it
- Participant attempts DM: `error { code: 'dm_axis_violation' }`
- Muted participant attempts chat: `error { code: 'muted' }`; no event logged; no broadcast
- `welcome` message includes `recording_notice` string

### Tests Required

**chat.test.ts**
- Participant sends chat: chat event logged, broadcast to all
- Muted participant sends chat: error, no event, no broadcast
- Chat updates last_activity_at
- Empty text is rejected (400 equivalent)

**dm.test.ts**
- PH sends DM to Co-Host: dm event logged, delivered only to PH and Co-Host sockets
- Co-Host sends DM to PH: same
- Co-Host attempts DM to another Co-Host: axis violation error
- Participant attempts DM: axis violation error
- Muted Co-Host sends DM: muted error
- DM to participant_id not in this room: not-found error

---

## Phase 9: Moderation — Mute, Visibility, and Persistence

**Goal**: Implement mute and unmute operations with full authority rules, mute persistence across disconnect/reconnect, mute indicator in presence/roster data, and event log entries. This phase is deliberately narrow — no kick, no ban, no IP enforcement.

### Files Created / Modified

```
src/ws/handlers/
├── mute.ts              # Handles ClientMsg { kind: 'mute' }; authority check; setMuted; appends role event; broadcasts mute_state
└── unmute.ts            # Handles ClientMsg { kind: 'unmute' }; flat authority (any PH or Co-Host); setMuted(false); appends event; broadcasts

tests/ws/
├── mute.test.ts
└── unmute.test.ts
```

### Mute Authority Rules

| Actor | Can mute |
|-------|---------|
| `primary_host` | `co_host`, `command_entrant`, `participant` |
| `co_host` | `command_entrant`, `participant` (NOT other `co_host`) |
| `command_entrant` | nobody |
| `participant` | nobody |

Unmute: any `primary_host` or `co_host` can unmute any muted participant (flat authority).

### Mute Cycle

1. `mute` message received
2. Verify actor authority vs target tier
3. `participants.setMuted(target_id, true, actor_id)`
4. Append `session_events({ kind: 'role', payload: { op: 'mute', target_participant_id, from_tier: target.tier } })`
5. Broadcast `mute_state { participant_id: target, muted: true, actor_id }` to all connections

### Mute Persistence Across Reconnect

When `hello` is processed in `handlers/hello.ts`:
- After `findByToken`, the `Participant` record includes `muted` flag from DB
- The `welcome` message includes each participant's `muted` state in `ParticipantSummary[]`
- No additional work needed — persistence is guaranteed by the DB column

This satisfies the B-5 boundary test: muted user disconnects and reconnects; `welcome` shows them as muted; their chat attempts are rejected.

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 9**: Mute is the only moderation action; mute disables outbound chat; muted user keeps role and command authority; mute indicator visible to all; authority rules; flat unmute; mute persists across reconnect; mute clears on room recycle/delete (cascade)

### Acceptance Criteria Contributed To

- **AC5**: Co-Host mutes Participant; Participant's chat rejected with mute message; all participants see mute indicator; mute persists across disconnect/reconnect

### Definition of Done

- Co-Host mutes a Participant; `mute_state` broadcast received by all connections; muted participant's subsequent chat attempt returns `error { code: 'muted' }` and no event is logged
- Muted participant disconnects and reconnects; `welcome` shows `muted: true` in their `ParticipantSummary`; chat is still rejected
- Co-Host attempts to mute another Co-Host: `error { code: 'insufficient_authority' }` and no DB change
- PH unmutes a participant muted by a Co-Host: `mute_state { muted: false }` broadcast; subsequent chat succeeds

### Tests Required

**mute.test.ts** (B-5)
- PH mutes Participant: mute_state broadcast, DB updated, event logged
- Co-Host mutes Command Entrant: valid
- Co-Host mutes Co-Host: authority error, no DB change
- Muted user reconnects: welcome shows muted: true (query DB before welcome is assembled)

**unmute.test.ts**
- PH unmutes: mute_state broadcast with muted: false
- Co-Host unmutes (even if a different Co-Host muted the user): valid
- Participant attempts unmute: authority error

---

## Phase 10: Room Lifecycle — Pin, Delete, and Idle Recycle

**Goal**: Implement room pinning, Primary-Host-only delete with type-to-confirm enforcement at the protocol level, idle recycle sweeper, and join-code pool management. All three atomicity requirements from the ADR are present in this phase.

### Files Created / Modified

```
src/ws/handlers/
├── pin.ts               # Handles ClientMsg { kind: 'pin' } and { kind: 'unpin' }; PH-only; setPinned; broadcasts room_state
└── delete-room.ts       # Handles ClientMsg { kind: 'delete_room', confirm_title }; PH-only; type-to-confirm check; cascade delete; broadcast room_closed; close sockets

src/rooms/
└── recycle-sweeper.ts   # setInterval(60_000); finds recyclable rooms; cascade deletes; logs; broadcasts room_closed to connected participants

tests/rooms/
├── recycle-sweeper.test.ts
└── delete-room.test.ts

tests/ws/
└── pin.test.ts
```

### Pin/Unpin

- PH sends `{ kind: 'pin' }` or `{ kind: 'unpin' }`
- Non-PH sends: `error { code: 'insufficient_authority' }`
- `rooms.setPinned(room_id, true/false)`
- Append `lifecycle(pinned)` or `lifecycle(unpinned)` event
- Broadcast `room_state { pinned: true/false, last_activity_at }` to all connections

### Delete Room (type-to-confirm)

Protocol-level enforcement:
1. `delete_room { confirm_title }` received
2. Non-PH: `error { code: 'insufficient_authority' }`
3. `rooms.findById(room_id)` — get current title
4. If `confirm_title !== room.title` (exact match): `error { code: 'confirm_title_mismatch', detail: 'The room title you entered does not match.' }` — no action taken (B-6)
5. If match: begin cascade delete transaction (one `BEGIN IMMEDIATE ... COMMIT`):
   - Delete room row (cascades participants, session_events, saves)
   - Note: sandbox for this room must be shut down — send `SHUTDOWN` to sandbox before committing
6. After commit: broadcast `room_closed { reason: 'deleted', message: 'This room was closed by the host.' }` to all connected participants
7. Close all WebSocket sockets for this room

### Idle Recycle Sweeper

`recycle-sweeper.ts` runs on a 60-second `setInterval`:
1. Acquires a process-level lock (simple boolean flag in module scope — prevents overlapping sweeps)
2. `rooms.listRecycleCandidates(now, idle_recycle_days)` — unpinned, last_activity_at past threshold
3. For each candidate:
   a. Send `SHUTDOWN` to the room's sandbox (if running)
   b. Execute cascade delete transaction (same as room delete above)
   c. Broadcast `room_closed { reason: 'recycled' }` to connected participants (if any are connected to an idle-recycled room, they are reconnecting to a stale URL — unlikely but handled)
   d. Close all WebSocket sockets for this room
4. Release process-level lock

Satisfies atomicity requirement #3: the cascade delete is a single transaction. The process lock prevents overlapping sweeps.

Satisfies AC6: room older than `idle_recycle_days` is recycled within 1 minute of next sweep; pinned room with same age is not recycled.

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 3**: Join code returns to pool on recycle/delete (code becomes available when the room row is deleted)
- **Decision 12**: `last_activity_at`, 14-day idle recycle, operator-configurable `idle_recycle_days`, PH-only pin and delete, type-to-confirm delete, broadcast `room_closed` before socket closure

### Acceptance Criteria Contributed To

- **AC4**: Room delete cascade — all participants receive `room_closed`, DB tables return zero rows, join code is immediately available for reissue
- **AC6**: Idle recycle within 1 minute of sweep; pinned room not recycled

### Definition of Done

- PH deletes room with correct title: all participants receive `room_closed`; `SELECT COUNT(*) FROM session_events WHERE room_id = ?` returns 0; same for participants and saves
- PH deletes with wrong title: `error { code: 'confirm_title_mismatch' }`; room still exists
- Recycle sweeper: room with `last_activity_at` at `now - 14 days - 1s` is recycled on next sweep; room at `now - 14 days + 1s` is not; pinned room at `now - 30 days` is not recycled (B-4)

### Tests Required

**delete-room.test.ts**
- Correct confirm_title: room_closed broadcast, all child rows gone, sandbox receives SHUTDOWN
- Wrong confirm_title: error, room intact (B-6)
- Non-PH attempts delete: authority error

**pin.test.ts**
- PH pins: room_state broadcast with pinned: true; DB updated
- PH unpins: room_state broadcast with pinned: false
- Non-PH attempts pin: authority error

**recycle-sweeper.test.ts** (B-4)
- Room at threshold - 1s: recycled
- Room at threshold + 1s: not recycled
- Pinned room at threshold - 1s: not recycled
- Overlapping sweep invocations: second sweep is a no-op while first is running (process lock)

---

## Phase 11: Error Envelope, DB Failure Handling, and Crash Recovery

**Goal**: Harden the cross-cutting error paths that were noted in ADR-153's negative-path tests but not yet fully implemented. Specifically: unified error envelope for all WebSocket error responses (consistent with HTTP errors from Phase 2), DB write failure propagation (N-2), and sandbox crash mid-turn (N-1). Also covers N-6 (malformed story at sandbox init time).

### Files Created / Modified

```
src/ws/
└── error-response.ts        # Helper: buildErrorMsg(code, detail): ServerMsg — used uniformly across all WS handlers

src/sandbox/
└── sandbox-process.ts       # Modified: adds crash-mid-turn detection; adds init-failure detection (N-6)

src/rooms/
└── room-manager.ts          # Modified: on sandbox EXITED{reason=crash}, broadcasts runtime_crash error; marks sandbox as crashed; allows RESTORE

tests/ws/
└── error-paths.test.ts      # N-1, N-2, N-6, N-7 negative paths consolidated
```

### DB Write Failure (N-2)

Every call to `session_events.append` is wrapped in a try/catch. On failure:
- Log the error server-side (stderr)
- Broadcast `{ kind: 'error', code: 'persistence_failure', detail: 'The session log could not be written. The action has been rolled back.' }`
- The state change that required the event is NOT applied — if save creation fails at the event-append step, the save row is also rolled back (the atomicity requirement ensures this)
- Server process continues running

This is testable by providing a DB stub that throws on `append` and verifying the broadcast and rollback.

### Sandbox Crash Mid-Turn (N-1)

Already partially implemented in Phase 4. This phase adds:
- Detection of crashes specifically during the turn window (between COMMAND sent and OUTPUT expected)
- Distinguishes "crash mid-turn" (`phase: 'turn'`) from "crash at idle" (`phase: 'init'` or ungrouped)
- Surfaces `error { code: 'runtime_crash', detail: 'The story runtime crashed during your command. The last turn may be incomplete. Restore from the last save to continue.' }` with the turn_id

### Malformed Story (N-6)

The sandbox entry point (`deno-entry.ts`) wraps the dynamic import in try/catch. On failure:
- Writes `ERROR { phase: 'init', detail: '<error message>' }` to stdout
- Writes `EXITED { reason: 'crash' }` and exits

`room-manager.ts` handles this `EXITED { reason: 'crash' }` during the INIT window (before READY is received):
- Does not create the room (or if the room row was already created, marks it as broken — depends on whether room creation and sandbox spawn are atomic)
- Responds to the HTTP `POST /api/rooms` with `{ code: 'story_load_failed', detail: '<sandbox error>' }` — no partial room remains (N-6 satisfies this)

Note: Phase 2 created the room row before spawning the sandbox. This phase must refactor `room-manager.ts` to either (a) spawn the sandbox before creating the room row and only commit the row after READY, or (b) delete the room row on init failure. Option (a) is preferred.

### Stale Draft on Reconnect (N-7)

Already implemented in Phase 5's `draft-delta.ts` (seq comparison). This phase adds an explicit test.

### Sharpee Packages Imported

None in this phase.

### ADR Decisions Covered

- **Decision 1** (negative path): Sandbox crash recovery — server survives, broadcasts error, allows RESTORE
- **Decision 2** (negative path): DB write failure surfaces as error; state change is not applied silently

### Acceptance Criteria Contributed To

- **AC7**: Sandbox crash recovery: server detects EXITED, notifies room with "runtime crashed" message, server process does not crash

### Definition of Done

- Simulated SIGKILL on the Deno subprocess mid-turn: room receives `runtime_crash` error within 5 seconds; subsequent RESTORE succeeds; server is still handling other rooms' requests
- Simulated SQLite ENOSPC on `session_events.append`: error broadcast to room; save row does not exist in DB
- Malformed story file: `POST /api/rooms` returns error with `code: story_load_failed`; no room in DB

### Tests Required

**error-paths.test.ts**
- N-1: Sandbox killed after COMMAND, before OUTPUT → runtime_crash broadcast, server alive
- N-2: DB write failure during save-create → persistence_failure broadcast, save row absent, event row absent
- N-6: Sandbox init failure (stub returns ERROR{phase:init}) → POST /api/rooms returns 500 with story_load_failed; no room row
- N-7: draft_delta with seq=5 when server's current seq=10 → silently ignored; no draft_frame broadcast

---

## Phase 12: Docker Packaging and docker-compose

**Goal**: Produce a production-ready multi-stage Docker image, a reference `docker-compose.yml`, a healthcheck endpoint, and verify that `docker compose up` on a fresh Linux host starts the server correctly. This phase is largely infrastructure but constitutes its own AC.

### Files Created / Modified

```
Dockerfile                        # Finalize multi-stage build (from stub in Phase 0):
                                  #   Stage 1 (builder): node:22-alpine, install deps, tsc compile
                                  #   Stage 2 (runtime): node:22-alpine + curl Deno binary; COPY compiled JS from builder; COPY migrations/
docker-compose.yml                # Finalize reference compose:
                                  #   volumes: /data/db, /data/stories, /etc/sharpee-platform.yaml
                                  #   healthcheck: curl localhost:{PORT}/health
                                  #   restart: unless-stopped
.dockerignore                     # Excludes node_modules, tests, src/ (only dist/ and migrations/ go in image)

src/http/routes/
└── health.ts                     # GET /health → 200 { status: 'ok', version: '<package.json version>' }

scripts/
└── smoke-test.sh                 # Bash script: docker compose up -d; curl /health until 200; submit one WebSocket command; docker compose down; verify no data loss on re-up
```

### Dockerfile Stages

**Stage 1 — builder**
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json .
COPY src/ ./src/
RUN npx tsc
```

**Stage 2 — runtime**
```dockerfile
FROM node:22-alpine AS runtime
RUN apk add --no-cache curl
RUN curl -fsSL https://deno.land/install.sh | sh && mv /root/.deno/bin/deno /usr/local/bin/
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY migrations/ ./migrations/
COPY package.json .
EXPOSE ${PORT:-3000}
HEALTHCHECK CMD curl -f http://localhost:${PORT:-3000}/health || exit 1
CMD ["node", "dist/index.js"]
```

### Volumes

| Volume | Purpose |
|--------|---------|
| `/data/db` | SQLite database file (`sharpee.db`) |
| `/data/stories` | Operator-preloaded `.sharpee` files |
| `/etc/sharpee-platform.yaml` | Operator config (mounted as read-only) |

### Sharpee Packages Imported

None in this phase. The Docker image embeds the compiled server code; the Deno sandbox entry point is copied as a pre-compiled JS bundle.

### ADR Decisions Covered

- **Decision 14**: Single Docker image; `docker-compose.yml`; single HTTP/WebSocket port; volumes for db, stories, config; multi-stage build; single-container model

### Acceptance Criteria Contributed To

- **AC8**: `docker compose up` on a clean Linux VM produces a running instance; `docker compose down` then re-`up` resumes with prior rooms intact

### Definition of Done

- `docker compose up` on a machine with only Docker installed (not Node, not Deno) starts the server on the configured port
- `curl localhost:{PORT}/health` returns 200 within 30 seconds of `up`
- `docker compose down && docker compose up` restores DB state (rooms and saves intact)
- Image size is under 500MB

### Tests Required

- `scripts/smoke-test.sh` passes: create a room via API, verify `docker compose down && up` restores the room
- This is a manual test that constitutes the AC8 acceptance gate; no automated equivalent in the unit test suite

---

## Phase 13: Operator Documentation

**Goal**: Write and verify the four operator documents specified in ADR-153 AC9. Documentation is a v0.1 blocker, not an afterthought. Each document must be verified by a person other than the implementer standing up a fresh instance from scratch.

### Files Created

```
docs/server/
├── install-guide.md         # Prerequisites, Docker install, docker compose up, first-run smoke test
├── config-reference.md      # Full sharpee-platform.yaml schema; all env vars; defaults; examples
├── backup-restore.md        # SQLite WAL backup strategy; volume snapshot; restore procedure; story file backup
└── upgrade-guide.md         # Upgrade procedure: pull new image, docker compose pull && up; migration runner runs automatically on startup
```

### install-guide.md Coverage

- Prerequisites: Linux host (Debian/Ubuntu recommended), Docker Engine 24+, `docker compose` plugin
- Clone or download the `docker-compose.yml` and `sharpee-platform.yaml.example`
- Configure `sharpee-platform.yaml`: port, stories directory, CAPTCHA provider and keys
- Place `.sharpee` files in the stories directory
- `docker compose up -d`
- Verify: `curl http://localhost:{PORT}/health`
- First room creation: step-by-step with screenshots/output
- Common first-run errors: CAPTCHA not configured, stories directory empty, port conflict

### config-reference.md Coverage

Every field in `sharpee-platform.yaml` documented with: type, default, description, example value.

Key fields:
- `port` — HTTP/WebSocket listen port (default 3000)
- `rooms.idle_recycle_days` — idle recycle threshold (default 14)
- `captcha.provider` — `turnstile` | `hcaptcha` | `friendly_captcha` | `bypass` (bypass for local dev only)
- `captcha.site_key` and `captcha.secret_key`
- `stories.directory` — path to preloaded `.sharpee` files (default `/data/stories`)
- `db.path` — SQLite database file path (default `/data/db/sharpee.db`)

### backup-restore.md Coverage

- SQLite WAL mode: copy the `.db` file plus `.db-wal` and `.db-shm` using `sqlite3 sharpee.db .backup backup.db`
- Recommended cron: nightly `sqlite3 .backup` + `gzip` + offsite copy
- Volume snapshot: `docker run --rm -v sharpee_data:/data -v $(pwd):/backup alpine tar czf /backup/data-$(date +%Y%m%d).tar.gz /data`
- Story file backup: `.sharpee` files are operator-managed; recommend git-tracking the stories directory
- Restore procedure: stop container, restore DB file, restart container

### upgrade-guide.md Coverage

- `docker compose pull` — pulls new image tag
- `docker compose up -d` — restarts containers with new image; migration runner applies any new `.sql` files automatically
- Breaking changes: if any migration changes behavior, documented in the release notes for that version
- Rollback: not supported (forward-only migrations); advise: take a DB backup before upgrade

### ADR Decisions Covered

None directly — this phase is an implementation requirement, not a Decision. It closes **Acceptance Criterion 9**.

### Acceptance Criteria Contributed To

- **AC9**: Install guide, config reference, backup/restore runbook, and upgrade guide present and verified by a person other than the implementer

### Definition of Done

- All four documents are written
- A second person (not the implementer) follows the install-guide start-to-finish on a clean Ubuntu 24.04 LTS VM with only Docker installed and successfully reaches the room creation page
- The config-reference has been diffed against the actual `sharpee-platform.yaml` schema to verify no fields are missing or misspelled

### Tests Required

- No automated tests — AC9 is a human verification gate
- The verification checklist:
  - [ ] Install guide followed on clean VM: server reachable on configured port
  - [ ] Config reference: every field in `sharpee-platform.yaml.example` has a corresponding entry in `config-reference.md`
  - [ ] Backup/restore: backup taken, container restarted from restored backup, rooms intact
  - [ ] Upgrade guide: `docker compose pull && up` applied to a running instance, migration runner logged `Applied migration 000N`, service still running

---

## Acceptance Criteria Mapping

| AC | Description | Phases |
|----|-------------|--------|
| **AC1** | Two-user smoke: both browsers connect, one types, both see keystrokes stream, both see story output | Phase 2 (room creation), Phase 3 (WS presence), Phase 4 (sandbox + turn execution), Phase 5 (lock-on-typing) |
| **AC2** | Save/restore round-trip: save, disconnect, reconnect, restore returns prior state | Phase 6 (save/restore blob routing) |
| **AC3** | PH succession: 3-user room, PH closes browser, 5 min later Co-Host promoted, earliest Participant becomes Co-Host successor, original PH rejoins as Participant | Phase 7 (role hierarchy and cascading succession) |
| **AC4** | Room delete cascade: all participants receive `room_closed`, all rows gone, join code available for reissue | Phase 10 (room lifecycle — delete), Phase 1 (cascade delete transaction) |
| **AC5** | Mute visibility: Co-Host mutes Participant, chat rejected, indicator visible, mute persists across reconnect | Phase 9 (mute), Phase 8 (chat, mute check) |
| **AC6** | Idle recycle: unactioned room recycled within 1 minute of sweep; pinned room not recycled | Phase 10 (recycle sweeper) |
| **AC7** | Sandbox crash recovery: Deno subprocess killed, server broadcasts error, RESTORE available, server does not crash | Phase 4 (crash detection), Phase 11 (hardened crash path) |
| **AC8** | Docker smoke: `docker compose up` on clean Linux VM, `down` and re-`up` preserves data | Phase 12 (Docker packaging) |
| **AC9** | Operator docs: install guide, config reference, backup/restore runbook, upgrade guide — verified by a second person | Phase 13 (operator documentation) |

---

## ADR-153 Decision Coverage

| Decision | Name | Phases |
|----------|------|--------|
| 1 | Server-side engine execution with Deno sandbox isolation | Phase 4, Phase 11 |
| 2 | No filesystem access in story runtime | Phase 4, Phase 6, Phase 11 |
| 3 | Rooms are the primitive | Phase 2, Phase 10 |
| 4 | No user accounts; durable session tokens per-room | Phase 2, Phase 3 |
| 5 | Four-tier role hierarchy with strict promotion discipline | Phase 7 |
| 6 | Cascading succession invariant | Phase 7 |
| 7 | Lock-on-typing input model with live preview | Phase 3 (partial), Phase 5 |
| 8 | Room chat + PH↔Co-Host DMs only | Phase 8 |
| 9 | Mute is the moderation hammer; no kick | Phase 9 |
| 10 | Room-scoped saves; auto-named; server-side SQLite | Phase 1 (schema), Phase 6 |
| 11 | Unified append-only session event log | Phase 1 (schema), Phase 4, Phase 5, Phase 6, Phase 7, Phase 8, Phase 9, Phase 10 |
| 12 | 14-day idle recycle; PH-only pin; PH-only delete | Phase 10 |
| 13 | Desktop/laptop browsers only | Client-side concern; server makes no decision here — no phase needed |
| 14 | Docker as the canonical deployment artifact | Phase 0 (stub), Phase 12 (finalized) |
| 15 | Framework and library choices (Hono, ws, better-sqlite3, raw SQL) | Phase 0 (package.json), Phase 1 (repositories), Phase 2 (Hono routes), Phase 3 (ws server) |

---

## Test Specification Coverage

| Test | Type | Phase |
|------|------|-------|
| E2E-1: create → join → play → save → restore | E2E | Phases 2+3+4+5+6 |
| E2E-2: PH disconnect → succession → chain refill | E2E | Phase 7 |
| B-1: Lock race (two Command Entrants within 50ms) | Boundary | Phase 5 |
| B-2: AFK timeout at T+60s | Boundary | Phase 5 |
| B-3: PH grace timer at T+4m59s / T+5m01s | Boundary | Phase 7 |
| B-4: Idle recycle boundary (threshold ± 1s) | Boundary | Phase 10 |
| B-5: Mute persistence across disconnect/reconnect | Boundary | Phase 9 |
| B-6: Type-to-confirm delete (correct vs incorrect title) | Boundary | Phase 10 |
| N-1: Sandbox crash mid-turn | Negative | Phase 4 (partial), Phase 11 |
| N-2: Database write failure (ENOSPC) | Negative | Phase 11 |
| N-3: WebSocket drop during lock hold | Negative | Phase 5 (AFK release handles this) |
| N-4: Token for deleted room | Negative | Phase 3 |
| N-5: CAPTCHA failure (no room created, no token) | Negative | Phase 2 |
| N-6: Malformed story (sandbox init failure) | Negative | Phase 4 (partial), Phase 11 |
| N-7: Stale draft_delta seq | Negative | Phase 5 (partial), Phase 11 |

---

## Cross-Cutting Concerns

### Unified Error Envelope

Established in Phase 2 (`middleware/error-envelope.ts`) for HTTP and Phase 3 (`ws/error-response.ts`) for WebSocket. All error responses across all phases use `{ code: string, detail: string }`. No phase introduces a divergent error shape.

### Session Event Log Write Path

The `session_events.append` method is the single write path for all event kinds. It is established in Phase 1 and used by every subsequent phase. Atomicity requirements (room delete cascade, succession, save+event) are all implemented at the repository layer, not at the handler layer.

### Durable Token Middleware

Token resolution is implemented in Phase 2 (`tokens.ts`) and extended in Phase 3 (`handlers/hello.ts`). Every WebSocket message handler that is actor-aware calls `findByToken` (or uses the participant resolved at `hello` time, stored on the socket connection object). No handler performs its own token lookup — the resolved `Participant` is attached to the WS connection at handshake time and used directly by all handlers.

### `last_activity_at` Maintenance

Updated in Phase 2 (room creation), Phase 3 (join/reconnect), Phase 4 (command submission), Phase 6 (save), Phase 8 (chat). The update is a single call to `rooms.updateLastActivity` in each handler. The recycle sweeper in Phase 10 reads this field to find candidates.

### CAPTCHA Bypass for Testing

Established in Phase 2: `CAPTCHA_BYPASS=1` env var disables CAPTCHA verification. Used by all integration tests and the E2E harness. Never enabled in the Docker image by default — requires the operator to explicitly set it.

---

## Entry State

- `docs/architecture/adrs/adr-153-multiuser-sharpee-server.md` is Proposed and passes the `/adr-review` checklist (verified in prior session)
- `docs/brainstorm/multiuser/overview.md` is complete; all decisions resolved
- `tools/server/` does not exist
- `docs/work/multiuser/` is created by writing this plan

## What This Plan Does Not Cover

- Browser client implementation (framework choice for the client-side is a separate ADR or design doc, per ADR-153 Consequences section)
- Story upload UI (explicitly deferred, not in v0.1 scope)
- Admin UI, kick/ban, rate limiting beyond CAPTCHA (all explicitly deferred)
- Mobile support (explicit non-goal)
- Federation, cross-room identity, user accounts (all deferred post-MVP)
- Transcript export tooling (deferred post-MVP)
- Per-room container or microVM isolation (deferred post-MVP upgrade path)
