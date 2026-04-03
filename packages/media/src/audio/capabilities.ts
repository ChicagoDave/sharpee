/**
 * Audio capability negotiation and player preference types.
 *
 * Public interface: AudioCapabilities (declared by clients at session start)
 * and AudioPreferences (player settings persisted by clients).
 *
 * Owner context: @sharpee/media (ADR-138)
 */

import type { Volume, AudioFormat } from './types';

/**
 * Audio capabilities declared by the client at session start.
 * Stories can check these before emitting audio events to avoid
 * sending events the client cannot render.
 */
export interface AudioCapabilities {
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

/**
 * Player audio preferences, persisted to localStorage by the client.
 * Player settings override story-specified volumes.
 */
export interface AudioPreferences {
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
