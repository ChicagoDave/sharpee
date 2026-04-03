/**
 * Common audio primitive types for the Sharpee media subsystem.
 *
 * Public interface: Type aliases used throughout all audio event interfaces,
 * the AudioRegistry, and capability negotiation.
 *
 * Owner context: @sharpee/media (ADR-138)
 */

/** Volume level: 0.0 (silent) to 1.0 (full) */
export type Volume = number;

/** Duration in milliseconds */
export type DurationMs = number;

/** Stereo pan: -1.0 (hard left) to 1.0 (hard right), 0.0 = center */
export type StereoPan = number;

/** Playback rate: 1.0 = normal, 0.5 = half speed, 2.0 = double speed */
export type PlaybackRate = number;

/** Asset path relative to the story's assets/audio/ directory */
export type AudioAssetPath = string;

/** Named ambient channel identifier (e.g., 'wind', 'machinery', 'dripping') */
export type AmbientChannel = string;

/** Ducking priority: 0 (none) to 3 (aggressive). See AudioSfxEvent.duck. */
export type DuckPriority = 0 | 1 | 2 | 3;

/**
 * Audio mix target — identifies where an effect or volume change applies.
 * - 'master': affects all audio output
 * - 'sfx': affects all sound effects
 * - 'music': affects the music track
 * - 'ambient:{channel}': affects a specific ambient channel
 */
export type AudioTarget = 'master' | 'sfx' | 'music' | `ambient:${string}`;

/** Effect types that map to Web Audio API nodes */
export type AudioEffectType =
  | 'reverb'      // ConvolverNode — params: decay, mix
  | 'lowpass'     // BiquadFilterNode — params: frequency, q
  | 'highpass'    // BiquadFilterNode — params: frequency, q
  | 'distortion'  // WaveShaperNode — params: amount
  | 'delay';      // DelayNode — params: time, feedback, mix

/** Audio file formats */
export type AudioFormat = 'mp3' | 'ogg' | 'wav' | 'aac' | 'opus' | 'webm';

/**
 * Built-in recipe names that clients SHOULD support.
 * Stories may use any string — unknown recipes are silently skipped.
 */
export type BuiltinRecipeName =
  | 'beep'        // Simple tone (params: frequency, duration)
  | 'alert'       // Repeating alert (params: frequency, interval, count)
  | 'sweep-up'    // Rising frequency (params: startFreq, endFreq, duration)
  | 'sweep-down'  // Falling frequency (params: startFreq, endFreq, duration)
  | 'static'      // Noise burst (params: color [0=white, 1=pink], duration)
  | 'hum';        // Continuous low tone (params: frequency, harmonics)

/** Recipe name: built-in or story-defined */
export type ProceduralRecipeName = BuiltinRecipeName | (string & {});
