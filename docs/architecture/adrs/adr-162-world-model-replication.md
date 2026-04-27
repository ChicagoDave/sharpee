# ADR-162: World-Model Replication for Multiuser Renderers

## Status: PROPOSAL

## Date: 2026-04-27

## Relates to

- **ADR-153** (Multiuser Sharpee Server) — establishes the per-room Deno
  sandbox isolation that puts the engine + world model behind an IPC
  boundary. This ADR keeps that isolation intact and addresses the
  downstream consequence: renderers losing direct world access.
- **ADR-156** (Multiuser Browser Client) — owns the React client that
  needs a working renderer contract. This ADR defines what world-shaped
  data the client receives and how it consumes it.
- **ADR-160** (Engine-State Continuity) — independent. Continuity decides
  what world a returning identity sees; replication decides how that
  world is delivered to renderers each turn.

## Context

Sharpee renderers across the platform — Zifmia, the CLI runner,
`platform-browser`, in-process tools — all share one pattern: the
renderer holds a reference to the live `WorldModel` and queries it
directly. Status line, transcript enrichment, scope-aware UI affordances,
map / inventory panels, "X (held)" / "X (worn)" disambiguation — every
one of these dips into `world.getEntity(...)`, capabilities, traits, or
relationship data. The engine emits narrative *deltas* via events; the
world model is the queryable state. This is visible in
`packages/zifmia/src/context/GameContext.tsx:289` where
`extractCurrentRoom(world, roomId)` is called on every `actor_moved`
event because the event itself only carries an id — the human-readable
name lives on the world model.

The multiuser server (ADR-153) puts the engine + world model inside a
per-room Deno sandbox isolate. The Node server is a wire bridge; the
browser client is two hops away over WebSocket. As a result, **the
multiuser stack is the only Sharpee surface that does not give its
renderer access to the world model.** Every UI feature that wants
state-derived rendering has to either:

1. Receive a custom projection over the wire, designed and versioned
   per surface.
2. Reconstruct world state from the event stream — only viable if the
   engine's events are replay-complete, which they are not.
3. Replicate the world model itself.

Today the multiuser client does (1) implicitly — but only for fields
the server explicitly chose to expose. The trigger for this ADR was the
status line: the multiuser client cannot show *Score: X/Y | Turns: N |
Location*. None of those facts are on the wire as data; they are buried
inside `text_blocks`. The same gap blocks every future renderer feature.

A clarifying observation: **the world model is the data store.** It is
not a remote service to project away from. It is JSON. `WorldModel` has
`toJSON()` / `fromJSON()` (`packages/world-model/src/world/WorldModel.ts:208`,
`packages/world-model/src/entities/entity-store.ts:111`). The engine's
`ISaveData` blob — already round-tripping over the wire for save and
restore (ADR-153 Decision 10) — *is* the world model serialized. The
world model is not trapped behind an IPC boundary; it is plain data
that can ride the wire.

A further clarification: **renderers need read access only.** The
sandbox is the sole writer. Server and client never mutate world state.
This means the design problem is not coordination of writes against a
distributed model — there is exactly one writer, exactly one wire, and
read-only mirrors downstream. No conflict resolution, no eventual
consistency reasoning.

A diagram of the proposed shape lives at `~/public_html/sharpee-world-replication.html`
(also in this repo at the path noted in References).

## Decision

**The sandbox emits a serialized world snapshot alongside every outbound
turn frame. The server hydrates a per-room read-only mirror. Each
connected client also hydrates its own read-only mirror. Renderers query
their local mirror via the same idioms used in Zifmia and elsewhere.**

Five constituent decisions:

### 1. Authoritative writer is unchanged

The Deno sandbox remains the only process that mutates a `WorldModel`.
ADR-153's isolation posture is preserved verbatim. No new permissions,
no new attack surface, no new code paths into the engine.

### 2. Snapshot rides the wire on `OUTPUT`, `RESTORED`, and welcome

- After `engine.executeTurn(...)` completes inside `deno-entry.ts`, the
  sandbox calls `world.toJSON()` and includes the result on the
  outbound `OUTPUT` frame.
- After a successful `RESTORE`, the sandbox emits the post-restore
  snapshot on the `RESTORED` frame so clients re-hydrate without
  waiting for the next `look`.
- The welcome `RoomSnapshot` (ws hello path) carries the most recent
  snapshot the server has hydrated, so a fresh tab or reconnect renders
  fully on first paint.

### 3. Server and client both hydrate via `WorldModel.fromJSON`

`WorldModel` already deserializes a JSON blob into a fully-functional
instance. Server holds one mirror per active room; each client holds
one mirror for the room it's in. When a new snapshot arrives, the
mirror is replaced (not patched) — full replacement is simpler, and the
"correct" state is whatever the sandbox just emitted.

### 4. Mirrors are typed read-only by construction

Define `ReadOnlyWorldModel` as the query subset of `IWorldModel`:

```ts
type ReadOnlyWorldModel = Pick<
  IWorldModel,
  | 'getEntity'
  | 'hasEntity'
  | 'getAllEntities'
  | 'getLocation'
  | 'getContents'
  | 'getContainingRoom'
  | 'getAllContents'
  | 'getCapability'
  | 'hasCapability'
  | 'getStateValue'
  | 'getPrompt'
  | 'findByTrait'
  | 'findByType'
  | 'findWhere'
  | 'getVisible'
  | 'getInScope'
  | 'canSee'
  | 'getRelated'
  | 'areRelated'
  | 'getTotalWeight'
  | 'wouldCreateLoop'
  | 'findPath'
  | 'getPlayer'
  | 'isInRegion'
  | 'getRegionCrossings'
  | 'getSceneConditions'
  | 'getAllSceneConditions'
  | 'isSceneActive'
  | 'hasSceneEnded'
  | 'hasSceneHappened'
>;
```

This type lives initially in `tools/server/src/wire/world-mirror.ts`
(read by both server and client). Promotion to `@sharpee/world-model`
as an extracted `IReadOnlyWorldModel` interface is deferred until a
second consumer wants it; we do not amend a platform package on
speculation.

The underlying instance is still a full `WorldModel` with mutators
present — we narrow at the type level, not at the value level. Compile
fails if mirror code calls `createEntity`, `moveEntity`, etc. Runtime
calls would also work (the methods exist) but the type system prevents
them from ever being written.

### 5. Snapshot shape is the same shape as `ISaveData`

The save/restore blob already serializes the world. Reusing the same
shape for per-turn snapshots means one serializer, one hydrator, one
test surface. Save metadata (creator, name, timestamp) is layered
*outside* the blob, in the `saves` table — that does not change.

## Invariants

- **Single writer.** Only the sandbox ever mutates a `WorldModel`. Server
  and client mirrors are read-only by construction (type-enforced).
- **Mirror freshness.** A mirror reflects the world as of the most
  recent `OUTPUT` / `RESTORED` / welcome snapshot received. Between
  turns, the mirror is correct. During turn execution the mirror is
  stale by exactly one turn — same staleness window the user
  experiences in any IF surface (you can't observe state mid-turn).
- **Wire-only authority.** Clients never derive world state from
  events. If a renderer needs a fact, it queries the local mirror; if
  the mirror does not know, the answer is "not yet." Events remain
  for narrative deltas only.
- **No mid-turn snapshots.** One snapshot per turn, attached to the
  one outbound frame that closes the turn. No partial snapshots, no
  parallel snapshot stream.
- **Replacement, not patch.** Hydration is full replacement. We do not
  attempt to diff or merge. The wire carries the complete shape every
  time.

## Acceptance Criteria

1. **AC-1**: `OUTPUT` wire type carries a `world: SerializedWorldModel`
   field. `deno-entry.ts` populates it from `world.toJSON()` after every
   `executeTurn`. The sandbox integration test asserts the field is
   present and parses to a `WorldModel`.
2. **AC-2**: `RESTORED` wire type carries the same field. Sandbox
   populates it after `engine.executeTurn('restore')`.
3. **AC-3**: `RoomSnapshot` (ws welcome) carries the latest server-held
   snapshot. A fresh client connecting to an in-progress room receives
   a renderable world without waiting for the next turn.
4. **AC-4**: Server's `RoomManager` keeps a `Map<room_id, WorldModel>`
   that updates on each `OUTPUT` and `RESTORED`. Existing turn-routing
   logic is unchanged; the map is purely a hydration target.
5. **AC-5**: Client's `roomReducer` accepts the snapshot, hydrates a
   `WorldModel` instance, and exposes it via React context. A `useWorld()`
   hook returns the `ReadOnlyWorldModel`-typed reference.
6. **AC-6**: `StatusLine` component (multiuser client) reads
   `world.getEntity(player).location.name` and the score / turn
   capabilities. End-to-end test: spawn dungeo room, run a few
   commands, assert status line reflects current state including
   mid-game `maxScore` change.
7. **AC-7**: Type system rejects any mutation call from server-side
   `RoomManager` or client-side renderer code paths against the mirror.
   Compile-time test: a `// @ts-expect-error` test file that attempts
   `world.moveEntity(...)` against a `ReadOnlyWorldModel` reference.
8. **AC-8**: Bandwidth measurement on dungeo: serialized snapshot size
   per turn. Recorded in the implementation plan; not a hard ceiling
   for this ADR but a baseline for any future delta-encoding work.

## Consequences

**Positive:**

- Renderer parity with every other Sharpee surface. The Zifmia idiom
  works in the multiuser client without a translation layer.
- Status line, future map/inventory/scope-aware panels are all
  client-only edits going forward. No new wire fields required.
- Server-side enforcement (e.g. permission checks that depend on world
  state) becomes possible without the server replaying events into a
  shadow model.
- The save/restore round-trip and the per-turn snapshot use the same
  serializer. One source of bugs, not two.

**Negative:**

- **Bandwidth.** Every turn carries a full world snapshot. For dungeo
  this is bounded but non-trivial. Mitigation: this is a known
  trade-off, deferred until measurement shows it bites. Compression on
  the WS layer covers most of it; delta encoding is the next lever.
- **Hydration cost.** Each client allocates a fresh `WorldModel` per
  turn. Modern JS engines GC this fine for the dungeo entity count;
  measure before optimizing.
- **Hidden coupling on `toJSON` shape.** Any change to what
  `WorldModel.toJSON()` emits is now a wire-protocol change too. We
  already have this coupling in the save/restore path; this ADR
  inherits it. Future ADRs that reshape `toJSON` must list
  multiuser-server impact.
- **Browser bundle ships `WorldModel`.** The full class travels to the
  client. Zifmia already does this; the cost is not new, but it is
  worth noting that the multiuser client now pulls `@sharpee/world-model`
  as a runtime dependency (not just types).

## Resolved Implementation Choices

- **Snapshot encoding**: JSON. Already what `toJSON()` produces; no
  protobuf, no msgpack, no schemas-on-the-wire. WS frame compression
  is the existing transport-level mitigation.
- **`SerializedWorldModel` as a wire type**: declared in
  `tools/server/src/wire/world-mirror.ts` as `type SerializedWorldModel
  = ReturnType<WorldModel['toJSON']>`. No structural duplication.
- **Hydration trigger**: explicit, in the `'story_output'` /
  `'restored'` reducer cases. No automatic background hydration.
- **Mirror disposal**: server discards the mirror when the room's
  sandbox tears down (`roomManager.closeRoom`). Client discards on
  unmount or room change.
- **Read-only type location**: `tools/server/src/wire/world-mirror.ts`
  for now. Promotion to `@sharpee/world-model` deferred to a follow-up
  ADR if a second consumer surfaces.

## Open Questions for Implementation

- **Snapshot vs. hash dedup.** If the engine's `executeTurn` was a
  read-only command (e.g. `look`, `inventory`), the world is identical
  to last turn. Cheap optimisation: include a content hash on the
  snapshot, skip rebroadcast when unchanged. Worth measuring before
  building.
- **Welcome snapshot freshness window.** If the server has a stale
  mirror (e.g. sandbox crashed and was restarted), the welcome
  snapshot may not match the live engine. The `room_state` welcome
  could trigger a one-shot `STATUS_REQUEST → STATUS` round-trip with
  the sandbox to refresh before sending. Or accept staleness for one
  turn — the next `OUTPUT` corrects it.
- **Save snapshot vs. live snapshot field equivalence.** Confirm that
  `ISaveData` and `world.toJSON()` produce equal shapes for the same
  world state. If they diverge (e.g. save adds metadata fields), we
  pick one canonical shape and adapt the other.

## Constrains Future Sessions

- **Wire protocol versioning.** `OUTPUT.world` is now a versioned
  field. `wire/server-sandbox.ts`'s `PROTOCOL_VERSION = 1` covers it
  initially; any breaking change to `WorldModel.toJSON()`'s shape
  bumps the version.
- **No mid-turn world queries from server.** The server's mirror is
  fresh only at turn boundaries. Server-side logic that depends on
  world facts must accept that staleness window. (Today there is no
  server logic that does this; future authority-checks against world
  state must respect this constraint.)
- **`WorldModel` mutability as a private contract.** External packages
  that care about read-only world access should consume
  `ReadOnlyWorldModel` once promoted, not the full `IWorldModel`.

## References

- ADR-153: Multiuser Sharpee Server (sandbox isolation)
- ADR-156: Multiuser Browser Client (renderer contract)
- ADR-160: Engine-State Continuity (independent; world *what*, not *how delivered*)
- Architecture diagram: `~/public_html/sharpee-world-replication.html`
- `packages/world-model/src/world/WorldModel.ts:208` — `toJSON()` declaration
- `packages/zifmia/src/context/GameContext.tsx:289` — example renderer
  pattern this ADR brings to the multiuser stack
- `tools/server/src/wire/server-sandbox.ts:52-57` — `Output` wire type
  to be extended

## Session

2026-04-27 main — derived from a session-long investigation triggered
by missing in-game save and missing status line. The status-line gap
exposed the broader pattern: the multiuser stack is the only Sharpee
surface without renderer-side world access, and that is an
architectural gap, not a feature gap.
