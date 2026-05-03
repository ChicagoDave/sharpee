# ADR-163: Channel-Service Platform — Universal Wire and Author-Controlled Media

## Status: ACCEPTED (rewritten 2026-05-02)

## Date: 2026-04-28 (original) — 2026-05-02 (rewritten: closure-per-channel)

## Replaces

- **ADR-101** (Graphical Client Architecture, Proposed 2026-01-14) —
  author-controlled media events. Never implemented; folded into the
  channel-I/O wire by this ADR.
- **The original ADR-163** (rule-based routing, 2026-04-28 / 04-29 / 05-01)
  — replaced in place. The original specified a rule schema (`ChannelRule`
  with `when` predicates and `extract` strategies) routing text-blocks
  and events to channels by key/type matching. Implementation work in
  Phases 1–3 (channel-service package, CLI migration) was built on that
  model. The model is replaced by a simpler one in which each channel
  definition carries a TypeScript closure that produces its own value
  per turn. The wire format (hello / cmgt / turn / command packets)
  is unchanged; only the producer-side machinery changes.

ADR-153 / 153a / 156 / 162 are the predecessor multi-user-specific
ADRs; they are replaced by **ADR-164** (which builds on this ADR's
wire). See ADR-164's Replaces section for the multi-user supersession
chain.

## Carries forward unchanged

- **ADR-161** (Persistent Identity) — `{id, handle, passcode}` triple
  is orthogonal to the wire model.
- **ADR-129** (ScoreLedger) and engine internals.

## Carries forward (from ADR-101) as principle

- **Author-controlled media presentation.** The story author has full
  control over multimedia presentation. The engine and stdlib emit
  channel values; the client renders them.
- **Client is a renderer, not an interpreter of game semantics.**
- **Graceful degradation is the author's responsibility, not the
  client's.** Stories check declared client capabilities and only
  populate channels the client will honor.

## Relationship to ADR-164

This ADR defines the **platform**: the universal channel-I/O wire,
the channel-service package, and the platform vocabulary of channels.
**ADR-164** is the downstream consumer that defines the stateless
multi-user server. ADR-164 builds on this ADR's wire and adds three
server-sourced channels (`chat`, `presence`, `command_echo`), the
per-room save-blob model, the transcript capability, and the
mid-session join replay. Single-user surfaces (CLI, platform-browser)
do not depend on ADR-164.

## Context

Three threads converge.

**Thread 1: ADR-101 was paper.** ADR-101 specified `media.image.show`,
`media.sound.play`, `media.music.play`, `media.ambient.play`,
`media.layout.configure`, `media.animation.play`, `media.transition`,
plus a `ClientCapabilities` negotiation. None was implemented. The
absence of an implementation made consolidation cheap.

**Thread 2: text-service is a pragmatic interim.** text-service was
proposed in 2025 to ship Dungeo and burn the platform into working
shape. It was accepted as deferral-to-ship, not as the architectural
destination. Channel I/O has been the design intent since the
2010-era fyrevm-server.

**Thread 3: a story should run identically across surfaces.**
Single-user surfaces (zifmia, platform-browser, CLI) and any
multi-user surface that arrives later should consume the same wire.
A story like The Alderman registers custom channels, ships its own
renderer, and synthesizes commands from UI gestures; that contract
must hold whether the player is in a browser, a desktop app, or a
terminal.

The original ADR-163 (April 2026) consolidated these into a wire
model based on rule-matched routing: text-service produces `ITextBlock`s,
channel-service rules match block keys and event types, extracted
values flow to channels. Phases 1–3 implemented that model.

Phase 4 implementation surfaced a structural awkwardness. The status
channels (`score`, `turn`) require values that no production code
emits — `status.score` and `status.turns` blocks exist only in test
fixtures. The architectural fix is to let channels read their values
from where the data actually lives (world capabilities, engine state)
rather than route them through synthetic intermediate blocks. That
fix collapses the channel/rule duality: a channel defined with a
TypeScript closure that reads world/events/blocks/turn-count produces
its own value cleanly. The rule schema becomes redundant.

This ADR documents the closure-per-channel model.

## Decision

**The channel-I/O wire is the universal consumer contract for every
Sharpee surface. Every surface — CLI, platform-browser, zifmia, and
any multi-user server — speaks `hello` / `cmgt` / `turn` / `command`
packets via `@sharpee/channel-service`. Each channel definition
includes a TypeScript closure that produces the channel's value for
the current turn, given world / events / text-blocks / turn count
/ previous value. Standard platform channels live in stdlib (alongside
language messages and grammar templates); stories register additional
channels through the same API. text-service is retired in its
wire-producing role.**

---

### 1. Channel I/O is the universal wire

Every surface — CLI, platform-browser, zifmia, multi-user — speaks
the same four-packet wire model:

- **`hello`** (client → producer) — capability declaration.
- **`cmgt`** (producer → client) — channel manifest, filtered by
  client capabilities.
- **`turn`** (producer → client, per turn) — channel values for this
  turn.
- **`command`** (client → producer) — player input.

Wire packets are JSON over whatever transport the surface uses. The
CLI and platform-browser run in-process (no transport); ADR-164's
multi-user server runs over WebSocket. The shape is identical.

### 2. Capability handshake — `hello` packet

The client opens the session by declaring what it will honor:

```ts
interface HelloPacket {
  readonly kind: 'hello';
  readonly capabilities: ClientCapabilities;
}

interface ClientCapabilities {
  // Display
  readonly text: true;            // always true; required of every Sharpee surface
  readonly images: boolean;
  readonly animations: boolean;
  readonly video: boolean;
  // Audio
  readonly sound: boolean;
  readonly music: boolean;
  readonly speech: boolean;
  // Layout
  readonly splitPane: boolean;
  readonly statusBar: boolean;
  readonly sidebar: boolean;
  // Input
  readonly clickableText: boolean;
  readonly clickableImage: boolean;
  readonly dragDrop: boolean;
  // Advanced
  readonly transitions: boolean;
  readonly layers: boolean;
  readonly customFonts: boolean;
  // Optional
  readonly screenWidth?: number;
  readonly screenHeight?: number;
}
```

A capability flag set to `true` is a **promise** the client will do
something sensible with packets routed to channels gated by that
flag. Clients that don't honor a capability declare it `false`;
channels gated by that flag are filtered from the manifest at
`ChannelService.buildManifest()` time and do not appear in turn packets.

The standard `@sharpee/platform-browser` declares `text`, `sound`,
`music`, `statusBar`, `customFonts` true and the rest false. Richer
clients (a future graphical client, an electron desktop, etc.) ship
in separate packages and declare what they support.

### 3. Content types — `text`, `number`, `json`

Channels declare a `contentType`:

- `text` — plain string.
- `number` — finite number.
- `json` — anything JSON-serializable; typed by the channel's
  consumer.

Content type is a wire-level shape contract. The `main` channel
carries `TextContent[]` (a `json` channel). The `score` channel
carries `{ current: number; max: number | null }` (a `json` channel).
The `prompt` channel carries a flat string (`text`). Content types
exist for client-side dispatch — a client can route all `text`
channels to a generic text renderer if it wants.

### 4. Channel mode — `replace`, `append`, `event`

Each channel declares one of three modes:

- **`replace`** — the channel's current value is the most recent
  emission; later emissions overwrite earlier ones. Used for status
  surfaces (`score`, `turn`, `location`), images-by-layer, music.
- **`append`** — each emission contributes one or more entries to
  an accumulating buffer. Used for narrative prose (`main`).
- **`event`** — emissions are transient signals; clients react to
  them and don't accumulate. Used for sound effects, transitions,
  death notifications.

For `append`-mode channels, the **payload value carries new entries
only** — not the accumulated history. The client owns accumulation.
This matters for repaint: a fresh client joining mid-session
reconstructs the full transcript by replaying the `cmgt` manifest +
the persisted turn packets.

### 5. Per-channel emit policy — `always` / `sparse`

Each channel declares an emit policy:

- **`always`** — the channel appears in every turn packet, whether
  it changed or not. The producer re-emits the previous value on
  idle turns. Used for status surfaces and the prompt — clients
  joining mid-session see current state without waiting for a change.
- **`sparse`** — the channel appears only when it changes (replace
  mode), receives new entries (append mode), or fires (event mode).
  Used for things like custom story channels whose value is only
  meaningful on change.

The `ChannelService` instance maintains a previous-value snapshot
per channel (scoped to that instance — a new session creates a new
`ChannelService`, which starts with an empty cache). Sparse channels
diff against the snapshot; always channels emit unconditionally.

### 6. Channels are self-contained: definition includes producer

A channel is a typed object — an `IOChannel` — with identity (an `id`),
configuration (mode, emit policy, content type, optional capability
gating), and a TypeScript closure that produces the channel's value
for the current turn. Platform code creates `IOChannel` instances;
authors create `IOChannel` instances; same construction, same shape.

The type lives in `@sharpee/if-domain` so every package that touches
channels (channel-service, stdlib, engine, platform-browser, multi-user
web-client) imports the same definition:

```ts
// @sharpee/if-domain — types only, no implementation
interface IOChannel<T = unknown> {
  readonly id: string;
  readonly contentType: ChannelContentType;
  readonly mode: ChannelMode;
  readonly emit: ChannelEmitPolicy;
  /** Capability flag this channel is gated by, if any. */
  readonly gatedBy?: CapabilityFlag;
  /**
   * Produce this channel's value for the current turn.
   *
   * Return:
   *  - `T` to emit the value.
   *  - `undefined` to skip emission this turn (sparse channels stay
   *    quiet; always channels re-emit prevValue).
   *  - `null` to emit a hide / stop / clear signal (used by media
   *    channels per §9 and by `clear` per §12).
   *
   * For `append`-mode channels, return an array of new entries (or
   * `undefined` for "no new entries this turn"). For `replace` or
   * `event` mode, return a single value (or `undefined`).
   */
  readonly produce: (ctx: ChannelProduceContext) => T | T[] | undefined | null;
}

interface ChannelProduceContext {
  readonly world: IWorldModel;
  readonly events: readonly ISemanticEvent[];
  readonly blocks: readonly ITextBlock[];
  readonly turn: number;
  readonly prevValue: unknown | undefined;
}

interface IChannelRegistry {
  add(channel: IOChannel): void;
  get(id: string): IOChannel | undefined;
  all(): readonly IOChannel[];
}
```

The closure runs once per turn, called by `ChannelService.build(ctx)`.
It has full access to:

- the **world** (current state — read score capability, get player
  location, walk the room graph),
- the turn's **events** (fired during command execution),
- the turn's **blocks** (produced by text-service from events),
- the **turn count**,
- this channel's **previous value** (for diff-aware emission
  decisions, append-mode awareness, etc.).

Closures are pure functions of context (and the world is read-only
from the producer's perspective). They do not mutate; they project.

**Why closures, not rules.** A rule schema is a poor man's
function: a `when` predicate and an `extract` strategy that
ultimately compute a value from inputs. TypeScript already has
functions, with type inference, IDE support, and arbitrary
expressiveness. The collapse simplifies the model end-to-end:

- **One concept** to learn (channel-with-producer) instead of two
  (channel + rule).
- **No rule conflict resolution** — each channel id has exactly
  one definition. Story override = re-register with same id.
- **No predicate/extract dichotomy** — the closure is both predicate
  (decide whether to emit) and extractor (compute the value).
- **No special "dynamic channel id" plumbing** — stories register
  specific channel ids (`image:portrait`) directly.
- **No `status.score` / `status.turns` synthetic blocks** — the
  score channel reads `world.getCapability('scoring').scoreValue`
  directly.

### 7. Standard channels live in stdlib's registry

The platform vocabulary of channels — `main`, `prompt`, `location`,
`score`, `turn`, `info`, `ifid`, `death`, `endgame`, `score_notify`,
plus the media channels — lives in `@sharpee/stdlib`. This mirrors how
`@sharpee/lang-en-us` ships standard messages and
`@sharpee/parser-en-us` ships standard grammar; stories extend the
same registry through the same API.

stdlib owns the **channel registry** — an `IChannelRegistry` instance
populated with standard channels at module init. Stories add their
own channels to the same registry through `Story.registerChannels?(registry)`
during engine bootstrap.

```ts
// @sharpee/stdlib/src/channels/registry.ts
import type { IOChannel, IChannelRegistry } from '@sharpee/if-domain';
import { mainChannel, scoreChannel, turnChannel,
         locationChannel, promptChannel, infoChannel,
         ifidChannel, deathChannel, endgameChannel,
         scoreNotifyChannel } from './standard';
import { mediaChannels } from './media';

class StdlibChannelRegistry implements IChannelRegistry {
  private channels = new Map<string, IOChannel>();
  add(channel: IOChannel): void { this.channels.set(channel.id, channel); }
  get(id: string): IOChannel | undefined { return this.channels.get(id); }
  all(): readonly IOChannel[] { return [...this.channels.values()]; }
}

export const channelRegistry: IChannelRegistry = new StdlibChannelRegistry();

// Standard IOChannels added at module init:
for (const ch of [mainChannel, promptChannel, locationChannel,
                  scoreChannel, turnChannel, infoChannel, ifidChannel,
                  deathChannel, endgameChannel, scoreNotifyChannel,
                  ...mediaChannels]) {
  channelRegistry.add(ch);
}
```

Each standard channel is an `IOChannel` instance — declarative data
co-located with the system that owns it (the `score` IOChannel sits
near the scoring capability; the `location` IOChannel sits near the
looking action; etc.). Example:

```ts
// @sharpee/stdlib/src/channels/score.ts
import type { IOChannel } from '@sharpee/if-domain';

export const scoreChannel: IOChannel<{ current: number; max: number | null }> = {
  id: 'score',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  produce: ({ world }) => {
    const cap = world.getCapability('scoring');
    return cap ? { current: cap.scoreValue, max: cap.maxScore ?? null } : undefined;
  },
};
```

Stories override any standard channel by re-registering an `IOChannel`
with the same id — `registry.add(channel)` is last-write-wins on id.
They add new channels with the same call.

### 8. Capability gating

Any channel may declare `gatedBy: CapabilityFlag`. At
`ChannelService.buildManifest()` time, channels gated by a flag the
client declared `false` are filtered from the manifest and do not
appear in turn packets. Standard non-media channels are typically ungated
(they exist on every surface). Media channels are gated by their
respective capability flags:

| Channel | `gatedBy` |
|---|---|
| `image:*` | `images` |
| `sound` | `sound` |
| `music` | `music` |
| `animation`, `animate` | `animations` |
| `transition` | `transitions` |
| `layout` | `splitPane` |
| `clear` | (ungated — see §10) |

Capability gating is **the only filter** between registration and
the wire. Stories register the channels they want; the client's
capabilities determine what reaches the wire.

### 9. ADR-101 media events fold into channels

ADR-101's media events become channel emissions:

| ADR-101 event | Channel | Mode | Closure reads |
|---|---|---|---|
| `media.image.show {layer, src, hotspots, transition}` | `image:<layer>` | replace | events for the layer |
| `media.image.hide {layer}` | `image:<layer>` | replace, returns `null` | events for the layer |
| `media.image.preload {src[]}` | `image:preload` | event | events |
| `media.sound.play {bus, src, volume}` | `sound` | event | events |
| `media.music.play {src, fadeIn, loop, volume}` | `music` | replace | events |
| `media.music.stop {fadeOut}` | `music` | replace, returns `null` | events |
| `media.ambient.play {channel: id, src, ...}` | `ambient:<id>` | replace | events for the id |
| `media.ambient.stop {channel: id}` | `ambient:<id>` | replace, returns `null` | events for the id |
| `media.animation.play` / `media.animate` | `animation` / `animate` | event | events |
| `media.transition` | `transition` | event | events |
| `media.layout.configure` | `layout` | replace | events |
| `media.clear {target}` | `clear` | event | events |

A `null` return on a `replace`-mode media channel signals stop / hide
to the renderer. The wire carries `null`; clients dispatch on it.

The dynamic per-layer / per-id channels (`image:portrait`,
`ambient:wind`) are **not** automatically registered. Stories
register the specific layers/ids they use; their closures filter
events for the relevant layer/id.

### 10. UI gestures are synthesized commands; triggers are one-way

**Triggers (engine → UI) are strictly one-way.** When the engine
emits to `sound`, `transition`, `animation`, or any other event-mode
media channel, the wire packet is fire-and-forget. The engine does
not wait for completion. The next turn fires whenever the next
player command arrives. No "blocking" mechanism, no engine-side
completion tracking.

**This drops ADR-101's `onComplete: string` callback for animations.**
ADR-101 declared that animation events could carry an `onComplete`
event-name the engine would receive when the animation finished.
Under one-way triggers there is no return path for completion. If a
story needs to know an animation finished, the author offers the
player a click affordance ("press any key to continue") and uses a
synthesized command for the click.

**User input from the UI uses synthesized commands.** A click on an
ADR-101-style hotspot:

```ts
// inside a media.image.show payload
hotspots: [
  { id: 'dial1', bounds: { x, y, w, h }, command: 'turn dial 1' },
  ...
]
```

When the player clicks, the client emits `{ kind: 'command', text:
'turn dial 1' }`. The engine cannot distinguish the click-derived
command from a typed command, and that is the point — the parser
processes both identically. (ADR-101's hotspot `action` field is
renamed `command` for clarity.)

The same mechanism handles drag-and-drop, context-menu selection,
custom widget clicks. The renderer is responsible for mapping the
gesture to a canonical command string. There is no separate callback
packet kind.

**Renderer-local UI state stays off the wire.** The
synthesized-commands rule applies only to gestures that affect game
state or pass time. Pure-visual interactions — closing a modal,
scrolling, hovering, expanding/collapsing a section — are
renderer-local and never produce a `CommandPacket`. The boundary
rule:

> If the action would change what the engine sees on the next turn,
> it is a `CommandPacket`. Otherwise it is renderer-local and never
> reaches the wire.

A turn-passing parser command that *also* opens a UI panel (e.g.,
`REVIEW NOTES` advancing the world clock and surfacing a dossier
view) goes through the wire as a normal command; the engine responds
by emitting to a story-defined channel (replace-mode visibility flag,
or an event-mode focus signal) that the renderer translates into the
panel-open action. The subsequent gesture to *close* that panel is
renderer-local — closing a modal does not pass time.

### 11. Layer z-ordering is convention

For image channels, the renderer hard-codes the three named layers
from ADR-101:

```
background  <  main  <  overlay
```

Story-defined layers carry an explicit `z` field in the
`image:<layer>` show-event payload; the renderer composes layers in
ascending `z` order, with the named layers slotted at conventional
z-values (background = 0, main = 100, overlay = 200) so author
layers can interleave.

**Z-ordering is not on `ChannelDefinition`.** Adding it would couple
channel registration to render-time concerns. The convention is
documented in the platform's renderer reference (ADR-165);
story-shipped renderers are free to use a different ordering scheme
as long as they honor the show-event payload's `z` hint.

### 12. `media.clear` truncates `append` channels

The `clear` channel is special: it carries a target name (e.g.,
`'main'` or `'all'`) and signals that the named append-mode channel
should be truncated. Clients receiving a `clear` event drop their
accumulated buffer for the target.

`clear` is ungated (every client must support truncation; otherwise
prose accumulates indefinitely after a scene transition).

### 13. Bootstrap order and per-client CMGT filtering

The engine drives bootstrap during `engine.start()`:

1. **stdlib's registry already holds the standard channels** — they
   were registered at stdlib module init (no engine involvement).
2. **`Story.registerChannels?.(registry)`** — engine invokes this
   hook on the loaded story. The story adds its own `IOChannel`s
   (or re-registers standards with overrides) via
   `registry.add(channel)`.
3. **Engine instantiates `ChannelService`** — `new ChannelService(registry,
   capabilities)`. The constructor captures the registry's contents
   as the channel set for this session (subsequent registry mutations
   do not affect this session — last-write-wins is locked in at
   construction).
4. **`channelService.buildManifest()`** — produces the `cmgt` packet,
   filtered by the capabilities the engine was given. Engine emits
   `channel:manifest`.

Per turn, after `textService.processTurn(events)` produces blocks, the
engine calls `channelService.build({ world, events, blocks, turn })`.
The service walks its captured channel set, calls each channel's
`produce(ctx)` closure, applies mode + emit-policy semantics, and
returns a `TurnPacket`. Engine emits `channel:packet`.

A new session (engine restart, story switch, RESTART command) creates
a fresh `ChannelService`. Because channel state lives on the
`ChannelService` instance and not in stdlib's registry, instances are
cheap to discard and recreate.

### 14. Package responsibilities

The architecture splits across four packages plus consumers:

**`@sharpee/if-domain`** (types only — no implementation)
- `IOChannel<T>`, `IChannelRegistry`, `ChannelContentType`,
  `ChannelMode`, `ChannelEmitPolicy`
- Wire packet types — `HelloPacket`, `CmgtPacket`, `TurnPacket`,
  `CommandPacket`
- `ClientCapabilities`, `CapabilityFlag`, `ChannelProduceContext`

Every package that touches channels imports its types from here.

**`@sharpee/channel-service`** (the `ChannelService` class)

```ts
class ChannelService {
  constructor(registry: IChannelRegistry, capabilities: ClientCapabilities);
  buildManifest(): CmgtPacket;
  build(ctx: { world; events; blocks; turn }): TurnPacket;
}
```

Concrete runtime: applies mode + emit policy, capability filtering,
prev-value tracking. Imports types from `@sharpee/if-domain`. Does
not know what `scoring` means or what `room.name` means — domain-
agnostic.

A small wire decoder ships here too (for clients receiving packets
that need to enforce hello → cmgt → turn ordering).

**`@sharpee/stdlib`** (registry instance + standard `IOChannel`s)
- Exports `channelRegistry: IChannelRegistry` — populated at module
  init with the 10 standard channels + media channels.
- Each standard channel is an `IOChannel` instance, co-located
  with the subsystem that owns its data (score channel near scoring
  capability, location channel near looking action, etc.).

**`@sharpee/engine`** (composes everything)
- Imports `ChannelService` from channel-service.
- Imports `channelRegistry` from stdlib.
- Per `engine.start()`: invokes `Story.registerChannels?.(registry)`,
  instantiates `new ChannelService(registry, capabilities)`,
  emits `channel:manifest` from `channelService.buildManifest()`.
- Per turn: emits `channel:packet` from `channelService.build({…})`.

**Consumers** (`@sharpee/platform-browser`, multi-user web-client)
- Import wire packet types from `@sharpee/if-domain`.
- Listen to `channel:manifest` and `channel:packet` events.
- Route packet payload to renderers (per ADR-165).
- Do not import channel-service or stdlib for the consumer-side
  rendering; the wire types are sufficient.

### 15. Engine has-a `ChannelService`

The engine composes a `ChannelService` instance via standard OO. It
constructs one during `engine.start()` from stdlib's channel registry
and the client capabilities the engine was given:

```ts
class GameEngine {
  private channelService!: ChannelService;

  async start(opts: { capabilities: ClientCapabilities }) {
    // … existing world build, story init …
    this.story.registerChannels?.(channelRegistry);  // story extends registry
    this.channelService = new ChannelService(channelRegistry, opts.capabilities);
    this.emit('channel:manifest', this.channelService.buildManifest());
  }

  async executeTurn(input: string) {
    // … existing turn execution → events, blocks …
    const packet = this.channelService.build({
      world: this.world, events, blocks, turn: this.context.currentTurn,
    });
    this.emit('channel:packet', packet);
    this.emit('text:output', blocks, turn);  // legacy, kept during migration
  }
}
```

Capabilities arrive via the engine constructor or a `start()` option
— the consumer (CLI bundle, BrowserClient, multi-user server) hands
them in. In multi-user, the server defers `engine.start()` until the
client's hello packet arrives over WebSocket and supplies the
capabilities.

The engine itself does **not** know about specific channels. It
gives the `ChannelService` a registry and a per-turn context; the
closures inside the registered `IOChannel`s do the rest. Consumers
listen to `channel:manifest` and `channel:packet` and route payload
to renderers (ADR-165). The existing `text:output` event remains for
backward compatibility during the migration.

### 16. Rendering is author-overridable; the platform ships defaults

The platform ships default renderers for the standard channels
(text → DOM `<p>`, score → status bar, image:main → `<img>` in a
canvas, etc.). The default renderers live in client packages
(`@sharpee/platform-browser` for browser; the CLI bundle for CLI).

Stories can override default renderers by registering their own
through the `Story.registerRenderers` hook (defined in ADR-165).
The registration API and dispatch conventions are documented in
ADR-165; this ADR is concerned only with the wire and the producer
side.

The wire is **data-only**. Renderer choice is a per-client concern.
A story that ships a custom renderer for a custom channel runs
identically on every surface that has the renderer registered.

### 17. Session continuity — re-emission identity and three repaint policies

For each surface, the `cmgt` manifest plus the sequence of `turn`
packets fully describes the visible state. A fresh client joining
mid-session replays the manifest + any persisted `turn` packets and
arrives at a state visually identical to a client that has been
connected throughout. This is **re-emission identity**.

Three repaint policies are supported, parameterized by where
packets are persisted:

- **`no-repaint`** — packets are not persisted; a fresh client sees
  only future turns. Used by the CLI (the terminal is a write-only
  stream).
- **`local-repaint`** — packets are persisted client-side
  (localStorage, IndexedDB, or equivalent); a fresh client replays
  them locally. Used by `platform-browser`. Phase 4 keeps the
  existing `BrowserSaveEnvelope` + transcript-HTML autosave path; a
  future enhancement may add packet-level persistence.
- **`server-repaint`** — packets are persisted server-side; a fresh
  client requests a replay from the server. Used by ADR-164's
  multi-user server.

Re-emission identity is testable: capture turn packets from a live
run, instantiate a fresh producer, replay the same input sequence,
compare the captured packets to the replay. They must be identical.

---

## Invariants

The platform contract is a set of invariants that producer
implementations and consumer renderers both rely on.

1. **Construction precedes operations.** `ChannelService.buildManifest()`
   and `ChannelService.build(ctx)` may only be called on a constructed
   instance. The constructor `new ChannelService(registry, capabilities)`
   is the single entry gate; both registry and capabilities are
   required.
2. **`ChannelService` captures registry contents at construction.**
   Subsequent `registry.add(channel)` calls do not affect a previously-
   constructed `ChannelService` instance — last-write-wins on channel
   id is resolved at construction time. A new session creates a new
   `ChannelService` against the (possibly mutated) registry.
3. **One definition per channel id.** Re-registering an id replaces
   the prior definition (last-write-wins, until freeze).
4. **Closures are pure projections.** Closures must not mutate world
   state, fire events, or have side effects. They read; they return.
   Producer implementations may run closures multiple times per turn
   for testing or speculation.
5. **Capability gating applies at manifest time only.** Channels
   filtered out of the manifest are skipped during turn evaluation;
   their closures are never called.
6. **`always` channels appear in every turn packet.** Even on idle
   turns where the closure returns `undefined`, `always` channels
   re-emit the previous value (replace mode) or appear with `[]`
   (append mode, when no new entries — see §4).
7. **`null` is a valid emission**, distinct from `undefined`. `null`
   means "stop / hide / clear"; `undefined` means "skip this turn."
8. **`append`-mode payloads carry new entries only.** Clients
   accumulate. The producer never emits the full history.
9. **Turn ordering is preserved.** Turn packets carry monotonically
   increasing `turn_id`. Clients that receive packets out of order
   may discard older ones.
10. **Wire packets are JSON-serializable.** No `Date`, no `Map`, no
    `Set`, no functions. Closures live in the producer; their
    outputs cross the wire as JSON.

---

## Acceptance Criteria

### Platform contract

**AC-1**: `@sharpee/if-domain` exports the channel types per §14
(`IOChannel`, `IChannelRegistry`, wire packet types,
`ChannelContentType`, `ChannelMode`, `ChannelEmitPolicy`,
`ClientCapabilities`, `ChannelProduceContext`).
`@sharpee/channel-service` exports the `ChannelService` class with
constructor `(registry: IChannelRegistry, capabilities: ClientCapabilities)`
and methods `buildManifest(): CmgtPacket` and `build(ctx): TurnPacket`.
No predefined channels in either package; no rule schema.

**AC-2**: Wire packet types match §1's contract: `hello`, `cmgt`,
`turn`, `command`. JSON-serializable. Decoder enforces ordering
invariants.

**AC-3**: A round-trip test (fake registry containing standard
`IOChannel` instances → `new ChannelService(registry, capabilities)`
→ `buildManifest()` → `build(ctx)` with scripted blocks/events)
demonstrates `main`, `location`, `score`, `turn` populating in the
resulting `TurnPacket`.

**AC-4**: `ChannelService.buildManifest()` filters channels by the
capabilities passed to the constructor. Channels gated by a `false`
flag are absent from the manifest and do not appear in turn packets
produced by subsequent `build(ctx)` calls.

**AC-5**: `new ChannelService(registry, capabilities)` requires both
arguments — TypeScript enforces it; runtime construction with missing
arguments throws. Methods `buildManifest()` and `build(ctx)` may be
called on the constructed instance in any order — the constructor
captures registry and capabilities, so there is no separate "manifest
must precede turn" runtime gate (the renderer-side ADR-165 enforces
that ordering between consumer-side `applyCmgt` and `applyTurnPacket`).

**AC-6**: Media channels register correctly: `image:*` channels gated
by `images`, `sound` gated by `sound`, `music` by `music`, etc., per
§8 table. A scenario that fires `media.image.show` produces an
`image:<layer>` channel emission with the event payload.

**AC-7**: A synthesized command — a click on an image hotspot —
produces a `CommandPacket` whose `text` is the hotspot's `command`
field. Round-trip test in isolation against the wire decoder.

**AC-8**: A `clear` event for `target: 'main'` causes consuming
clients to truncate accumulated `main`-channel content. Test asserts
client-side accumulation drops to empty after the clear, and resumes
on subsequent appends.

**AC-9**: Emit policy is honored. (a) `always` channels appear in
every turn packet, including idle turns where the closure returns
`undefined`. (b) `sparse` channels appear only when the closure
returns a value distinct from `prevValue`. (c) `append` channels
in `always` mode emit `[]` on idle turns.

**AC-10**: Channel re-registration replaces the prior definition.
A test registers a default channel, then re-registers the same id
with a different closure; subsequent turn packets reflect the new
closure's output.

**AC-11**: Bootstrap-order invariants. (a) stdlib's `channelRegistry`
is populated at module init with the standard `IOChannel`s — a test
that imports stdlib and inspects `channelRegistry.all()` finds every
standard channel. (b) `Story.registerChannels?(registry)` runs before
`new ChannelService(registry, capabilities)` — verified by an
integration test that asserts a story-added channel appears in the
manifest from `buildManifest()`. (c) Re-registering an `IOChannel`
with the same id replaces the prior entry — verified by a unit test
that adds a channel, re-adds with same id and different `produce`
closure, and asserts `registry.get(id)` returns the second entry.
(d) Constructing a fresh `ChannelService` discards prior session
`prevValue` cache — verified by a test that captures sparse-emit
behavior across two sequential `ChannelService` instances against
the same registry.

**AC-12**: Re-emission identity holds. A 10-turn fixture is captured;
a fresh producer replays the same inputs and produces packet-for-packet
identical output. Tests assert deep equality.

### Consumer migrations

**AC-13**: The CLI bundle (`dist/cli/sharpee.js`) consumes turn
packets via `engine.on('channel:packet', ...)` and writes the
flattened `main`-channel content to stdout. The Dungeo walkthrough
chain regression baseline holds (per the GREEN = any of N runs
passed convention).

**AC-14**: The platform-browser bundle (`dist/web/<story>/game.js`)
consumes turn packets via `engine.on('channel:packet', ...)`. A
real-path test (Playwright headless Chromium) drives the production
browser bundle and asserts that a Dungeo session produces the same
`main`-channel content as the CLI for the same command sequence.

**AC-15**: A fixture story registers a custom `json` channel with a
story-supplied closure and renderer. The same story runs through
the CLI bundle and the platform-browser bundle for the same command
sequence; the resulting turn packets are bit-identical, and the
story's renderer produces identical output on both surfaces.

**AC-16**: Direct ADR-101 event emission paths (raw `media.image.show`
etc. emitted as `ISemanticEvent`s in user-facing code) have been
removed from `packages/`. The only surviving references are inside
`packages/stdlib/`'s media-channel closures (which read the events
and emit channel values) and tests/fixtures.

---

## Consequences

### Positive

- **One concept** for channel authoring (definition + closure).
  Authors learn it once.
- **Standard and custom channels are uniform** — no API
  specialization, no platform-only privileges. Stories can override
  any platform channel.
- **No synthetic intermediate blocks for status data.** The score
  and turn channels read what the engine and world actually carry.
- **Channel-service stays small.** Pure machinery; domain-agnostic.
- **Engine integration is symmetric with text-service.** One
  pattern; engine hosts both.
- **Wire is unchanged from external observers.** The hello / cmgt
  / turn / command shapes are stable; this ADR's rewrite is
  producer-internal.

### Negative

- **Phases 1–3 already shipped on the rule-based model.** Their
  implementation is replaced (rule schema removed, standard channels
  move to stdlib, AC-10's old conflict-resolution gate becomes the
  new AC-10 re-registration gate). Phases 1–3's tests are largely
  rewritten.
- **Stdlib gains a dependency on channel-service.** New direction:
  stdlib → channel-service. Mirrors stdlib's existing pattern of
  importing other platform packages.
- **Engine gains a dependency on channel-service.** Same direction
  as engine → text-service (also platform-runtime). Symmetric.
- **Closures are not serializable.** Channels can't be sent over
  the wire as definitions; producers must be co-located with the
  engine. Multi-user servers run the producer server-side and ship
  only the manifest + turn packets to clients (which is the
  intended architecture per §15 and ADR-164).

### Neutral

- **Stories that don't touch channels see no change.** They write
  actions, traits, behaviors as before.
- **The wire format is preserved.** External clients (browser,
  multi-user web client) only see hello / cmgt / turn / command
  packets — they don't observe whether the producer used rules or
  closures.

---

## Constrains Future Sessions

- **Channel-service must stay domain-agnostic.** No imports of
  stdlib, engine internals, or world-model traits into
  channel-service. Anything that smells like domain knowledge moves
  out.
- **All standard channels go through the same registry as story
  channels.** No "platform privileged" registration path. If
  platform vocabulary needs a special hook, design the hook for
  authors first.
- **Closures must be pure projections.** Mutation, event firing,
  network I/O inside a closure is a violation. Producer
  implementations may run closures multiple times for testing.
- **Renderer registration is ADR-165's domain.** This ADR specifies
  the wire and the producer; the consumer side (renderer registry,
  dispatch, slot system) is ADR-165.
- **Wire format changes go through a new ADR.** Adding a new packet
  kind, changing field names, etc. require an ADR amendment. The
  existing four-packet shape is stable.

---

## References

- **ADR-101** (REPLACED): Graphical Client Architecture.
- **ADR-153 / 153a / 156 / 162** (REPLACED): pre-ADR-163 multi-user
  surfaces; superseded by this ADR's wire + ADR-164.
- **ADR-164**: Stateless Multi-User Server — downstream consumer.
- **ADR-165**: Renderer Architecture — consumer-side counterpart.
- **ADR-161**: Persistent Identity (carries forward).
- **ADR-129**: ScoreLedger (independent).
- `docs/work/channel-io-unification/audit-20260429-adr-101.md` —
  the ADR-101-fold audit.
- `docs/work/channel-io-unification/audit-20260502-platform-browser.md`
  — the Phase 4A audit that surfaced the rule-vs-closure decision.
- `docs/work/channel-io-unification/sequence-diagrams-20260429.md`
  — turn-by-turn message flows.
- `spikes/channel-io/` — runnable spike validating the platform
  contract.
- Original FyreVM channel I/O design — David Cornelson, 2010-era
  fyrevm-server.

---

## Session

2026-04-28 main — original ADR-163 written, defining a rule-based
channel-routing model.

2026-04-29 main — split into platform (this ADR) and downstream
multi-user (ADR-164).

2026-05-01 main — spike-driven refinements; rule-based model retained.

2026-05-02 main (rewrite) — Phase 4 implementation surfaced that the
rule-based model required synthetic `status.score` / `status.turns`
blocks (which no production code emits) to populate status channels.
The architectural fix is to let channels read from where the data
actually lives via embedded closures. The rule schema collapses; the
channel definition becomes self-contained. Standard platform channels
move from `@sharpee/channel-service` to `@sharpee/stdlib`, mirroring
the lang-en-us / parser-en-us pattern. This ADR is rewritten in place;
Phases 1–3's implementation is reworked, not extended.

2026-05-03 main (package-shape refinement) — clarified the package
split. Types (`IOChannel`, `IChannelRegistry`, wire packets, etc.)
live in `@sharpee/if-domain`. `@sharpee/channel-service` exports the
`ChannelService` class only. `@sharpee/stdlib` owns the registry
instance and the standard `IOChannel` definitions. The engine has-a
`ChannelService` (composition, not injection) — instantiated during
`engine.start()` against stdlib's registry and the consumer's
`ClientCapabilities`. Stories extend the registry through
`Story.registerChannels?(registry)`. Replaces the prior framing
where channel-service was "pure machinery" hosting wire types and
the standard registration helpers.
