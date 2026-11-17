# Session Plan: Create @sharpee/media types-only package

**Created**: 2026-04-01
**Overall scope**: Stand up the `@sharpee/media` package in the monorepo with all TypeScript types for the audio system defined in ADR-138. No runtime dependencies — types, interfaces, and the `AudioRegistry` class (which is a pure-TS class with no external deps) are the complete deliverable.
**Bounded contexts touched**: N/A — infrastructure/packaging work; audio types extend the engine event pipeline but do not modify it
**Key domain language**: AudioCue, VariationPool, AudioRegistry, RoomAtmosphere, DuckingConfig

---

## Background

ADR-138 (PROPOSED, 2026-04-01) defines a complete audio type surface for Sharpee stories. The types live in a new `@sharpee/media` package so stories can `import { AudioRegistry } from '@sharpee/media'` and platforms can import capability/preference types without pulling in any runtime audio implementation.

The package has exactly two concerns:
1. **Event data types** — shape of every `audio.*` event payload, merged into `@sharpee/core`'s `EventDataRegistry` via declaration merging so `createTypedEvent()` is compile-time checked.
2. **Registry + builder types** — `AudioCue`, `VariationPool`, `DuckingConfig`, `RoomAtmosphere`, `AtmosphereBuilder`, `AudioRegistry` class, `AudioCapabilities`, `AudioPreferences`.

The `AudioRegistry` class does have runtime logic (random pool resolution, `Math.random()` jitter) but still has zero external dependencies — it uses only `@sharpee/core`'s `createTypedEvent` and standard JS.

---

## Phases

### Phase 1: Scaffold the package (structure, config, build integration)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Package infrastructure — not domain logic; sets up the container that everything else lives in
- **Entry state**: `packages/` directory exists; `pnpm-workspace.yaml` already picks up `packages/*`; `build.sh` `PACKAGES` array is editable
- **Deliverable**:
  - `packages/media/package.json` — `@sharpee/media`, version `0.9.99`, depends on `@sharpee/core: workspace:*`; same shape as `@sharpee/if-domain/package.json`
  - `packages/media/tsconfig.json` — extends `../../tsconfig.base.json`, `composite: true`, references `../core`; same shape as `@sharpee/if-domain/tsconfig.json`
  - `packages/media/src/index.ts` — empty barrel (placeholder until Phase 2 fills it)
  - Entry added to `build.sh` `PACKAGES` array after `@sharpee/if-domain:if-domain` and before `@sharpee/world-model:world-model` (media has no world-model dep, but placing it early keeps the dependency order clean)
  - `pnpm install` succeeds after adding the package
- **Exit state**: `pnpm --filter '@sharpee/media' build` runs and produces `packages/media/dist/index.js` and `packages/media/dist/index.d.ts` (even if both are empty)
- **Status**: CURRENT

---

### Phase 2: Common primitive types and audio event interfaces

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Audio event type surface — the shapes that stories emit and clients consume
- **Entry state**: Phase 1 complete; `packages/media/src/` exists and builds
- **Deliverable**:
  - `packages/media/src/audio/types.ts` — all primitive branded/alias types: `Volume`, `DurationMs`, `StereoPan`, `PlaybackRate`, `AudioAssetPath`, `AmbientChannel`, `DuckPriority`, `AudioTarget`, `AudioEffectType`, `AudioFormat`, `BuiltinRecipeName`, `ProceduralRecipeName`
  - `packages/media/src/audio/events.ts` — all event interfaces: `AudioEventBase`, `AudioSfxEvent`, `AudioMusicPlayEvent`, `AudioMusicStopEvent`, `AudioAmbientPlayEvent`, `AudioAmbientStopEvent`, `AudioAmbientStopAllEvent`, `AudioProceduralEvent`, `AudioEffectEvent`, `AudioEffectClearEvent`; discriminated union `AudioEvent`; type guard `isAudioEvent()`
  - `packages/media/src/audio/capabilities.ts` — `AudioCapabilities` interface, `AudioPreferences` interface
  - `packages/media/src/audio/index.ts` — barrel re-exporting from the three files above
  - `packages/media/src/index.ts` — updated to re-export `./audio`
  - All files include JSDoc file headers per the project's documentation standard
- **Exit state**: `pnpm --filter '@sharpee/media' build` succeeds with all event types and capability types emitted to `dist/`; `tsc --noEmit` reports zero errors
- **Status**: PENDING

---

### Phase 3: EventDataRegistry declaration merging

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Type-safe event creation — the bridge that makes `createTypedEvent('audio.sfx', ...)` compile-checked without casts
- **Entry state**: Phase 2 complete; all event data type shapes exist in `audio/events.ts`
- **Deliverable**:
  - `packages/media/src/audio/registry-merge.ts` — exports concrete data interfaces (`AudioSfxData`, `AudioMusicPlayData`, `AudioMusicStopData`, `AudioAmbientPlayData`, `AudioAmbientStopData`, `AudioAmbientStopAllData`, `AudioProceduralData`, `AudioEffectData`, `AudioEffectClearData`) and the `declare module '@sharpee/core'` block that merges all nine event keys into `EventDataRegistry`
  - `packages/media/src/audio/index.ts` — updated to re-export `registry-merge` so the side-effect declaration fires when any consumer does `import ... from '@sharpee/media'`
  - Smoke-test verification: a small inline TypeScript snippet (documented in the plan, not checked in as a file) confirming that `createTypedEvent('audio.sfx', { src: 'x.mp3' })` compiles and that `createTypedEvent('audio.sfx', { volume: 0.8 })` does not (missing `src`)
- **Exit state**: `pnpm --filter '@sharpee/media' build` succeeds; `@sharpee/core`'s `EventDataRegistry` is extended with all nine `audio.*` keys when `@sharpee/media` is imported; no casts required to create typed audio events
- **Status**: PENDING

---

### Phase 4: AudioRegistry class and AtmosphereBuilder

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: AudioRegistry — the story-side singleton that owns all audio configuration; keeps sound design details out of action and handler code
- **Entry state**: Phase 3 complete; declaration merging is working; `createTypedEvent('audio.sfx', ...)` is type-safe
- **Deliverable**:
  - `packages/media/src/audio/audio-registry.ts` — exports:
    - `AudioCue` type alias (`() => ISemanticEvent`)
    - `VariationPool` interface (sources, volume, volumeJitter, pitchJitter, duck)
    - `DuckingConfig` interface (duckVolume, attackMs, releaseMs, targets)
    - `RoomAtmosphere` interface (ambient array, optional music, optional effect)
    - `AtmosphereBuilder` class (fluent: `.ambient()`, `.music()`, `.effect()`, `.build()`)
    - `AudioRegistry` class with:
      - `registerCue(name, cue)` / `cue(name)` — named cue factories
      - `registerPool(name, pool)` / resolution with Math.random jitter via `createTypedEvent('audio.sfx', ...)`
      - `registerAtmosphere(roomId, atmosphere)` / `atmosphere(roomId)` builder entry point / `getAtmosphere(roomId)`
      - `setDucking(config)` / `getDucking()`
      - `setFadeDefaults(defaults)` / `getFadeDefaults()`
  - `packages/media/src/audio/index.ts` — updated to re-export `audio-registry`
  - All public methods documented with JSDoc summaries, parameters, and return values per project standard
- **Exit state**: `pnpm --filter '@sharpee/media' build` succeeds; `AudioRegistry` is importable from `@sharpee/media`; a story can call `new AudioRegistry()`, register cues and atmospheres, and fire them without TypeScript errors
- **Status**: PENDING

---

## File Map (complete picture at the end of all phases)

```
packages/media/
  package.json               — @sharpee/media, workspace dep on @sharpee/core
  tsconfig.json              — extends tsconfig.base.json, references ../core
  src/
    index.ts                 — re-exports ./audio
    audio/
      index.ts               — barrel: types, events, capabilities, registry-merge, audio-registry
      types.ts               — primitive aliases (Volume, DurationMs, AudioTarget, etc.)
      events.ts              — event interfaces + AudioEvent union + isAudioEvent()
      capabilities.ts        — AudioCapabilities, AudioPreferences
      registry-merge.ts      — *Data interfaces + declare module '@sharpee/core' merging
      audio-registry.ts      — AudioCue, VariationPool, DuckingConfig, RoomAtmosphere,
                               AtmosphereBuilder, AudioRegistry
```

**build.sh change** — add one entry to the `PACKAGES` array:

```
"@sharpee/media:media"
```

Position: after `@sharpee/if-domain:if-domain`, before `@sharpee/world-model:world-model`.

---

## Notes and Constraints

- **No runtime dependencies.** The only import in `audio-registry.ts` is `createTypedEvent` from `@sharpee/core` and the type `ISemanticEvent` from `@sharpee/core`. No audio playback, no Web Audio API, no browser globals.
- **Declaration merging requires the module to be imported.** Stories and platforms that want type-safe audio event creation must `import '@sharpee/media'` (or import any named export from it). This is the standard TypeScript augmentation pattern — document it in the barrel's JSDoc.
- **AtmosphereBuilder is internal to the registry.** It is exported so stories can annotate variables if desired, but its primary entry point is `registry.atmosphere(roomId)`. It is not part of the "public API" but is not hidden either, consistent with how `@sharpee/if-domain` handles similar builder types.
- **build.sh is a platform package change** — per project conventions, this requires a discussion checkpoint before implementation. The plan notes this at Phase 1 and the implementer should confirm with the user before modifying `build.sh`.
- **pnpm-workspace.yaml does not need updating** — the wildcard `packages/*` already covers `packages/media`.
