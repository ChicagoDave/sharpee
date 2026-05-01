# ADR-165: Renderer Architecture — Consumer-Side Channel I/O

## Status: ACCEPTED

## Date: 2026-05-01

## Builds on

- **ADR-163** (Channel-Service Platform) — defines the wire shapes,
  the producer-side `@sharpee/channel-service` API, the standard
  channel set, capability handshake, and the session-continuity
  guarantee. ADR-163 settles **what** flows. This ADR settles
  **how the consumer renders it.**
- **ADR-164** (Stateless Multi-User Server) — one downstream
  consumer of the renderer contract defined here. The multi-user
  web client uses the same renderer architecture as single-bundle
  surfaces; only the transport differs.

## Carries forward unchanged

- Wire shapes, packet ordering, capability handshake, emit policy,
  session continuity (re-emission identity) — all from ADR-163.
- Renderer-local-vs-channel-driven boundary rule from ADR-163 §9:
  *"If the action would change what the engine sees on the next
  turn, it is a `CommandPacket`. Otherwise it is renderer-local
  and never reaches the wire."*

## Context

ADR-163 defines the producer-side contract — `produceCmgtManifest`,
`produceTurnPacket`, `registerChannel`, `addRule` — and the wire
shapes consumers receive (`CmgtPacket`, `TurnPacket`,
`CommandPacket`). It does not specify the consumer-side
architecture: how a renderer dispatches packets to per-channel
rendering logic, how stories register their own channel renderers,
how layouts compose, or how renderer-local UI state is held
separate from channel-driven state.

The spike at `spikes/channel-io/` validated the producer contract
against the Alderman case (custom channels, story-overridden `main`,
synthesized commands). Eight gaps surfaced; two were absorbed into
ADR-163. This ADR addresses the remaining six:

1. The `ChannelRenderer` interface — what a per-channel renderer
   exposes to the dispatcher.
2. The `Renderer` interface — what the renderer instance exposes
   to its surrounding consumer (CLI runtime, browser entry,
   multi-user web client).
3. The channel-renderer registry — registration, override,
   fallback.
4. State-store ownership — where channel state lives across turns
   and how it interacts with renderer-local UI state.
5. Default platform renderers — what the platform ships and how
   stories override.
6. Layout / slot system — how channel renderers compose into a
   coherent screen.

## Decision

**The consumer-side architecture is a registry of `ChannelRenderer`
implementations, dispatched by a `Renderer` instance that owns the
channel state store and exposes a stable surface to its consumer.
Platform defaults register first; stories override by
re-registering. Layout is a slot lookup; the platform ships a
default, stories may replace it. Renderer-local UI state is held
by the renderer but never persisted with channel state and never
appears on the wire.**

Eight constituent decisions follow.

### 1. `ChannelRenderer` interface

Per-channel rendering logic implements:

```ts
interface ChannelRenderer {
  // Required. Called once per emission of this channel in a turn
  // packet. `value` is shaped per the channel's contentType:
  //   replace-mode: the latest value
  //   append-mode:  array of new entries this turn (ADR-163 §5)
  //   event-mode:   the event payload
  onValue(value: unknown, channel: ChannelDefinition): void;

  // Optional. Append-mode only. Invoked by the dispatcher when a
  // `clear` event with a matching `target` arrives. The renderer
  // is responsible for clearing its rendered output (e.g.,
  // emptying its DOM container). The state store is reset by the
  // dispatcher.
  onClear?(target: string): void;

  // Optional. Invoked when CMGT is applied. Use for one-time
  // setup (DOM scaffolding, asset preload, audio context
  // initialization). Not for state restoration — that comes via
  // applyTurnPacket replays.
  //
  // On the *first* applyCmgt of a Renderer's lifetime this is
  // the only setup hook called. On *subsequent* applyCmgt calls
  // (e.g., during a repaint), onDestroy is called first to let
  // the renderer release any resources from the prior session,
  // then onCmgt is called again to set up a fresh session.
  onCmgt?(channel: ChannelDefinition, manifest: CmgtPacket): void;

  // Optional. Invoked when a fresh applyCmgt is about to reset
  // the world for this Renderer. Use this to release resources
  // allocated in onCmgt or held by long-lived event listeners
  // (Web Audio context, IntersectionObserver, etc.). Symmetric
  // with onCmgt; neither hook is required, but a renderer that
  // implements onCmgt and allocates teardown-needing resources
  // SHOULD implement onDestroy.
  //
  // Not called when the Renderer itself is being torn down
  // (process exit, page unload) — that path is the host
  // platform's responsibility.
  onDestroy?(): void;
}
```

The minimal renderer implements only `onValue`. The optional hooks
exist for renderers that need explicit clear handling, one-time
boot work, or resource cleanup; they are not required for typical
replace and append renderers.

The interface is **deliberately small**. Logic that needs to
reach across channels (e.g., a status-bar renderer reading both
`location` and `score`) lives in the renderer's host module, not
inside the `ChannelRenderer` instances. The `ChannelRenderer`
contract is one channel in, one rendering operation out.

### 2. `Renderer` interface

The top-level handle the consumer drives:

```ts
interface Renderer {
  // Apply a CMGT packet. On second+ invocations, runs onDestroy
  // hooks for currently-registered ChannelRenderers first, then
  // resets channel state stores, then invokes onCmgt hooks (per
  // §4 dispatch contract).
  applyCmgt(packet: CmgtPacket): void;

  // Dispatch a turn packet. For each key in payload, looks up
  // the registered ChannelRenderer and invokes onValue (or
  // onClear, for clear events on append channels). Updates state
  // stores.
  applyTurnPacket(packet: TurnPacket): void;

  // Subscribe to CommandPackets emitted by the renderer in
  // response to UI gestures.
  onCommand(handler: (cmd: CommandPacket) => void): void;

  // Emit a CommandPacket. Called by ChannelRenderer
  // implementations when a UI gesture should advance the engine
  // (per ADR-163 §9).
  emitCommand(text: string): void;

  // Optional. Snapshot of the channel state store for testing
  // and AC-12 (re-emission identity round-trip).
  getStateSnapshot?(): Record<string, unknown>;
}
```

A consumer (CLI runtime, browser entry, multi-user web client)
constructs one `Renderer` instance per session, drives it with
`applyCmgt` then `applyTurnPacket` per turn, and subscribes to
`onCommand` to feed the producer.

### 3. Channel-renderer registry — last-write-wins

Renderers register against channel ids:

```ts
function registerRenderer(channelId: string, renderer: ChannelRenderer): void;
```

**Last-write-wins resolution.** Platform-default renderers
register first during platform boot. Stories register during story
init; if a story registers a renderer for a channel id that the
platform also has a default for, the story's renderer replaces
the platform default. There is no "merge" or "delegate-to-parent"
semantics — the registered renderer is the only renderer for that
channel id.

**"Story init" in multi-user is split.** In a single-bundle
deployment, story init is one block of code that runs once at
boot, doing both channel registration (producer-side, per ADR-163
§11) and renderer registration (consumer-side, per this section).
In a multi-user deployment, those two halves run in different
processes:

- The **server** runs the producer-side half on every stateless
  worker boot (ADR-164 §1) — registering channels and rules so
  `produceCmgtManifest` produces the correct manifest.
- The **client** runs the consumer-side half on every fresh
  connection — registering `ChannelRenderer` implementations,
  registering slots, mounting layout.

Both halves come from the same story bundle but are invoked from
different sides. The asset-pipeline ADR (forthcoming) covers how
a `.sharpee` bundle declares which symbols are server-side and
which are client-side — and how each side loads only the part it
needs. The `ChannelRenderer` registration covered in this ADR is
strictly the **client-side** half.

**Fallback.** A channel id that appears in the CMGT manifest but
has no registered renderer falls back to a **generic JSON-tree
view** that renders the value as a collapsible tree. The
dispatcher logs a one-time warning per unrendered channel id.
This keeps unknown story channels visible-and-debuggable rather
than silently dropped.

**Deregistration is not supported.** A registry is monotonic
within a session. Stories that need to swap renderers based on
game state should encode the switching logic inside a single
renderer rather than swapping registrations.

### 4. Dispatch contract

When `applyTurnPacket(packet)` runs:

1. For each key in `packet.payload`:
   - Look up the `ChannelDefinition` from the current CMGT
     manifest. If not present (channel not in manifest), log a
     warning and skip.
   - Look up the registered `ChannelRenderer`. If not present,
     fall back to the generic JSON-tree view.
   - Update the state store for the channel (per decision 5).
   - Invoke the renderer's `onValue(value, channelDef)`.
2. **Clear handling.** If the payload contains a `clear` event
   channel emission, the dispatcher additionally:
   - Identifies append-mode channels matching the clear's
     `target` field.
   - Empties the state store for each matching channel.
   - Invokes each matching channel renderer's `onClear(target)`
     (if defined) so the renderer can drop its rendered output.
   - The `clear` channel renderer itself runs `onValue` as
     normal — typically used for visual side effects (a "scene
     transition" toast, a fade-to-black animation).

**Dispatch is synchronous.** All `onValue` and `onClear`
invocations for a single turn packet complete before
`applyTurnPacket` returns. This preserves render-order
determinism: the renderer's screen state after a turn packet is a
function of the packet's payload and the renderer's prior state,
nothing else.

**Order within a turn packet.** The dispatcher processes payload
keys in **CMGT manifest order** — i.e., the order channels were
registered. This makes layout updates deterministic when multiple
channels in one turn affect the same DOM region.

**`applyCmgt` lifecycle.** When `applyCmgt(packet)` runs, the
dispatcher executes in this order:

1. **First invocation only**: skip teardown.
   **Subsequent invocations** (e.g., on repaint): for each
   currently-registered `ChannelRenderer` whose channel was in
   the *prior* manifest, invoke `onDestroy()` (if defined). This
   gives renderers a chance to release resources allocated in
   their previous `onCmgt` (Web Audio contexts, observers, event
   listeners). The dispatcher does not enforce ordering between
   renderers' `onDestroy` calls — they are independent.
2. Reset all channel state stores to empty.
3. Update the current manifest to `packet`.
4. For each `ChannelDefinition` in the new manifest, invoke its
   registered renderer's `onCmgt(channel, packet)` (if defined).
   `onCmgt` invocations also do not require ordering, but the
   dispatcher invokes them in manifest order for determinism.

This makes `applyCmgt` symmetric: every `onCmgt` is paired with
exactly one future `onDestroy` (either on the next `applyCmgt`,
or never if the Renderer outlives all its `applyCmgt` calls and
is then torn down by the host platform). Renderers that do not
allocate teardown-needing resources can omit `onDestroy` and
nothing breaks.

### 5. State store — ownership and lifecycle

The renderer holds a state store keyed by channel id:

```ts
interface ChannelStateStore {
  [channelId: string]:
    | unknown        // replace-mode: the latest value
    | unknown[]      // append-mode: accumulated list
    | undefined;     // event-mode or never-emitted: no entry
}
```

**Lifecycle:**

- **Reset on `applyCmgt`.** Every CMGT application clears the
  store. This is what makes session continuity work: a fresh
  store + replayed packets reconstruct identical state.
- **Updated on `applyTurnPacket`.** Replace channels overwrite;
  append channels concatenate (subject to clear truncation);
  event channels do not write to the store.
- **Read by `ChannelRenderer.onValue`.** A renderer that needs to
  cross-reference other channels (e.g., the case-board renderer
  reading the notebook's `suspected` list to mark candidates)
  reads from the store via the renderer's host helper.
- **Snapshot via `getStateSnapshot()`.** Returns a deep-cloned
  copy of the store for testing. Used by ADR-163 AC-12
  (persist-and-repaint round-trip).

**The state store is not the renderer's only state.** It holds
*channel-driven* state — the data that came over the wire.
Renderer-local UI state (decision 6) is held separately.

**The state store is not exposed for direct mutation.** Renderers
read from it via the dispatcher's reference; they do not mutate
it. Mutation goes through the dispatcher, which keeps state
updates aligned with rendering and avoids divergence between
store and screen.

### 6. Renderer-local UI state — separate, never persisted, never on wire

Pure-visual state — modal visibility, scroll position, hover
state, tooltip visibility, in-progress animation flags — is held
**separately from the channel state store**. It is:

- **Held by the renderer** as ordinary instance variables or
  closure state in the host module.
- **Never written to the channel state store.** Snapshots taken
  by `getStateSnapshot()` do not include it.
- **Never persisted across sessions.** Reopening a saved session
  resets renderer-local state to defaults. (A story that wants
  modal visibility to persist must route it through a story
  channel, which makes it channel-driven state.)
- **Never round-trips through `CommandPacket`** (per ADR-163 §9).

The boundary rule (from ADR-163 §9):

> If the action would change what the engine sees on the next
> turn, it is a `CommandPacket`. Otherwise it is renderer-local
> and never reaches the wire.

State that backs renderer-local actions follows the same
boundary: state behind a `CommandPacket`-emitting gesture is
channel-driven (round-trips through the engine's response to
that command); state behind a non-wire interaction is
renderer-local.

**Worked example — the Alderman's `REVIEW NOTES`:**

- Player types `review notes` → `CommandPacket` → engine treats
  it as a wait-equivalent → engine emits to a story channel
  `view_state` (replace, json) carrying `{ panel: 'dossier',
  open: true }` → renderer reads the channel and *opens* the
  dossier panel.
  → The "open" state is **channel-driven**. It survives repaint
  because it lives in the channel state store.

- Player closes the dossier with the close button → renderer
  flips a local `dossierClosed` boolean → no `CommandPacket`, no
  turn passes.
  → The "closed-by-user" state is **renderer-local**. It does
  not survive repaint; reopening the session shows the dossier
  open again (because the channel state store says it's open),
  and the player must close it again if they want.

This is the right behavior. Renderer-local state is *ephemeral
preference*; channel-driven state is *game state*. The boundary
keeps them separate by construction.

### 7. Layout & slot system — default + override

A **slot** is a named handle to a region of the renderer's output
surface (a DOM element id in the browser; a terminal region or
ANSI cursor zone in the CLI; a Canvas group in a graphical
runtime). Channel renderers write to slots.

```ts
function getSlot(name: string): SlotHandle | null;
```

`SlotHandle` is whatever the renderer host platform uses to
address output regions. In the browser default, it is an
`HTMLElement`; in the CLI, it is a small object with `write()`
and `clear()` methods.

**Platform-default layout.** The browser-default renderer mounts a
layout with the following named slots, populated by the
platform-default channel renderers:

| Slot          | Channels rendered into it                    |
| ------------- | -------------------------------------------- |
| `status`      | `location`, `score`, `turn`                  |
| `main`        | `main` (prose), `command_echo` (multi-user)  |
| `sidebar`     | `chat`, `presence` (multi-user)              |
| `input`       | `prompt` + the user input field              |
| `media`       | `image:*`, `animation`, `transition`         |
| `notify`      | `death`, `endgame`, `score_notify` (toasts)  |
| `meta`        | `info`, `ifid` (typically hidden)            |

The CLI default layout uses a flat region model (status line at
top, prose in the middle, prompt at bottom). The slot names are
the same; the SlotHandle differs.

**Story override — two patterns.** A story can:

1. **Keep platform layout, override individual renderers.** Most
   common case. Story does not ship a layout; it just registers
   replacement `ChannelRenderer` implementations for specific
   channel ids. The platform-default layout's slots remain valid
   addresses.
2. **Replace the layout entirely.** Story bundle ships its own
   DOM (or terminal layout) and registers new slot names via
   `registerSlot(name, handle)`. The platform-default layout is
   not mounted. Story-supplied channel renderers reference
   story-defined slot names. The Alderman case is this pattern —
   the case-file UI replaces the entire default layout with
   masthead / case-board / evidence-pile / assertions-list /
   notebook / terminal slots.

**The platform does not enforce a coupling between channels and
slots.** A `ChannelRenderer` for the `main` channel can write to
any slot the renderer can resolve. The default
main-channel-renderer happens to write to the `main` slot, but a
story-supplied main-renderer could write to a story-defined
`notebook` slot instead.

### 8. Default platform renderers — what ships

The browser-default and CLI-default renderers ship with
implementations for all ten standard engine-sourced channels
(ADR-163 §4) and the media channels (ADR-163 §7) at full
capability:

| Channel              | Default renderer behavior                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `main`               | Append prose entries to the `main` slot (DOM: scrolling div; CLI: stdout)                       |
| `prompt`             | Set the input slot's prompt label                                                               |
| `location`           | Update the status slot's location field                                                         |
| `score`              | Update the status slot's score field (formatted `current/max`)                                  |
| `turn`               | Update the status slot's turn-counter field                                                     |
| `info`               | Set the document title (browser) or write to a meta region (CLI)                                |
| `ifid`               | Write to the meta region (typically not shown; available for story queries)                    |
| `death`              | Render a notify-slot toast / modal                                                              |
| `endgame`            | Render a notify-slot terminal screen                                                            |
| `score_notify`       | Render a transient notify-slot toast                                                            |
| `image:<layer>`      | Mount/unmount an `<img>` (or canvas equivalent) in the media slot at the layer's z-index        |
| `image:preload`      | Trigger asset prefetch; no visible output                                                       |
| `sound`              | Play through Web Audio (browser) or skip (CLI)                                                  |
| `music`              | Loop through Web Audio (browser) or skip (CLI)                                                  |
| `ambient:<id>`       | Loop through Web Audio at lower priority than `music` (browser) or skip (CLI)                   |
| `animation`          | Run a story-named animation against the media slot                                              |
| `animate`            | Apply a CSS/JS property animation to a target element                                           |
| `transition`         | Run a screen-transition effect                                                                  |
| `layout`             | Apply the layout configuration to the renderer's root                                           |
| `clear`              | Visual side effect (default: nothing); the dispatcher handles the truncation semantics          |

**Multi-user channels** (`chat`, `presence`, `command_echo` —
ADR-164 §3) have platform-default renderers that work in both
single-bundle and multi-user surfaces. In single-bundle they sit
idle (no chat or presence ever emits); in multi-user the default
sidebar renderer surfaces them.

**Story-defined channels** have no platform default. The fallback
generic JSON-tree view applies until the story registers a
renderer.

## Invariants

- **`ChannelRenderer.onValue` is the only required method.**
  Stories can implement a minimal renderer with a single method;
  optional hooks exist for renderers that need them.
- **Last-write-wins for renderer registration.** Platform
  defaults register first; story overrides replace them. There
  is no chain or fallback to the prior registration.
- **State store reset on every `applyCmgt`.** The store is never
  partially populated from a prior session; replayed packets
  rebuild it from empty.
- **Synchronous dispatch.** All renderer invocations for a turn
  packet complete before `applyTurnPacket` returns.
- **Manifest-order dispatch.** Within a turn packet, payload keys
  are dispatched in CMGT manifest order.
- **Renderer-local state is never in the channel state store.**
  Snapshots taken for re-emission identity testing exclude
  renderer-local state.
- **Slot resolution is the renderer's responsibility.** The
  platform supplies a default layout with named slots; stories
  may replace it; channel renderers reference slots by name.
- **Generic JSON-tree fallback for unrendered channels.** A
  channel id in CMGT with no registered renderer renders as a
  collapsible JSON tree, not silently dropped.
- **`onCmgt` and `onDestroy` are paired.** Every `onCmgt`
  invocation on a `ChannelRenderer` is paired with at most one
  future `onDestroy` invocation, executed by the dispatcher on
  the next `applyCmgt` (or never, if the `Renderer` is torn down
  without a second `applyCmgt`). Renderers without
  teardown-needing resources may omit `onDestroy`.

## Acceptance Criteria

The acceptance criteria split into two groups, mirroring ADR-163.

**Renderer contract** (AC-1 through AC-9). Testable in isolation
against a platform-shipped renderer implementation. Downstream
consumers depend only on this group.

**Consumer integrations** (AC-10 through AC-12). Track adoption
across surfaces. Land progressively.

### Renderer contract

1. **AC-1 — `ChannelRenderer` interface defined and exported.**
   `@sharpee/channel-service` (or a new `@sharpee/renderer`
   package — implementation choice) exports the
   `ChannelRenderer` and `Renderer` interfaces declared in
   decisions 1 and 2.

2. **AC-2 — Registry with last-write-wins.** Test:
   `registerRenderer('main', defaultMainRenderer)` followed by
   `registerRenderer('main', storyMainRenderer)` results in only
   `storyMainRenderer.onValue` being invoked when a `main`
   channel value arrives.

3. **AC-3 — JSON-tree fallback.** Test: a channel id present in
   the CMGT manifest but never registered by any
   `registerRenderer` call still renders (as a collapsible
   JSON-tree view) when its channel emits, and a one-time
   warning is logged.

4. **AC-4 — Dispatch correctness.** Test: a turn packet with a
   payload of `{ main: ['hello'], location: 'foyer' }` invokes
   exactly two `onValue` calls — one on the `main` renderer with
   `['hello']`, one on the `location` renderer with `'foyer'`.
   No other renderers fire.

5. **AC-5 — Manifest-order dispatch.** Test: register channels
   in order A, B, C; emit a turn packet with payload keys in
   order C, A, B; assert `onValue` is invoked in registration
   order A, B, C.

6. **AC-6 — `clear` truncation with `onClear`.** Test: append 5
   entries to a channel registered with an `onClear` hook; emit
   a `clear` event with matching target; assert the channel's
   state store is empty AND the `onClear` hook fired exactly
   once. Subsequent appends start fresh.

7. **AC-7 — State store lifecycle.** Test: drive the renderer
   for 3 turns; capture state snapshot. Apply a fresh CMGT;
   assert state store is empty. Replay the captured packets;
   assert state store equals the original snapshot exactly. (This
   is the renderer-side counterpart of ADR-163 AC-12.)

8. **AC-8 — Renderer-local state isolation.** Test: a renderer
   that maintains a local `dossierClosed` boolean does not have
   that field appear in `getStateSnapshot()`. Replay-after-reset
   does not restore the boolean to its prior value. (Verifies
   decision 6.)

9. **AC-9 — Slot system.** Test: `getSlot('main')` returns a
   handle in the platform-default layout. After a story calls
   `registerSlot('notebook', someHandle)` and replaces the
   layout, `getSlot('notebook')` returns the new handle and
   `getSlot('main')` returns null (or the appropriate sentinel).

### Consumer integrations

10. **AC-10 — CLI renderer parity.** The CLI consumer
    (`@sharpee/cli` or equivalent) instantiates a `Renderer`
    that conforms to AC-1–AC-9 and renders a Dungeo session
    using only platform-default `ChannelRenderer`
    implementations.

11. **AC-11 — Platform-browser renderer parity.** Same as AC-10
    but for the browser bundle, using DOM-based platform-default
    `ChannelRenderer` implementations.

12. **AC-12 — Story-renderer override (Alderman-shaped).** A
    test story registers four custom channels (`evidence`,
    `assertions`, `notebook`, `case_board`), supplies channel
    renderers for each, replaces the platform default layout
    with a story-supplied layout, and overrides the platform
    default `main` renderer with a story-styled variant. The
    resulting render matches the spike at
    `spikes/channel-io/index.html` for an equivalent turn
    sequence.

## Consequences

**Positive:**

- **Stories override cleanly.** Last-write-wins registration is
  the simplest viable model; no parent-chain, no merge logic.
- **Renderer is testable in isolation.** With mock
  `ChannelRenderer`s, `Renderer.applyCmgt` /
  `applyTurnPacket` round-trips test without DOM, transport,
  or engine.
- **State-store snapshot supports re-emission identity.** AC-7
  here mirrors ADR-163 AC-12; passing both ACs proves session
  continuity end-to-end.
- **Renderer-local state is structurally isolated.** A renderer
  bug that conflates UI state with channel state shows up as a
  test failure (AC-8), not as a subtle save-game corruption.
- **Slot system supports both naive (platform default) and
  ambitious (Alderman-shape) layouts** without protocol
  changes.

**Negative:**

- **Two state surfaces in the renderer.** Channel state store +
  renderer-local state. Implementations must be disciplined
  about which is which. The boundary rule (from ADR-163 §9)
  helps, but it is a discipline cost.
- **No deregistration.** A story that wants to swap renderers
  mid-session must encode the swap inside a single renderer's
  `onValue`. Adds complexity for that pattern but keeps the
  registry semantics simple.
- **Generic JSON-tree fallback may surprise authors.** A
  story that forgets to register a renderer for a custom channel
  sees a JSON tree on screen. Better than silent drop, but less
  obvious than a hard error. The one-time warning mitigates
  this.
- **Platform-default renderers are tied to their host
  environments.** The browser default uses DOM; the CLI default
  uses ANSI; zifmia (whenever migrated) needs its own. There
  is no portable "platform renderer" that runs everywhere —
  there is a portable *contract* and per-host implementations.
- **`onCmgt` paired with `onDestroy`.** Renderers that initialize
  long-lived resources in `onCmgt` (Web Audio contexts,
  observers, registered listeners) implement `onDestroy` to
  release them; the dispatcher invokes `onDestroy` on every
  `applyCmgt` after the first, before resetting state and
  re-invoking `onCmgt`. Renderers with no teardown-needing
  resources can omit `onDestroy` and nothing breaks. The cost
  is one more optional hook on the `ChannelRenderer` interface;
  the benefit is that long-session repaints don't leak resources
  by construction.

## Resolved Implementation Choices

- **`ChannelRenderer` is an object (not a class).** Plain object
  with method properties. Avoids prototype-chain confusion;
  simpler to register at runtime.
- **`Renderer` is a singleton per session.** One instance per
  consumer surface. A multi-user web client running two tabs
  has two `Renderer` instances, one per tab.
- **State store is internal to the `Renderer` instance.**
  Renderers read it via dispatcher-supplied references, not via
  a global. Multiple `Renderer` instances on a page do not
  share state.
- **Slot resolution is `getSlot(name) → handle | null`.**
  `null` is the sentinel for "slot not registered." Renderers
  must handle null gracefully (typically by skipping rendering
  for that channel).
- **Default-layout slots register at `Renderer` boot.** Story
  init runs after the platform default has set up its slots, so
  stories can either use them or call `registerSlot` to
  override.
- **JSON-tree fallback ships with the renderer**, not with
  channel-service. It is purely a consumer-side concern.

## Open Questions for Implementation

- **Where do platform-default renderers physically ship?** Bundled
  with `@sharpee/channel-service`? With a separate
  `@sharpee/renderer-browser` and `@sharpee/renderer-cli`? With
  the per-host runtime package? Implementation choice; not
  ADR-level. Recommend per-host packages so a CLI consumer
  doesn't pay for DOM-aware code.
- **Does the renderer pre-allocate state-store keys at CMGT
  time?** Or lazily on first emission? Performance question;
  pre-allocation may help long-session memory locality.
  Implementation tuning, not contract.
- **Asset-pipeline coupling.** Platform-default renderers may
  reference assets (icons, fonts, sounds) that need to ship
  with the platform. Story-supplied renderers reference assets
  that ship in the story bundle. The asset-pipeline ADR
  (forthcoming) covers both.
- **Renderer-side performance during long-session replay.** The
  spike's findings note that 1000-turn replay sequentially
  invokes `onValue` 1000+ times, with DOM operations each time.
  An optimization is for the dispatcher to detect replay (the
  consumer signals "I am about to replay N packets") and
  buffer DOM updates into a single batch commit. The contract
  in this ADR allows that optimization without modification —
  the renderer can choose to defer rendering until a
  consumer-supplied "replay complete" signal — but the optimal
  implementation is left for the renderer-side packages to
  decide.

## Constrains Future Sessions

- **`ChannelRenderer` interface is part of the platform
  contract.** Adding a required method bumps the renderer
  protocol version; adding an optional hook is additive.
- **`Renderer` interface bound across consumer migrations.**
  Adding methods is additive; changing existing method
  signatures requires a coordinated migration of CLI,
  platform-browser, and any multi-user client.
- **Last-write-wins registration is the model.** Future
  proposals for parent-chain or merge semantics need an ADR.
- **Slot model is host-specific behind a uniform name-based
  API.** A renderer for a future host (VR, terminal grid,
  voice) must supply its own `SlotHandle` shape; the lookup
  surface stays the same.
- **No deregistration.** Future proposals to support
  `unregisterRenderer` need an ADR; the current model assumes
  monotonic registration.
- **The state store is the renderer's source of truth for
  channel-driven state.** Bypassing it (e.g., a renderer that
  reads directly from CmgtPacket history) breaks the
  re-emission identity invariant and is a correctness bug.

## References

- ADR-163: Channel-Service Platform — the producer-side contract
  this ADR consumes.
- ADR-164: Stateless Multi-User Server — one downstream consumer
  of this renderer architecture.
- `spikes/channel-io/index.html` — runnable validation of the
  renderer architecture against the Alderman case.
- `spikes/channel-io/findings.md` — eight gaps from the spike;
  six are resolved here, two are resolved in ADR-163 §5 and §14.
- `docs/work/channel-io-unification/diagrams/renderer-architecture.html`
  — six-panel sketch of the consumer side. Visual companion to
  this ADR.
- `stories/thealderman/docs/detective-sheet.jsx` — story-shipped
  layout exemplar for the "story replaces the layout entirely"
  pattern (decision 7).
- Forthcoming asset-pipeline ADR — covers how renderer code and
  renderer-referenced assets physically ship in story and
  platform bundles. Out of scope here.

## Session

2026-05-01 main — derived from the renderer spike at
`spikes/channel-io/`, which validated the platform contract
against the Alderman case and surfaced eight gaps. Two gaps
were absorbed into ADR-163 (§5 append-mode payload value shape;
§14 standard repaint sequence) plus one boundary rule into
ADR-163 §9 (renderer-local UI state). The remaining six gaps are
resolved by this ADR's eight decisions: `ChannelRenderer`
interface, `Renderer` interface, registry with last-write-wins,
dispatch contract, state-store ownership, renderer-local state
isolation, slot system, default platform renderers. The Alderman
case is the canonical exemplar for the "story replaces the
layout entirely" pattern; the spike's session validated that the
contract supports it without protocol changes.
