# ADR-138: Audio System

## Status: PROPOSED

## Date: 2026-04-01

## Context

### The Problem

Sharpee stories are silent. Text conveys everything — atmosphere, tension, feedback. Audio would add a powerful dimension, especially for stories like Entropy where environmental atmosphere (scorched battlefields, underground passages, orbital mechanics) and character feedback (system activations, damage alerts) are central to the experience.

ADR-101 proposed a comprehensive multimedia system covering images, audio, video, animations, layouts, and hotspots in a single architecture. That scope is too broad to implement or validate incrementally. This ADR extracts audio as an independent concern that can ship and prove value on its own.

### Why Audio First

- **Highest value-to-effort ratio** for a text game — sound adds atmosphere without changing the visual interface
- **Simplest client integration** — no layout changes, no DOM manipulation beyond creating audio nodes
- **Web Audio API is mature** — full mixing, effects, spatial audio, procedural generation, sample-accurate timing
- **Graceful degradation is trivial** — text clients ignore audio events; the game is complete without them
- **Autoplay policy is solvable** — the first typed command satisfies the browser's user gesture requirement

### Design Principles

1. **Stories emit audio intent, clients render sound** — same separation as text events
2. **Three audio categories with distinct behavior** — SFX (one-shot), music (single track with crossfade), ambient (layered loops)
3. **File-based and procedural sources** — stories can reference audio files or describe synthesized sounds
4. **Client controls the mix** — players can mute categories independently, adjust volume, or disable audio entirely
5. **Zero cost when unused** — stories without audio events are unaffected

## Decision

### Type Definitions (`@sharpee/media`)

All types below live in the `@sharpee/media` package. This is the complete type surface for audio — what stories import to emit events and what clients import to implement renderers.

#### Common Types

```typescript
/** Volume level: 0.0 (silent) to 1.0 (full) */
type Volume = number;

/** Duration in milliseconds */
type DurationMs = number;

/** Stereo pan: -1.0 (hard left) to 1.0 (hard right), 0.0 = center */
type StereoPan = number;

/** Playback rate: 1.0 = normal, 0.5 = half speed, 2.0 = double speed */
type PlaybackRate = number;

/** Asset path relative to the story's assets/audio/ directory */
type AudioAssetPath = string;

/** Named ambient channel identifier (e.g., 'wind', 'machinery', 'dripping') */
type AmbientChannel = string;

/** Ducking priority: 0 (none) to 3 (aggressive). See AudioSfxEvent.duck. */
type DuckPriority = 0 | 1 | 2 | 3;

/**
 * Audio mix target — identifies where an effect or volume change applies.
 * - 'master': affects all audio output
 * - 'sfx': affects all sound effects
 * - 'music': affects the music track
 * - 'ambient:{channel}': affects a specific ambient channel
 */
type AudioTarget = 'master' | 'sfx' | 'music' | `ambient:${string}`;
```

#### Audio Events

All audio events extend a base shape. The `type` field is a string literal discriminant — clients switch on it.

```typescript
/**
 * Base interface for all audio events.
 * Audio events flow through the engine's event pipeline unchanged.
 * Clients that support audio render them; others ignore them.
 */
interface AudioEventBase {
  readonly type: string;
}

// ── Sound Effects (One-Shot) ──────────────────────────────────────────
// Short sounds triggered by actions or state changes.
// Fire-and-forget: play once and discard.

/**
 * Play a sound effect.
 *
 * Use cases: door opening, item pickup, skin activation, weapon fire,
 * system alert, puzzle solve chime.
 */
interface AudioSfxEvent extends AudioEventBase {
  readonly type: 'audio.sfx';

  /** Audio file path (relative to assets/audio/) */
  readonly src: AudioAssetPath;

  /** Playback volume. Default: 1.0 */
  readonly volume?: Volume;

  /** Playback speed. Default: 1.0 */
  readonly rate?: PlaybackRate;

  /** Stereo position. Default: 0.0 (center) */
  readonly pan?: StereoPan;

  /**
   * Ducking priority. Higher values duck lower-priority audio.
   * When this SFX fires, ambient and music temporarily reduce volume
   * so the SFX cuts through the mix. Default: 0 (no ducking).
   *
   * Suggested values:
   * - 0: ambient/background SFX (no ducking)
   * - 1: normal gameplay SFX (subtle duck)
   * - 2: important feedback (moderate duck)
   * - 3: critical alerts, combat hits (aggressive duck)
   */
  readonly duck?: DuckPriority;
}

// ── Music (Single Track) ──────────────────────────────────────────────
// Background music. Only one music track plays at a time.
// Starting a new track crossfades from the current one.

/**
 * Start playing a music track, or crossfade to a new one.
 * If music is already playing, the current track fades out while
 * the new one fades in over the fadeIn duration.
 *
 * Use cases: exploration theme, tension/combat music, victory stinger.
 */
interface AudioMusicPlayEvent extends AudioEventBase {
  readonly type: 'audio.music.play';

  /** Audio file path (relative to assets/audio/) */
  readonly src: AudioAssetPath;

  /** Playback volume. Default: 0.5 */
  readonly volume?: Volume;

  /** Fade-in duration. Default: 1000ms */
  readonly fadeIn?: DurationMs;

  /** Whether to loop the track. Default: true */
  readonly loop?: boolean;
}

/**
 * Stop the current music track.
 */
interface AudioMusicStopEvent extends AudioEventBase {
  readonly type: 'audio.music.stop';

  /** Fade-out duration. Default: 1000ms */
  readonly fadeOut?: DurationMs;
}

// ── Ambient (Layered Loops) ───────────────────────────────────────────
// Environmental atmosphere. Multiple named channels play simultaneously,
// each independently controllable. Starting a channel that is already
// playing replaces it with a crossfade.

/**
 * Start or replace an ambient channel.
 *
 * Use cases: wind, rain, cave dripping, engine hum, distant explosions,
 * electrical buzz, crowd murmur.
 */
interface AudioAmbientPlayEvent extends AudioEventBase {
  readonly type: 'audio.ambient.play';

  /** Audio file path (relative to assets/audio/) */
  readonly src: AudioAssetPath;

  /** Named channel. Reusing a channel name replaces the current source. */
  readonly channel: AmbientChannel;

  /** Playback volume. Default: 0.3 */
  readonly volume?: Volume;

  /** Fade-in duration. Default: 2000ms */
  readonly fadeIn?: DurationMs;

  /** Whether to loop. Default: true */
  readonly loop?: boolean;
}

/**
 * Stop a single ambient channel.
 */
interface AudioAmbientStopEvent extends AudioEventBase {
  readonly type: 'audio.ambient.stop';

  /** Channel to stop */
  readonly channel: AmbientChannel;

  /** Fade-out duration. Default: 2000ms */
  readonly fadeOut?: DurationMs;
}

/**
 * Stop all ambient channels at once (e.g., on scene change).
 */
interface AudioAmbientStopAllEvent extends AudioEventBase {
  readonly type: 'audio.ambient.stop_all';

  /** Fade-out duration for all channels. Default: 1000ms */
  readonly fadeOut?: DurationMs;
}

// ── Procedural Audio ──────────────────────────────────────────────────
// Synthesized sounds generated by the client using Web Audio oscillators,
// noise generators, and filters. No audio files required.

/**
 * Play a procedural sound from a named recipe.
 *
 * Recipes are registered by the client, not defined by the story.
 * The story says *what* conceptual sound it wants; the client decides
 * how to synthesize it. Clients without procedural support can map
 * recipe names to fallback audio files, or skip the event.
 *
 * Use cases: system beeps, alerts, electrical hum, static bursts,
 * tonal feedback for puzzle state.
 */
interface AudioProceduralEvent extends AudioEventBase {
  readonly type: 'audio.procedural';

  /** Named recipe identifier */
  readonly recipe: ProceduralRecipeName;

  /** Recipe-specific parameters (override recipe defaults) */
  readonly params?: Readonly<Record<string, number>>;

  /** Playback volume. Default: 1.0 */
  readonly volume?: Volume;

  /** Duration override. Uses recipe default if omitted. */
  readonly duration?: DurationMs;

  /** Ducking priority. See AudioSfxEvent.duck. Default: 0 */
  readonly duck?: DuckPriority;
}

/**
 * Built-in recipe names that clients SHOULD support.
 * Stories may use any string — unknown recipes are silently skipped.
 */
type BuiltinRecipeName =
  | 'beep'        // Simple tone (params: frequency, duration)
  | 'alert'       // Repeating alert (params: frequency, interval, count)
  | 'sweep-up'    // Rising frequency (params: startFreq, endFreq, duration)
  | 'sweep-down'  // Falling frequency (params: startFreq, endFreq, duration)
  | 'static'      // Noise burst (params: color [0=white, 1=pink], duration)
  | 'hum';        // Continuous low tone (params: frequency, harmonics)

/** Recipe name: built-in or story-defined */
type ProceduralRecipeName = BuiltinRecipeName | (string & {});

// ── Audio Effects ─────────────────────────────────────────────────────
// Per-channel audio processing. Clients MAY support effects — stories
// request them as hints and degrade gracefully if unsupported.

/** Effect types that map to Web Audio API nodes */
type AudioEffectType =
  | 'reverb'      // ConvolverNode — params: decay, mix
  | 'lowpass'     // BiquadFilterNode — params: frequency, q
  | 'highpass'    // BiquadFilterNode — params: frequency, q
  | 'distortion'  // WaveShaperNode — params: amount
  | 'delay';      // DelayNode — params: time, feedback, mix

/**
 * Apply an audio effect to a mix target.
 *
 * Use cases: reverb in caves, muffled sound behind walls,
 * distortion during damage, lowpass for flashback sequences.
 */
interface AudioEffectEvent extends AudioEventBase {
  readonly type: 'audio.effect';

  /** Which part of the audio mix to affect */
  readonly target: AudioTarget;

  /** Effect to apply */
  readonly effect: AudioEffectType;

  /** Effect-specific parameters */
  readonly params: Readonly<Record<string, number>>;

  /** Transition time to reach new effect state. Default: 0 (instant) */
  readonly transition?: DurationMs;
}

/**
 * Remove all effects from a mix target.
 */
interface AudioEffectClearEvent extends AudioEventBase {
  readonly type: 'audio.effect.clear';

  /** Which part of the audio mix to clear effects from */
  readonly target: AudioTarget;

  /** Transition time to remove effects. Default: 0 (instant) */
  readonly transition?: DurationMs;
}

// ── Discriminated Union ───────────────────────────────────────────────

/**
 * Union of all audio events. Clients switch on the `type` discriminant.
 */
type AudioEvent =
  | AudioSfxEvent
  | AudioMusicPlayEvent
  | AudioMusicStopEvent
  | AudioAmbientPlayEvent
  | AudioAmbientStopEvent
  | AudioAmbientStopAllEvent
  | AudioProceduralEvent
  | AudioEffectEvent
  | AudioEffectClearEvent;

// ── Type Guards ───────────────────────────────────────────────────────

/** Returns true if the event is any audio event */
function isAudioEvent(event: { type: string }): event is AudioEvent {
  return event.type.startsWith('audio.');
}
```

#### Capabilities

```typescript
/**
 * Audio capabilities declared by the client at session start.
 * Stories check these before emitting audio events.
 */
interface AudioCapabilities {
  /** Can play sound effects (AudioSfxEvent) */
  readonly sfx: boolean;

  /** Can play background music (AudioMusicPlayEvent/StopEvent) */
  readonly music: boolean;

  /** Can layer ambient channels (AudioAmbientPlayEvent/StopEvent) */
  readonly ambient: boolean;

  /** Can synthesize procedural sounds (AudioProceduralEvent) */
  readonly procedural: boolean;

  /** Can apply audio effects (AudioEffectEvent) */
  readonly effects: boolean;

  /** Maximum simultaneous audio sources. 0 = unlimited. */
  readonly maxChannels?: number;

  /** Supported audio file formats */
  readonly formats: readonly AudioFormat[];
}

/** Audio file formats */
type AudioFormat = 'mp3' | 'ogg' | 'wav' | 'aac' | 'opus' | 'webm';
```

#### Player Preferences

```typescript
/**
 * Player audio preferences, persisted to localStorage by the client.
 * Player settings override story-specified volumes.
 */
interface AudioPreferences {
  /** Master audio enabled/disabled */
  enabled: boolean;

  /** Master volume (multiplied against all event volumes). Default: 1.0 */
  masterVolume: Volume;

  /** Per-category volume multipliers */
  sfxVolume: Volume;
  musicVolume: Volume;
  ambientVolume: Volume;

  /** Per-category mute toggles (independent of volume) */
  sfxMuted: boolean;
  musicMuted: boolean;
  ambientMuted: boolean;
}
```

### EventDataRegistry Integration

`@sharpee/media` extends the core `EventDataRegistry` via declaration merging so that `createTypedEvent()` and `context.event()` are fully type-checked for audio events — no casts needed.

```typescript
// @sharpee/media/src/audio/registry.ts

import type { AudioAssetPath, Volume, DurationMs, StereoPan, PlaybackRate,
  AmbientChannel, AudioTarget, AudioEffectType, ProceduralRecipeName } from './types';

// ── Event data shapes (what goes in the `data` field) ─────────────────

export interface AudioSfxData {
  readonly src: AudioAssetPath;
  readonly volume?: Volume;
  readonly rate?: PlaybackRate;
  readonly pan?: StereoPan;
  readonly duck?: DuckPriority;
}

export interface AudioMusicPlayData {
  readonly src: AudioAssetPath;
  readonly volume?: Volume;
  readonly fadeIn?: DurationMs;
  readonly loop?: boolean;
}

export interface AudioMusicStopData {
  readonly fadeOut?: DurationMs;
}

export interface AudioAmbientPlayData {
  readonly src: AudioAssetPath;
  readonly channel: AmbientChannel;
  readonly volume?: Volume;
  readonly fadeIn?: DurationMs;
  readonly loop?: boolean;
}

export interface AudioAmbientStopData {
  readonly channel: AmbientChannel;
  readonly fadeOut?: DurationMs;
}

export interface AudioAmbientStopAllData {
  readonly fadeOut?: DurationMs;
}

export interface AudioProceduralData {
  readonly recipe: ProceduralRecipeName;
  readonly params?: Readonly<Record<string, number>>;
  readonly volume?: Volume;
  readonly duration?: DurationMs;
  readonly duck?: DuckPriority;
}

export interface AudioEffectData {
  readonly target: AudioTarget;
  readonly effect: AudioEffectType;
  readonly params: Readonly<Record<string, number>>;
  readonly transition?: DurationMs;
}

export interface AudioEffectClearData {
  readonly target: AudioTarget;
  readonly transition?: DurationMs;
}

// ── Declaration merging with @sharpee/core ────────────────────────────

declare module '@sharpee/core' {
  interface EventDataRegistry {
    'audio.sfx': AudioSfxData;
    'audio.music.play': AudioMusicPlayData;
    'audio.music.stop': AudioMusicStopData;
    'audio.ambient.play': AudioAmbientPlayData;
    'audio.ambient.stop': AudioAmbientStopData;
    'audio.ambient.stop_all': AudioAmbientStopAllData;
    'audio.procedural': AudioProceduralData;
    'audio.effect': AudioEffectData;
    'audio.effect.clear': AudioEffectClearData;
  }
}
```

With this in place, all audio event creation is compile-time checked:

```typescript
import { createTypedEvent } from '@sharpee/core';

// ✓ Compiles — correct data shape
createTypedEvent('audio.sfx', { src: 'sfx/skin-activate.mp3', volume: 0.8 });

// ✗ Compile error — 'src' is missing
createTypedEvent('audio.sfx', { volume: 0.8 });

// ✗ Compile error — 'loudness' is not a known field
createTypedEvent('audio.sfx', { src: 'sfx/beep.mp3', loudness: 0.8 });

// ✓ context.event() in actions is also type-checked
context.event('audio.ambient.play', {
  src: 'ambient/wind.mp3',
  channel: 'environment',
  volume: 0.4,
  fadeIn: 2000,
});
```

### AudioRegistry

**All audio configuration is registered in one place.** Actions, daemons, and handlers never contain sound design details — no file paths, frequencies, volumes, or recipe parameters. They reference registered names. The registry owns all audio decisions.

`AudioRegistry` lives in `@sharpee/media` as a platform type. Stories create one and populate it in `initializeWorld()`.

```typescript
// @sharpee/media/src/audio/registry.ts (the platform type, not the EventDataRegistry file)

import type { ISemanticEvent } from '@sharpee/core';
import type { AudioEffectType, AudioTarget, AudioAssetPath,
  AmbientChannel, Volume, DurationMs } from './types';

/**
 * An audio cue factory — returns a fresh event each invocation.
 * Factories (not constants) because each call needs a unique event id/timestamp.
 */
export type AudioCue = () => ISemanticEvent;

/**
 * A variation pool — multiple audio files for the same logical sound.
 * The client picks one at random each time and applies jitter to
 * prevent repetition fatigue.
 */
export interface VariationPool {
  /** Audio files to choose from (at least one required) */
  readonly sources: readonly AudioAssetPath[];

  /** Base volume before jitter. Default: 1.0 */
  readonly volume?: Volume;

  /** Random volume jitter range: ±jitter. e.g., 0.1 means volume varies ±10%. Default: 0 */
  readonly volumeJitter?: number;

  /** Random pitch jitter range: ±jitter applied to playback rate. e.g., 0.05 means ±5%. Default: 0 */
  readonly pitchJitter?: number;

  /** Ducking priority. Default: 0 */
  readonly duck?: DuckPriority;
}

/**
 * Ducking configuration — how the client reduces background audio
 * when a high-priority sound fires.
 */
export interface DuckingConfig {
  /** Volume multiplier applied to ducked audio (0.0–1.0). Default: 0.3 */
  readonly duckVolume: Volume;

  /** How quickly ducked audio fades down (ms). Default: 100 */
  readonly attackMs: DurationMs;

  /** How quickly ducked audio recovers after the SFX ends (ms). Default: 500 */
  readonly releaseMs: DurationMs;

  /**
   * Which categories get ducked. Default: ['music', 'ambient']
   * SFX never duck other SFX.
   */
  readonly targets: readonly ('music' | 'ambient')[];
}

/**
 * Atmosphere definition for a room or region.
 * Describes the ambient soundscape, optional music track, and optional effect.
 */
export interface RoomAtmosphere {
  readonly ambient: ReadonlyArray<{
    readonly src: AudioAssetPath;
    readonly channel: AmbientChannel;
    readonly volume: Volume;
  }>;
  readonly music?: {
    readonly src: AudioAssetPath;
    readonly volume: Volume;
  };
  readonly effect?: {
    readonly effect: AudioEffectType;
    readonly target: AudioTarget;
    readonly params: Readonly<Record<string, number>>;
  };
}

/**
 * Central registry for all audio in a story.
 * Stories populate this during initializeWorld(). Actions and handlers
 * reference registered names — never raw audio parameters.
 */
export class AudioRegistry {
  private cues = new Map<string, AudioCue>();
  private pools = new Map<string, VariationPool>();
  private atmospheres = new Map<string, RoomAtmosphere>();
  private fadeDefaults = { ambientIn: 2000, ambientOut: 2000, musicIn: 1000, effectTransition: 2000 };
  private duckingConfig: DuckingConfig = { duckVolume: 0.3, attackMs: 100, releaseMs: 500, targets: ['music', 'ambient'] };

  // ── Cues ────────────────────────────────────────────────────────────

  /** Register a named audio cue (single sound, full control) */
  registerCue(name: string, cue: AudioCue): void {
    this.cues.set(name, cue);
  }

  /**
   * Register a variation pool — multiple files for one logical sound.
   * When fired, the client picks a random source and applies jitter.
   */
  registerPool(name: string, pool: VariationPool): void {
    this.pools.set(name, pool);
  }

  /**
   * Fire a registered cue or pool by name. Returns empty array if not registered.
   *
   * Resolution order:
   * 1. Check cues (exact factory)
   * 2. Check pools (random selection + jitter → AudioSfxEvent)
   * 3. Return [] (silent degradation)
   */
  cue(name: string): ISemanticEvent[] {
    // Direct cue factory
    const factory = this.cues.get(name);
    if (factory) return [factory()];

    // Variation pool → resolve to SFX event with random source + jitter
    const pool = this.pools.get(name);
    if (pool) return [this.resolvePool(pool)];

    return [];
  }

  private resolvePool(pool: VariationPool): ISemanticEvent {
    const src = pool.sources[Math.floor(Math.random() * pool.sources.length)];
    const baseVolume = pool.volume ?? 1.0;
    const volumeJitter = pool.volumeJitter ?? 0;
    const pitchJitter = pool.pitchJitter ?? 0;

    const volume = Math.max(0, Math.min(1, baseVolume + (Math.random() * 2 - 1) * volumeJitter));
    const rate = 1.0 + (Math.random() * 2 - 1) * pitchJitter;

    return createTypedEvent('audio.sfx', { src, volume, rate, duck: pool.duck });
  }

  // ── Ducking ─────────────────────────────────────────────────────────

  /** Override the default ducking behavior */
  setDucking(config: Partial<DuckingConfig>): void {
    this.duckingConfig = { ...this.duckingConfig, ...config };
  }

  getDucking(): Readonly<DuckingConfig> {
    return this.duckingConfig;
  }

  // ── Atmospheres ─────────────────────────────────────────────────────

  /** Register a room atmosphere by room ID (raw object) */
  registerAtmosphere(roomId: string, atmosphere: RoomAtmosphere): void {
    this.atmospheres.set(roomId, atmosphere);
  }

  /** Start a fluent atmosphere builder for a room */
  atmosphere(roomId: string): AtmosphereBuilder {
    return new AtmosphereBuilder(this, roomId);
  }

  /** Get the registered atmosphere for a room. Returns undefined if none. */
  getAtmosphere(roomId: string): RoomAtmosphere | undefined {
    return this.atmospheres.get(roomId);
  }

  // ── Fade defaults ───────────────────────────────────────────────────

  /** Override default fade durations (ms) */
  setFadeDefaults(defaults: Partial<typeof this.fadeDefaults>): void {
    Object.assign(this.fadeDefaults, defaults);
  }

  getFadeDefaults(): Readonly<typeof this.fadeDefaults> {
    return this.fadeDefaults;
  }
}

/**
 * Fluent builder for room atmospheres.
 * Avoids verbose JSON object literals in registration code.
 */
class AtmosphereBuilder {
  private _ambient: RoomAtmosphere['ambient'] = [];
  private _music: RoomAtmosphere['music'];
  private _effect: RoomAtmosphere['effect'];

  constructor(
    private registry: AudioRegistry,
    private roomId: string,
  ) {}

  /** Add an ambient channel */
  ambient(src: AudioAssetPath, channel: AmbientChannel, volume: Volume): this {
    this._ambient = [...this._ambient, { src, channel, volume }];
    return this;
  }

  /** Set the music track */
  music(src: AudioAssetPath, volume: Volume): this {
    this._music = { src, volume };
    return this;
  }

  /** Set an audio effect */
  effect(effect: AudioEffectType, target: AudioTarget, params: Record<string, number>): this {
    this._effect = { effect, target, params };
    return this;
  }

  /** Register the atmosphere with the registry */
  build(): void {
    this.registry.registerAtmosphere(this.roomId, {
      ambient: this._ambient,
      music: this._music,
      effect: this._effect,
    });
  }
}
```

**Story implementation — all audio registration in one file:**

```typescript
// stories/entropy/src/audio/index.ts

import { createTypedEvent } from '@sharpee/core';
import { AudioRegistry } from '@sharpee/media';

import { BattlefieldRoomIds } from '../regions/battlefield';
import { UndergroundRoomIds } from '../regions/underground';
import { OrbitRoomIds } from '../regions/orbit';

/**
 * Create and populate the audio registry for Entropy.
 * All sound design decisions live here — cues, atmospheres, fade timing.
 * No other file in the story references audio files or frequencies.
 */
export function createAudioRegistry(): AudioRegistry {
  const audio = new AudioRegistry();

  // ── Ducking ───────────────────────────────────────────────
  // When a high-priority SFX fires, ambient and music duck briefly
  // so the SFX cuts through the mix.

  audio.setDucking({
    duckVolume: 0.3,     // duck to 30% volume
    attackMs: 80,        // fade down in 80ms
    releaseMs: 600,      // recover over 600ms after SFX ends
    targets: ['music', 'ambient'],
  });

  // ── Cues (single sounds) ──────────────────────────────────

  audio.registerCue('system.error', () =>
    createTypedEvent('audio.procedural', {
      recipe: 'alert',
      params: { frequency: 300, interval: 200, count: 3 },
      volume: 0.5,
      duck: 2,
    }),
  );

  audio.registerCue('system.warning', () =>
    createTypedEvent('audio.procedural', {
      recipe: 'alert',
      params: { frequency: 440, interval: 300, count: 2 },
      volume: 0.6,
      duck: 2,
    }),
  );

  audio.registerCue('system.critical', () =>
    createTypedEvent('audio.procedural', {
      recipe: 'alert',
      params: { frequency: 880, interval: 150, count: 5 },
      volume: 0.9,
      duck: 3,
    }),
  );

  audio.registerCue('skin.activate', () =>
    createTypedEvent('audio.sfx', {
      src: 'sfx/skin-activate.mp3',
      volume: 0.8,
      duck: 2,
    }),
  );

  audio.registerCue('skin.deactivate', () =>
    createTypedEvent('audio.sfx', {
      src: 'sfx/skin-deactivate.mp3',
      volume: 0.6,
      duck: 1,
    }),
  );

  audio.registerCue('puzzle.solve', () =>
    createTypedEvent('audio.procedural', {
      recipe: 'sweep-up',
      params: { startFreq: 400, endFreq: 1200, duration: 600 },
      volume: 0.7,
      duck: 2,
    }),
  );

  // ── Variation pools (multiple files per logical sound) ────
  // Client picks one at random and applies pitch/volume jitter
  // to prevent repetition fatigue.

  audio.registerPool('combat.plasma_fire', {
    sources: [
      'sfx/plasma-fire-01.mp3',
      'sfx/plasma-fire-02.mp3',
      'sfx/plasma-fire-03.mp3',
    ],
    volume: 0.9,
    pitchJitter: 0.08,    // ±8% pitch variation
    volumeJitter: 0.05,   // ±5% volume variation
    duck: 2,
  });

  audio.registerPool('combat.impact', {
    sources: [
      'sfx/impact-hit-01.mp3',
      'sfx/impact-hit-02.mp3',
      'sfx/impact-hit-03.mp3',
      'sfx/impact-hit-04.mp3',
    ],
    volume: 0.7,
    pitchJitter: 0.1,
    volumeJitter: 0.08,
    duck: 2,
  });

  audio.registerPool('door.open', {
    sources: [
      'sfx/door-open-01.mp3',
      'sfx/door-open-02.mp3',
    ],
    volume: 0.6,
    pitchJitter: 0.05,
    duck: 1,
  });

  audio.registerPool('footstep.metal', {
    sources: [
      'sfx/step-metal-01.mp3',
      'sfx/step-metal-02.mp3',
      'sfx/step-metal-03.mp3',
      'sfx/step-metal-04.mp3',
    ],
    volume: 0.3,
    pitchJitter: 0.12,
    volumeJitter: 0.1,
    duck: 0,              // footsteps don't duck anything
  });

  // ── Atmospheres ───────────────────────────────────────────

  audio.atmosphere(BattlefieldRoomIds.LOST_BATTLEFIELD)
    .ambient('ambient/wind-scorched.mp3', 'environment', 0.4)
    .ambient('ambient/distant-rumble.mp3', 'tectonic', 0.15)
    .music('music/desolation.mp3', 0.3)
    .build();

  audio.atmosphere(BattlefieldRoomIds.SMOKING_FOREST)
    .ambient('ambient/fire-crackle.mp3', 'environment', 0.5)
    .ambient('ambient/wind-scorched.mp3', 'wind', 0.2)
    .build();

  audio.atmosphere(UndergroundRoomIds.UNDERGROUND_RIVER)
    .ambient('ambient/cave-drip.mp3', 'environment', 0.3)
    .effect('reverb', 'master', { decay: 3.0, mix: 0.4 })
    .build();

  audio.atmosphere(UndergroundRoomIds.ENEMY_BUNKER)
    .ambient('ambient/electrical-hum.mp3', 'environment', 0.2)
    .music('music/tension.mp3', 0.25)
    .build();

  audio.atmosphere(OrbitRoomIds.BRIDGE)
    .ambient('ambient/engine-hum.mp3', 'environment', 0.3)
    .ambient('ambient/console-beeps.mp3', 'electronics', 0.1)
    .music('music/orbit.mp3', 0.2)
    .build();

  return audio;
}
```

**Usage in actions and daemons — reference names, not sound design:**

```typescript
// In any action or daemon that has access to the registry:

// Action report
report(context: ActionContext): ISemanticEvent[] {
  return [
    context.event('if.message', { id: 'entropy.skin.activated' }),
    ...audio.cue('skin.activate'),
  ];
},

// Action blocked
blocked(context: ActionContext, result: any): ISemanticEvent[] {
  if (context.sharedData.get('already_active')) {
    return [context.event('if.message', { id: 'entropy.skin.already_active' })];
  }
  return [
    context.event('if.message', { id: 'entropy.skin.damaged' }),
    ...audio.cue('system.error'),
  ];
},

// Daemon
if (systems.health === 3) {
  events.push(createMessageEvent('warning', 'entropy.systems.health_warning'));
  events.push(...audio.cue('system.warning'));
} else if (systems.health === 1) {
  events.push(createMessageEvent('warning', 'entropy.systems.health_critical'));
  events.push(...audio.cue('system.critical'));
}
```

**`audio.cue()` returns an array** so it spreads cleanly into event lists. If the cue isn't registered (e.g., audio was stripped for a minimal build), it returns `[]` — silent degradation, no crashes.

**Design rules:**
- One `createAudioRegistry()` per story, called from `initializeWorld()`
- All `registerCue()` and `registerAtmosphere()` calls in that one file
- Actions, daemons, and handlers only call `audio.cue(name)` or consult `audio.getAtmosphere(roomId)`
- Cue names use dot-separated categories: `system.error`, `skin.activate`, `combat.plasma_fire`

### Player Controls

The client provides audio controls independent of the story:

- **Master volume** slider
- **Category mutes** — independently mute SFX, music, ambient
- **Audio on/off** toggle (respects between sessions via localStorage)

Player preferences override story volume levels. If the player sets music volume to 50%, a `volume: 0.8` event plays at `0.4` effective volume.

### Autoplay Policy

Browsers require a user gesture before playing audio. The client handles this transparently:

1. Create the `AudioContext` on page load (suspended state)
2. On the first user interaction (typing a command, clicking), call `audioContext.resume()`
3. Queue any audio events received before resume and play them once the context is active

Stories do not need to know about autoplay. They emit events; the client handles timing.

### Asset Packaging

Audio assets live in the story's asset directory:

```
stories/entropy/
├── src/
│   └── ...
├── assets/
│   └── audio/
│       ├── sfx/
│       │   ├── skin-activate.mp3
│       │   ├── system-alert.mp3
│       │   └── door-open.mp3
│       ├── music/
│       │   ├── desolation.mp3
│       │   └── tension.mp3
│       └── ambient/
│           ├── wind-scorched.mp3
│           ├── cave-drip.mp3
│           └── engine-hum.mp3
└── package.json
```

The build system bundles audio assets into the client output. Asset paths in events are relative to `assets/audio/`.

**File format guidance**:
- MP3 for broad compatibility (all browsers)
- OGG/Opus for smaller file sizes (all modern browsers including Safari 17+)
- WAV for short SFX where decode latency matters
- Keep ambient loops short (15-30 seconds) and seamlessly loopable
- Total audio budget per story: recommend under 10MB for web delivery

### What Each Layer Knows

| Layer | Knows About |
|-------|-------------|
| Engine | Nothing — passes events through |
| Language layer | Nothing — produces text only |
| World model | Nothing — audio is not entity state |
| Story code | Audio event types, asset paths, capability checks |
| Client | AudioContext, mixing, effects, player preferences, autoplay |

## Example: Entropy Audio Integration

This shows exactly how audio hooks into a Sharpee story, using Entropy as the reference. All audio flows through the `AudioRegistry` — no action, daemon, or handler ever contains sound design details.

### 1. Registration in `initializeWorld()`

The story creates the registry, registers the atmosphere handler, and makes the registry available to actions and daemons.

```typescript
// stories/entropy/src/index.ts

import { createAudioRegistry } from './audio';
import { registerAtmosphereHandler } from './audio/atmosphere-handler';

initializeWorld(world: WorldModel, engine: GameEngine): void {
  // ... create regions, connect rooms, place player ...

  // Audio — all sound design registered in one place
  const audio = createAudioRegistry();
  const eventProcessor = engine.getEventProcessor();
  registerAtmosphereHandler(eventProcessor, world, audio);

  // Make registry available to actions and daemons
  // (stored on world or passed directly — story's choice)
  (world as any).audioRegistry = audio;

  // ... register daemons, event handlers, etc. ...
}
```

### 2. Atmosphere Handler (Generic)

The atmosphere handler is generic — it reads from the registry, not from hardcoded config. The same handler works for any story.

```typescript
// stories/entropy/src/audio/atmosphere-handler.ts

import type { EventProcessor } from '@sharpee/event-processor';
import type { WorldModel } from '@sharpee/world-model';
import { ISemanticEvent, createTypedEvent } from '@sharpee/core';
import type { AudioRegistry } from '@sharpee/media';

/**
 * Register audio atmosphere handler with the event processor.
 * Reads room atmospheres from the registry — contains no sound design.
 */
export function registerAtmosphereHandler(
  eventProcessor: EventProcessor,
  world: WorldModel,
  audio: AudioRegistry,
): void {
  let currentRoomId: string | null = null;
  const fades = audio.getFadeDefaults();

  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    const data = event.data as { actor?: { id: string }; toRoom?: string };
    if (!data?.toRoom) return [];

    // Only respond to player movement, not NPCs
    const player = world.getPlayer();
    if (!player || data.actor?.id !== player.id) return [];

    // Skip if same room (shouldn't happen, but guard)
    if (currentRoomId === data.toRoom) return [];
    currentRoomId = data.toRoom;

    const atmosphere = audio.getAtmosphere(data.toRoom);
    const events: ISemanticEvent[] = [];

    // Stop current ambient
    events.push(createTypedEvent('audio.ambient.stop_all', { fadeOut: fades.ambientOut }));

    if (!atmosphere) {
      // No atmosphere registered — silence + clear effects
      events.push(createTypedEvent('audio.effect.clear', {
        target: 'master',
        transition: fades.effectTransition,
      }));
      return events;
    }

    // Start new ambient channels
    for (const amb of atmosphere.ambient) {
      events.push(createTypedEvent('audio.ambient.play', {
        src: amb.src,
        channel: amb.channel,
        volume: amb.volume,
        fadeIn: fades.ambientIn,
      }));
    }

    // Crossfade music
    if (atmosphere.music) {
      events.push(createTypedEvent('audio.music.play', {
        src: atmosphere.music.src,
        volume: atmosphere.music.volume,
        fadeIn: fades.musicIn,
      }));
    }

    // Apply or clear room effects
    if (atmosphere.effect) {
      events.push(createTypedEvent('audio.effect', {
        target: atmosphere.effect.target,
        effect: atmosphere.effect.effect,
        params: atmosphere.effect.params,
        transition: fades.effectTransition,
      }));
    } else {
      events.push(createTypedEvent('audio.effect.clear', {
        target: 'master',
        transition: fades.effectTransition,
      }));
    }

    return events;
  });
}
```

### 3. Sound Effect via Story Action

The action references cue names. It doesn't know what `skin.activate` sounds like.

```typescript
// stories/entropy/src/actions/activate-skin/activate-skin-action.ts

import { Action, ActionContext } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import type { AudioRegistry } from '@sharpee/media';

export const activateSkinAction: Action = {
  id: 'entropy.action.activate_skin',
  group: 'systems',

  validate(context: ActionContext) {
    const skin = getFlightSkin(context.world);
    if (skin.isActive) {
      context.sharedData.set('already_active', true);
      return { valid: false, reason: 'skin_already_active' };
    }
    if (skin.isDamaged) {
      return { valid: false, reason: 'skin_damaged' };
    }
    return { valid: true };
  },

  execute(context: ActionContext) {
    const skin = getFlightSkin(context.world);
    skin.isActive = true;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const audio = getAudioRegistry(context.world);
    return [
      context.event('if.message', { id: 'entropy.skin.activated' }),
      ...audio.cue('skin.activate'),
    ];
  },

  blocked(context: ActionContext, result: any): ISemanticEvent[] {
    const audio = getAudioRegistry(context.world);
    if (context.sharedData.get('already_active')) {
      return [context.event('if.message', { id: 'entropy.skin.already_active' })];
    }
    return [
      context.event('if.message', { id: 'entropy.skin.damaged' }),
      ...audio.cue('system.error'),
    ];
  },
};
```

### 4. System Alert via Scheduler Daemon

Same pattern — cue names only, no sound design.

```typescript
// stories/entropy/src/scheduler/need-resources-daemon.ts (excerpt)

import { SchedulerService } from '@sharpee/engine';
import { ISemanticEvent, createMessageEvent } from '@sharpee/core';
import type { AudioRegistry } from '@sharpee/media';

export function registerNeedResourcesDaemon(
  scheduler: SchedulerService,
  world: WorldModel,
  audio: AudioRegistry,
): void {
  scheduler.registerDaemon('entropy.daemon.need_resources', () => {
    const systems = getMainSystems(world);
    const events: ISemanticEvent[] = [];

    systems.health -= 1;

    if (systems.health === 3) {
      events.push(createMessageEvent('warning', 'entropy.systems.health_warning'));
      events.push(...audio.cue('system.warning'));
    } else if (systems.health === 1) {
      events.push(createMessageEvent('warning', 'entropy.systems.health_critical'));
      events.push(...audio.cue('system.critical'));
    }

    return events;
  });
}
```

### Integration Summary

| Integration Point | Sharpee Mechanism | What It Calls |
|---|---|---|
| Room atmosphere | `eventProcessor.registerHandler('if.event.actor_moved', ...)` | `audio.getAtmosphere(roomId)` |
| Action feedback | `Action.report()` / `Action.blocked()` | `audio.cue('skin.activate')` |
| Timed alerts | `scheduler.registerDaemon(...)` | `audio.cue('system.critical')` |
| Combat | `eventProcessor.registerHandler('if.event.attacked', ...)` | `audio.cue('combat.plasma_fire')` |
| Puzzle solve | `eventProcessor.registerHandler('{custom_event}', ...)` | `audio.cue('puzzle.solve')` |

All audio flows through the registry. All sound design lives in `stories/entropy/src/audio/index.ts`. Actions, daemons, and handlers are audio-agnostic — they reference semantic names. If a cue isn't registered, `audio.cue()` returns `[]` and the game runs silently. No crashes, no missing-file errors.

## Implementation Plan

### Phase 0: `@sharpee/media` Package

Create a new workspace package for all media type contracts — audio, images, video, animations, speech. This package contains only TypeScript interfaces, type definitions, and constants. No runtime code, no browser APIs.

```
packages/media/
├── src/
│   ├── index.ts              # Public API
│   ├── audio/
│   │   ├── events.ts         # AudioSfxEvent, AudioMusicEvent, AudioAmbientEvent, etc.
│   │   ├── capabilities.ts   # AudioCapabilities interface
│   │   ├── procedural.ts     # ProceduralRecipe types
│   │   └── effects.ts        # AudioEffect types
│   ├── speech/
│   │   ├── tts.ts            # SpeechBlock, TTSPreferences (ADR-139)
│   │   ├── stt.ts            # STTPreferences, vocabulary hints (ADR-139)
│   │   └── capabilities.ts   # SpeechCapabilities interface
│   ├── visual/               # Reserved for future ADRs
│   │   ├── image.ts          # ImageEvent types (from ADR-101/122)
│   │   ├── animation.ts      # AnimationEvent types (from ADR-101)
│   │   ├── video.ts          # VideoEvent types (from ADR-101)
│   │   ├── layout.ts         # LayoutEvent types (from ADR-101)
│   │   └── transition.ts     # TransitionSpec (from ADR-101)
│   └── capabilities.ts       # MediaCapabilities (aggregates all sub-capabilities)
├── package.json
└── tsconfig.json
```

Stories import types from `@sharpee/media`. Clients import types and implement renderers. The engine passes media events through unchanged — it does not depend on this package.

This follows the same pattern as `@sharpee/if-domain`: contracts that define the boundary between story code and client rendering.

### Phase 1: Core Audio Pipeline

- Define audio event types in `@sharpee/media/audio/`
- Add `AudioCapabilities` to `MediaCapabilities` interface
- Ensure event pipeline passes `audio.*` events through to clients unchanged
- Browser client: create `AudioManager` class wrapping Web Audio API
  - AudioContext lifecycle (create, resume on gesture, suspend on tab hide)
  - SFX playback (decode, play, discard)
  - Music playback (single track, crossfade)
  - Ambient channel management (named channels, independent volume)
- Player controls: master volume, category mutes, persist to localStorage

### Phase 2: Effects and Procedural

- Audio effect nodes (reverb, filters) in AudioManager
- Procedural recipe system (oscillators, noise generators)
- Story-registered custom recipes
- Preloading / asset caching

### Phase 3: Story Integration (Entropy)

- Add audio assets to Entropy
- Wire audio events into room entry, system activation, combat, daemons
- Build and test in browser client
- Validate crossfade, layering, effects in practice

### Phase 4: Tooling

- Audio asset bundling in build pipeline
- Dev mode: hot-reload audio assets
- Audio event logging for debugging
- Transcript tester: log audio events (don't play them)

## Consequences

### Positive

- **Atmosphere without UI changes** — audio enhances text, doesn't replace it
- **Incremental adoption** — stories add audio when ready, zero cost when not
- **Procedural option** — small stories get sound with no audio files
- **Player control** — full volume/mute controls, preferences persist
- **Browser-native** — Web Audio API, no plugins or libraries needed
- **Testable** — audio events are inspectable in the event stream

### Negative

- **Asset size** — audio files increase story bundle size (mitigated by format choice and short loops)
- **Autoplay complexity** — browser policy requires careful AudioContext lifecycle management
- **Creative burden** — authors need audio assets or sound design skills
- **Cross-browser testing** — Web Audio behavior can vary (especially mobile Safari)

### Neutral

- CLI/terminal clients ignore audio events — no impact
- Does not preclude ADR-101's visual features — those become separate ADRs
- Audio events are just events — they serialize, replay, and log like any other

## Relationship to Other ADRs

**ADR-101** (Graphical Client Architecture) defined audio events as part of a larger multimedia system. This ADR supersedes the audio portions of ADR-101:

- `media.sound.play` → `audio.sfx`
- `media.music.play/stop` → `audio.music.play/stop`
- `media.ambient.play/stop` → `audio.ambient.play/stop`

ADR-101's visual features (images, animations, video, layouts, hotspots) should be extracted into their own ADRs when the time comes. ADR-122 (Rich Media and Story Styling) already covers inline illustrations and story CSS.

**ADR-139** (Speech Accessibility) builds on this ADR's AudioManager and AudioContext foundation. Implement ADR-138 first.

**`@sharpee/media` package** (Phase 0 of this ADR) houses all media type contracts. Audio types live in `@sharpee/media/audio/`, with `speech/` and `visual/` directories reserved for ADR-139 and future visual ADRs. Stories and clients both import from this single package.

## References

- ADR-101: Graphical Client Architecture (audio events extracted from here)
- ADR-122: Rich Media and Story Styling (illustrations and CSS — separate concern)
- ADR-121: Story Runner Architecture (asset bundling)
- [Web Audio API specification](https://www.w3.org/TR/webaudio/)
- [Autoplay policy (Chrome)](https://developer.chrome.com/blog/autoplay/)
