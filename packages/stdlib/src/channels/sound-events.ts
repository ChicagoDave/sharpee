/**
 * @sharpee/stdlib/channels — spatial sound channel (ADR-172 Phase 5).
 *
 * Owner context: stdlib language layer. Defines:
 *
 *  - `SOUND_EVENT_TYPES` — semantic-event type constants the engine's
 *    sound dispatcher (Phase 6) emits when the propagation function
 *    delivers an `AudibilityEvent` to a listener.
 *  - `audibilityChannel` — the `IOChannel` that filters those events
 *    out of the per-turn event stream and projects their payloads.
 *
 * **Channel id is `'audibility'`, not `'sound'`.** The `'sound'` id is
 * reserved by ADR-163 for the media-cue channel (`media.sound.play`
 * payloads). ADR-172's per-listener audibility events are a distinct
 * concept (perception of a propagated sound, with prose+audio render
 * branches) so they ride a distinct channel id.
 *
 * The channel is **not** capability-gated. Per ADR-172 §Channel routing,
 * both text-only and audio-capable clients consume audibility events:
 * text-only renders descriptive prose ("muffled voices to the north"),
 * audio-capable additionally plays a cue at a tier-mapped playback
 * volume. The wire shape is the `AudibilityEvent`; clients render what
 * they can.
 *
 * @see ADR-172 — Spatial Sound Propagation §Channel routing
 * @see ADR-163 — Channel-Service Platform §6, §7 (closure-per-channel)
 */

import type { IOChannel } from '@sharpee/if-domain';
import type { IAudibilityEvent } from '@sharpee/if-domain';

/**
 * Semantic-event types emitted by the sound subsystem. Phase 6's
 * dispatcher fires `AUDIBILITY_HEARD` once per listener per propagated
 * sound; the event's `data` field carries the listener-specific
 * `IAudibilityEvent` payload.
 */
export const SOUND_EVENT_TYPES = {
  /**
   * A listener perceived a propagated sound. Event `data` is an
   * `IAudibilityEvent` (per-listener tier, source-room, optional
   * crossing wall, content if content-bearing).
   */
  AUDIBILITY_HEARD: 'sound.audibility.heard',
} as const;

export type SoundEventType = typeof SOUND_EVENT_TYPES[keyof typeof SOUND_EVENT_TYPES];

/**
 * `audibility` — append-mode channel carrying every `AudibilityEvent`
 * delivered to listeners during the turn just executed.
 *
 * Mode is `append` because a single turn may produce multiple
 * `AUDIBILITY_HEARD` events (multiple emissions × multiple listeners
 * after dispatcher fan-out in Phase 6). Each turn's projected value is
 * the array of newly-heard events; quiet turns emit nothing under the
 * `sparse` policy.
 *
 * Renderers consume per their capability:
 *  - text-only — language layer maps `(kind, audibilityTier)` to
 *    descriptive prose (see `sound-messages` in lang-{locale}).
 *  - audio-capable — optionally plays an audio cue per the existing
 *    Web Audio infrastructure (ADR-169), playback volume mapped from
 *    `audibilityTier`.
 */
export const audibilityChannel: IOChannel<IAudibilityEvent> = {
  id: 'audibility',
  contentType: 'json',
  mode: 'append',
  emit: 'sparse',
  produce: (ctx) => {
    const heard: IAudibilityEvent[] = [];
    for (const event of ctx.events) {
      if (event.type !== SOUND_EVENT_TYPES.AUDIBILITY_HEARD) continue;
      const data = event.data as IAudibilityEvent | undefined;
      if (!data) continue;
      heard.push(data);
    }
    return heard.length > 0 ? heard : undefined;
  },
};

/**
 * Sound-subsystem channels. Currently a single entry; the constant
 * exists to match the `STANDARD_CHANNELS` / `MEDIA_CHANNELS`
 * registration pattern and to give future sound-related channels a
 * stable bucket.
 */
export const SOUND_CHANNELS: ReadonlyArray<IOChannel> = [audibilityChannel];

export const SOUND_CHANNEL_IDS = ['audibility'] as const;
export type SoundChannelId = typeof SOUND_CHANNEL_IDS[number];
