# ADR-163: Channel-Service Platform — Universal Wire and Author-Controlled Media

## Status: ACCEPTED (revised 2026-04-29)

## Date: 2026-04-28 (original) — 2026-04-29 (revised: split into platform + downstream multi-user)

## Replaces

- **ADR-101** (Graphical Client Architecture, Proposed 2026-01-14) —
  author-controlled media events. Never implemented; folded into the
  channel-I/O wire by this ADR rather than implemented as ADR-101
  specified.

ADR-153 / 153a / 156 / 162 are the predecessor multi-user-specific
ADRs; they are replaced by **ADR-164** (which builds on this ADR's
wire). See ADR-164's Replaces section for the multi-user supersession
chain.

## Carries forward unchanged

- **ADR-161** (Persistent Identity) — `{id, handle, passcode}` triple
  is orthogonal to the wire model.
- **ADR-129** (ScoreLedger) and engine internals.

## Carries forward (from ADR-101) as principle, not implementation

The principle that drove ADR-101 carries verbatim:

- **Author-controlled media presentation.** The story author has full
  control over multimedia presentation. The engine emits explicit
  media directives, and the client renders them.
- **Client is a renderer, not an interpreter of game semantics.**
- **Graceful degradation is the author's responsibility, not the
  client's.** Stories check declared client capabilities and emit
  appropriate events.

## Relationship to ADR-164

This ADR defines the **platform**: the universal channel-I/O wire,
the channel-service package, the standard channel set sourced by the
engine, the ADR-101 media folding, and the test gates against the CLI
and platform-browser surfaces.

**ADR-164 is the downstream consumer** that defines the stateless
multi-user server. ADR-164 builds on this ADR's wire and adds the
three server-sourced channels (`chat`, `presence`, `command_echo`),
the per-room save-blob model, the transcript capability, and the
mid-session join replay. Single-user surfaces (CLI, platform-browser)
do not depend on ADR-164.

## Context

Three threads converge to this ADR.

**Thread 1: ADR-101 was paper.** ADR-101 specified `media.image.show`,
`media.sound.play`, `media.music.play`, `media.ambient.play`,
`media.layout.configure`, `media.animation.play`, `media.transition`,
plus a `ClientCapabilities` negotiation. None of it was implemented
(verified 2026-04-29: zero references to `media.image.` or
`ClientCapabilities` across `packages/`, `tools/`, `stories/`). The
absence of an implementation is a blessing — there is no migration
problem; there is a consolidation opportunity.

**Thread 2: text-service is a pragmatic interim.** text-service was
proposed in 2025 to ship Dungeo and burn the platform into working
shape. It was accepted as deferral-to-ship, not as the architectural
destination. Channel I/O has been the design intent since the
2010-era fyrevm-server. The audit at
`docs/work/channel-io-unification/audit-20260429-adr-101.md`
enumerates ADR-101's surface area and confirms it folds cleanly into
the channel model.

**Thread 3: a story should run identically across surfaces.**
Single-user surfaces (zifmia, platform-browser, CLI) and any
multi-user surface that arrives later should consume the same wire.
A story like The Alderman registers custom channels, ships its own
renderer, and synthesizes commands from UI gestures; that contract
must hold whether the player is in a browser, a desktop app, or a
terminal. Today the wire shape varies by surface — text-service
produces text-blocks for single-user; the multi-user direction
(ADR-164) needs channel I/O. One wire serves both.

A second observation: `packages/text-blocks/src/types.ts` already
cites FyreVM by name, defines 12 `CORE_BLOCK_KEYS`, and routes engine
output by key. The platform already speaks channel-style emission
internally — the consumer-facing wire just isn't shaped that way.

This ADR consolidates: **all surfaces consume channel I/O via
`@sharpee/channel-service`. ADR-101's media events become channel
emissions. text-service is retired in its wire-producing role.**

## Decision

**The channel-I/O wire is the universal consumer contract for every
Sharpee surface. Every surface — CLI, platform-browser, zifmia (when
migrated), and any multi-user server — speaks `hello` / `cmgt` /
`turn` / `command` packets via `@sharpee/channel-service`. ADR-101's
media surfaces fold into the channel set. text-service is retired in
its wire-producing role.**

Thirteen constituent decisions follow.

### 1. Channel I/O is the universal wire

Four packet kinds define the consumer surface:

```ts
{ kind: 'hello',   capabilities }                        // client → server
{ kind: 'cmgt',    protocol_version, channels }          // server → client
{ kind: 'turn',    turn_id, payload }                    // server → client per turn
{ kind: 'command', text }                                // client → server per input
```

**Layered abstraction:**

- `@sharpee/text-blocks` stays. It is the engine's output abstraction
  (semantic block stream) and is consumed by `channel-service` as one
  of its inputs. It is *not* a wire format.
- `@sharpee/channel-service` produces the wire packets. It is the
  single producer of CMGT and `turn` packets across all surfaces.
- `text-service` is retired in its wire-producing role. Single-user-
  specific concerns (terminal cursor handling, REPL prompt redraw,
  ANSI color helpers) may continue to live in `text-service` or be
  absorbed into renderer-side helpers; what is retired is its role as
  the *producer of the consumer-facing event stream*.

**Channel IDs are strings.** FyreVM packed channel names into 4-byte
ASCII ints because Z-machine. We have JSON; the channel `id` *is* the
wire identifier. One concept, not two.

**Single-bundle deployment is the default; the multi-user server
is the only exception.** In every other deployment — CLI binary,
platform-browser bundle, zifmia desktop app — the platform, the
story, and the renderer ship as one build artifact, and channel
I/O is in-process function calls carrying `HelloPacket` /
`CmgtPacket` / `TurnPacket` / `CommandPacket` payloads. There is no
wire. The multi-user server (ADR-164) is the only deployment that
splits the producer from the consumer across a network transport,
where the same payload shapes are JSON-serialized. The "wire" in
this ADR is therefore a *contract* — universal across deployments
— not a serialization boundary that always exists.

### 2. Capability handshake — `hello` packet

Clients declare capabilities at session start:

```ts
interface HelloPacket {
  kind: 'hello';
  capabilities: ClientCapabilities;
}

interface ClientCapabilities {
  // Display
  text: true;                  // Always true
  images: boolean;
  animations: boolean;
  video: boolean;

  // Audio
  sound: boolean;
  music: boolean;
  speech: boolean;

  // Layout
  splitPane: boolean;
  statusBar: boolean;
  sidebar: boolean;

  // Input
  clickableText: boolean;
  clickableImage: boolean;
  dragDrop: boolean;

  // Advanced
  transitions: boolean;
  layers: boolean;
  customFonts: boolean;

  // Dimensions
  screenWidth?: number;
  screenHeight?: number;
}
```

The fields preserve ADR-101's `ClientCapabilities` interface
verbatim.

**Server emits `cmgt` only after receiving `hello`.** The CMGT
manifest is *per-client* — derived from the union of registered
channels filtered by the client's capability declaration.

**Single-user runtimes synthesize a `hello` internally.** The CLI
synthesizes a minimal hello (`{ text: true, images: false, sound:
false, ... }`) at startup. Platform-browser synthesizes a richer
hello reflecting browser-environment capabilities. zifmia (when
migrated) declares its own static capabilities (`{ text: true,
images: true, sound: true, music: true, ... }`) at runtime startup.
No actual packet crosses a transport in the single-user case, but
the contract is identical to the multi-user case — local
channel-service receives the synthesized hello before producing
CMGT.

### 3. Content types — `text`, `number`, `json`

```ts
type ChannelContentType = 'text' | 'number' | 'json';
```

- `text` — plain string. Renderer writes it verbatim or styles it.
- `number` — integer or float. Engine emits `42`; client formats with
  locale and layout.
- `json` — structured object. Escape hatch for any author-defined
  complex surface, and for the platform's `main` channel which carries
  `TextContent[]` (so decoration metadata survives the wire).

No `boolean`, no `text[]`. `json` covers anything the three primitives
don't. Stay tight.

### 4. Standard channel set — 10 engine-sourced channels

The platform pre-registers ten engine-sourced channels. Default
platform routing rules (decision 12 below) cover the engine output.

| ID             | Type   | Mode    | Notes                                                          |
| -------------- | ------ | ------- | -------------------------------------------------------------- |
| `main`         | json   | append  | Narrative prose; `TextContent[]` per emission (decorations)    |
| `prompt`       | text   | replace | Input prompt (default `> `)                                    |
| `location`     | text   | replace | Status-line location name                                      |
| `score`        | json   | replace | `{ current: number, max: number \| null }`                     |
| `turn`         | number | replace | Turn count                                                     |
| `death`        | text   | event   | Death notification                                             |
| `endgame`      | text   | event   | Endgame text                                                   |
| `score_notify` | text   | event   | Transient score-change announcement                            |
| `info`         | json   | replace | `{ title, author, version }` — emitted at start, re-emitted on ABOUT |
| `ifid`         | text   | replace | IFID — emitted at start, re-emitted on ABOUT                   |

Downstream consumers may register additional standard channels
during init alongside this set; see ADR-164 for the multi-user
server's additions.

`mode` semantics (consumed by clients):

- `replace` — newest value supersedes prior values. Persistent: a
  mid-session join replays the latest value.
- `append` — value added to a chronological list (transcript-shaped).
  Persistent: a mid-session join replays the full list (subject to
  decision 11 — `clear` may truncate).
- `event` — transient signal; client renders once and discards. Not
  persisted; mid-session joins do not see prior `event` emissions.

The principle: **channels are for separate UI surfaces, not for state
mirrors.** If the player can ask for a fact via a verb (inventory,
exits, look), the answer goes to `main`. If a fact has a dedicated UI
slot (status line, score display) or fires as a transient signal
(death, score change), it gets a channel.

`info` and `ifid` are `replace`-mode rather than emit-once because
the ABOUT command re-emits them. The client renders the new value
(which is normally identical to the prior value) — `replace`
semantics handle that uniformly. There is no special "emit-once"
channel mode.

### 5. Per-channel emit policy — `always` / `sparse`

**`emit: 'always'`** — the channel is populated in every turn
packet. Replace-mode channels emit their current value (changed or
not); append-mode channels emit any new entries (possibly an empty
array, but the channel key is always present); event-mode channels
remain the natural exception — they emit only when the event fires,
since they have no "current value" to carry on idle turns.

**`emit: 'sparse'`** — the channel appears in a turn packet only
when its value changed (`replace`) or new entries were produced
(`append`/`event`). Idle channels with this policy do not appear.

**Append-mode payload value is the new entries only, not the
accumulated list.** The value carried for an append-mode channel in
a turn packet is the array of entries produced *this turn*. The
renderer (or any consumer that maintains a derived view) is
responsible for accumulating across turns. A consumer that connects
mid-session sees, on the first turn packet of its lifetime, only the
entries from that turn going forward; historical entries arrive
through the session-continuity mechanism in §14, which re-emits each
captured turn packet in order so the renderer accumulates identically
to a continuous session. (This is what makes the re-emission
identity invariant work for append-mode without a special "history"
packet kind.)

**Standard channels register with `emit: 'always'`.** All ten
platform standard channels are populated every turn. Clients can
rely on every standard channel being present in every turn payload —
no last-known-value tracking on platform state. Any consumer that
joins or rejoins a session can bootstrap from any recent turn
packet for standard channels without a replay synthesis. The
bandwidth cost is trivial because standard-channel values are
scalar (`turn`, `location`, `score`, `prompt`) or small objects
(`info`).

**Story channels default to `emit: 'sparse'`.** Most story-
registered channels carry large or rarely-changing structured
payloads (the Alderman's `evidence` pile, an image-layer manifest, an
animation spritesheet reference). Sparse-emit cuts real bandwidth on
those.

**Stories can opt into `emit: 'always'` per channel.** When the
renderer benefits from current values every turn — countdown timers,
decay indicators, current-state gauges, ephemeral UX surfaces whose
"current" reading the UI must always have without tracking last-
known state — the author registers the channel with `emit: 'always'`.
The opt-in is per channel, so an author can mix policies inside one
story (notebook = sparse; stamina = always).

### 6. Capability scope — only media channels are gated

Standard channels (the 10 from decision 4, plus any registered by
downstream consumers) **always exist regardless of declared
capabilities** and always populate every turn. A pure-text CLI gets
the same standard set as a fully-graphical browser.

**Capability-gated channels are the media channels** introduced in
decision 7 below: `image:*`, `sound`, `music`, `ambient:*`,
`animation`, `animate`, `transition`, `layout`, `clear`. The CMGT
producer omits these from the manifest when the corresponding
capability flag is `false`. The story registers them
unconditionally during init; the producer filters at emission time.

**Story-defined channels are not capability-gated by default.** A
story-registered channel (Alderman's `evidence`, `assertions`,
`notebook`) appears in every CMGT manifest. If an author wants their
custom channel to depend on a client capability, they wire that
themselves in story init by checking
`channelService.getCapabilities()`.

### 7. ADR-101 media events fold into channels

Each ADR-101 event maps to a channel registration. Channels are
registered by the platform's `registerMediaChannels()` helper during
story init when the corresponding capability is present.

| ADR-101 event                  | Channel                     | contentType | mode    | emit     | Notes                                                                      |
|--------------------------------|-----------------------------|-------------|---------|----------|----------------------------------------------------------------------------|
| `media.image.show` / `.hide`   | `image:<layer>`             | `json`      | `replace` | `always` | hide = `null` payload; mid-session join sees current image state |
| `media.image.preload`          | `image:preload`             | `json`      | `event`   | `sparse` | renderer downloads on receipt and discards                                |
| `media.sound.play`             | `sound`                     | `json`      | `event`   | `sparse` | payload includes `bus?: string` (renamed from ADR-101's `channel?`)       |
| `media.music.play` / `.stop`   | `music`                     | `json`      | `replace` | `always` | stop = `null` payload                                                     |
| `media.ambient.play` / `.stop` | `ambient:<id>`              | `json`      | `replace` | `always` | per-channel ambient layer; stop = `null`                                  |
| `media.animation.play`         | `animation`                 | `json`      | `event`   | `sparse` |                                                                            |
| `media.animate`                | `animate`                   | `json`      | `event`   | `sparse` | property animation (opacity / x / y / scale / rotation)                   |
| `media.transition`             | `transition`                | `json`      | `event`   | `sparse` | screen transition between scenes                                          |
| `media.layout.configure`       | `layout`                    | `json`      | `replace` | `always` | mid-session join sees current layout                                      |
| `media.clear`                  | `clear`                     | `json`      | `event`   | `sparse` | per decision 11, can truncate `append`-mode channels                       |

**Replace-mode media channels register `emit: 'always'`** so that a
consumer joining or rejoining a session sees the current image /
music / ambient / layout state from any recent turn packet, without
needing a separate replay-synthesis mechanism. This trades a small
payload weight (each turn re-emits unchanged image manifests for
active layers) for a clean joiner contract.

**Event-mode media channels register `emit: 'sparse'`.** Sound,
transition, and animation play exactly when fired — they have no
"current value" to populate idle turns with.

**Subsumed ADR-101 concepts:**

- **`media.status.update` is deleted.** ADR-101 specified a status-
  bar update event. Under this ADR the status bar is composed from
  the standard `location`, `score`, `turn`, and `score_notify`
  channels (decision 4). Stories that want richer status content emit
  to a story-defined `json` channel instead.
- **`media.sound.play`'s `channel?` field is renamed `bus`.** The
  ADR-101 field referred to a *mixer bus* ("for managing multiple
  sounds"), not a wire channel. The renaming avoids confusion with
  the wire concept of "channel."
- **ADR-101's `assets/{images,audio,animations}/...` bundle layout
  remains a convention** (see decision 13).

### 8. Layer z-ordering is convention

The renderer hard-codes the three named layers from ADR-101:

```
background  <  main  <  overlay
```

Story-defined layers carry an explicit `z` field in the
`image:<layer>` show-event payload; the renderer composes layers in
ascending `z` order, with the named layers slotted at conventional
z-values (e.g., background = 0, main = 100, overlay = 200) so author
layers can interleave.

**Z-ordering is not on `ChannelDefinition`.** Adding it would couple
channel registration to render-time concerns. The convention is
documented in the platform's renderer reference; story-shipped
renderers are free to use a different ordering scheme as long as
they honor the show-event payload's `z` hint.

### 9. UI gestures are synthesized commands; triggers are one-way

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
{
  // inside a media.image.show payload
  hotspots: [
    { id: 'dial1', bounds: { x, y, w, h }, command: 'turn dial 1' },
    ...
  ]
}
```

When the player clicks, the client emits `{ kind: 'command', text:
'turn dial 1' }`. The engine cannot distinguish the click-derived
command from a typed command, and that is the point — the parser
processes both identically. (ADR-101's hotspot `action` field is
renamed `command` for clarity.)

The same mechanism handles any other UI-input gesture: drag-and-
drop, context-menu selection, custom widget clicks. The renderer is
responsible for mapping the gesture to a canonical command string.
There is no separate callback packet kind.

**Renderer-local UI state stays off the wire.** The
synthesized-commands rule applies only to gestures that affect game
state or pass time. Pure-visual interactions — closing a modal,
scrolling within a panel, hovering for a tooltip, expanding or
collapsing a section — are renderer-local and never produce a
`CommandPacket`. The boundary rule:

> If the action would change what the engine sees on the next turn,
> it is a `CommandPacket`. Otherwise it is renderer-local and never
> reaches the wire.

A turn-passing parser command that *also* opens a UI panel (e.g.,
`REVIEW NOTES` advancing the world clock and surfacing a dossier
view) goes through the wire as a normal command; the engine
responds by emitting to a story-defined channel (replace-mode
visibility flag, or an event-mode focus signal) that the renderer
translates into the panel-open action. The subsequent gesture to
*close* that panel is renderer-local — closing a modal does not
pass time.

### 10. `media.clear` truncates `append` channels

The `clear` event channel carries `{ target: 'all' | 'main' |
'graphics' | string }`. When the `target` matches an `append`-mode
channel's domain, the renderer **resets that channel's accumulated
state** locally on receipt.

**New invariant on `append`-mode channels:** accumulation is not
strictly monotonic. The producer can issue a `clear` and the
renderer must drop accumulated entries for the named target.

`media.clear` is the only mechanism that violates append's
monotonicity. Authors should use it sparingly — typical case is
scene transitions where the prose buffer should reset.

How a downstream consumer persists clears across reconnects or
mid-session joins (e.g., the multi-user transcript in ADR-164) is
that consumer's concern. The platform contract is just: when a
`clear` arrives, the renderer drops the matching append-mode
state.

### 11. Bootstrap order and per-client CMGT filtering

Strict packet ordering:

1. Client emits `hello` (or single-user runtime synthesizes one).
2. Server emits `cmgt` — channel registry manifest filtered by the
   client's declared capabilities. Pure schema; no values.
3. First `turn` packet — carries `info` and `ifid` (story metadata)
   alongside the opening location and narrative. The engine emits
   `info`/`ifid` on the first turn; channel-service routes them.
4. Subsequent live turns.

**Story init runs unconditionally.** A story's `initializeWorld()`
registers all channels (standard, media, story-defined) without
checking client capabilities. Channel registration is a story-design
concern that does not depend on who is connecting.

**The CMGT producer filters at emission time.** When channel-service
calls `produceCmgtManifest(capabilities)`, it iterates the
registered channel set and excludes any media channel whose
capability flag is `false`. The resulting manifest is per-client;
one source serving two clients with different capabilities sends
each client a different CMGT manifest.

When the player issues an ABOUT command, the engine re-emits `info`
and `ifid` as part of that turn's output. Because both channels are
`replace`-mode, the client renders the (typically unchanged) values
without special handling.

### 12. `@sharpee/channel-service` is a new package

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

// One TextBlock can match multiple rules and emit to multiple
// channels (e.g., room.name → both `main` (append) and `location`
// (replace)). The target channel's `mode` is the source of truth;
// rules don't carry mode.
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
function getCapabilities(): ClientCapabilities;
function addRule(rule: ChannelRule): void;
function addRules(rules: ChannelRule[]): void;

// Bootstrap — once per session, after hello received
function produceCmgtManifest(
  capabilities: ClientCapabilities,
): { protocol_version: number; channels: ChannelDefinition[] };

// Per-turn producer
function produceTurnPacket(input: {
  textBlocks: ITextBlock[];
  events: DomainEvent[];
  world: WorldModel;
  prevValues?: Record<string, unknown>;
}): { turn_id: string; payload: Record<string, unknown> };
```

The platform produces only the payload that derives from engine
output (TextBlocks + events) routed through registered rules.
Channels populated from consumer-side state — the multi-user
server's `chat` / `presence` / `command_echo` (ADR-164) is the
canonical example — are merged by the consumer into the returned
payload after `produceTurnPacket` returns:

```ts
const platformPacket = produceTurnPacket({ textBlocks, events, world, prevValues });
const finalPacket = {
  ...platformPacket,
  payload: { ...platformPacket.payload, /* consumer channels */ },
};
```

This keeps the platform API free of any consumer-specific shape.

**Conflict resolution**: if two rules emit to the same `replace`-
mode channel in the same turn, higher priority wins; ties go to
registration order (first-registered wins). Documented invariant —
no runtime warning.

**Default rule set**: channel-service ships a `platformRules` array
covering the 12 `CORE_BLOCK_KEYS` defined in
`packages/text-blocks/src/types.ts`. The 10 standard channels are
pre-registered. Stories opt out by clearing rules (rare) or override
by registering higher-priority rules for the same `key`.

**Dependencies**:

- `@sharpee/core` — events, primitive types.
- `@sharpee/world-model` — read-only snapshot input.
- `@sharpee/text-blocks` — `ITextBlock`, `CORE_BLOCK_KEYS`.
- *Not* `@sharpee/engine` — engine produces the inputs but never
  imports channel-service.
- *Not* `@sharpee/lang-en-us` — the language layer has already
  rendered text by the time channel-service runs.

**Wire protocol module**: `packages/channel-service/src/wire/` (or
equivalent shared path). Both client and server import packet
types — `HelloPacket`, `CmgtPacket`, `TurnPacket`, `CommandPacket`,
`ChannelDefinition`, `ChannelContentType`, `ClientCapabilities` —
directly from this module per CLAUDE.md rule 7b. The module
declares no runtime-specific types so it can be imported by
browser, Node, and CLI contexts alike.

**Boundary statement**:

- **OWNER**: platform package. Runs in-process wherever the engine
  runs (Node CLI, Node multi-user server, browser zifmia,
  platform-browser).
- **SHARED?**: yes — wire types cross trust boundaries. Single-user
  surfaces import the wire-protocol module locally; multi-user
  surfaces (ADR-164) import the same module on both server and
  client sides.
- **PROMISE**: the engine's output shapes (`ITextBlock`,
  `DomainEvent`, `WorldModel`) are the input contract. Engine never
  imports channel-service; channel-service imports the engine's
  output types (one-way coupling).
- **ALTERNATIVES**: leaving the channel logic embedded in
  `tools/server/` (the multi-user direction) would tie channels to
  the multi-user product. A platform package keeps single-user
  surfaces (CLI, platform-browser, zifmia) on the same wire without
  depending on the multi-user infrastructure.

### 13. Rendering is author-overridable; the platform ships defaults

The web client (and any other surface) ships **standard defaults
for every channel**: `main` renders as scrolling prose,
`location` / `score` / `turn` populate a status line, media
channels render via the platform's default media renderer when
present, and so on. These defaults work out-of-the-box for any
well-behaved story.

**Authors can override any rendering for their own story.** A story
bundle declares which parts of the UI it customizes — from a single
custom-channel renderer (e.g., a `combat` panel for a `json`
channel) to restyled prose, to a wholly-rethemed status line, to a
complete layout. Where the platform ships a default, the author's
override replaces it; where the platform has no default (a custom
channel), the author supplies the renderer.

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

**The wire shape is independent of the renderer.** Channel I/O
carries data. Whether a `main` emission renders as scrolling prose,
a typewriter animation, or a comic-strip panel is a client-side
decision driven by the active renderer. The producer emits the same
packet regardless.

**Concrete example —
`stories/thealderman/docs/detective-sheet.jsx`.** A story-authored
UI sketch for a Clue-style deduction game. Three panes:

- **Evidence pile** (auto-populated). Story-defined `evidence`
  channel (`json`, `append`, engine-sourced). Each emission is a
  structured card — `{ id, kind: 'claim' | 'observation' |
  'inference', source, text, salience, turn }` — produced by the
  engine when the PC encounters claims or observations during play.
- **Case board** (player-curated suspect / weapon / location
  columns). Two state surfaces here. The candidate lists themselves
  come from a story-defined channel (`json`, `replace`) — re-emitted
  only when the candidate set changes (typically once at session
  start, plus any narrative events that introduce or eliminate
  candidates). The player's *eliminations* and *suspicions* are
  working-pad state — not world state, not engine knowledge — and
  round-trip via a `notebook` capability the client posts back via
  story-specific commands (SUSPECT, CLEAR). Channel-service emits a
  `notebook`-channel packet (`json`, `replace`) whenever the
  capability changes, so the renderer's working pad survives
  reconnects and mid-session joins.
- **Assertions list.** Story-defined `assertions` channel (`json`,
  `append`). Each entry is a structured tuple — `{ verb, target:
  { kind, id }, supporting: [evidenceId...], note }` — emitted by
  the story's deduction verbs (IDENTIFY GAP, CONTRADICT). Hover-
  highlight edges back to the evidence pile are a pure renderer
  concern; the channel data carries the supporting-evidence ids and
  the renderer draws the connections.
- **The notebook / parser pane.** Platform-standard `main` and (in
  multi-user contexts) `command_echo` channels, completely restyled
  — Playfair Display italic for narrative, IBM Plex Mono for input,
  oxblood and brass on cream paper. Same wire content as the
  platform default; totally different surface.

The platform's default web client would render this same packet
stream as scrolling prose with a status line. The author's renderer
makes it a deduction-game notebook. The wire model is the same
either way: CMGT manifest at session start (registering `evidence`,
`assertions`, `notebook` alongside the standards), sparse `turn`
packets carrying only changed channels, no special protocol
extension.

This exemplar is a deliberate stress test of the wire contract:
custom channels, custom verbs, custom render rules, client-supplied
state that round-trips through a capability — all expressible inside
this ADR's model without protocol changes. Future story examples
that *cannot* be expressed this way are the signal to revisit the
wire.

**The author-override mechanism is out of scope for this ADR.** How
renderer assets physically ship in the `.sharpee` bundle, how the
server serves them, how the client loads them, and what security
boundary applies (CSP, sandboxed iframe, signed bundles, etc.) is
the subject of a separate forthcoming ADR. The channel wire
contract in this ADR is stable across whatever mechanism is chosen.

### 14. Session continuity — re-emission identity and three repaint policies

The platform guarantees that re-emitting a captured `TurnPacket`
to the renderer produces output identical to its original live
emission. Consumers use this guarantee to support whatever restore
UX their renderer demands; three patterns are documented:

1. **No-repaint** — the consumer does not re-emit packets on
   restore. The renderer's state is assumed to survive across
   restores by some out-of-band mechanism (terminal scrollback in
   the CLI case). Persistence may be limited to world state alone;
   packets need not be retained. On restore the consumer simply
   resumes producing live turns.

2. **Local repaint** — the consumer persists packets locally (file,
   IndexedDB, app save) and re-emits them through its own renderer
   on restore. Used by zifmia and platform-browser.

   *Persistence-unit sub-choice.* Local repaint consumers may
   persist `TurnPacket` values and replay them through the
   renderer (renderer-version-independent, slower on long
   sessions), or persist the renderer's output directly — markup,
   DOM fragments, captured XAML, or equivalent — and re-inject on
   restore (faster, but tied to the renderer that produced it).
   Both produce the same visual result. The Secret Letter
   (OpenSilver) project shipped using rendered-output persistence;
   zifmia and platform-browser may pick either or hybridise (e.g.,
   re-inject markup for fast first paint, reconcile against
   packets for ground truth). The platform contract sits at the
   packet layer; rendered-output persistence is a renderer-side
   optimisation that any consumer may layer on top.

3. **Network repaint** — the producer persists packets and
   re-emits them to a connecting, reconnecting, or new-joining
   client. Used by the multi-user server (ADR-164 §5). Rendered-
   output persistence is *not* available in this case because
   rendered output is not portable across clients with different
   renderers; packets are the only persistence unit that
   travels.

Where each consumer physically stores packets is the consumer's
choice. The platform's stake is solely in the re-emission identity
guarantee.

This works without any "replay mode" flag because event-mode
channels are not persisted (per §4) so they don't refire,
replace-mode channels converge to the final value through any
sequence, and append-mode channels accumulate identically
including any `clear` events at their original positions
(per §10).

**Standard repaint sequence.** For local repaint and network
repaint, the canonical sequence a consumer follows on restore is:

1. Cold-start the channel-service producer (fresh registry, fresh
   `prevValues`, hello not yet registered).
2. Run story init — the same code path as a normal session start.
   Channels register, rules register.
3. Register the same `hello` capabilities the original session used
   (or, if capabilities have changed, the new ones — the renderer
   will receive a fresh CMGT in step 4).
4. Call `produceCmgtManifest(capabilities)` — this freezes the
   manifest. Pass the result to the renderer's `applyCmgt`.
5. Iterate the persisted turn packets in order, passing each to the
   renderer's `applyTurnPacket`.
6. Resume producing live turns.

The platform API supports this sequence without modification —
`produceTurnPacket` is not called during replay (the captured
packets are passed directly to the renderer), so no fresh production
is needed. Stateless multi-user workers (ADR-164) follow the same
sequence per worker boot; single-bundle consumers follow it on
process start when local repaint is the policy.

**Story init must be deterministic.** Step 4 produces a *fresh*
CMGT manifest by re-running story init with the saved
capabilities. The resulting manifest is expected to match the
original — same channel registrations, same rules, same modes.
Stories whose init reads non-deterministic inputs (random seeds,
wall-clock time, environment-dependent data) break this
assumption and cannot be replayed correctly under multi-user;
they may still work under single-bundle if the consumer chooses
to *capture and replay* the original CMGT alongside turn packets
(rather than re-produce). Multi-user **must** re-produce because
each connecting client has its own capability-filtered manifest;
a captured CMGT from another client would have the wrong filter
applied. Single-bundle consumers are free to pick either pattern,
but determinism is the more portable assumption.

## Invariants

- **Hello before CMGT.** No CMGT packet may be emitted before the
  consumer's hello has been registered (in single-bundle deployments
  the runtime synthesizes one; in transport-attached deployments
  per ADR-164 the client transmits one).
- **CMGT before any turn.** The first non-hello packet a consumer
  receives is always `cmgt`. A consumer that receives a `turn`
  packet before `cmgt` raises a protocol error and renders nothing.
  In transport-attached deployments the surface additionally drops
  and reconnects per ADR-164's rules; in single-bundle deployments
  the protocol error surfaces directly to the runtime.
- **Channel registration is closed before CMGT emits.** Stories
  register channels in init; the manifest is computed once per
  client and frozen for the session. Late `registerChannel` calls
  during a turn are an error.
- **Per-channel emit policy.** A channel registered with
  `emit: 'always'` appears in every turn packet (replace-mode emits
  current value; append-mode emits any new entries, possibly an
  empty array; event-mode is the natural exception — only emits on
  fire). A channel registered with `emit: 'sparse'` (the default)
  appears only when its value changed or new entries were produced.
- **Standard channels populate every turn.** All ten platform
  standard channels register with `emit: 'always'`. Including `info`
  and `ifid`, which carry near-static values; the bandwidth cost is
  negligible and the rule stays uniform.
- **Story channels default to sparse-emit.** Story-registered
  channels default to `emit: 'sparse'`. Authors opt into
  `emit: 'always'` per channel for ephemeral UX surfaces whose
  renderer benefits from current values every turn.
- **Mode lives on the channel, not on the rule.** A channel always
  behaves the same way regardless of which rule routed a block to
  it.
- **Standard channels always exist.** The standard channels appear
  in every CMGT manifest on every surface, regardless of declared
  capabilities. A client cannot opt out of standard channels.
- **Media channels are capability-gated.** A media channel never
  appears in a CMGT manifest for a client that did not declare the
  corresponding capability.
- **Triggers are one-way.** Event-mode channels carrying action
  directives (sound, transition, animation, animate, clear) have no
  return path. The producer does not wait, retry, or track
  completion.
- **UI input is synthesized commands.** Any UI gesture that affects
  game state (hotspot click, drag-drop, custom widget) emits a
  `{ kind: 'command' }` packet that the engine processes identically
  to a typed command.
- **`clear` truncates append channels.** A `clear` event with
  `target` matching an append-mode channel's domain resets
  accumulated entries on the renderer. Transcript replay honors
  clears at their original point.
- **The wire is transport-agnostic.** The same packet shapes work
  for in-process single-user (CLI, platform-browser, zifmia),
  WebSocket multi-user (ADR-164), and any future HTTP request-
  response or SSE surface.
- **Story init does not depend on capabilities.** Channel
  registration runs unconditionally; CMGT filtering happens at
  emission time.
- **Re-emission identity.** A captured `TurnPacket` re-emitted
  through the renderer produces output identical to its original
  live emission. Consumers (per decision 14) may rely on this
  when persisting packets and replaying them on restore.
- **Single writer per turn.** The engine produces the inputs;
  channel-service produces the packet; the wire emits. No mid-turn
  amendments.

## Acceptance Criteria

The acceptance criteria split into two groups.

**Platform contract** (AC-1 through AC-12). These define the shape
of the platform deliverable: package, public API, standard
channels, wire-protocol module, ordering invariants, persistence /
repaint guarantee, and contract-level tests. **ADR-164 depends
only on this group.** Each is testable against
`@sharpee/channel-service` in isolation; no real consumer needs to
exist.

**Consumer migrations** (AC-13 through AC-16). These track
per-surface adoption and the codebase-wide cleanup of the retired
text-service path. They land progressively and **do not block
downstream ADRs.**

### Platform contract

1. **AC-1 — Package and standard channels.**
   `@sharpee/channel-service` package exists at
   `packages/channel-service/`, exposes the API in decision 12, and
   pre-registers the ten engine-sourced standard channels from
   decision 4. `platformRules` covers all 12 `CORE_BLOCK_KEYS`.

2. **AC-2 — Wire protocol module.** Wire protocol module (shared by
   any client and any server) exports `HelloPacket`, `CmgtPacket`,
   `TurnPacket`, `CommandPacket`, `ChannelDefinition`,
   `ChannelContentType`, and `ClientCapabilities`. Single-user
   surfaces and multi-user surfaces both import these types
   directly — no duplication.

3. **AC-3 — Round-trip platform test.** A test exercises
   `produceCmgtManifest({ ...full-capability hello })` →
   `produceTurnPacket()` for a sample TextBlock + event batch → a
   default renderer consumes the packet → asserts on rendered values
   for `main`, `location`, `score`, `turn`. The test uses a fake
   engine producing scripted TextBlocks; no real engine, no
   transport.

4. **AC-4 — Hello packet contract.** `produceCmgtManifest` throws
   (or returns a documented error type) when called before a hello
   has been registered for the session. The thrown error names the
   missing hello and references the bootstrap-order invariant.
   Tested directly against `@sharpee/channel-service`; no
   transport. ADR-164 adds the transport-level variant.

5. **AC-5 — Per-client CMGT filtering.** Two clients connect to the
   same source with different capabilities; their CMGT manifests
   differ exactly on the capability-gated media channels. Test:
   client A declares `images: true, sound: false`; client B declares
   `images: false, sound: true`; assert A's manifest contains
   `image:*` channels but no `sound`; B's contains `sound` but no
   `image:*`. Standard channels appear in both.

6. **AC-6 — Media channel mappings.** Each ADR-101 event has a
   round-trip test through channel-service: emit a synthetic
   `media.image.show` from a story action, assert the resulting
   `turn` packet contains the corresponding `image:<layer>` channel
   with the ADR-101 payload preserved (modulo the `bus` rename and
   the `command`-not-`action` rename for hotspots).

7. **AC-7 — Synthesized command from hotspot click.** A renderer
   that receives an `image:main` payload with hotspots and
   simulates a click on a hotspot emits a
   `{ kind: 'command', text: ... }` packet. The parser processes
   it indistinguishably from a typed command. Test against the
   platform decoder in isolation; no consumer-specific venue
   required.

8. **AC-8 — `clear` truncation.** Story emits 5 entries on a `main`
   channel, then a `clear` with `target: 'main'`. The renderer's
   accumulated `main` buffer is empty after the clear. Subsequent
   appends start fresh.

9. **AC-9 — Per-channel emit-policy invariants.**
   - **Test (a) `emit: 'always'` populate-every-turn**: a turn that
     does not change the score still emits a `score` key in the
     payload carrying the unchanged `{ current, max }`. Verified
     across all ten standard channels (which all register
     `emit: 'always'`).
   - **Test (b) `emit: 'sparse'` skip-when-unchanged**: register a
     story `replace`-mode channel as `'sparse'` (or omit the field —
     it's the default), emit once, then run a turn that does not
     touch it. Assert the channel key is absent from the second
     turn's payload.
   - **Test (c) story-channel opt-in to `'always'`**: register a
     story `replace`-mode channel with `emit: 'always'`. Emit once.
     Run a turn that does not change it. Assert the channel key
     still appears in the second turn's payload with the unchanged
     value.

10. **AC-10 — Conflict resolution.** Test: two rules registered
    against the same `key`, both emitting to the same `replace`-
    mode channel. Higher-priority rule's value wins; ties resolved
    by registration order.

11. **AC-11 — Bootstrap ordering and registration discipline.**
    Four sub-tests, all enforced inside `@sharpee/channel-service`
    since channel registration and packet ordering are the
    package's contract surface:
    - **(a) `cmgt`-after-`hello` (positive)**: producer does not
      emit `cmgt` before a hello has been registered for the
      session (synthesized in single-bundle deployments,
      transmitted in transport-attached ones).
    - **(b) `turn`-after-`cmgt` (positive)**: producer does not
      emit any `turn` packet before its `cmgt` packet, even if the
      engine produces output during init.
    - **(c) Registration closes at `cmgt` (rejection)**: after
      `produceCmgtManifest()` has been called for a session, a
      subsequent `registerChannel()` call for that session throws
      an error that names the offending channel id and references
      the manifest-frozen invariant. Test the channel-service
      registry directly, in isolation.
    - **(d) Decoder rejects out-of-order `turn` (rejection)**: a
      decoder that receives a `turn` packet before `cmgt` returns
      a documented protocol-error state and renders nothing.
      Tested in isolation against the wire-protocol module — no
      transport, no engine.

12. **AC-12 — Persist-and-repaint round-trip.** Drive a fixture
    story for 10 turns, capturing each `produceTurnPacket` return
    value to an array. Initialize a fresh
    `@sharpee/channel-service` (story init re-runs; channels
    re-register), call `produceCmgtManifest(capabilities)`, then
    feed each captured packet to the renderer in order. Compare
    the resulting rendered state to the original live render
    captured at the end of turn 10. They match exactly. This
    proves the **re-emission identity** invariant supporting
    decision 14's three repaint policies.

### Consumer migrations

13. **AC-13 — Test gate: CLI parity.** A Dungeo session run from
    the CLI consumes channel-I/O packets (CMGT + `turn`) and
    renders `main` to stdout; standard channels behave identically
    to the platform-browser run of the same session. text-service
    is not in the producer path. Test: same command sequence
    produces same `main`-channel content across CLI and platform-
    browser. The CLI surface uses the **no-repaint** policy from
    decision 14: on restore it does not re-emit historical
    packets.

14. **AC-14 — Test gate: platform-browser parity.** A Dungeo
    session run in platform-browser consumes channel-I/O packets;
    `location`, `score`, `turn` render to the status surfaces;
    `main` renders to the transcript; capability-gated media
    channels (when declared) drive the platform's default media
    renderers. text-service is not in the producer path. The
    platform-browser surface uses the **local repaint** policy
    from decision 14: page refresh repaints from persisted
    packets.

15. **AC-15 — Story renderer parity.** A test story that registers
    a custom `json` channel and ships its own renderer produces
    identical packets and identical rendered output across CLI
    (where applicable, given CLI capabilities) and platform-
    browser. (The Alderman, when built, is the canonical exemplar;
    for AC-15 a smaller test story will do.) Zifmia is **out of
    scope** for this AC; zifmia migration is deferred to a
    follow-on session.

16. **AC-16 — ADR-101 events have no remaining direct emission
    path.** `grep -r 'media.image.show\|media.sound.play\|...'
    packages/` returns zero results. The folded channel emissions
    are the only way to drive media.

## Consequences

**Positive:**

- **Renderer parity across surfaces.** A story written once runs
  identically in CLI, platform-browser, and any multi-user surface.
  Author-shipped renderers (per decision 13) are write-once.
- **One wire, one mental model.** The platform has a single
  consumer-facing event-stream contract. Reasoning about the system
  no longer requires holding "text-service does this for single-user
  but channel-service does it for multi-user" in mind.
- **ADR-101 lands without implementation cost.** A 3-month-Proposed
  ADR becomes Accepted-and-implemented as a side effect of the
  channel-I/O consolidation. Author-controlled media is a real
  platform capability.
- **Capability negotiation generalizes.** ADR-101's
  `ClientCapabilities` flags become wire-level facts that propagate
  through the CMGT manifest. Capability-aware story logic
  (`if (capabilities.images) channelService.registerChannel(...)`)
  works on every surface.
- **Wire bandwidth drops dramatically vs ADR-162.** Sparse channel
  packets vs full `world.toJSON()` per turn. Typical turn packet for
  Dungeo is expected to be ~1 KB (vs ~64 KB gzipped under ADR-162
  multi-user replication).
- **fyrevm lineage closes.** The 2010-era fyrevm-server channel-I/O
  pattern becomes the universal Sharpee wire — the architectural
  intent that pre-dates text-service finally lands.

**Negative:**

- **Migration cost is real for platform-browser.** It consumes
  text-blocks today; the renderer pipeline needs to be rewritten to
  consume CMGT + `turn` packets. The plan doc enumerates the work;
  this ADR notes it but doesn't bound it.
- **Authors writing for ADR-101 against the published spec lose
  `onComplete`.** No animation completion callbacks; authors needing
  end-of-cutscene signals route through hotspot-style click
  affordances. A real change from ADR-101 as written.
- **`bus` rename and `command` rename break ADR-101 verbatim
  fidelity.** Anyone who internalized ADR-101's schema will need to
  relearn two field names. Worth one mention in author-facing docs.
- **`media.status.update` is gone.** Authors targeting that event
  have to migrate to standard status channels (`location` / `score`
  / `turn`) or a custom story-defined channel.
- **Single-user `hello` synthesis adds plumbing.** CLI and platform-
  browser need a small startup path that constructs and dispatches
  the ClientCapabilities to local channel-service. Conceptually the
  same as the multi-user case; mechanically it is new code.
- **text-service is now ambiguous.** Some of its code is retired
  (the wire-producing role); some may stay (terminal-specific
  helpers). The migration plan must be explicit about what stays and
  what goes to avoid leaving dead code behind.
- **Story authors learn channels.** The platform's default rule set
  covers stock IF; custom UI surfaces require registering a `json`
  channel and (for v1) using a platform-shipped renderer.
- **Zifmia parity is deferred.** Zifmia continues to consume
  text-blocks until a follow-on session migrates it. The platform
  wire works without zifmia; zifmia adoption is a downstream
  decision.

## Resolved Implementation Choices

- **Payload framing**: `HelloPacket` / `CmgtPacket` / `TurnPacket`
  / `CommandPacket` are TypeScript shapes. In single-bundle
  deployments they are passed in-process by reference. When
  serialized for transport (per ADR-164), they go over JSON; the
  transport itself (WebSocket, HTTP, SSE) is the consumer's
  choice, not the platform's.
- **`hello` is a real packet shape**, but single-bundle runtimes
  synthesize it locally rather than transmit it.
- **Capability scope**: standard channels never gated; media
  channels always gated; story channels by author choice.
- **Channel id type**: string. No integer packing.
- **Mode location**: on `ChannelDefinition`, not on `ChannelRule`.
- **Default rules location**: shipped with `@sharpee/channel-
  service` as `platformRules`.
- **Story metadata emission**: stories emit `info` as a structured
  TextBlock; no server-side `extract: 'metadata'` parser of
  `game.banner`.
- **Layer ordering**: convention-based; story layers carry `z` in
  payload.
- **Callback model**: synthesized commands; no separate callback
  packet kind.
- **`onComplete` for animations**: dropped; out of scope.
- **`media.clear` semantics**: allowed to truncate `append`
  channels.
- **Story init timing**: unconditional; CMGT filters at emission.
- **Asset pipeline**: out of scope; separate ADR.
- **text-service retirement**: wire-producing role only; terminal
  helpers may remain.
- **Zifmia migration**: deferred to a follow-on session; not a
  platform-acceptance gate.

## Open Questions for Implementation

- **~~Replay packet shape on connect~~ (resolved 2026-05-01).**
  Mid-session join uses the **N-packet form** — captured turn
  packets are re-emitted in order, identical to live packets. **No
  `replay: true` flag is needed** because event-mode channels are
  not persisted (per §4) and won't refire on replay; replace and
  append modes converge correctly under naive re-emission. The
  spike at `spikes/channel-io/index.html` verified re-emission
  identity holds for the Alderman case. The persistence storage
  of the transcript is downstream (ADR-164 uses a world-model
  capability); the wire protocol for replay is the same as live.
- **`prevValues` storage strategy.** Per-channel emit policy needs
  `prevValues` for any `'sparse'`-emit channel. For single-user
  surfaces the producer holds `prevValues` in process. For
  multi-user surfaces ADR-164 routes this through the transcript
  capability. The wire is unaffected either way.
- **CMGT versioning.** Today: `protocol_version: 1`. When a new
  standard channel is added, does the version bump or does the
  manifest just grow? Recommend: `protocol_version` bumps only on
  breaking shape changes (packet kinds, ChannelDefinition fields);
  additive channels (new standard or new media) do not bump
  version. Confirm in implementation.
- **text-service's continued surface.** Which terminal-specific
  helpers stay? Audit `text-service` post-migration and document
  the remaining surface, or fully retire the package.
- **Author-override asset pipeline.** Decision 13 establishes that
  authors can override any renderer; the *mechanism* — how
  renderer assets physically ship in the `.sharpee` bundle, how
  the server serves them, how the client loads them, what security
  boundary applies (CSP, sandboxed iframe, bundle signing) — is
  the subject of a separate forthcoming ADR. The channel wire
  contract in this ADR is stable across whichever mechanism lands.

- **~~Renderer architecture (deferred)~~ (resolved 2026-05-01).**
  The consumer-side architecture — channel-renderer registration
  API, the renderer's contract surface, channel-renderer dispatch
  conventions, state-store ownership and lifecycle, default
  platform renderers and the override pattern, layout / slot
  system — is settled in **ADR-165** (Renderer Architecture).
  The platform contract in this ADR is stable across ADR-165's
  decisions. Six of the spike's eight gaps are addressed there;
  the remaining two (append-mode payload value shape, repaint
  sequence) are resolved here in §5 and §14.

## Constrains Future Sessions

- **Wire protocol versioning.** `CmgtPacket` and `TurnPacket` are
  versioned by a `protocol_version` field on CMGT (initial value
  `1`). Any breaking change to either packet shape bumps the
  version.
- **Channel-service inputs are the engine's output contract.** Any
  change to `ITextBlock`, `DomainEvent`, or `world.toJSON()` shape
  that affects the produced packet must be evaluated against
  channel-service's default rules. The engine never imports
  channel-service, but channel-service imports the engine's output
  types — so a one-way coupling is enforced.
- **No mid-turn channel emissions.** The wire is one packet per
  turn. Streaming partial output during a long-running command is a
  separate capability that would require a new packet kind (e.g.,
  `turn_progress`); it does not exist in v1.
- **No new packet kinds without an ADR.** The four packet kinds
  (`hello`, `cmgt`, `turn`, `command`) are the wire surface. Any
  proposal for `callback`, `bootstrap`, `error`, etc. is an ADR-
  level decision.
- **ADR-101 vocabulary.** `media.image.show` etc. are no longer
  real events — they are historical names for what are now channel
  emissions. Author-facing docs and tutorials should use channel
  vocabulary, not ADR-101 event vocabulary.
- **Capability flags are versioned with the protocol.** Adding a
  new `ClientCapabilities` flag (e.g., `haptics`, `vr`) is a
  backwards-compatible additive change at protocol version 1.
  Removing a flag bumps the version.
- **Asset pipeline must accommodate both renderer assets and
  ADR-101's `assets/...` bundle layout.** The forthcoming asset-
  pipeline ADR cannot pick one in isolation.
- **Single-writer principle.** "Engine produces; channel-service
  consumes; wire emits" pipeline holds across all surfaces. No
  surface introduces a parallel write path.
- **One wire to extend.** Adding a new media surface requires
  updating decision 7's table, registering a new channel, and
  adding the corresponding capability flag. ADR amendment
  territory if the new media class doesn't fit the existing modes;
  otherwise a channel-service patch.

## References

- ADR-101 (REPLACED): Graphical Client Architecture — author-
  controlled media events.
- ADR-153 / 153a / 156 / 162 (REPLACED): pre-ADR-163 multi-user
  surface; superseded by this ADR's wire model + ADR-164's
  stateless server.
- ADR-164: Stateless Multi-User Server — downstream consumer of
  this ADR's wire.
- ADR-165: Renderer Architecture — consumer-side counterpart to
  this ADR. Specifies the `ChannelRenderer` and `Renderer`
  interfaces, registry, dispatch, state stores, layout / slot
  system, and default platform renderers.
- ADR-161: Persistent Identity (carries forward).
- ADR-129: ScoreLedger (independent).
- `docs/work/channel-io-unification/audit-20260429-adr-101.md` —
  capability-by-capability audit of ADR-101 against the channel
  model. The six design choices recommended in §14 of the audit are
  resolved in decisions 2, 6, 8, 9, 10, 11 of this ADR.
- `docs/work/channel-io-unification/sequence-diagrams-20260429.md`
  — worked turn-by-turn message flows for Dungeo (vanilla) and The
  Alderman (author renderer). The validation matrix in §3 of the
  diagrams becomes part of this ADR's acceptance criteria.
- `spikes/channel-io/index.html` — runnable spike validating the
  platform contract against the Alderman case (custom story
  channels, story-overridden `main`, synthesized commands from
  clicks / right-clicks / drag-drop, capture-and-replay round-
  trip).
- `spikes/channel-io/findings.md` — eight gaps surfaced from the
  spike. Two (append-mode payload shape, repaint sequence) are
  resolved in this ADR's §5 and §14; six are deferred to the
  forthcoming renderer-architecture ADR.
- `docs/work/channel-io-unification/diagrams/adr-163-164-architecture.html`
  — alignment diagram of the four panels: deployment patterns,
  ADR-163/164 ownership, repaint policies, platform API.
- `docs/work/channel-io-unification/diagrams/renderer-architecture.html`
  — six-panel sketch of the consumer side. Reference for the
  forthcoming renderer-architecture ADR.
- `docs/brainstorm/stateless-multiuser/overview.md` — D1–D8
  decisions and the longer rationale that produced the original
  ADR-163.
- `packages/text-blocks/src/types.ts:67` — FyreVM attribution and
  the channel-routing claim already in the codebase.
- `packages/text-blocks/src/types.ts:149` — `CORE_BLOCK_KEYS`
  (12 keys mapped onto the standard channel set in decision 4).
- `stories/thealderman/docs/detective-sheet.jsx` — story-authored
  case-board UI sketch demonstrating author-controlled UX. Cited
  in decision 13 as the architectural shape this wire must
  support.
- `legacy/tools-server` (origin branch) — preserved pre-ADR-163
  multi-user implementation.
- Original FyreVM channel I/O design — David Cornelson, 2010-era
  fyrevm-server.

## Session

2026-04-28 main — derived from a session that began as e2e Phase
2–4 implementation, surfaced a structurally fragile reconnect path,
and ended in an architectural pivot. ADRs 153, 153a, 156, and 162
were marked REPLACED on the same day; the original ADR-163 was the
replacement.

2026-04-29 main (revised) — split the original ADR-163 (which
combined platform wire + multi-user-specific server decisions) and
ADR-164 (which extended the wire to single-user surfaces) into two
ADRs along the platform / downstream boundary. This ADR now defines
the platform: the universal wire, the channel-service package, the
ten engine-sourced standard channels, the ADR-101 media folding,
and the test gates against CLI and platform-browser. ADR-164 was
rewritten in place to define the stateless multi-user server as a
downstream consumer of this platform. Zifmia migration is deferred.

2026-05-01 main (spike-driven refinements) — the renderer spike
at `spikes/channel-io/` validated the platform contract against the
Alderman case and surfaced eight gaps in the consumer-side
specification. Two are resolved in this ADR: §5 now states crisply
that append-mode payload values are *new entries only* (not the
accumulated list) and that consumers handle accumulation; §14
documents the canonical six-step repaint sequence. §9 adds the
boundary rule separating game-state-affecting commands (which go
through the wire as `CommandPacket`) from pure-visual interactions
(which stay renderer-local) — surfaced from the Alderman's
`REVIEW NOTES` flow. The remaining six gaps (channel-renderer
registration API, renderer's contract surface, dispatch
conventions, state-store ownership, default platform renderer
overrides, layout / slot system) are deferred to a forthcoming
renderer-architecture ADR; the platform contract in this ADR is
stable across whichever decisions land there.
