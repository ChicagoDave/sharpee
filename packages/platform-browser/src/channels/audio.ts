/**
 * @sharpee/platform-browser/channels/audio — `sound`, `music`,
 * `ambient:*` channel renderers.
 *
 * Owner context: browser default. Per ADR-165 §8, audio channels
 * delegate to the platform's `AudioManager` (the existing Web Audio
 * orchestrator). The renderer translates channel-emission shapes into
 * the legacy `audio.*` event vocabulary that `AudioManager` already
 * understands, so we do not duplicate the playback machinery.
 *
 * Channel mapping (ADR-163 §7):
 *  - `sound` (event, json with `bus?`) → `audio.sfx`.
 *  - `music` (replace, json) → `audio.music.play` (object) or
 *    `audio.music.stop` (null).
 *  - `ambient:<id>` (replace, json) → `audio.ambient.play` (object)
 *    or `audio.ambient.stop` (null), with `channel: id` injected.
 *
 * The `AudioManager` instance is supplied by the caller (typically
 * `BrowserClient`) so the same instance handles both legacy and
 * channel-driven audio events.
 */

import type { ChannelRenderer } from '@sharpee/channel-service';

/**
 * Minimal `AudioManager` surface this module depends on. The full
 * `AudioManager` class implements this; tests pass a mock.
 */
export interface AudioManagerLike {
  handleAudioEvent(event: { type: string; data: unknown }): void;
}

/**
 * `sound` channel renderer — event-mode. Forwards the payload (with
 * the `bus` rename already applied by stdlib's media channel) to
 * `AudioManager` as an `audio.sfx` event.
 */
export function createSoundChannelRenderer(
  audio: AudioManagerLike,
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      audio.handleAudioEvent({ type: 'audio.sfx', data: value });
    },
  };
}

/**
 * `music` channel renderer — replace-mode. Object value → play; null
 * → stop. Undefined returns are filtered by the dispatcher (sparse
 * channels stay quiet on no-change).
 */
export function createMusicChannelRenderer(
  audio: AudioManagerLike,
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (value === null) {
        audio.handleAudioEvent({ type: 'audio.music.stop', data: {} });
        return;
      }
      if (!value || typeof value !== 'object') return;
      audio.handleAudioEvent({ type: 'audio.music.play', data: value });
    },
  };
}

/**
 * Construct an `ambient:<id>` channel renderer. Stories register one
 * per ambient layer they use (typically via stdlib's
 * `createAmbientChannel` builder on the producer side).
 *
 * @param audio — the `AudioManager` instance.
 * @param ambientId — the suffix portion of the channel id
 *   (e.g., `'wind'` for the `ambient:wind` channel).
 */
export function createAmbientChannelRenderer(
  audio: AudioManagerLike,
  ambientId: string,
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (value === null) {
        audio.handleAudioEvent({
          type: 'audio.ambient.stop',
          data: { channel: ambientId },
        });
        return;
      }
      if (!value || typeof value !== 'object') return;
      audio.handleAudioEvent({
        type: 'audio.ambient.play',
        data: { channel: ambientId, ...(value as Record<string, unknown>) },
      });
    },
  };
}
