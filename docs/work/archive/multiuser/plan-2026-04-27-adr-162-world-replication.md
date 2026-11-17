# Plan — ADR-162: World-Model Replication for Multiuser Renderers

**Created**: 2026-04-27
**ADR**: [`docs/architecture/adrs/adr-162-world-model-replication.md`](../../architecture/adrs/adr-162-world-model-replication.md) (ACCEPTED)
**Status**: COMPLETE — all phases A–F delivered. AC-1 through AC-9
verified. Bandwidth baseline captured in
[`adr-162-bandwidth-baseline.md`](./adr-162-bandwidth-baseline.md).

**Overall scope**: serialize the sandbox's `WorldModel` on every
outbound turn frame; hydrate read-only mirrors on server and client;
expose the mirror to renderers via the same idioms Zifmia uses.
Delivers AC-1..AC-9 from ADR-162. Unblocks status line, future map /
inventory / scope-aware UI work in the multiuser client.

**Bounded contexts touched**: sandbox runtime (`deno-entry.ts`); wire
protocols (`wire/server-sandbox.ts`, `wire/browser-server.ts`); a new
shared wire-type module (`wire/world-mirror.ts`); server room manager;
client room reducer + React context; one renderer surface (StatusLine)
to prove the mirror.

**Key domain language**: snapshot, mirror, hydrate, ReadOnlyWorldModel,
SerializedWorldModel, STATUS_REQUEST/STATUS, single writer, replacement
not patch.

**Cutover posture**: greenfield, one-shot. The wire change introduces
the `world` field on existing frames and adds two new frames; old
sandbox/server pairs do not interoperate with new ones. Per
[`feedback_no_backcompat_server_lifecycle`](../../../../.claude/projects/-Users-david-repos-sharpee/memory/feedback_no_backcompat_server_lifecycle.md):
single-shot replacement; no two-phase rollout.

---

## Phase A: Wire types (foundation, additive)

**Tier**: Small
**Budget**: ~120 tool calls
**Domain focus**: type-only additions across three wire files. No
behavior change. Prepares the contract surface that B / C / D consume.

**Entry state**: ADR-162 ACCEPTED on main; no implementation yet.

**Deliverable**:

- **New file** `tools/server/src/wire/world-mirror.ts`:
  - Imports `IWorldModel` and `WorldModel` from `@sharpee/world-model`.
  - `type SerializedWorldModel = ReturnType<WorldModel['toJSON']>` —
    resolves to `string`.
  - `type ReadOnlyWorldModel = Pick<IWorldModel, ...>` — exact key list
    per ADR-162 Decision 4 (29 query methods).
  - Documented header per CLAUDE.md rule 8 (purpose / public interface
    / owner context).
- **Extend** `tools/server/src/wire/server-sandbox.ts`:
  - `Output.world?: SerializedWorldModel` field — **optional in Phase
    A; Phase B tightens to required** once `deno-entry.ts` populates
    it on every emit.
  - `Restored.world?: SerializedWorldModel` field — same optional →
    required path; tightened in Phase B.
  - New `StatusRequest = { kind: 'STATUS_REQUEST' }` (server → sandbox).
  - New `Status = { kind: 'STATUS'; world: SerializedWorldModel }`
    (sandbox → server). Required from day 1 — no existing producers
    to break.
  - Discriminated unions `ServerToSandboxMessage` and
    `SandboxToServerMessage` updated.
- **Extend** `tools/server/src/wire/browser-server.ts`:
  - `RoomSnapshot.world?: SerializedWorldModel` — **optional in Phase
    A; Phase C tightens to required** once the welcome handler
    populates it (with STATUS_REQUEST round-trip on cold start).
- **Extend** `wire/http-api.ts` if any HTTP responses emit
  `RoomSnapshot` (verify; likely not).

**Phase A optionality rationale**: Adding required wire fields without
their producers would break 6 typecheck sites (1 server, 5 client) for
RoomSnapshot — all test fixtures and `ws/room-snapshot.ts:91`. Per
CLAUDE.md "no half-finished implementations", we don't want
empty-string stubs. Each newly-introduced field starts optional and
tightens in the phase that introduces its producer.

**AC coverage**: contract pieces of AC-1, AC-2, AC-3 — types are
present; the field-population work lands in B and C.

**Boundary statement** (per CLAUDE.md rule 7a):
- OWNER: wire-protocol module set under `tools/server/src/wire/`.
- SHARED?: no — wire types are explicitly shared between server and
  client (rule 7b). This phase enforces that sharing.
- PROMISE: `wire/server-sandbox.ts`'s header doc declares it the
  protocol between Node server and Deno sandbox. New frames belong
  here.
- ALTERNATIVES: declaring `SerializedWorldModel` inside
  `world-mirror.ts` rather than `server-sandbox.ts` keeps the
  serialization-shape concept separate from frame definitions —
  matches the existing pattern (`primitives.ts`).

**Test cascade**: nothing yet — types alone do not run. Compile clean
on both server and client packages confirms the additions are valid.

**Exit state**: types added, server + client typecheck clean. No
runtime behavior changed.

**Status**: PENDING

---

## Phase B: Sandbox emits snapshots on OUTPUT, RESTORED, STATUS

**Tier**: Medium
**Budget**: ~250 tool calls
**Domain focus**: `deno-entry.ts` — the sandbox's main loop. Three
emission paths: post-turn, post-restore, on-demand status.

**Entry state**: Phase A complete; `Output.world` etc. are typed.

**Deliverable**:

- **`tools/server/src/sandbox/deno-entry.ts`**:
  - After `engine.executeTurn(frame.input)` (line ~250) and before the
    `kind: 'OUTPUT'` emit (line ~258), call `world.toJSON()` and set
    `world` on the frame.
  - After `engine.executeTurn('restore')` (line ~287) and before the
    `kind: 'RESTORED'` emit (line ~294), do the same.
  - New handler branch in the message loop: `STATUS_REQUEST` →
    immediately call `world.toJSON()` and emit
    `{ kind: 'STATUS', world: snap }`. No turn execution, no event
    side effects.
  - Snapshot-emit failure: wrap each `toJSON()` call in try/catch. On
    throw, emit `{ kind: 'ERROR', phase: 'turn', detail: msg }` and
    skip the OUTPUT/RESTORED/STATUS for that cycle. Mirror stays stale
    by one turn.

- **Tighten wire types** in `tools/server/src/wire/server-sandbox.ts`:
  - `Output.world?` → `Output.world` (required).
  - `Restored.world?` → `Restored.world` (required).
  - This must land in the same commit as the deno-entry producer
    change; otherwise typecheck breaks at the emit sites.

- **Sandbox integration test** (extends existing `sandbox/*.test.ts`):
  - Run a sandbox; send a `COMMAND`; assert `OUTPUT.world` is a
    non-empty string and parses via
    `JSON.parse(out.world); new WorldModel().loadJSON(out.world)`
    without throw.
  - Send a `STATUS_REQUEST`; assert `STATUS` reply has the same world
    serialization as the most recent `OUTPUT`.
  - Send a `RESTORE`; assert `RESTORED.world` is populated and
    rehydrates.

**Behavior Statement** (per CLAUDE.md rule 11) — to be written before
test code, but the sketch is:

**[deno-entry.ts emit-snapshot path]**
- DOES: appends `world: string` to the OUTPUT/RESTORED/STATUS frame,
  sourced from `world.toJSON()`.
- WHEN: after `engine.executeTurn(...)` returns successfully, after
  `engine.executeTurn('restore')` returns successfully, on receipt of
  `STATUS_REQUEST`.
- BECAUSE: renderer mirrors require a serialization of the live
  world at every observable boundary.
- REJECTS WHEN: `world.toJSON()` throws — emits `ERROR` (`phase:
  'turn'`) and suppresses the corresponding OUTPUT/RESTORED/STATUS.

**AC coverage**: AC-1, AC-2, plus the sandbox-side half of AC-3.

**Integration Reality**: the test drives a real Deno sandbox process
via the existing test harness — no stub. Per CLAUDE.md rule 12a, this
is an OWNED dependency (this repo spawns the sandbox); the REAL-PATH
TEST is the existing sandbox harness, extended with the new
assertions.

**Exit state**: sandbox emits snapshots; all existing sandbox tests
still pass; new assertions for `world` field pass.

**Status**: PENDING

---

## Phase C: Server hydrates per-room mirror; welcome path uses STATUS_REQUEST

**Tier**: Medium
**Budget**: ~300 tool calls
**Domain focus**: `RoomManager` keeps a `Map<room_id, WorldModel>`,
updated on each OUTPUT/RESTORED. Welcome handler issues STATUS_REQUEST
when the map has no entry.

**Entry state**: Phases A and B complete; sandbox emits snapshots.

**Deliverable**:

- **`tools/server/src/rooms/room-manager.ts`** (or wherever the room
  registry lives — confirm during impl):
  - New private field `worldMirrors: Map<string, WorldModel>`.
  - On `Output` from a sandbox: `m = new WorldModel(); m.loadJSON(out.world); worldMirrors.set(room_id, m)`.
  - On `Restored`: same.
  - Public `getWorldMirror(room_id): ReadOnlyWorldModel | null`.
  - On `closeRoom(room_id)`: `worldMirrors.delete(room_id)`.
  - Malformed-snapshot handling: try/catch around `loadJSON`; on
    failure, log and retain the prior mirror (per AC-9).

- **Tighten wire type** in `tools/server/src/wire/browser-server.ts`:
  - `RoomSnapshot.world?` → `RoomSnapshot.world` (required). Lands
    in the same commit as the welcome handler change so test fixtures
    are updated together.

- **Welcome handler** (`ws/handlers/hello.ts` or where `RoomSnapshot`
  is built):
  - When constructing `RoomSnapshot`, look up
    `roomManager.getWorldMirror(room_id)`. If present, call
    `mirror.toJSON()` and use that as `world`. (Re-serialize from the
    held mirror so we always emit a fresh string with no caching
    drift.)
  - If absent, send `STATUS_REQUEST` to the room's sandbox via the
    existing process-message channel; await `STATUS` reply (with a
    timeout — say 2s; on timeout: error to client and abort welcome);
    hydrate the mirror; serve welcome from the now-populated mirror.

- **Tests**:
  - `tests/rooms/room-manager-mirror.test.ts` — drive an OUTPUT
    through, assert `getWorldMirror` returns a hydrated instance;
    drive a malformed `world` through, assert the prior mirror is
    retained and an error is logged.
  - `tests/ws/welcome-with-mirror.test.ts` — connect a fresh client
    after a turn has happened, assert `RoomSnapshot.world` is
    populated.
  - `tests/ws/welcome-cold-start.test.ts` — connect a fresh client
    before any turn, assert STATUS_REQUEST is sent, STATUS is
    received, welcome arrives with `world`. Real sandbox + real WS.

**AC coverage**: AC-3 (full), AC-4. Half of AC-9 (server-side
malformed-snapshot rejection).

**Integration Reality**: real `ws.WebSocket` against real Hono+WS
server with real Deno sandbox. No mocked sandbox; the STATUS_REQUEST
round-trip must traverse the IPC boundary.

**Exit state**: server holds mirrors; cold-start welcome works; mirror
GCs on room close.

**Status**: PENDING

---

## Phase D: Client hydrates mirror; `useWorld()` hook

**Tier**: Medium
**Budget**: ~250 tool calls
**Domain focus**: client roomReducer receives the snapshot,
constructs a `WorldModel` mirror, exposes it via React context.

**Entry state**: Phases A–C complete; server emits welcome with
`world`, OUTPUT with `world`.

**Deliverable**:

- **`tools/server/client/src/roomReducer.ts`** (or wherever the
  reducer lives):
  - New state field `world: ReadOnlyWorldModel | null`.
  - Cases that set it: `room_state` (welcome), `story_output`
    (OUTPUT), `restored` (RESTORED).
  - Hydration pattern: `try { const m = new WorldModel(); m.loadJSON(snap); state.world = m; } catch (e) { console.error(...); /* retain prior */ }`.
  - Reducer-level rejection of malformed snapshots: prior mirror
    retained.

- **React context + hook** (new file
  `tools/server/client/src/hooks/useWorld.ts`):
  - `WorldContext` provider wraps the room view.
  - `export function useWorld(): ReadOnlyWorldModel | null`.
  - Boundary: returns the typed `ReadOnlyWorldModel`, not the full
    `WorldModel`. Renderer code cannot call mutators (compile error).

- **Provider wiring** in `Room.tsx` or wherever room-scoped React
  state is dispatched: read `roomState.world`, wrap children in
  `<WorldContext.Provider value={world}>`.

- **Tests**:
  - `roomReducer.test.ts` extension: drive a snapshot through,
    assert `state.world` is a `WorldModel`-shaped object with
    `getEntity` working; drive a malformed snapshot, assert prior
    mirror retained.
  - `useWorld.test.tsx` — render a child component inside the
    provider, assert `useWorld()` returns the hydrated mirror;
    re-render with a new snapshot, assert the mirror replaced.

**AC coverage**: AC-5; client-side half of AC-9.

**Boundary statement** (per CLAUDE.md rule 7a):
- OWNER: client per-room render scope.
- SHARED?: no — each connected client owns its own mirror.
- PROMISE: the mirror is read-only at the type level. Mutations are
  the sandbox's responsibility.
- ALTERNATIVES: putting the mirror in a global Redux/Zustand store
  rather than React context — rejected, mirror is room-scoped and
  unmounts on room change.

**Exit state**: client hydrates; `useWorld()` returns a typed mirror;
existing rendering unchanged.

**Status**: PENDING

---

## Phase E: StatusLine — first renderer that consumes the mirror

**Tier**: Small
**Budget**: ~150 tool calls
**Domain focus**: prove the mirror works end-to-end with a real
renderer feature. StatusLine is the surface that triggered ADR-162.

**Entry state**: Phase D complete; `useWorld()` available.

**Deliverable**:

- **New component** `tools/server/client/src/components/StatusLine.tsx`:
  - Reads `useWorld()`.
  - If `world` is null, renders a placeholder ("…").
  - If non-null: looks up the player entity, gets containing room
    name, reads `score` and `maxScore` capabilities via
    `world.getCapability(...)`, reads turn count.
  - Renders `Score: X/Y | Turns: N | Location: <room name>`.

- **Integration in Room.tsx** — render `<StatusLine />` in the
  appropriate header slot.

- **Tests**:
  - `StatusLine.test.tsx` — provide a `WorldContext` with a
    pre-hydrated mirror containing a known dungeo scene; assert the
    rendered string matches.
  - End-to-end (extends `Room.test.tsx`): mount Room, dispatch a
    welcome action with a real dungeo snapshot, run a few simulated
    OUTPUT messages, assert StatusLine reflects state changes
    including `maxScore` change mid-game.

**AC coverage**: AC-6.

**Exit state**: StatusLine is live; status info renders correctly.

**Status**: DONE — `tools/server/client/src/components/StatusLine.tsx`
created; mounted as a `status` grid row in `RoomView` between header
and banner, inside `WorldProvider` scope. Behavior degrades segment-by-
segment when `getPlayer()`, `getCapability('scoring')`, or
`getContainingRoom(player.id)` is missing — never throws. Tests:
`StatusLine.test.tsx` (7 unit) cover null mirror, hydrated render,
missing-player / missing-scoring / unroomed-player guards, fresh-mirror
re-render, and mid-game maxScore propagation. `Room.test.tsx`
extended with 3 RoomView-level tests (StatusLine wired into layout,
mid-game maxScore via mirror replacement, null-mirror placeholder).
Client suite: 349 → 359 passing. Server suite untouched at 497.

---

## Phase F: Type-rejection test, malformed-snapshot test, bandwidth baseline

**Tier**: Small
**Budget**: ~100 tool calls
**Domain focus**: close out the remaining ACs (AC-7, AC-9, AC-8).

**Entry state**: Phases A–E complete.

**Deliverable**:

- **Compile-time test** for AC-7 — new file
  `tools/server/src/wire/world-mirror.types.test-d.ts` (or co-located
  with reducer tests; pick during impl):
  - Use `// @ts-expect-error` annotations on lines that attempt
    `world.moveEntity(...)`, `world.createEntity(...)`,
    `world.removeEntity(...)` against a `ReadOnlyWorldModel`
    reference. The annotations themselves are the assertion: if the
    type system stops rejecting, the file fails to typecheck (the
    `@ts-expect-error` is unused).
  - Run via `pnpm typecheck` in CI.

- **Malformed-snapshot tests** for AC-9 — extend the unit tests added
  in Phase C and Phase D:
  - Server: pass `{ world: 'not json' }` to the OUTPUT-handling path;
    assert the prior mirror is unchanged and a log entry was emitted.
  - Client: dispatch a `story_output` action with `world: '{"bad":'`;
    assert `state.world` is unchanged from the prior tick.
  - Verify both sides recover: a subsequent valid snapshot rehydrates
    normally.

- **Bandwidth measurement** for AC-8:
  - Run dungeo end-to-end (server + sandbox) over ~10 turns.
  - Log `out.world.length` per turn.
  - Capture min/median/max into
    `docs/work/multiuser/adr-162-bandwidth-baseline.md`. Include the
    measurement methodology so future delta-encoding work can compare.

**AC coverage**: AC-7, AC-8, AC-9.

**Exit state**: ADR-162 ACs all delivered. Compile-time mutation
guarantee in place. Bandwidth baseline captured for future
optimization decisions.

**Status**: DONE.

- **AC-7** — `tools/server/src/wire/world-mirror.types.test-d.ts`
  added. ~25 `@ts-expect-error` directives across entity, spatial,
  state, capability, player, scoring, persistence, relationship,
  scene, event-system, and scope mutators. Self-check probe: removing
  any directive caused `tsc --noEmit` to exit 2 with TS2339;
  restoring the directive returned exit 0. The `.test-d.ts` suffix
  keeps Vitest from running the file at runtime; the regular
  `tsc --noEmit` build covers it (the file lives under `src/`).
- **AC-9** — recovery tests added on both sides. Server:
  `room-manager-mirror.test.ts` "AC-9 recovery: a valid OUTPUT after a
  malformed one rehydrates the mirror" — asserts `getWorldMirror`
  returns the same instance after malformed and a fresh different
  instance after recovery. Client: `roomReducer.test.ts` "AC-9
  recovery: a valid story_output after a malformed one rehydrates" —
  same assertion shape on `state.world`.
- **AC-8** — `tools/server/tests/sandbox/bandwidth-baseline.test.ts`
  added (gated on `SHARPEE_BANDWIDTH=1`; skipped in regular CI).
  Drives a real Deno + dungeo bundle through ten frozen turns and
  prints sizes + stats. Captured numbers landed in
  `docs/work/multiuser/adr-162-bandwidth-baseline.md` along with the
  full methodology, command sequence, and re-measurement protocol.
  Median snapshot ≈ 418 KiB; per-turn delta ≈ 500–700 bytes.

Final test counts: server 498/498 (+1 recovery, +1 baseline skipped
unless gated); client 360/360 (+1 recovery). Both typecheck clean.

---

## Integration Reality Statement (applies to all phases)

The Deno sandbox, the WS server, and `@sharpee/world-model` are
**owned dependencies** — this repo ships them. Per CLAUDE.md rule 12a:

- Phase B's REAL-PATH TEST drives a real Deno subprocess via the
  existing sandbox harness; no in-process stub of the sandbox.
- Phase C's REAL-PATH TEST connects a real `ws.WebSocket` to a real
  Hono+WS server with a real sandbox child process. The
  STATUS_REQUEST round-trip must traverse the actual IPC boundary.
- Phase D's tests run against the real `WorldModel` class (no fake
  with `getEntity`/`loadJSON` substitutes). The `useWorld()` hook is
  exercised through React Testing Library.
- Phase E's end-to-end test feeds a real dungeo `world.toJSON()`
  output (captured from a sandbox run) into the client reducer.

No phase named "world replication" or any of its sub-integrations
ships behind a stub.

---

## AC Coverage Matrix

| AC    | Phase(s)        | How verified                                                                         |
|-------|-----------------|--------------------------------------------------------------------------------------|
| AC-1  | A, B            | Wire type added (Ph A); sandbox populates `OUTPUT.world` (Ph B); integration test parses it back to a WorldModel |
| AC-2  | A, B            | Same pattern on `RESTORED` |
| AC-3  | A, C            | Welcome wire field (Ph A); welcome handler with STATUS_REQUEST cold-start path (Ph C); cold-start integration test |
| AC-4  | C               | RoomManager Map; OUTPUT/RESTORED hydration; close-room disposal |
| AC-5  | D               | roomReducer sets `world`; `useWorld()` hook returns ReadOnlyWorldModel-typed reference |
| AC-6  | E               | StatusLine component; end-to-end test with mid-game `maxScore` change |
| AC-7  | F               | `// @ts-expect-error` typecheck file; CI typecheck enforces |
| AC-8  | F               | Bandwidth log captured into docs/work/multiuser/adr-162-bandwidth-baseline.md |
| AC-9  | C, D, F         | Server-side malformed-snapshot test (Ph C); client-side (Ph D); recovery test (Ph F) |

---

## Phase Tier Totals

| Phase | Tier   | Budget        |
|-------|--------|---------------|
| A     | Small  | ~120 calls    |
| B     | Medium | ~250 calls    |
| C     | Medium | ~300 calls    |
| D     | Medium | ~250 calls    |
| E     | Small  | ~150 calls    |
| F     | Small  | ~100 calls    |
| **Total** | — | **~1,170 calls** |

Critical path is A → B → C → D → E → F. C and D could be parallelized
across two sessions after B; E depends on D; F depends on all prior.

---

## Open Items (carried from ADR-162)

- **Hash dedup** (ADR-162 Open Question 1) — non-blocking
  optimization; revisit after AC-8 bandwidth baseline if dungeo's
  numbers warrant it.
- **`ReadOnlyWorldModel` promotion to `@sharpee/world-model`** —
  deferred until a second consumer (e.g., a CLI/Zifmia path that wants
  the same read-only narrowing) surfaces. Per CLAUDE.md no-speculation
  rule, no platform amendment yet.
