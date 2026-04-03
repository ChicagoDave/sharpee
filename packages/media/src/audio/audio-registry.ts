/**
 * AudioRegistry — central registration system for all audio in a story.
 *
 * Public interface: AudioCue, VariationPool, DuckingConfig, RoomAtmosphere,
 * AtmosphereBuilder, and AudioRegistry class. Stories create one AudioRegistry
 * in initializeWorld() and populate it with cues, pools, and atmospheres.
 * Actions and handlers reference registered names only — never raw audio
 * parameters.
 *
 * Owner context: @sharpee/media (ADR-138)
 */

import type { ISemanticEvent } from '@sharpee/core';
import { createTypedEvent } from '@sharpee/core';
import type {
  AudioAssetPath,
  AmbientChannel,
  Volume,
  DurationMs,
  DuckPriority,
  AudioEffectType,
  AudioTarget,
} from './types';

// Ensure declaration merging is active
import './registry-merge';

/**
 * An audio cue factory — returns a fresh event each invocation.
 * Factories (not constants) because each call needs a unique event id/timestamp.
 */
export type AudioCue = () => ISemanticEvent;

/**
 * A variation pool — multiple audio files for the same logical sound.
 * The registry picks one at random each time and applies jitter to
 * prevent repetition fatigue.
 */
export interface VariationPool {
  /** Audio files to choose from (at least one required) */
  readonly sources: readonly AudioAssetPath[];

  /** Base volume before jitter. Default: 1.0 */
  readonly volume?: Volume;

  /** Random volume jitter range: +/-jitter. e.g., 0.1 means volume varies +/-10%. Default: 0 */
  readonly volumeJitter?: number;

  /** Random pitch jitter range: +/-jitter applied to playback rate. e.g., 0.05 means +/-5%. Default: 0 */
  readonly pitchJitter?: number;

  /** Ducking priority. Default: 0 */
  readonly duck?: DuckPriority;
}

/**
 * Ducking configuration — how the client reduces background audio
 * when a high-priority sound fires.
 */
export interface DuckingConfig {
  /** Volume multiplier applied to ducked audio (0.0-1.0). Default: 0.3 */
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

/** Default fade durations for atmosphere transitions */
export interface FadeDefaults {
  /** Ambient channel fade-in duration (ms). Default: 2000 */
  readonly ambientIn: DurationMs;
  /** Ambient channel fade-out duration (ms). Default: 2000 */
  readonly ambientOut: DurationMs;
  /** Music track fade-in duration (ms). Default: 1000 */
  readonly musicIn: DurationMs;
  /** Audio effect transition duration (ms). Default: 2000 */
  readonly effectTransition: DurationMs;
}

/**
 * Central registry for all audio in a story.
 * Stories populate this during initializeWorld(). Actions and handlers
 * reference registered names — never raw audio parameters.
 *
 * @example
 * ```typescript
 * const audio = new AudioRegistry();
 *
 * // Register a simple cue
 * audio.registerCue('skin.activate', () =>
 *   createTypedEvent('audio.sfx', { src: 'sfx/skin-activate.mp3', volume: 0.8 })
 * );
 *
 * // Register a variation pool (multiple files, random selection + jitter)
 * audio.registerPool('footstep.metal', {
 *   sources: ['sfx/step-metal-1.mp3', 'sfx/step-metal-2.mp3', 'sfx/step-metal-3.mp3'],
 *   volume: 0.6,
 *   volumeJitter: 0.1,
 *   pitchJitter: 0.05,
 * });
 *
 * // Register a room atmosphere using the fluent builder
 * audio.atmosphere('entropy.room.bridge')
 *   .ambient('ambient/ship-hum.mp3', 'environment', 0.3)
 *   .ambient('ambient/console-beeps.mp3', 'machinery', 0.15)
 *   .music('music/bridge-theme.mp3', 0.4)
 *   .effect('lowpass', 'ambient:environment', { frequency: 2000, q: 1 })
 *   .build();
 *
 * // In an action or handler — just use the name
 * const events = audio.cue('skin.activate');
 * ```
 */
export class AudioRegistry {
  private cues = new Map<string, AudioCue>();
  private pools = new Map<string, VariationPool>();
  private atmospheres = new Map<string, RoomAtmosphere>();
  private fadeDefaultValues: FadeDefaults = {
    ambientIn: 2000,
    ambientOut: 2000,
    musicIn: 1000,
    effectTransition: 2000,
  };
  private duckingConfig: DuckingConfig = {
    duckVolume: 0.3,
    attackMs: 100,
    releaseMs: 500,
    targets: ['music', 'ambient'],
  };

  // ── Cues ────────────────────────────────────────────────────────────

  /**
   * Register a named audio cue (single sound, full control).
   *
   * @param name - Unique cue identifier (e.g., 'skin.activate', 'door.open')
   * @param cue - Factory function that returns a fresh ISemanticEvent
   */
  registerCue(name: string, cue: AudioCue): void {
    this.cues.set(name, cue);
  }

  /**
   * Register a variation pool — multiple files for one logical sound.
   * When fired, the registry picks a random source and applies jitter.
   *
   * @param name - Unique pool identifier (e.g., 'footstep.metal')
   * @param pool - Pool configuration with sources and jitter parameters
   */
  registerPool(name: string, pool: VariationPool): void {
    this.pools.set(name, pool);
  }

  /**
   * Fire a registered cue or pool by name. Returns empty array if not registered.
   *
   * Resolution order:
   * 1. Check cues (exact factory)
   * 2. Check pools (random selection + jitter -> AudioSfxEvent)
   * 3. Return [] (silent degradation)
   *
   * @param name - Registered cue or pool name
   * @returns Array of events to emit (empty if name is not registered)
   */
  cue(name: string): ISemanticEvent[] {
    const factory = this.cues.get(name);
    if (factory) return [factory()];

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

  /**
   * Override the default ducking behavior.
   *
   * @param config - Partial ducking configuration to merge with defaults
   */
  setDucking(config: Partial<DuckingConfig>): void {
    this.duckingConfig = { ...this.duckingConfig, ...config };
  }

  /**
   * Get the current ducking configuration.
   *
   * @returns Read-only ducking config
   */
  getDucking(): Readonly<DuckingConfig> {
    return this.duckingConfig;
  }

  // ── Atmospheres ─────────────────────────────────────────────────────

  /**
   * Register a room atmosphere by room ID (raw object).
   *
   * @param roomId - Entity ID of the room
   * @param atmosphere - Complete atmosphere definition
   */
  registerAtmosphere(roomId: string, atmosphere: RoomAtmosphere): void {
    this.atmospheres.set(roomId, atmosphere);
  }

  /**
   * Start a fluent atmosphere builder for a room.
   *
   * @param roomId - Entity ID of the room
   * @returns AtmosphereBuilder instance — call .build() to register
   */
  atmosphere(roomId: string): AtmosphereBuilder {
    return new AtmosphereBuilder(this, roomId);
  }

  /**
   * Get the registered atmosphere for a room.
   *
   * @param roomId - Entity ID of the room
   * @returns The atmosphere definition, or undefined if none registered
   */
  getAtmosphere(roomId: string): RoomAtmosphere | undefined {
    return this.atmospheres.get(roomId);
  }

  // ── Fade defaults ───────────────────────────────────────────────────

  /**
   * Override default fade durations (ms).
   *
   * @param defaults - Partial fade defaults to merge
   */
  setFadeDefaults(defaults: Partial<FadeDefaults>): void {
    this.fadeDefaultValues = { ...this.fadeDefaultValues, ...defaults };
  }

  /**
   * Get the current fade defaults.
   *
   * @returns Read-only fade defaults
   */
  getFadeDefaults(): Readonly<FadeDefaults> {
    return this.fadeDefaultValues;
  }
}

/**
 * Fluent builder for room atmospheres.
 * Avoids verbose JSON object literals in registration code.
 *
 * @example
 * ```typescript
 * registry.atmosphere('entropy.room.bridge')
 *   .ambient('ambient/ship-hum.mp3', 'environment', 0.3)
 *   .music('music/bridge-theme.mp3', 0.4)
 *   .build();
 * ```
 */
export class AtmosphereBuilder {
  private _ambient: RoomAtmosphere['ambient'] = [];
  private _music: RoomAtmosphere['music'];
  private _effect: RoomAtmosphere['effect'];

  constructor(
    private registry: AudioRegistry,
    private roomId: string,
  ) {}

  /**
   * Add an ambient channel to the atmosphere.
   *
   * @param src - Audio file path
   * @param channel - Named channel identifier
   * @param volume - Playback volume (0.0-1.0)
   * @returns this (for chaining)
   */
  ambient(src: AudioAssetPath, channel: AmbientChannel, volume: Volume): this {
    this._ambient = [...this._ambient, { src, channel, volume }];
    return this;
  }

  /**
   * Set the music track for the atmosphere.
   *
   * @param src - Audio file path
   * @param volume - Playback volume (0.0-1.0)
   * @returns this (for chaining)
   */
  music(src: AudioAssetPath, volume: Volume): this {
    this._music = { src, volume };
    return this;
  }

  /**
   * Set an audio effect for the atmosphere.
   *
   * @param effect - Effect type (e.g., 'reverb', 'lowpass')
   * @param target - Mix target to apply the effect to
   * @param params - Effect-specific parameters
   * @returns this (for chaining)
   */
  effect(effect: AudioEffectType, target: AudioTarget, params: Record<string, number>): this {
    this._effect = { effect, target, params };
    return this;
  }

  /**
   * Register the atmosphere with the registry.
   */
  build(): void {
    this.registry.registerAtmosphere(this.roomId, {
      ambient: this._ambient,
      music: this._music,
      effect: this._effect,
    });
  }
}
