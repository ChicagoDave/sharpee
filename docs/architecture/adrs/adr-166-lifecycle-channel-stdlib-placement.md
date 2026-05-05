# ADR-166: Lifecycle Channel Lives in Stdlib

## Status: ACCEPTED

## Date: 2026-05-04

## Builds on

- **ADR-163** (Channel-Service Platform) — defines `IOChannel`,
  `IChannelRegistry`, the standard channel registry hosted in stdlib,
  and the rule that channels are the universal UI surface.
- **ADR-165** (Renderer Architecture) — defines the consumer-side
  `Renderer` and per-channel `ChannelRenderer` contract that the
  lifecycle channel's payload feeds.

## Context

Phase 2 of the channel-io-event-retirement plan
(`docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`)
introduced a new channel that projects three platform completion
events into the channel surface:

  - `platform.save_failed`
  - `platform.restore_failed`
  - `platform.restore_completed`

The browser client previously consumed these as raw events through
`engine.on('event', ...)` and called `appendSystemMessage` /
`renderCombinedStatus` directly. Migrating the consumption path to
channels required deciding **where the channel definition lives**:

- **Option A — stdlib**, alongside the other ten standard channels
  (`main`, `prompt`, `score`, `turn`, `location`, `info`, `ifid`,
  `death`, `endgame`, `score_notify`).
- **Option B — platform-browser**, since the only consumer that
  meaningfully renders lifecycle signals today is the browser client.
- **Option C — engine**, since the lifecycle events originate in the
  engine's save/restore hook flow.

The shape of the consideration:

- **Discoverability.** Standard channels are pre-populated on the
  shared `channelRegistry` instance in stdlib. A new consumer (CLI
  variant, multi-user web client) sees them in the manifest at
  bootstrap without needing to know about platform-browser internals.
- **Symmetry with existing channels.** `death` and `endgame` already
  read engine-emitted events (`combat.player_died`, `game.won`,
  `game.lost`) and live in stdlib. The lifecycle channel is the same
  pattern — projecting raw engine events into structured payloads —
  and benefits from the same placement.
- **Dependency direction.** Stdlib already imports event types from
  `@sharpee/core`. Adding a channel that reads `event.payload.error`
  doesn't introduce a new dependency. Placing the channel in
  platform-browser would invert the direction: a renderer-side
  package defining a producer-side channel that other consumers
  (CLI bundles, future Zifmia builds, multi-user clients) would need
  to import for full lifecycle signal coverage.
- **Consumer optionality.** A channel definition costs nothing on
  surfaces that don't render it. Stdlib registers the channel; the
  CLI bundle ignores it (no renderer registered → JSON-tree fallback
  warning fires once); browser registers a renderer that does the
  DOM work. The decision of *whether* to render lifecycle is a
  per-consumer decision, made by registering or omitting a renderer.

## Decision

The lifecycle channel lives in **stdlib**, in
`packages/stdlib/src/channels/standard.ts`, alongside the other
platform-standard channels. It is exported as `lifecycleChannel`,
added to `STANDARD_CHANNELS` and `STANDARD_CHANNEL_IDS`, and
auto-registered on the `channelRegistry` singleton at module
initialization.

The channel is **not** capability-gated. Save and restore are core
platform operations available on every surface, so the channel
emits unconditionally; consumers that don't render it pay only the
cost of the projected payload travelling through the wire.

The wire shape:

```typescript
export type LifecycleEventKind =
  | 'save_failed'
  | 'restore_failed'
  | 'restore_completed';

export interface LifecyclePayload {
  kind: LifecycleEventKind;
  message?: string;
}
```

`message` is read from `event.payload.error` (the actual location of
platform-event error messages — the legacy `event.data.error` read
in `BrowserClient` was always undefined and is a quiet pre-existing
bug fixed by the channel migration).

The channel uses **event-mode + sparse-emit**: turns without a
lifecycle event suppress emission entirely. If multiple lifecycle
events appear in one turn, the **last** one wins (in practice each
save/restore operation produces exactly one completion event, so
this is unobservable, but the rule is documented for test authors).

The browser-side renderer (`createLifecycleChannelRenderer`) is
**callback-driven**, not slot-driven, since its two side effects
already exist as `BrowserClient` private methods. The renderer
receives `{ appendSystemMessage, onRestoreCompleted? }` callbacks.
`registerDefaultBrowserRenderers` accepts an optional `lifecycle`
options object — when omitted, the renderer is skipped (CLI / test
scenarios that don't need lifecycle UI).

## Consequences

### Constrains future sessions

- New platform-wide channels (channels that any surface might
  legitimately render) belong in stdlib. The bar for stdlib placement
  is "at least two consumer surfaces could plausibly render this"
  — which lifecycle clears (CLI hypothetically, browser concretely,
  multi-user clients eventually).
- New surface-specific channels (channels that only one consumer can
  meaningfully consume — e.g., a hypothetical `browser:focus-trap`
  channel for accessibility) belong in the consuming package, not
  stdlib. Distinct from this ADR; flagged here so future sessions
  don't over-stuff stdlib.
- The "channel definition + renderer factory" split-ownership pattern
  (stdlib defines the projection, platform-browser defines the DOM
  side effects) is the canonical shape for any future channel that
  bridges engine signals to platform UI.

### Forecloses

- Adding the lifecycle channel definition to platform-browser. Phase 2
  ships with stdlib placement; reversing this would require migrating
  every downstream consumer's manifest expectations.
- Treating `event.data.error` as the canonical platform-event error
  field. The channel reads `event.payload.error` per the actual
  `IPlatformEvent` shape; consumers writing new platform-event
  consumers must read from `payload`, not `data`.

### Doesn't touch

- The renderer architecture (ADR-165) — the lifecycle channel
  consumes the renderer surface unchanged.
- The wire shape — `LifecyclePayload` is just another `IOChannel`'s
  value type, no new wire-level concept.
- Save/restore flow itself — engine still emits the same
  `platform.save_failed` / `platform.restore_failed` /
  `platform.restore_completed` events; the channel only adds a
  projection of them to the channel surface.

## Acceptance Criteria

- `lifecycleChannel` exported from `@sharpee/stdlib` and registered
  on `channelRegistry`.
- `LifecyclePayload` and `LifecycleEventKind` exported as types from
  `@sharpee/stdlib`.
- `createLifecycleChannelRenderer` exported from
  `@sharpee/platform-browser` and registered conditionally by
  `registerDefaultBrowserRenderers` based on `opts.lifecycle`
  presence.
- Browser save/restore failure UI: `appendSystemMessage` is called
  with `[Save failed: <message>]` / `[Restore failed: <message>]`
  formatted strings. Fallback strings preserve pre-Phase-2 behaviour
  when `payload.error` is absent.
- Browser restore_completed UI: `renderCombinedStatus` is invoked.
  `currentTurn` synchronisation is handled by the standard `turn`
  channel renderer (not by the lifecycle channel) since `turn` is
  `always`-mode and re-emits on every packet.
- Tests:
  - 7 unit tests for `lifecycleChannel.produce` covering each event
    kind, payload-error read, last-wins semantics, non-lifecycle
    event ignore.
  - 7 unit tests for `createLifecycleChannelRenderer` covering each
    kind, fallback strings, callback wiring.
  - AC-13 / AC-14 / AC-16 unchanged GREEN.

## Session

Produced in session `2026-05-04 08:45` during Phase 2 of the
channel-io-event-retirement plan. Implementation commit: `c5c943a2`.

## References

- ADR-163 — Channel-Service Platform
- ADR-165 — Renderer Architecture
- `docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`
- `packages/stdlib/src/channels/standard.ts` — `lifecycleChannel` definition
- `packages/platform-browser/src/channels/lifecycle.ts` — renderer factory
