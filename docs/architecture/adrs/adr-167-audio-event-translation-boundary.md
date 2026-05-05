# ADR-167: Audio Event Translation Boundary — Story-Side, Long-Term Stdlib

## Status: ACCEPTED (Phase 3 ships story-side; long-term move to stdlib is a future session)

## Date: 2026-05-04

## Builds on

- **ADR-138** (Audio System) — defines `AudioRegistry`, the room
  atmosphere model, and the `audio.*` event vocabulary that the
  legacy `AudioManager.handleAudioEvent` consumed.
- **ADR-163** (Channel-Service Platform) — §7 specifies the canonical
  `media.*` event vocabulary that channel closures listen for, and
  the static + dynamic media channels (`sound`, `music`,
  `image:<layer>`, `ambient:<id>`).
- **ADR-101** (Media Event Architecture) — original media event design
  that ADR-163 §7 folded into the channel surface.

## Context

Phase 3 of the channel-io-event-retirement plan
(`docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`)
migrated Dungeo's audio handler from emitting legacy `audio.*` events
(consumed by `BrowserClient`'s raw event listener) to emitting
canonical `media.*` events (projected through stdlib's ambient and
music channels).

Three vocabularies are involved:

1. **Story trigger vocabulary** — `if.event.actor_moved`, the engine
   event the audio handler listens for. Owned by stdlib.
2. **Channel-projection vocabulary** — `media.ambient.play` /
   `.stop` / `media.music.play` / `.stop` etc. ADR-163 §7. Owned by
   stdlib's channel definitions.
3. **AudioManager internal vocabulary** — `audio.ambient.play`,
   `audio.music.play`, `audio.sfx`, etc. The Web Audio orchestrator's
   internal language. Owned by `@sharpee/platform-browser`.

The `media.*` → `audio.*` translation already exists in
`packages/platform-browser/src/channels/audio.ts`: the
`createAmbientChannelRenderer` / `createSoundChannelRenderer` /
`createMusicChannelRenderer` factories take channel-projected
payloads and forward them to `AudioManager.handleAudioEvent` as
`audio.*` events. That bridge is fine — it lives in the
infrastructure-side renderer.

The contested boundary is the **upstream** translation:
`if.event.actor_moved` → `media.*`. Today (post-Phase-3) this lives
in `stories/dungeo/src/audio/audio-setup.ts`. The handler reads the
destination room's atmosphere from the story's `AudioRegistry` and
emits one `media.ambient.play` per ambient channel + a
`media.music.play` if music is set, or per-channel `media.ambient.stop`
events when the destination has no atmosphere.

Three options for where this translation lives long-term:

- **A — Story-side** (current). Each story emits `media.*` events
  from its own room-entry handler. Allow-listed in AC-16.
- **B — Stdlib helper.** Stdlib exports a builder that takes an
  `AudioRegistry` instance and registers (i) the channel
  definitions for each ambient channel id, (ii) the actor-moved
  handler that emits the right `media.*` events. Stories call one
  helper and do not emit `media.*` directly; AC-16 keeps stories
  out of its allow-list.
- **C — Channel-service capability.** Each ambient channel's
  `produce` closure reads the world's room state and atmosphere
  registry directly (rather than projecting from `media.*` events).
  Eliminates the translation step — the channel becomes the single
  source of truth for "what plays now."

There is also the question of `audio.effect`. The story's
`AudioRegistry` allows `atmosphere.effect = { target, effect, params }`
entries. The legacy code emitted `audio.effect`, but
`AudioManager.handleAudioEvent` had no `audio.effect` case — the event
was silently dropped. Phase 3 preserved that by no longer emitting
the event. There is no `media.effect` channel in stdlib.

## Decision

### Translation boundary: ship story-side now, plan stdlib helper

Phase 3 ships **Option A** (story-side). `stories/dungeo/src/audio/`
is added to AC-16's allow-list with a comment documenting the
transitional nature. `audio-setup.ts` constructs `media.*` events
inline using a local `createMediaEvent` helper because the `media.*`
vocabulary is not registered in `@sharpee/core`'s `EventDataRegistry`
(only `audio.*` is, in `@sharpee/media`) and a story package should
not extend the core registry.

The **long-term home is Option B** — a stdlib helper. The shape:

```typescript
// In @sharpee/stdlib/channels (or a new audio submodule)
export function registerAudioFromAtmosphere(
  registry: IChannelRegistry,
  audioRegistry: AudioRegistry,
  options?: {
    ambientChannelIds?: readonly string[];  // for stop_all
    eventProcessor: EventProcessor;          // to register actor_moved handler
  },
): void {
  // 1. Register createAmbientChannel(id) for each ambient channel.
  // 2. Register the actor_moved handler that emits media.* events.
  // 3. Optional: extend EventDataRegistry via module-merge so
  //    stdlib can use createTypedEvent for media.*.
}
```

Stories call one helper:

```typescript
// In DungeoStory
registerChannels(registry: IChannelRegistry): void {
  registerAudioFromAtmosphere(registry, audioRegistry, {
    ambientChannelIds: ['environment'],
    eventProcessor: this.engine.getEventProcessor(),
  });
}
```

Migrating to Option B is **a future session**, not part of this ADR's
implementation scope. This ADR documents the direction so that
session knows the destination.

**Option C is rejected** for two reasons:

1. The atmosphere data model is story-owned (`AudioRegistry` is in
   `@sharpee/media`, instantiated in the story). Putting the channel
   closure in stdlib but having it read story-owned state would
   require either importing `@sharpee/media` from stdlib (dependency
   inversion concern) or passing the registry through the
   `ChannelProduceContext` (a new platform concept just for audio).
   Both costs are higher than the helper-based middle ground.
2. The `media.*` event vocabulary is the documented integration
   surface. Eliminating events means stories that want to react to
   audio changes (e.g., a captioning system that displays text when
   ambient plays) would have to scrape channel state instead of
   listening for events. ADR-163 §7 deliberately keeps the events
   addressable.

### `audio.effect` disposition: drop until a real consumer needs it

`audio.effect` is **not migrated** to a `media.effect` channel.
Reasoning:

- The event has no consumer today. `AudioManager` never handled it;
  no story authored against it; no transcript test asserts on it.
- Adding a `media.effect` channel without a renderer is dead code
  that AC-16 has to police.
- The semantic is also unclear — `audio.effect` carries
  `{ target, effect, params, transition }` but the only "target" the
  audio code knows about is "the AudioContext" (which doesn't exist
  in the post-Phase-1 AudioManager). What "transition" means in a
  Web Audio context (vs. CSS-transition) is also undefined.

If a future story or extension genuinely needs per-bus or per-channel
audio processing (filter sweeps, ducking, fades beyond fade-in/out),
that requirement will name the capability concretely and a
`media.effect` channel can be designed against it then. Until then,
the field on `RoomAtmosphere` exists but is silently ignored — a
future-compatible no-op.

### Story-side transitional emission rules

Until Option B lands, stories that emit `media.*` events must:

1. Define the exhaustive list of ambient channel ids they use as a
   constant (e.g., `DUNGEO_AMBIENT_CHANNEL_IDS = ['environment']`).
   Used by both the per-channel stop emission (no `media.*` `stop_all`
   exists) and the `Story.registerChannels` hook for
   `createAmbientChannel(id)` calls.
2. Construct events as plain `ISemanticEvent` objects (a
   `createMediaEvent` helper, ~10 lines, suffices) rather than
   extending `EventDataRegistry` from a story package.
3. Add the story's audio handler path to AC-16's allow-list with a
   comment referencing this ADR. Allow-list entries pre-Option-B are
   **transitional** — Option B will remove them.

Stories are responsible for keeping the ambient channel ids
constant in sync with what their `AudioRegistry` populates.
Mismatch is silent (extra ids → unused channels in manifest;
missing ids → ambient layers play but never stop on no-atmosphere
rooms).

## Consequences

### Constrains future sessions

- Adding new `media.*` event types requires updating: stdlib's
  `MEDIA_EVENT_TYPES`, the corresponding channel closure, and any
  story-side allow-list comment in AC-16. Additions go through
  ADR-163 §7's media vocabulary.
- The Option-B migration is the natural next step for any session
  doing meaningful work in the audio area. When it ships, AC-16
  allow-list entries for `stories/*/audio/` come out as part of the
  same change.
- Authors of new stories that need ambient/music must follow the
  story-side rules above (ambient channel id constant + `createMediaEvent`
  helper + AC-16 allow-list addition). Reference: Dungeo's
  `audio-setup.ts`.

### Forecloses

- Putting raw audio events back on `engine.on('event', ...)`. Phase 3
  + AC-17 mechanically prevent this regression in `BrowserClient`.
- A `media.effect` channel without a real consumer to motivate it.
- Stdlib reaching into `@sharpee/media` directly (Option C). The
  helper indirection (Option B) preserves dependency direction.

### Doesn't touch

- AudioManager's internal `audio.*` vocabulary. The Web Audio
  orchestrator continues to consume `audio.ambient.play` /
  `audio.music.play` / `audio.sfx` etc. — the `media.*` →
  `audio.*` translation in `packages/platform-browser/src/channels/audio.ts`
  is permanent infrastructure, not transitional.
- The `AudioRegistry` data model. `atmosphere.effect` stays defined;
  it just produces no events until a real consumer arrives.
- Image / animation / transition / layout / clear channels. Their
  emission paths are not story-side today (no story currently emits
  `media.image.show` etc.) and this ADR does not prescribe a model
  for when they arrive.

## Acceptance Criteria

### Phase 3 (current ship)

- `stories/dungeo/src/audio/audio-setup.ts` emits canonical `media.*`
  events.
- `DUNGEO_AMBIENT_CHANNEL_IDS` constant drives both the per-channel
  stop emission and `registerStoryAmbientChannels`.
- AC-16 allow-list includes `stories/dungeo/src/audio/`.
- `BrowserClient` no longer routes `audio.*` events.
- Walkthrough chain GREEN through the rebuilt CLI bundle (CLI doesn't
  exercise audio, so this confirms only that the migration didn't
  break room movement).
- `audio.effect` not emitted; `AudioManager.beep` already deleted in
  Phase 1.

### Future Option-B session

- Stdlib exports `registerAudioFromAtmosphere` (or a similarly named
  helper) that handles channel registration + actor_moved handler in
  one call.
- Dungeo's `audio-setup.ts` shrinks to a one-line call; AC-16
  allow-list removes the `stories/dungeo/src/audio/` entry.
- The helper extends `EventDataRegistry` via stdlib-side module-merge
  so internal callers can use `createTypedEvent('media.*', ...)`.
- The helper itself is what new stories adopt for room-atmosphere
  audio; the patterns from this ADR's "Story-side transitional
  emission rules" become unnecessary.

## Session

Produced in session `2026-05-04 08:45` during Phase 3 of the
channel-io-event-retirement plan. Phase 3 implementation commit:
`54e020d3`. Phase 4 commit: `3150e53e`.

## References

- ADR-138 — Audio System
- ADR-163 — Channel-Service Platform — §7
- ADR-101 — Media Event Architecture (folded into ADR-163)
- `packages/stdlib/src/channels/media.ts` — `createAmbientChannel`,
  `MEDIA_EVENT_TYPES`
- `packages/platform-browser/src/channels/audio.ts` — `media.*` →
  `audio.*` translation in the renderer
- `packages/platform-browser/src/audio/AudioManager.ts` — internal
  `audio.*` consumer vocabulary
- `stories/dungeo/src/audio/audio-setup.ts` — Phase-3 story-side
  emission
- `packages/channel-service/tests/ac-16-cleanup-grep-gate.test.ts` —
  allow-list mechanism
- `docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md`
