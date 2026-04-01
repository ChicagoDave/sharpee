/**
 * EventDataRegistry declaration merging for audio events.
 *
 * Public interface: Nine *Data interfaces and the declaration merging
 * block that extends @sharpee/core's EventDataRegistry with audio event
 * keys. Importing this module (or any re-export of it) activates
 * compile-time type checking for createTypedEvent('audio.*', ...).
 *
 * Owner context: @sharpee/media (ADR-138)
 */

import type {
  AudioAssetPath,
  Volume,
  DurationMs,
  StereoPan,
  PlaybackRate,
  AmbientChannel,
  DuckPriority,
  AudioTarget,
  AudioEffectType,
  ProceduralRecipeName,
} from './types';

// ── Event data shapes (what goes in the `data` field) ─────────────────

/** Data for audio.sfx events */
export interface AudioSfxData {
  readonly src: AudioAssetPath;
  readonly volume?: Volume;
  readonly rate?: PlaybackRate;
  readonly pan?: StereoPan;
  readonly duck?: DuckPriority;
}

/** Data for audio.music.play events */
export interface AudioMusicPlayData {
  readonly src: AudioAssetPath;
  readonly volume?: Volume;
  readonly fadeIn?: DurationMs;
  readonly loop?: boolean;
}

/** Data for audio.music.stop events */
export interface AudioMusicStopData {
  readonly fadeOut?: DurationMs;
}

/** Data for audio.ambient.play events */
export interface AudioAmbientPlayData {
  readonly src: AudioAssetPath;
  readonly channel: AmbientChannel;
  readonly volume?: Volume;
  readonly fadeIn?: DurationMs;
  readonly loop?: boolean;
}

/** Data for audio.ambient.stop events */
export interface AudioAmbientStopData {
  readonly channel: AmbientChannel;
  readonly fadeOut?: DurationMs;
}

/** Data for audio.ambient.stop_all events */
export interface AudioAmbientStopAllData {
  readonly fadeOut?: DurationMs;
}

/** Data for audio.procedural events */
export interface AudioProceduralData {
  readonly recipe: ProceduralRecipeName;
  readonly params?: Readonly<Record<string, number>>;
  readonly volume?: Volume;
  readonly duration?: DurationMs;
  readonly duck?: DuckPriority;
}

/** Data for audio.effect events */
export interface AudioEffectData {
  readonly target: AudioTarget;
  readonly effect: AudioEffectType;
  readonly params: Readonly<Record<string, number>>;
  readonly transition?: DurationMs;
}

/** Data for audio.effect.clear events */
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
