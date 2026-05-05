# ADR-168: Story-Defined Channels Replace `handleStoryEvent`

## Status: ACCEPTED

## Date: 2026-05-04

## Builds on

- **ADR-163** (Channel-Service Platform) — `Story.registerChannels`
  hook, `IOChannel` definition, `IChannelRegistry`.
- **ADR-165** (Renderer Architecture) — per-channel `ChannelRenderer`
  interface, story-side renderer registration in the consumer
  package's entry point.
- **Project memory `project_channels_universal_ui_surface.md`** —
  channels carry ALL story→UI signals; transport sits below.

## Context

Phase 4 of the channel-io-event-retirement plan
(`docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`)
deletes the `BrowserClientCallbacks.handleStoryEvent` public-API hook
that `BrowserClient` previously invoked from `engine.on('event', ...)`.
The hook signature was:

```typescript
handleStoryEvent?: (
  event: ISemanticEvent,
  client: BrowserClientInterface,
) => boolean;  // return true if handled
```

The hook was used by Dungeo to display `dungeo.event.rname` (room
name) and `dungeo.event.objects` (object-listing) on the GDT-flavoured
`RNAME` and `OBJECTS` commands. Implementation in
`stories/dungeo/src/browser-entry.ts` returned `true` after pushing a
formatted string to `client.displayText`.

The hook predates ADR-163's channel surface. Two problems made it a
retirement target:

1. **Bypasses the channel surface.** Channels are the universal UI
   surface; the hook is a side door that breaks that invariant. As
   long as `handleStoryEvent` exists, the "channels carry ALL
   story→UI signals" claim is conditional on every story choosing
   not to use the hook.
2. **Couples stories to a renderer-side concept.** `handleStoryEvent`
   takes `BrowserClientInterface` — a browser-specific contract —
   and pushes strings via `client.displayText`. A story emitting via
   `handleStoryEvent` cannot present its custom signals on a CLI
   surface, a Zifmia bundle, a multi-user web client, or any future
   transport without re-implementing the hook for each. Channels
   project once and any consumer renders.

The replacement pattern was already in production: the
`stories/channel-service-test` story (R7 of ADR-163) defines
`debugStatsChannel` via `Story.registerChannels` and a renderer in
its entry point. Phase 4 makes Dungeo follow the same shape and
deletes the hook.

## Decision

### Story-defined channels are the sanctioned story event extension point

Stories that need to surface custom signals to UI define their own
`IOChannel`s and register them via `Story.registerChannels(registry)`.
Per-consumer renderers (browser, CLI, etc.) register against the
channel id in the consumer's entry point.

Pattern shape:

```typescript
// stories/<story>/src/channels.ts
import type { IOChannel, IChannelRegistry } from '@sharpee/if-domain';

export const myChannel: IOChannel<string> = {
  id: 'mystory.something',
  contentType: 'text',
  mode: 'event',          // or 'replace' / 'append'
  emit: 'sparse',         // or 'always'
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (event.type === 'mystory.event.something') {
        return formatPayload(event.data);
      }
    }
    return undefined;
  },
};

export function registerStoryChannels(registry: IChannelRegistry): void {
  registry.add(myChannel);
}
```

```typescript
// stories/<story>/src/index.ts (Story implementation)
registerChannels(registry: IChannelRegistry): void {
  registerStoryChannels(registry);
}
```

```typescript
// stories/<story>/src/browser-entry.ts
const renderer = client.getChannelRenderer();
renderer.registerRenderer('mystory.something', {
  onValue(value: unknown): void {
    if (typeof value === 'string') client.displayText(value);
  },
});
```

The `BrowserClient.getChannelRenderer()` and `getAudioManager()`
accessors (added in Phase 3 + Phase 4) are the supported integration
seam for story-side renderer registration. They are available between
`client.connectEngine(engine, world)` and `client.start()` — the
window when default platform renderers are registered but no
`channel:packet` has fired yet.

### `BrowserClientCallbacks.handleStoryEvent` is deleted

Phase 4 commits the deletion. There is **no deprecation period** —
per the project's no-backwards-compatibility policy
(`feedback_no_backcompat_server_lifecycle.md`), the only consumer in
the repository (Dungeo) is migrated in the same commit.

The interface `BrowserClientCallbacks` is preserved as an empty
interface for forward extensibility. Future hooks that genuinely
need a callback shape (rather than a channel) can be added; a header
comment on the interface documents that channels are the default
answer to "how do I get my custom signal to UI?"

### `BrowserClient` registers exactly two engine listeners

After Phase 4, `engine.on('channel:manifest', ...)` and
`engine.on('channel:packet', ...)` are the only engine subscriptions
in `BrowserClient`. AC-17
(`packages/channel-service/tests/ac-17-two-listeners-only.test.ts`)
enforces this mechanically with three assertions:

1. Exactly two `engine.on(...)` call sites in `BrowserClient.ts`
   source (comments excluded).
2. Those subscriptions target `channel:manifest` and `channel:packet`,
   no other channels.
3. No `engine.on('event', ...)` listener exists.

The test runs as part of the channel-service test suite and fails
any commit that re-introduces a raw event listener.

### Story-side fallback for surfaces without renderers

When a story registers a custom channel but a particular consumer
(e.g., the CLI bundle) does not register a corresponding renderer,
the renderer's JSON-tree fallback fires once with a console warning.
This is **acceptable behaviour**: a CLI surface that doesn't render
`dungeo.objects` simply doesn't present GDT-flavoured object listings
on that surface. Stories that need a CLI rendering path register one
in their CLI entry; stories that don't, leave the fallback warning.

The fallback warning is one-time per channel id, so it does not
spam. It is gated on the renderer's `fallbackWarn` callback, which
`BrowserClient` already passes as a no-op (`() => undefined`) to
suppress warnings during the channel:manifest application phase.

### Multi-channel stories

Stories with multiple custom signals register multiple channels.
Dungeo registers two: `dungeo.rname` and `dungeo.objects`, both
event/sparse, both projecting to text strings. Stories that need
richer payloads (objects, structured records) project them as JSON
and write a renderer that consumes the structured shape — the
channel's `contentType` field documents the wire shape.

There is no "story bus" channel that demuxes by event type. Stories
should define one channel per UI signal so renderers can target
specific behaviours. Lumping unrelated signals into a single channel
defeats the channel surface's discoverability.

## Consequences

### Constrains future sessions

- New story-specific UI signals are channels, not hooks. Any
  proposal that adds a "callback for event X" to a renderer-side
  config object must justify why it cannot be a channel. The default
  answer is "it can be a channel."
- `BrowserClientCallbacks` is the interface where callback-shaped
  hooks would be added if any are ever justified. New entries
  require an ADR or a clear note in the session summary explaining
  the justification.
- AC-17 is the regression gate. Any session adding a third
  `engine.on(...)` to `BrowserClient.ts` must explicitly remove
  AC-17 with a documented rationale; defeating the gate without
  removing it would be a silent regression.

### Forecloses

- Re-introducing `handleStoryEvent`, `handleEvent`, or any other
  raw-event hook on `BrowserClientCallbacks`. The retirement is
  permanent.
- Story authors using `engine.on('event', ...)` directly in their
  entry points to consume engine events. Stories should consume
  through the channel renderer the engine drives via
  `channel:packet`. Authors who try this will find the engine event
  source available (`engine.on` is public) but the practice is
  documented as anti-pattern in this ADR.
- A "default" string-displaying renderer for unknown channel ids.
  The JSON-tree fallback is the contract; replacing it with
  `client.displayText(JSON.stringify(value))` would make missing
  renderers invisible failures.

### Doesn't touch

- `extendParser`, `extendLanguage`, `getCustomActions`,
  `onEngineReady` — the other Story extension hooks are unchanged.
  This ADR is specifically about the renderer-side event hook.
- Audio (Phase 3 / ADR-167) — audio routing already moved to
  channels in Phase 3 via `media.*` events. ADR-168 is the parallel
  decision for non-audio custom events.
- Lifecycle (Phase 2 / ADR-166) — platform-emitted events project
  through stdlib's `lifecycleChannel`. Story-defined custom events
  project through story-defined channels. The two patterns coexist.

## Acceptance Criteria

- `BrowserClientCallbacks.handleStoryEvent` is deleted from
  `packages/platform-browser/src/types.ts`.
- `BrowserClient.setupEngineHandlers()` is deleted from
  `packages/platform-browser/src/BrowserClient.ts`. The
  `engine.on('event', ...)` listener does not exist.
- `BrowserClient` exposes public `getChannelRenderer()` and
  `getAudioManager()` accessors. `getChannelRenderer()` throws if
  called before `connectEngine`.
- Dungeo's `dungeo.event.rname` and `dungeo.event.objects` are
  consumed via story-defined channels (`stories/dungeo/src/channels.ts`)
  registered in `DungeoStory.registerChannels`. Browser-side
  renderers in `stories/dungeo/src/browser-entry.ts` push strings to
  `client.displayText`.
- AC-17 GREEN — exactly two `engine.on(...)` call sites in
  `BrowserClient.ts`, subscribing to `channel:manifest` and
  `channel:packet` only.
- Walkthrough chain (wt-01 + wt-02): 49/49 GREEN through the rebuilt
  CLI bundle.
- AC-13, AC-14, AC-16 unchanged GREEN against the rebuilt bundle.

## Session

Produced in session `2026-05-04 08:45` during Phase 4 of the
channel-io-event-retirement plan. Phase 4 implementation commit:
`3150e53e`. Plan archived at
`docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`.

## References

- ADR-163 — Channel-Service Platform — `Story.registerChannels`
- ADR-165 — Renderer Architecture
- ADR-166 — Lifecycle Channel Stdlib Placement (Phase 2 sibling
  decision)
- ADR-167 — Audio Event Translation Boundary (Phase 3 sibling
  decision)
- `packages/channel-service/tests/ac-17-two-listeners-only.test.ts` —
  static gate
- `stories/channel-service-test/` — reference pattern (R7)
- `stories/dungeo/src/channels.ts` — Phase-4 consumer
- `stories/dungeo/src/browser-entry.ts` — renderer registration
  pattern
- `~/.claude/projects/-Users-david-repos-sharpee/memory/project_channels_universal_ui_surface.md`
  — project commitment recorded post-ADR-163
