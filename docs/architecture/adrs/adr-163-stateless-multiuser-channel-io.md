# ADR-163: Stateless Multi-User Server with Channel I/O

## Status: ACCEPTED

## Date: 2026-04-28

## Replaces

- **ADR-153** (Multiuser Sharpee Server) — per-room Deno subprocess + stateful
  WS protocol.
- **ADR-153a** (Phase-4 Amendments) — transitive (addendum to a replaced ADR).
- **ADR-156** (Multiuser Browser Client) — four-phase client state machine
  (`connecting/hydrated/closed/error`) and `welcome` / `OUTPUT` / `RESTORED`
  snapshot streaming.
- **ADR-162** (World-Model Replication) — full-world `toJSON()` push every
  turn; per-room read-only mirrors on server and client.

## Carries forward unchanged

- **ADR-161** (Persistent Identity) — `{id, handle, passcode}` triple is
  orthogonal to the engine model.
- **ADR-129** (ScoreLedger) and engine internals.
- The save-blob serializer (`world.toJSON()` / `world.loadJSON()` from
  commit `bf9b9564`) — the only per-room server-side state under this ADR.
- HTTP routes for identity, room create, room list (the surface from
  ADR-153 minus the `/connect` WS endpoint).
- Server-side state that is *not* engine state: chat history, presence,
  draft-typing locks, room metadata.

## Context

ADR-153 placed a long-running `GameEngine` inside a per-room Deno
subprocess; commands streamed in over stdin/stdout, narrative streamed
back, and ADR-162 layered on a full `world.toJSON()` push every turn so
clients could mirror the world.

Three problems compounded:

1. **WS reconnect is structurally fragile.** Per-room in-memory engine
   state means any connection blip risks state loss; the client must
   resync the full mirror after every reconnect (see Phase 4 of the
   2026-04-28 e2e session — 60% flake under parallel load).
2. **Save / restore is dormant code.** The path that loads `ISaveData`
   into a fresh engine only runs when a player clicks Save. The bug
   fixed in `0ea2ba9f` (`engine.executeTurn('restore')` blocked by
   `restoringAction.validate()` because the multi-user sandbox doesn't
   populate `sharedData.saves`) had been latent for weeks because no
   automated turn exercised that code path.
3. **Wire bandwidth is dominated by a mirror nobody asked for.** Every
   turn carries the entire world snapshot so the client *can* render
   anything, but in practice the client renders a status line, prose,
   and a chat panel. The wire is shaped for capability, not need.

The `tools/server` directory has been removed from `main` and preserved
on `legacy/tools-server`. The brainstorm at
`docs/brainstorm/stateless-multiuser/overview.md` captured the
exploration that led to this ADR.

A second observation: `packages/text-blocks/src/types.ts` already cites
FyreVM by name, defines 12 `CORE_BLOCK_KEYS`, and routes engine output
by key. The platform already speaks channel-style emission internally —
the multi-user wire just isn't shaped that way.

## Decision

**The multi-user server holds no engine state in memory between turns.
Each command loads the room's saved blob, runs the engine in-process
(Node, no Deno), snapshots back, emits a sparse channel-I/O packet to
subscribers, and discards the engine. Save and restore are on the hot
path — every turn is a restore.**

Eight constituent decisions follow.

### 1. Engine runs in-process (Node) — no Deno subprocess

Sharpee public instances run admin-installed well-known story bundles
only. There is no untrusted-code threat model. The Deno boundary is not
load-bearing.

The engine, world model, and language packages run inside the same Node
process as the HTTP server. `tools/server/src/sandbox/` and the
`deno-entry.ts` mechanism are deletable. Per-turn cost drops from
~150–300 ms (Deno cold spawn) to ~5–20 ms (in-process load + execute).

If untrusted bundles ever become a goal, a worker pool (Deno-per-turn,
or a Node `worker_threads` pool with capability isolation) can be
reintroduced as the per-turn execution surface without changing the
wire or the channel model. The pivot is reversible at the worker
boundary.

### 2. Wire format is fyrevm-style channel I/O

Two packet kinds are defined.

**CMGT (channel manifest)** — emitted once per session, before any
`turn` packet:

```ts
interface CmgtPacket {
  kind: 'cmgt';
  channels: ChannelDefinition[];
}
```

**Turn (per-turn delta)** — emit behavior is controlled per-channel
via the `emit` field on `ChannelDefinition`:

```ts
interface TurnPacket {
  kind: 'turn';
  turn_id: string;
  payload: { [channelId: string]: TextValue | NumberValue | JsonValue };
}
```

Per-channel emit policy:

- **`emit: 'always'`** — the channel is populated in every turn packet.
  Replace-mode channels emit their current value (changed or not);
  append-mode channels emit any new entries (possibly an empty array,
  but the channel key is always present); event-mode channels remain
  the natural exception — they emit only when the event fires, since
  they have no "current value" to carry on idle turns.
- **`emit: 'sparse'`** — the channel appears in a turn packet only when
  its value changed (`replace`) or new entries were produced
  (`append`/`event`). Idle channels with this policy do not appear.

**Standard channels register with `emit: 'always'`.** All 13 channels
from decision 5 are populated every turn. Clients can rely on every
standard channel being present in every turn payload — no
last-known-value tracking on platform state, mid-session joiners can
bootstrap from any recent turn packet for standard channels without
a replay synthesis, and multi-user fan-out doesn't need per-recipient
delta tracking. The bandwidth cost is trivial because standard-channel
values are scalar (`turn`, `location`, `score`, `prompt`) or small
objects (`info`).

**Story channels default to `emit: 'sparse'`.** Most story-registered
channels carry large or rarely-changing structured payloads (the
Alderman's `evidence` pile, an image-layer manifest, an animation
spritesheet reference). Sparse-emit cuts real bandwidth on those.

**Stories can opt into `emit: 'always'` per channel.** When the
renderer benefits from current values every turn — countdown timers,
decay indicators, current-state gauges, ephemeral UX surfaces whose
"current" reading the UI must always have without tracking last-known
state — the author registers the channel with `emit: 'always'`. The
opt-in is per channel, so an author can mix policies inside one story
(notebook = sparse; stamina = always).

CMGT is the wire schema. Without it, the client cannot decode subsequent
emissions. It must be the first message after connection.

ADR-162's `OUTPUT` / `RESTORED` / `welcome` / `RoomSnapshot` frames are
deleted; the `world: SerializedWorldModel` field is deleted; the
`ReadOnlyWorldModel` `Pick<>` projection at
`tools/server/src/wire/world-mirror.ts` is deleted; the client's
`hydrateWorld` reducer logic is deleted.

### 3. Three content types — `text`, `number`, `json`

```ts
type ChannelContentType = 'text' | 'number' | 'json';
```

- `text` — plain string. Renderer writes it verbatim or styles it.
- `number` — integer or float. Engine emits `42`; client formats with
  locale and layout.
- `json` — structured object. Escape hatch for any author-defined complex
  surface, and for the platform's `main` channel which carries
  `TextContent[]` (so decoration metadata survives the wire).

No `boolean`, no `text[]`. `json` covers anything the three primitives
don't. Stay tight.

### 4. Channel IDs are strings — not 4-byte ASCII integers

FyreVM packed channel names into 4-byte ASCII ints because Z-machine.
We have JSON; the channel `id` *is* the wire identifier. One concept,
not two.

### 5. Standard channel set (13) — Sharpee adaptation of FyreVM

The platform pre-registers thirteen channels. Default platform routing
rules (decision 7 below) cover the engine-sourced channels; the
server-sourced channels (`chat`, `presence`, `command_echo`) are
populated by `produceTurnPacket`'s `serverContext` / `command` inputs.

| ID             | Type   | Mode    | Source | Notes                                                          |
| -------------- | ------ | ------- | ------ | -------------------------------------------------------------- |
| `main`         | json   | append  | engine | Narrative prose; `TextContent[]` per emission (decorations)    |
| `prompt`       | text   | replace | engine | Input prompt (default `> `)                                    |
| `location`     | text   | replace | engine | Status-line location name                                      |
| `score`        | json   | replace | engine | `{ current: number, max: number \| null }`                     |
| `turn`         | number | replace | engine | Turn count                                                     |
| `death`        | text   | event   | engine | Death notification                                             |
| `endgame`      | text   | event   | engine | Endgame text                                                   |
| `score_notify` | text   | event   | engine | Transient score-change announcement                            |
| `info`         | json   | replace | engine | `{ title, author, version }` — emitted at start, re-emitted on ABOUT |
| `ifid`         | text   | replace | engine | IFID — emitted at start, re-emitted on ABOUT                   |
| `chat`         | json   | append  | server | `{ from, text, ts }` — server-only                             |
| `presence`     | json   | replace | server | Roster — server-only                                           |
| `command_echo` | json   | append  | server | `{ actor_handle, text, ts }` — every command broadcast to all room subscribers |

`mode` semantics (consumed by clients):

- `replace` — newest value supersedes prior values for that channel.
  Persistent: a mid-session join replays the latest value.
- `append` — value is added to a chronological list (transcript-shaped).
  Persistent: a mid-session join replays the full list.
- `event` — transient signal; client renders once and discards. Not
  persisted; mid-session joins do not see prior `event` emissions.

The principle: **channels are for separate UI surfaces, not for state
mirrors.** If the player can ask for a fact via a verb (inventory,
exits, look), the answer goes to `main`. If a fact has a dedicated UI
slot (status line, score display, command transcript) or fires as a
transient signal (death, score change), it gets a channel.

`info` and `ifid` are `replace`-mode rather than emit-once because the
ABOUT command re-emits them. The client renders the new value (which
is normally identical to the prior value) — `replace` semantics handle
that uniformly. There is no special "emit-once" channel mode.

`command_echo` carries every player command, including the issuing
player's own. The client decides whether to render its own commands
(usually yes, for transcript fidelity) or suppress them and rely on a
local input echo. Broadcast-to-all-subscribers is the wire-level
guarantee.

### 6. Rendering is author-overridable; the platform ships defaults

The web client ships **standard defaults for every channel**: `main`
renders as scrolling prose, `location` / `score` / `turn` populate a
status line, `chat` and `presence` populate sidebars, `command_echo`
threads commands into the transcript. These defaults work
out-of-the-box for any well-behaved story.

**Authors can override any rendering for their own story.** A story
bundle declares which parts of the UI it customizes — from a single
custom-channel renderer (e.g. a `combat` panel for a `json` channel)
to restyled prose, to a wholly-rethemed status line, to a complete
layout. Where the platform ships a default, the author's override
replaces it; where the platform has no default (a custom channel),
the author supplies the renderer.

A story registers a custom channel in its bundle's init code:

```ts
channelService.registerChannel({
  id: 'combat',
  contentType: 'json',
  mode: 'event',
});
```

The CMGT manifest advertises the channel; the client looks up the
matching renderer (story-supplied or platform-supplied). If neither
exists, the client falls back to a generic JSON-tree view (degraded
but functional).

**The wire shape is independent of the renderer.** Channel I/O carries
data. Whether a `main` emission renders as scrolling prose, a
typewriter animation, or a comic-strip panel is a client-side
decision driven by the active renderer. The server emits the same
packet regardless.

**Concrete example — `stories/thealderman/docs/detective-sheet.jsx`.**
A story-authored UI sketch for a Clue-style deduction game. Three
panes:

- **Evidence pile** (auto-populated). Story-defined `evidence` channel
  (`json`, `append`, engine-sourced). Each emission is a structured
  card — `{ id, kind: 'claim' | 'observation' | 'inference', source,
  text, salience, turn }` — produced by the engine when the PC
  encounters claims or observations during play.
- **Case board** (player-curated suspect / weapon / location columns).
  Two state surfaces here. The candidate lists themselves come from a
  story-defined channel (`json`, `replace`) — re-emitted only when
  the candidate set changes (typically once at session start, plus
  any narrative events that introduce or eliminate candidates). The
  player's *eliminations* and *suspicions* are working-pad state — not
  world state, not engine knowledge — and round-trip via a `notebook`
  capability the client posts back via story-specific commands
  (SUSPECT, CLEAR). Channel-service emits a `notebook`-channel packet
  (`json`, `replace`) whenever the capability changes, so the
  renderer's working pad survives reconnects and mid-session joins.
- **Assertions list.** Story-defined `assertions` channel (`json`,
  `append`). Each entry is a structured tuple — `{ verb, target:
  { kind, id }, supporting: [evidenceId...], note }` — emitted by the
  story's deduction verbs (IDENTIFY GAP, CONTRADICT). Hover-highlight
  edges back to the evidence pile are a pure renderer concern; the
  channel data carries the supporting-evidence ids and the renderer
  draws the connections.
- **The notebook / parser pane.** Platform-standard `main` and
  `command_echo` channels, completely restyled — Playfair Display
  italic for narrative, IBM Plex Mono for input, oxblood and brass on
  cream paper, dark-paper terminal block for the transcript. Same
  wire content as the platform default; totally different surface.

The platform's default web client would render this same packet
stream as scrolling prose with a status line. The author's renderer
makes it a deduction-game notebook. The ADR's wire model is the same
either way: CMGT manifest at session start (registering `evidence`,
`assertions`, `notebook` alongside the standard 13), sparse `turn`
packets carrying only changed channels, no special protocol
extension. The footer note in the sketch captures the principle:
*"the diagram is a sibling surface to the prose; both consume the
same domain events."*

This exemplar is a deliberate stress test of the wire contract:
custom channels, custom verbs, custom render rules, client-supplied
state that round-trips through a capability — all expressible inside
the ADR-163 model without protocol changes. Future story examples
that *cannot* be expressed this way are the signal to revisit the
wire.

**The author-override mechanism is out of scope for this ADR.** How
renderer assets physically ship in the `.sharpee` bundle, how the
server serves them, how the client loads them, and what security
boundary applies (CSP, sandboxed iframe, signed bundles, etc.) is the
subject of a separate forthcoming ADR. The channel wire contract in
this ADR is stable across whatever mechanism is chosen.

### 7. `@sharpee/channel-service` is a new package

**Location**: `packages/channel-service/`.

**Public API**:

```ts
// Channel definition (sent to client in CMGT manifest)
interface ChannelDefinition {
  id: string;
  contentType: 'text' | 'number' | 'json';
  mode: 'replace' | 'append' | 'event';
  emit?: 'always' | 'sparse';   // default 'sparse'
}

// One TextBlock can match multiple rules and emit to multiple channels
// (e.g., room.name → both `main` (append) and `location` (replace)).
// The target channel's `mode` is the source of truth; rules don't
// carry mode.
interface ChannelRule {
  when: {
    key?: string;                        // exact match
    keyPattern?: string | RegExp;        // pattern match
    keyPrefix?: string;                  // sugar for keyPattern
    decoration?: string;                 // any content carrying this decoration type
    custom?: (block: ITextBlock) => boolean;
  };
  emit: {
    channel: string;                     // must be a registered channel id
    extract?:
      | 'content'                        // pass through TextContent[]
      | 'string'                         // flatten to plain string
      | 'number'                         // parse as integer
      | ((block: ITextBlock) => unknown);
  };
  priority?: number;                     // higher = checked first; default 0
}

// Registries — imperative
function registerChannel(def: ChannelDefinition): void;
function getChannelRegistry(): ChannelDefinition[];
function addRule(rule: ChannelRule): void;
function addRules(rules: ChannelRule[]): void;

// Bootstrap (once per session)
function produceCmgtManifest(): { channels: ChannelDefinition[] };

// Per-turn producer (sparse — only changed channels emit)
function produceTurnPacket(input: {
  textBlocks: ITextBlock[];
  events: DomainEvent[];
  world: WorldModel;
  command?: { actor_handle: string; text: string };
  serverContext?: { chat?: ChatEntry[]; presence?: Roster };
  prevValues?: Record<string, unknown>;
}): { turn_id: string; payload: Record<string, unknown> };
```

**Conflict resolution**: if two rules emit to the same `replace`-mode
channel in the same turn, higher priority wins; ties go to registration
order (first-registered wins). Documented invariant — no runtime
warning.

**Default rule set**: channel-service ships a `platformRules` array
covering the 12 `CORE_BLOCK_KEYS` defined in
`packages/text-blocks/src/types.ts`. The 12 standard channels are
pre-registered. Stories opt out by clearing rules (rare) or override by
registering higher-priority rules for the same `key`.

**Dependencies**:

- `@sharpee/core` — events, primitive types.
- `@sharpee/world-model` — read-only snapshot input.
- `@sharpee/text-blocks` — `ITextBlock`, `CORE_BLOCK_KEYS`.
- *Not* `@sharpee/engine` — engine produces the inputs but never imports
  channel-service.
- *Not* `@sharpee/lang-en-us` — the language layer has already rendered
  text by the time channel-service runs.

**Boundary statement**:

- **OWNER**: server-side bounded context. Runs in-process where the
  engine runs (Node).
- **SHARED?**: yes — channel definitions cross the wire. Server
  registers and emits; client receives via CMGT and renders. Both sides
  import `ChannelDefinition`, `ChannelContentType`, and packet types
  directly from a shared protocol module (CLAUDE.md rule 7b).
- **PROMISE**: the engine's output shapes (`ITextBlock`, `DomainEvent`,
  `WorldModel`) are the input contract. Engine never imports
  channel-service.
- **ALTERNATIVES**: leaving this in `tools/server/src/` would tie
  channels to the multi-user product. A package keeps single-user
  surfaces (zifmia, CLI) able to consume the same wire format if
  useful.

### 8. CMGT-first bootstrap order

Strict ordering (matches FyreVM's "content management rule listed
first"):

1. `cmgt` — channel registry manifest. Pure schema; no values.
2. First `turn` packet — carries `info` and `ifid` (story metadata)
   alongside the opening location and narrative. The engine emits
   `info`/`ifid` on the first turn; channel-service routes them.
3. Subsequent live turns.

A client that connects mid-session receives `cmgt` first, then a
synthesized "current state" packet carrying the latest values of all
persistent channels (`replace` and `append` modes — `event` channels
are not replayed). The live stream then resumes.

When the player issues an ABOUT command, the engine re-emits `info`
and `ifid` as part of that turn's output. Because both channels are
`replace`-mode, the client renders the (typically unchanged) values
without special handling.

### 9. Per-room state lives entirely in the save blob — transcript travels with the world

The room's only server-side engine state is its current saved blob in
the DB. There is no `engine_state` cache, no in-memory `WorldModel`, no
sticky-session routing. Any worker can serve any room's next turn.

To make mid-session join work without a separate `turn_packets` table,
the **transcript of channel packets is stored as a world-model
capability**:

- After each turn, channel-service writes the produced packet into the
  room's `transcript` capability via `world.updateCapability(...)`.
- `world.toJSON()` captures the transcript as part of the snapshot
  automatically; `world.loadJSON()` restores it.
- The engine never reads the transcript capability — it is purely
  consumer-side state, written by channel-service and consumed by the
  wire.
- Mid-session join replays the transcript with a `replay: true` flag so
  the client renders in transcript-builder mode (no transient `event`
  channels surface as toasts; `replace` channels render as their final
  value only).

**Save-blob format bumps to v3.** v2 saves restore correctly under v3 —
the transcript capability simply starts empty. No auto-delete of legacy
saves; per CLAUDE.md memory the next save-format change uses a version
reader rather than a hard break.

## Invariants

- **No engine state in memory between turns.** Every turn is
  `load-blob → execute → snapshot → emit → discard`. A worker that
  retains a `WorldModel` reference past the end of a turn is a bug.
- **CMGT before any turn.** The first packet a client receives is
  always `cmgt`. A client that receives a `turn` packet before `cmgt`
  must drop the connection and reconnect.
- **Channel registration is closed before CMGT emits.** Stories
  register channels in init; the manifest is computed once and frozen
  for the session. Late `registerChannel` calls during a turn are an
  error.
- **Per-channel emit policy.** A channel registered with `emit:
  'always'` appears in every turn packet (replace-mode emits current
  value; append-mode emits any new entries, possibly an empty array;
  event-mode is the natural exception — only emits on fire). A
  channel registered with `emit: 'sparse'` (the default) appears only
  when its value changed or new entries were produced.
- **Standard channels populate every turn.** All 13 standard channels
  register with `emit: 'always'`. Including `info` and `ifid`, which
  carry near-static values; the bandwidth cost is negligible and the
  rule stays uniform.
- **Story channels default to sparse-emit.** Story-registered channels
  default to `emit: 'sparse'`. Authors opt into `emit: 'always'` per
  channel for ephemeral UX surfaces (countdown timers, decay
  indicators, current-state gauges) whose renderer benefits from
  current values every turn.
- **Mode lives on the channel, not on the rule.** A channel always
  behaves the same way regardless of which rule routed a block to it.
- **Single writer per turn.** The engine produces the inputs; the
  channel-service produces the packet; the wire emits. No mid-turn
  amendments.
- **Transcript is consumer-side state.** The engine never reads the
  transcript capability. The transcript can be reset, truncated, or
  replayed without affecting world correctness.
- **Save-blob is the only per-room server state.** The DB row carrying
  the most recent save *is* the room. No shadow caches, no in-memory
  world maps.

## Acceptance Criteria

1. **AC-1**: `@sharpee/channel-service` package exists at
   `packages/channel-service/`, exposes the API in decision 7, and
   pre-registers the 13 standard channels from decision 5 (10 engine,
   3 server). `platformRules` covers all 12 `CORE_BLOCK_KEYS`.
2. **AC-2**: Wire protocol module (shared by client and server)
   exports `CmgtPacket`, `TurnPacket`, `ChannelDefinition`, and
   `ChannelContentType`. Client and server both import these types
   directly — no duplication.
3. **AC-3**: A round-trip test exercises `produceCmgtManifest()` →
   client decodes → `produceTurnPacket()` for a sample TextBlock+event
   batch → client renders. Asserts on rendered values for `main`,
   `location`, `score`, `turn`.
4. **AC-4**: Save-blob format bumps to v3. The `transcript` capability
   is captured by `world.toJSON()` and restored by `world.loadJSON()`.
   Test: produce 3 turns of packets, save, restore into a fresh world,
   assert transcript matches.
5. **AC-5**: v2 save loads under v3 with an empty transcript capability.
   Test: load a fixture v2 save, assert no exception, assert
   `world.getCapability('transcript')?.entries === []` (or equivalent).
6. **AC-6**: Mid-session join replays the transcript with `replay:
   true`. Test: produce 5 turns into a room, connect a second client,
   assert it receives `cmgt`, then 5 `turn` packets each carrying
   `replay: true`, then live stream resumes.
7. **AC-7**: Per-channel emit-policy invariants.
   - **Test (a) `emit: 'always'` populate-every-turn**: a turn that
     does not change the score still emits a `score` key in the payload
     carrying the unchanged `{ current, max }`. Verified across all 13
     standard channels (which all register `emit: 'always'`).
   - **Test (b) `emit: 'sparse'` skip-when-unchanged**: register a
     story `replace`-mode channel as `'sparse'` (or omit the field —
     it's the default), emit once, then run a turn that does not touch
     it. Assert the channel key is absent from the second turn's
     payload.
   - **Test (c) story-channel opt-in to `'always'`**: register a story
     `replace`-mode channel with `emit: 'always'`. Emit once. Run a
     turn that does not change it. Assert the channel key still
     appears in the second turn's payload with the unchanged value.
8. **AC-8**: Conflict resolution. Test: two rules registered against
   the same `key`, both emitting to the same `replace`-mode channel.
   Higher-priority rule's value wins; ties resolved by registration
   order.
9. **AC-9**: CMGT-first invariant enforced in the server. Test: server
   does not emit any `turn` packet before its `cmgt` packet, even if
   the engine produces output during init.
10. **AC-10**: Per-turn cost. The in-process engine load-execute-save
    loop completes in under 50 ms (p95) on the dungeo story for a
    representative command (`look`). Recorded in the implementation
    plan; not a hard ceiling but a regression baseline.

## Consequences

**Positive:**

- **Save / restore is the hot path.** Latent bugs in the save/restore
  pipeline become impossible to ignore. The 2026-04-28 restore-routing
  bug would not have survived ten minutes of fyrevm-style play.
- **WS reconnect is a non-event.** No per-session in-memory state.
  The next command from the reconnected client just kicks the same
  load-execute-save loop.
- **Trivial horizontal scaling.** Any worker can serve any room's next
  turn. No sticky-session routing, no warm-room scheduler.
- **Crash recovery is automatic.** A turn that crashes throws away the
  *worker's* engine; the next turn reloads the most recent saved blob.
  Sandbox crash modal becomes vestigial.
- **Wire bandwidth drops dramatically.** Sparse channel packets vs full
  `world.toJSON()` per turn. Typical turn packet for dungeo is expected
  to be ~1 KB (vs ~64 KB gzipped under ADR-162).
- **One serializer for two paths.** Save and per-turn snapshot use the
  same `world.toJSON()`; one source of bugs, not two.

**Negative:**

- **Per-turn engine instantiation cost.** ~5–20 ms in-process. Bounded;
  tracked in AC-10. Mitigated by Node v8 JIT warm path.
- **Save size grows with transcript.** ~1 KB/turn after gzip; 1000-turn
  session ≈ 1 MB save. Acceptable for typical IF session length.
- **Renderer parity loss.** ADR-162's "renderer queries the world like
  Zifmia does" pattern goes away in the multi-user client. The status
  line, future map / inventory panels are now driven by channel values,
  not by `world.getEntity(...)` calls. Equivalent expressiveness via
  custom `json` channels.
- **Story authors learn channels.** The platform's default rule set
  covers stock IF; custom UI surfaces require registering a `json`
  channel and (for v1) using a platform-shipped renderer.
- **One-shot cutover.** The live `play.sharpee.net` instance's existing
  rooms and saves are wiped on deploy. Per CLAUDE.md memory ("server
  admin owns lifecycle"), this is an explicit non-goal of backwards
  compatibility.

## Resolved Implementation Choices

- **Engine isolation surface**: in-process Node. No subprocess. No
  Deno. Worker boundary deferred until untrusted bundles are a goal.
- **Wire framing**: JSON-encoded `CmgtPacket` and `TurnPacket` over the
  existing transport. WS remains the transport for broadcast fan-out;
  HTTP can carry single-room request-response if a future client
  prefers it (the wire shape is transport-agnostic).
- **Channel id type**: string. No integer packing.
- **Mode location**: on `ChannelDefinition`, not on `ChannelRule`.
- **Default rules location**: shipped with `@sharpee/channel-service`
  as `platformRules`.
- **Story metadata emission**: stories emit `info` as a structured
  TextBlock; no server-side `extract: 'metadata'` parser of
  `game.banner`.
- **Mid-session join replay marker**: `replay: true` flag on `turn`
  packets emitted from the transcript capability.
- **Save format version**: v3. The v2 → v3 bump is additive (transcript
  capability is the only new field). No auto-delete.
- **Renderer extensibility**: author-overridable. The platform ships
  defaults for every standard channel; stories can replace any
  default and supply renderers for any custom channel. The asset
  pipeline / serving / security model is deferred to a separate ADR;
  the wire contract holds across whichever mechanism lands.

## Open Questions for Implementation

- **Q-D — Single-user adoption.** Does the REPL client adopt the
  channel protocol, or stay on the current text-block stream? Channel
  I/O is the wire shape that matters for multi-user; whether single-
  user surfaces (CLI, zifmia) consume the same wire is a separable
  decision. Non-blocking; affects `channel-service` reuse story.
- **Q-F — `info` / `ifid` packet timing.** Confirmed in decision 8 that
  CMGT carries schema only and `info`/`ifid` ride a first `turn`
  packet. If a renderer requires `info` *before* the first turn renders
  (e.g., to set the document title), a `bootstrap` packet kind may be
  added between CMGT and the first turn. Not blocking v1.
- **Q-G — Saves UX.** Under stateless every turn produces a save. The
  player-facing "Save" button now *names* a blob that already exists.
  Open: keep the named-saves UX, or replace with "rewind one turn / N
  turns"? Affects the saves-table schema and the Save UI component;
  does not affect channel-service or the wire.
- **Author-override asset pipeline.** Decision 6 establishes that
  authors can override any renderer; the *mechanism* — how renderer
  assets physically ship in the `.sharpee` bundle, how the server
  serves them, how the client loads them, what security boundary
  applies (CSP, sandboxed iframe, bundle signing) — is the subject of
  a separate forthcoming ADR. The channel wire contract in this ADR
  is stable across whichever mechanism lands.

## Constrains Future Sessions

- **Wire protocol versioning.** `CmgtPacket` and `TurnPacket` are
  versioned by a `protocol_version` field on CMGT (initial value `1`).
  Any breaking change to either packet shape bumps the version.
- **Channel-service inputs are the engine's output contract.** Any
  change to `ITextBlock`, `DomainEvent`, or `world.toJSON()` shape that
  affects the produced packet must be evaluated against
  channel-service's default rules. The engine never imports
  channel-service, but channel-service imports the engine's output
  types — so a one-way coupling is enforced.
- **No mid-turn channel emissions.** The wire is one packet per turn.
  Streaming partial output during a long-running command is a separate
  capability that would require a new packet kind (e.g.,
  `turn_progress`); it does not exist in v1.
- **Transcript capability ownership.** Channel-service writes; the
  engine never reads. Future capabilities that need transcript data
  must read it via the same world-model API (`world.getCapability`),
  not via a side channel from channel-service.
- **No untrusted bundles.** This ADR explicitly rests on the trust
  boundary that admin-installed stories are safe to run in-process. A
  future ADR that opens public story uploads must reintroduce a worker
  boundary; the wire and channel model continue to work unchanged on
  the other side of that worker.

## References

- ADR-153 (REPLACED): Multiuser Sharpee Server.
- ADR-153a (REPLACED): Phase-4 Amendments.
- ADR-156 (REPLACED): Multiuser Browser Client.
- ADR-162 (REPLACED): World-Model Replication.
- ADR-161: Persistent Identity (carries forward).
- Brainstorm: `docs/brainstorm/stateless-multiuser/overview.md` —
  D1–D8 decisions and the longer rationale.
- `packages/text-blocks/src/types.ts:67` — FyreVM attribution and the
  channel-routing claim already in the codebase.
- `packages/text-blocks/src/types.ts:149` — `CORE_BLOCK_KEYS` (12
  keys mapped onto the standard channel set in decision 5).
- `packages/world-model/src/world/WorldModel.ts:208-209` —
  `toJSON` / `loadJSON` (the only per-room state carrier under this
  ADR).
- `legacy/tools-server` (origin branch) — preserved ADR-153 / 156 /
  162 implementation; reference for HTTP routes, identity helpers,
  Playwright e2e patterns.
- Original FyreVM channel I/O design — David Cornelson, 2010-era
  fyrevm-server.
- `stories/thealderman/docs/detective-sheet.jsx` — story-authored
  case-board UI sketch for a Clue-style deduction game; cited in
  Decision 6 as a stress test of the wire model (custom channels,
  custom verbs, client-side working-pad state round-tripping via a
  capability). Future examples that don't fit this shape are the
  signal to revisit the wire contract.

## Session

2026-04-28 main — derived from a session that began as e2e Phase 2–4
implementation, surfaced a structurally fragile reconnect path, and
ended in an architectural pivot. The brainstorm at
`docs/brainstorm/stateless-multiuser/overview.md` captures the longer
exploration. ADRs 153, 153a, 156, and 162 were marked REPLACED on the
same day; this ADR is the replacement.
