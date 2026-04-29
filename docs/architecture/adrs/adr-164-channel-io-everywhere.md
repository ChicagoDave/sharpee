# ADR-164: Channel I/O Everywhere — Single-User Adoption + Author-Controlled Media

## Status: ACCEPTED

## Date: 2026-04-29

## Supersedes

- **ADR-101** (Graphical Client Architecture, Proposed 2026-01-14) —
  author-controlled media events. Never implemented; folded into the
  channel-I/O wire by this ADR rather than implemented as ADR-101
  specified.

## Builds on

- **ADR-163** (Stateless Multi-User Server with Channel I/O) —
  establishes the wire shape (CMGT manifest + `turn` packets), the 13
  standard channels, the `ChannelDefinition` API, and the per-channel
  emit policy. ADR-164 extends the same wire to single-user surfaces
  and absorbs ADR-101's media surfaces as channels.

## Carries forward (from ADR-101) as principle, not implementation

The principle that drove ADR-101 carries verbatim:

- **Author-controlled media presentation.** "The story author has full
  control over multimedia presentation. The engine emits explicit
  media directives, and the client renders them."
- **Client is a renderer, not an interpreter of game semantics.**
- **Graceful degradation is the author's responsibility, not the
  client's.** Stories check `context.client.supports('images')` (or
  the channel-service equivalent) and emit appropriate events.

These are the same principles ADR-163 D6 re-established for the
multi-user wire. They constitute a single design conviction
re-confirmed across two ADRs.

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

**Thread 2: ADR-163 left single-user out of scope.** ADR-163's wire
contract covers the multi-user web client. Single-user surfaces
(zifmia, platform-browser, CLI) still consume `text-service` +
`text-blocks` events directly. If the principle from ADR-163 D6
("authors design their own UX") is to mean anything across the
platform, **a story like The Alderman should run identically across
all surfaces** — the wire and renderer contract must be the same
whether the player is in a browser, a desktop app, or a terminal.
Today they are not.

**Thread 3: text-service is a pragmatic interim.** text-service was
proposed by Claude in 2025 to ship Dungeo and burn the platform into
working shape. It was accepted as deferral-to-ship, not as the
architectural destination. Channel I/O has been the design intent
since the 2010-era fyrevm-server. The audit at
`docs/work/channel-io-unification/audit-20260429-adr-101.md` enumerates
ADR-101's surface area and confirms it folds cleanly into the
channel model.

This ADR consolidates: **all surfaces consume channel I/O via
`@sharpee/channel-service`. ADR-101's media events become channel
emissions. text-service is retired in its wire-producing role.**

## Decision

**The channel-I/O wire from ADR-163 is the universal consumer
contract. Every Sharpee surface — zifmia, platform-browser, CLI, the
multi-user web client — speaks CMGT + `turn` packets via
`@sharpee/channel-service`. ADR-101's media surfaces are folded into
the channel set. text-service is retired in its wire-producing role.**

Eleven constituent decisions follow.

### 1. Channel I/O is the universal wire

All consumer-facing surfaces speak the wire defined in ADR-163 §2:

- `{ kind: 'hello', capabilities }` — client to server (decision 2 below)
- `{ kind: 'cmgt', protocol_version, channels }` — server to client
- `{ kind: 'turn', turn_id, payload }` — server to client per turn
- `{ kind: 'command', text }` — client to server per player input

**Layered abstraction:**

- `@sharpee/text-blocks` stays. It is the engine's output abstraction
  (semantic block stream) and is consumed by `channel-service` as one
  of its inputs. It is *not* a wire format under this ADR.
- `@sharpee/channel-service` produces the wire packets. It is the
  single producer of CMGT and `turn` packets across all surfaces.
- `text-service` is retired as the producer of the consumer-facing
  wire. Any single-user-specific concerns (terminal cursor handling,
  REPL animation timing, prompt redraw) live in the renderer or in a
  client-side helper, not in a wire-producing service.

The transport differs by surface: WebSocket for multi-user, in-process
function calls for single-user (zifmia, CLI, platform-browser). The
*wire shape* is identical; transport is an integration detail.

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

The fields preserve ADR-101's `ClientCapabilities` interface verbatim.

**Server emits `cmgt` only after receiving `hello`.** The CMGT
manifest is *per-client* — derived from the union of registered
channels filtered by the client's capability declaration.

**Single-user runtimes synthesize a `hello` internally.** zifmia
declares its own static capabilities (`{ text: true, images: true,
sound: true, music: true, ... }`) at runtime startup; the local
channel-service receives the synthesized hello before producing CMGT.
No actual packet crosses a transport, but the contract is identical to
the multi-user case. CLI synthesizes a minimal hello (`{ text: true,
images: false, sound: false, ... }`) at startup.

### 3. Capability scope — only media channels are gated

Standard channels (the 13 from ADR-163 D5) **always exist regardless
of declared capabilities** and always populate every turn (per
ADR-163's `emit: 'always'` policy). `main`, `prompt`, `location`,
`score`, `turn`, `info`, `ifid`, `chat`, `presence`, `command_echo`,
`death`, `endgame`, `score_notify` are present in every CMGT manifest
on every surface. A pure-text CLI gets the same standard set as a
fully-graphical browser.

**Capability-gated channels are the media channels** introduced in
decision 4 below: `image:*`, `sound`, `music`, `ambient:*`,
`animation`, `animate`, `transition`, `layout`, `clear`. The CMGT
producer omits these from the manifest when the corresponding
capability flag is `false`. The story registers them unconditionally
during init; the producer filters at emission time.

**Story-defined channels are not capability-gated by default.** A
story-registered channel (Alderman's `evidence`, `assertions`,
`notebook`) appears in every CMGT manifest. If an author wants their
custom channel to depend on a client capability, they wire that
themselves in story init by checking
`channelService.getCapabilities()`.

### 4. ADR-101 media events fold into channels

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
| `media.clear`                  | `clear`                     | `json`      | `event`   | `sparse` | per decision 7, can truncate `append`-mode channels                        |

**Replace-mode media channels register `emit: 'always'`** so that a
mid-session join sees the current image / music / ambient / layout
state without needing a transcript replay synthesis. This trades a
small wire weight (each turn re-emits unchanged image manifests for
active layers) for a clean joiner contract.

**Event-mode media channels register `emit: 'sparse'`.** Sound, transition,
and animation play exactly when fired — they have no "current value"
to populate idle turns with.

### 5. Layer z-ordering is convention

The renderer hard-codes the three named layers from ADR-101:

```
background  < main  < overlay
```

Story-defined layers carry an explicit `z` field in the
`image:<layer>` show-event payload; the renderer composes layers in
ascending `z` order, with the named layers slotted at conventional
z-values (e.g., background = 0, main = 100, overlay = 200) so author
layers can interleave.

**Z-ordering is not on `ChannelDefinition`.** Adding it would couple
channel registration to render-time concerns. The convention is
documented in the platform's renderer reference; story-shipped
renderers are free to use a different ordering scheme as long as they
honor the show-event payload's `z` hint.

### 6. Callbacks are synthesized commands; triggers are one-way

**Triggers (engine → UI) are strictly one-way.** When the engine emits
to `sound`, `transition`, `animation`, or any other event-mode media
channel, the wire packet is fire-and-forget. The engine does not wait
for completion. The next turn fires whenever the next player command
arrives. No "blocking" mechanism, no engine-side completion tracking.

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

The same mechanism handles any other UI-input gesture: drag-and-drop,
context-menu selection, custom widget clicks. The renderer is
responsible for mapping the gesture to a canonical command string.
There is no separate callback packet kind.

### 7. `media.clear` truncates `append` channels

The `clear` event channel carries `{ target: 'all' | 'main' |
'graphics' | string }`. When the `target` matches an `append`-mode
channel's domain, the renderer **resets that channel's accumulated
state** locally on receipt.

**New invariant on `append`-mode channels:** accumulation is not
strictly monotonic. The server can issue a `clear` and the renderer
must drop accumulated entries for the named target.

**Transcript capability records the clear.** When a `clear` event is
emitted, channel-service writes the packet into the transcript
capability like any other turn packet. Mid-session joiners replaying
the transcript apply the `clear` at the appropriate point and resume
appending after it. The transcript shows the *post-clear* state of
the affected channels.

`media.clear` is the only mechanism that violates append's monotonicity.
Authors should use it sparingly — typical case is scene transitions
where the prose buffer should reset.

### 8. Story init runs unconditionally; CMGT filters per-client

A story's `initializeWorld()` registers all channels (standard,
media, story-defined) without checking client capabilities. Channel
registration is a story-design concern that does not depend on who is
connecting.

**The CMGT producer filters at emission time.** When channel-service
calls `produceCmgtManifest(capabilities)`, it iterates the registered
channel set and excludes any media channel whose capability flag is
`false`. The resulting manifest is per-client; one room serving two
clients with different capabilities sends each client a different
CMGT manifest.

**Stateless multi-user implication:** under ADR-163's per-turn worker
model, story init runs at the start of each turn (after loading the
save blob into a fresh world). The capability set is an input to
`produceCmgtManifest`; the channel registry itself is rebuilt per
worker boot but is identical for the same story across workers. This
is cheap because channel registration is small and synchronous.

### 9. Subsumed concepts from ADR-101

**`media.status.update` is deleted.** ADR-101 specified a status-bar
update event. Under this ADR the status bar is composed from the
standard `location`, `score`, `turn`, and `score_notify` channels
(ADR-163 D5). Stories that want richer status content emit to a
story-defined `json` channel instead.

**`media.sound.play`'s `channel?` field is renamed `bus`.** The
ADR-101 field referred to a *mixer bus* ("for managing multiple
sounds"), not a wire channel. The renaming avoids confusion with the
wire concept of "channel."

**ADR-101's `assets/{images,audio,animations}/...` bundle layout
remains a convention** (see decision 10).

### 10. Asset pipeline is out of scope; deferred to a separate ADR

ADR-101's asset bundle layout (`story/assets/images/...`,
`story/assets/audio/...`, `story/assets/animations/...`) is referenced
as a convention but **not specified by this ADR**. The same bundle
also carries author-shipped renderer JS / CSS / HTML (per ADR-163
D6). Asset pipeline, asset serving, asset path resolution, renderer
loading, and the security boundary (CSP, sandboxed iframe, bundle
signing) are the subject of a forthcoming ADR.

This ADR is stable across whatever asset-pipeline mechanism lands.
Asset paths in channel payloads (e.g., `image:main`'s `src` field)
are opaque strings the renderer resolves; their bundle layout is the
asset-pipeline ADR's concern.

### 11. text-service is retired in its wire-producing role

Single-user surfaces (zifmia, platform-browser, CLI) consume CMGT +
`turn` packets via channel-service, the same as the multi-user web
client. text-service is no longer the consumer-facing wire producer
for any surface.

**Migration is gradual.** Phasing belongs in the implementation plan
at `docs/work/channel-io-unification/plan-{date}.md`, not in this
ADR. The expected order is CLI first (lowest UI surface area —
renders `main` channel to stdout, ignores capability-gated media
channels), then platform-browser (single-user web client), then
zifmia (largest UI surface — React GameContext, save UX, transcript
display).

**text-service's footprint after migration.** text-service is not
deleted outright; it may continue to host single-user-specific
concerns that don't fit the wire abstraction (terminal cursor
positioning, REPL prompt redraw, ANSI color rendering helpers, etc.).
What is retired is its role as the *producer of the consumer-facing
event stream*. Anything text-service used to push to clients now
flows through channel-service.

## Invariants

- **Hello before CMGT.** No CMGT packet may be emitted before the
  client's hello arrives (or the single-user runtime has synthesized
  one internally).
- **CMGT before any turn packet.** Inherited from ADR-163.
- **Standard channels always exist.** The 13 standard channels appear
  in every CMGT manifest on every surface, regardless of declared
  capabilities. A client cannot opt out of standard channels.
- **Media channels are capability-gated.** A media channel never
  appears in a CMGT manifest for a client that did not declare the
  corresponding capability.
- **Triggers are one-way.** Event-mode channels carrying action
  directives (sound, transition, animation, animate, clear) have no
  return path. The engine does not wait, retry, or track completion.
- **UI input is synthesized commands.** Any UI gesture that affects
  game state (hotspot click, drag-drop, custom widget) emits a
  `{ kind: 'command' }` packet that the engine processes identically
  to a typed command.
- **`clear` truncates append channels.** A `clear` event with `target`
  matching an append-mode channel's domain resets accumulated entries
  on the renderer. Transcript replay honors clears at their original
  point.
- **The wire is transport-agnostic.** The same packet shapes work for
  WebSocket multi-user, in-process zifmia, in-process CLI, and any
  future HTTP request-response or SSE surface.
- **Story init does not depend on capabilities.** Channel registration
  runs unconditionally; CMGT filtering happens at emission time.

## Acceptance Criteria

1. **AC-1 — Hello packet contract.** A client that connects without
   sending `hello` (or whose hello fails to parse) receives no CMGT.
   Test: open a connection, omit the hello, assert no CMGT arrives
   within 1s and the connection is closed with a protocol error.
2. **AC-2 — Per-client CMGT filtering.** Two clients connect to the
   same room with different capabilities; their CMGT manifests differ
   exactly on the capability-gated media channels. Test: client A
   declares `images: true, sound: false`; client B declares `images:
   false, sound: true`; assert A's manifest contains `image:*`
   channels but no `sound`; B's contains `sound` but no `image:*`.
3. **AC-3 — Media channel mappings.** Each ADR-101 event has a
   round-trip test through channel-service: emit a synthetic
   `media.image.show` from a story action, assert the resulting `turn`
   packet contains the corresponding `image:<layer>` channel with the
   ADR-101 payload preserved (modulo the `bus` rename and the
   `command`-not-`action` rename for hotspots).
4. **AC-4 — Synthesized command from hotspot click.** Client receives
   an `image:main` payload with hotspots; simulating a click on a
   hotspot emits a `{ kind: 'command', text: ... }` packet. The engine
   processes it indistinguishably from a typed command. Test in
   single-user platform-browser.
5. **AC-5 — `clear` truncation.** Story emits 5 entries on a `main`
   channel, then a `clear` with `target: 'main'`. The renderer's
   accumulated `main` buffer is empty after the clear. Subsequent
   appends start fresh. Mid-session joiner replaying the transcript
   sees the post-clear state.
6. **AC-6 — Single-user CLI parity.** A Dungeo session run from the
   CLI consumes channel-I/O packets (CMGT + `turn`) and renders `main`
   to stdout; standard channels behave identically to the multi-user
   web client. Test: same command sequence, same `main`-channel
   content.
7. **AC-7 — Single-user zifmia parity.** A Dungeo session run in
   zifmia consumes channel-I/O packets; `location`, `score`, `turn`
   render to the GameContext-derived status surfaces; `main` renders
   to the transcript. text-service is not in the producer path.
8. **AC-8 — Single-user platform-browser parity.** A Dungeo session
   run in platform-browser consumes channel-I/O packets; same renderer
   contract as zifmia. text-service is not in the producer path.
9. **AC-9 — Story renderer parity across surfaces.** A test story
   that registers a custom `json` channel and ships its own renderer
   produces identical packets and identical rendered output across
   zifmia, platform-browser, and the multi-user web client. (The
   Alderman, when built, is the canonical exemplar; for AC-9 a
   smaller test story will do.)
10. **AC-10 — ADR-101 events have no remaining direct emission path.**
    `grep -r 'media.image.show\|media.sound.play\|...' packages/`
    returns zero results. The folded channel emissions are the only
    way to drive media.

## Consequences

**Positive:**

- **Renderer parity across surfaces.** A story written once runs
  identically in zifmia, platform-browser, CLI, and multi-user web.
  Author-shipped renderers (per ADR-163 D6) are write-once.
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
- **fyrevm lineage closes.** The 2010-era fyrevm-server channel-I/O
  pattern becomes the universal Sharpee wire — the architectural
  intent that pre-dates text-service finally lands.

**Negative:**

- **Migration cost is real for zifmia and platform-browser.** Both
  consume text-blocks today. The renderer pipelines need to be
  rewritten to consume CMGT + `turn` packets. The plan doc enumerates
  the work; this ADR notes it but doesn't bound it.
- **Authors writing for ADR-101 against the published spec lose
  `onComplete`.** No animation completion callbacks; authors needing
  end-of-cutscene signals route through hotspot-style click
  affordances. A real change from ADR-101 as written.
- **`bus` rename and `command` rename break ADR-101 verbatim
  fidelity.** Anyone who internalized ADR-101's schema will need to
  relearn two field names. Worth one mention in author-facing docs.
- **`media.status.update` is gone.** Authors targeting that event have
  to migrate to standard status channels (`location` / `score` /
  `turn`) or a custom story-defined channel.
- **Single-user `hello` synthesis adds plumbing.** zifmia and CLI need
  a small startup path that constructs and dispatches the
  ClientCapabilities to local channel-service. Conceptually the same
  as the multi-user case; mechanically it is new code.
- **text-service is now ambiguous.** Some of its code is retired (the
  wire-producing role); some may stay (terminal-specific helpers).
  The migration plan must be explicit about what stays and what goes
  to avoid leaving dead code behind.

## Resolved Implementation Choices

- **Wire framing:** JSON-encoded packets over the active transport.
  Multi-user is WebSocket; single-user is in-process.
- **`hello` is a real packet shape on the wire**, but single-user
  surfaces synthesize it internally rather than transmit it.
- **Capability scope:** standard channels never gated; media channels
  always gated; story channels by author choice.
- **Layer ordering:** convention-based; story layers carry `z` in
  payload.
- **Callback model:** synthesized commands; no separate callback
  packet kind.
- **`onComplete` for animations:** dropped; out of scope.
- **`media.clear` semantics:** allowed to truncate `append` channels;
  transcript records the clear.
- **Story init timing:** unconditional; CMGT filters at emission.
- **Asset pipeline:** out of scope; separate ADR.
- **text-service retirement:** wire-producing role only; terminal
  helpers may remain.

## Open Questions for Implementation

- **Migration phasing for single-user surfaces.** CLI first / zifmia
  last is the recommended order, but specific milestones (which
  Dungeo features must pass before zifmia migrates, etc.) belong in
  the plan doc.
- **Replay packet shape on connect.** ADR-163 D8 mentions a
  synthesized "current state" packet for mid-session joiners.
  Sequence-diagrams §4 #1 surfaces the open question: one big packet
  vs N small packets replayed from the transcript. Drawing the
  diagrams suggested one packet is cleaner for state, but
  transcript-builder rendering may want the N-packet form so animations
  / event channels don't fire on replay. Recommend the N-packet
  form, with a `replay: true` flag on each replayed `turn` packet
  that the renderer uses to suppress event-mode side effects. Resolve
  during channel-service implementation.
- **`prevValues` storage strategy.** Per-channel emit policy
  (ADR-163 D2) needs `prevValues` for any `'sparse'`-emit channel.
  Sequence-diagrams §4 #2 recommends recovering `prevValues` from the
  prior transcript-capability entry — self-contained in the save blob.
  Implement and verify under stateless multi-user load.
- **CMGT versioning.** Today: `protocol_version: 1`. When a new
  standard channel is added, does the version bump or does the
  manifest just grow? Recommend: protocol_version bumps only on
  breaking shape changes (packet kinds, ChannelDefinition fields);
  additive channels (new standard or new media) do not bump version.
  Confirm in implementation.
- **text-service's continued surface.** Which terminal-specific
  helpers stay? Audit `text-service` post-migration and document the
  remaining surface, or fully retire the package.

## Constrains Future Sessions

- **One wire to extend.** Adding a new media surface requires
  updating decision 4's table, registering a new channel, and adding
  the corresponding capability flag. ADR amendment territory if the
  new media class doesn't fit the existing modes; otherwise a
  channel-service patch.
- **No new packet kinds without an ADR.** The four packet kinds
  (`hello`, `cmgt`, `turn`, `command`) are the wire surface. Any
  proposal for `callback`, `bootstrap`, `error`, etc. is an ADR-level
  decision.
- **ADR-101 vocabulary.** `media.image.show` etc. are no longer real
  events — they are historical names for what are now channel
  emissions. Author-facing docs and tutorials should use channel
  vocabulary, not ADR-101 event vocabulary.
- **Capability flags are versioned with the protocol.** Adding a new
  `ClientCapabilities` flag (e.g. `haptics`, `vr`) is a backwards-
  compatible additive change at protocol version 1. Removing a flag
  bumps the version.
- **Asset pipeline must accommodate both ADR-163 D6 (renderer assets)
  and ADR-101's `assets/...` bundle layout.** The forthcoming
  asset-pipeline ADR cannot pick one in isolation.
- **Single-writer principle preserved.** ADR-163's "engine produces;
  channel-service consumes; wire emits" pipeline holds across all
  surfaces. No surface introduces a parallel write path.

## References

- ADR-101 (SUPERSEDED): Graphical Client Architecture — author-
  controlled media events.
- ADR-163: Stateless Multi-User Server with Channel I/O — the wire
  this ADR universalizes.
- ADR-161: Persistent Identity (carries forward unchanged).
- ADR-129: ScoreLedger (independent).
- `docs/work/channel-io-unification/audit-20260429-adr-101.md` —
  capability-by-capability audit of ADR-101 against the channel
  model. The six design choices recommended in §14 of the audit are
  resolved in decisions 2, 3, 5, 6, 7, 8 of this ADR.
- `docs/work/channel-io-unification/sequence-diagrams-20260429.md` —
  worked turn-by-turn message flows for Dungeo (vanilla) and The
  Alderman (author renderer). The validation matrix in §3 of the
  diagrams becomes part of this ADR's acceptance criteria.
- `stories/thealderman/docs/detective-sheet.jsx` — story-authored
  case-board sketch demonstrating author-controlled UX. Cited in
  ADR-163 D6 as the architectural shape this ADR's universal wire
  must support.
- `packages/text-blocks/src/types.ts` — engine output abstraction;
  unchanged by this ADR. Channel-service consumes it.
- `legacy/tools-server` (origin branch) — preserved pre-ADR-163
  multi-user implementation.

## Session

2026-04-29 main — derived from the post-ADR-163 conversation that
surfaced (a) the channel-service-vs-text-service question for
single-user surfaces, (b) the ADR-101 lineage of author-controlled
media that pre-dated text-service, and (c) the recognition that
text-service was a pragmatic interim, not the design destination.
The audit and sequence-diagram exercises validated that ADR-101's
surface area folds cleanly into the channel model with six explicit
design choices, all resolved in this ADR.
