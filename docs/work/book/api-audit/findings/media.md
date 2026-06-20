# Findings — @sharpee/media

## Author-relevance
Author-facing. Core Part VII (audio/media) material: stories build an `AudioRegistry` in `initializeWorld()`, register cues/pools/atmospheres, and emit `audio.*` events. The event interfaces + primitives are the vocabulary authors use to make a story make sound. Types-only package (plus the registry runtime); no DOM dependency — the browser-side playback lives in platform-browser's `AudioManager`.

## Naming
Clean, consistent, spelled-out. No abbreviations beyond `sfx` (an established audio domain term) and `ms`/`Ms` suffixes. Strengths:
- Event interfaces follow a tight `Audio<Verb><Noun>Event` pattern (`AudioMusicPlayEvent`, `AudioAmbientStopAllEvent`).
- Parallel `*Event` (full event with `type` discriminant) vs `*Data` (the `EventDataRegistry`-merge payload, no `type`) split is principled and consistent across all nine event kinds.
- Branded-ish primitive aliases (`Volume`, `DurationMs`, `StereoPan`, `PlaybackRate`) read well.
- No `I`-prefix anywhere — internally consistent (differs from channel-service/if-domain convention, but self-consistent within the package).

## Should-be-internal
- The nine `Audio*Data` interfaces (`AudioSfxData`, `AudioMusicPlayData`, …) — these exist purely to drive `@sharpee/core`'s `EventDataRegistry` declaration merging for `createTypedEvent('audio.*', …)`. Authors more naturally use the `*Event` interfaces; the `*Data` twins are near-duplicates exported for the type-merge mechanism. Borderline — keep exported for `createTypedEvent` ergonomics, but the book should lead with `*Event` and mention `*Data` only in the typed-event context.

## API shape
- Strong typing throughout; **no `any`** in public signatures. `params: Readonly<Record<string, number>>` for effect/procedural params is appropriately loose (recipe-defined) but bounded to numbers.
- `ProceduralRecipeName = BuiltinRecipeName | (string & {})` — the `(string & {})` trick preserves built-in autocomplete while allowing arbitrary strings; idiomatic, intentional.
- Duplicate concept noted above: `Audio*Event` vs `Audio*Data` describe the same payloads twice (one with `type`, one without). Unavoidable given the typed-event-registry pattern, but worth a one-line book note.
- `AudioCue = () => ISemanticEvent` (factory, not constant) — well-justified in TSDoc (fresh id/timestamp per fire). Clean.
- `AudioTarget = 'master' | 'sfx' | 'music' | \`ambient:${string}\`` — template-literal union; precise.
- Builder return types are consistent (`this` for chaining; `build(): void`).

## Documentation (TSDoc)
Excellent — ~95%+ documented, with per-field defaults, use-case lists, and a full `@example` block on `AudioRegistry` and `AtmosphereBuilder`. Every event field carries its default value inline (e.g. "Default: 1.0"). Among the most author-readable surfaces in the audit. Minor gap: a couple of `*Data` interfaces have only a one-line `/** Data for … */` header (acceptable, they mirror the documented `*Event`).

## Book highlights
- `AudioRegistry` (class) — the registration hub: `registerCue`, `registerPool`, `registerAtmosphere`, `atmosphere(roomId)`, `cue(name)`, `setDucking`, `setFadeDefaults`. The center of the audio chapter.
- `AtmosphereBuilder` — fluent room-soundscape builder (`.ambient().music().effect().build()`).
- The `AudioEvent` union + `isAudioEvent` guard — the event vocabulary stories emit.
- Event interfaces by use-case: `AudioSfxEvent`, `AudioMusicPlayEvent`/`StopEvent`, `AudioAmbientPlayEvent`/`StopEvent`/`StopAllEvent`, `AudioProceduralEvent`, `AudioEffectEvent`/`ClearEvent`.
- `AudioCapabilities` / `AudioPreferences` — capability negotiation + player settings.
- Primitive aliases (`Volume`, `DurationMs`, `StereoPan`, `DuckPriority`, `AudioTarget`, `ProceduralRecipeName`) — the type glossary for the chapter.
