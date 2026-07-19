/**
 * Audio module barrel — re-exports all audio types, events, capabilities,
 * registry merging, and the AudioRegistry class.
 *
 * Public interface: Everything needed by stories and clients to work
 * with Sharpee audio.
 *
 * Owner context: @sharpee/media (ADR-138)
 */

export type {
  Volume,
  DurationMs,
  StereoPan,
  PlaybackRate,
  AudioAssetPath,
  AmbientChannel,
  DuckPriority,
  AudioTarget,
  AudioEffectType,
  AudioFormat,
  BuiltinRecipeName,
  ProceduralRecipeName,
} from './types.js';

export type {
  AudioEventBase,
  AudioSfxEvent,
  AudioMusicPlayEvent,
  AudioMusicStopEvent,
  AudioAmbientPlayEvent,
  AudioAmbientStopEvent,
  AudioAmbientStopAllEvent,
  AudioProceduralEvent,
  AudioEffectEvent,
  AudioEffectClearEvent,
  AudioEvent,
} from './events.js';

export { isAudioEvent } from './events.js';

export type {
  AudioCapabilities,
  AudioPreferences,
} from './capabilities.js';

export type {
  AudioSfxData,
  AudioMusicPlayData,
  AudioMusicStopData,
  AudioAmbientPlayData,
  AudioAmbientStopData,
  AudioAmbientStopAllData,
  AudioProceduralData,
  AudioEffectData,
  AudioEffectClearData,
} from './registry-merge.js';

// Side-effect import: activates declaration merging for audio event keys
import './registry-merge.js';

export type {
  AudioCue,
  VariationPool,
  DuckingConfig,
  RoomAtmosphere,
  FadeDefaults,
} from './audio-registry.js';

export { AudioRegistry, AtmosphereBuilder } from './audio-registry.js';
