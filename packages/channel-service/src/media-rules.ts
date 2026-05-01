/**
 * @sharpee/channel-service — media routing rules
 *
 * Owner context: platform package. Routes the ten ADR-101 media event
 * types onto the channels registered by `registerMediaChannels()` per
 * ADR-163 §7's mapping table.
 *
 * Two ADR-163-mandated payload renames live in this file:
 *  - `media.sound.play`'s `channel?` field → `bus?` on the wire (avoids
 *    confusion with the wire concept of "channel").
 *  - `media.image.show`'s `hotspots[].action` field → `command` on the
 *    wire (matches the §9 synthesized-command vocabulary).
 *
 * One ADR-163-mandated payload drop:
 *  - `media.animation.play`'s `onComplete` field is removed (§9 — one-
 *    way triggers; no engine-side completion tracking).
 *
 * Hide/stop events (`media.image.hide`, `media.music.stop`,
 * `media.ambient.stop`) emit `null` as the channel value per §7 — the
 * renderer interprets `null` on a replace-mode media channel as "hide
 * / stop". The producer's null/undefined convention treats `null` as a
 * valid emission (only `undefined` skips), so the null reaches the
 * wire untouched.
 *
 * Dynamic channel ids — `image:<layer>` and `ambient:<id>` — resolve
 * from the event payload at routing time. The story must register the
 * concrete channel id (`image:portrait`, `ambient:wind`) before
 * `produceCmgtManifest` freezes registration; routing to an
 * unregistered id silently drops the contribution (the rule is inert).
 *
 * @see ADR-163 — Channel-Service Platform — decisions 7, 9
 * @see ADR-101 — Graphical Client Architecture (REPLACED) — for the
 *   media event vocabulary that folded into these rules.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { ChannelRule } from './types';
import { MEDIA_CHANNEL_IDS } from './media-channels';
import { addRules } from './registry';

/**
 * Event types from ADR-101 (now folded into channel emissions per
 * ADR-163 §7). Frozen as literal-typed constants so consumers can
 * pattern-match without hand-typed strings.
 */
export const MEDIA_EVENT_TYPES = {
  IMAGE_SHOW: 'media.image.show',
  IMAGE_HIDE: 'media.image.hide',
  IMAGE_PRELOAD: 'media.image.preload',
  SOUND_PLAY: 'media.sound.play',
  MUSIC_PLAY: 'media.music.play',
  MUSIC_STOP: 'media.music.stop',
  AMBIENT_PLAY: 'media.ambient.play',
  AMBIENT_STOP: 'media.ambient.stop',
  ANIMATION_PLAY: 'media.animation.play',
  ANIMATE: 'media.animate',
  TRANSITION: 'media.transition',
  LAYOUT_CONFIGURE: 'media.layout.configure',
  CLEAR: 'media.clear',
} as const;

export type MediaEventType =
  (typeof MEDIA_EVENT_TYPES)[keyof typeof MEDIA_EVENT_TYPES];

// ─── Channel-id resolvers ──────────────────────────────────────────────

/**
 * Resolve `image:<layer>` from an image event's payload. Falls back to
 * `'image:main'` when the payload omits a layer (matches ADR-101's
 * default-to-main convention).
 */
function imageChannelId(input: unknown): string {
  const event = input as ISemanticEvent;
  const data = event.data as { layer?: string } | undefined;
  const layer = data?.layer ?? 'main';
  return `image:${layer}`;
}

/**
 * Resolve `ambient:<channel>` from an ambient event's payload. The
 * ambient-layer field is named `channel` in ADR-101's payload (not
 * renamed by ADR-163); the wire channel id is composed from it.
 */
function ambientChannelId(input: unknown): string {
  const event = input as ISemanticEvent;
  const data = event.data as { channel?: string } | undefined;
  const layer = data?.channel ?? 'default';
  return `ambient:${layer}`;
}

// ─── Payload extractors ────────────────────────────────────────────────

/**
 * `media.sound.play` — rename `channel?` → `bus?`. Pass other fields
 * through. The rename avoids conflation with the wire "channel"
 * concept (ADR-163 §7).
 */
function extractSoundPayload(input: unknown): unknown {
  const event = input as ISemanticEvent;
  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return data;
  if (!('channel' in data)) return data;
  const { channel, ...rest } = data;
  return { ...rest, bus: channel };
}

/**
 * `media.image.show` — rename `hotspots[].action` → `hotspots[].command`.
 * Other payload fields and other hotspot fields are passed through.
 */
function extractImageShowPayload(input: unknown): unknown {
  const event = input as ISemanticEvent;
  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return data;
  const hotspots = data.hotspots;
  if (!Array.isArray(hotspots)) return data;
  return {
    ...data,
    hotspots: hotspots.map((h) => {
      if (!h || typeof h !== 'object') return h;
      const hotspot = h as Record<string, unknown>;
      if (!('action' in hotspot)) return hotspot;
      const { action, ...rest } = hotspot;
      return { ...rest, command: action };
    }),
  };
}

/**
 * `media.animation.play` — drop `onComplete`. ADR-163 §9 declares
 * triggers one-way; the engine does not track UI completion, so the
 * field has no semantic carrier on the wire.
 */
function extractAnimationPlayPayload(input: unknown): unknown {
  const event = input as ISemanticEvent;
  const data = event.data as Record<string, unknown> | undefined;
  if (!data) return data;
  if (!('onComplete' in data)) return data;
  const { onComplete: _drop, ...rest } = data;
  return rest;
}

/**
 * Hide/stop extractor — emits `null` as the channel value. Used by
 * `media.image.hide`, `media.music.stop`, and `media.ambient.stop` per
 * ADR-163 §7. The producer treats `null` as a valid emission (only
 * `undefined` skips), so the null propagates to the wire.
 */
function extractNull(): unknown {
  return null;
}

// ─── Rule set ──────────────────────────────────────────────────────────

/**
 * Default media routing rules covering the 10 ADR-101 event types
 * mapped to the 11 platform-registered media channels (plus the two
 * dynamic channel families `image:<layer>` and `ambient:<id>` resolved
 * at routing time).
 *
 * All rules use the default priority (0). Stories override per-event
 * routing by registering at higher priority.
 *
 * Routing to a dynamic channel that the story has not registered
 * silently drops the contribution. This is intentional: stories opt
 * into custom layers by registering the concrete channel id, and
 * unregistered ids represent "this surface does not present this layer."
 */
export const mediaRules: ReadonlyArray<ChannelRule> = [
  // ─── Image events ────────────────────────────────────────────────
  {
    when: { eventType: MEDIA_EVENT_TYPES.IMAGE_SHOW },
    emit: { channel: imageChannelId, extract: extractImageShowPayload },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.IMAGE_HIDE },
    emit: { channel: imageChannelId, extract: extractNull },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.IMAGE_PRELOAD },
    emit: { channel: MEDIA_CHANNEL_IDS.IMAGE_PRELOAD },
  },

  // ─── Audio events ────────────────────────────────────────────────
  {
    when: { eventType: MEDIA_EVENT_TYPES.SOUND_PLAY },
    emit: { channel: MEDIA_CHANNEL_IDS.SOUND, extract: extractSoundPayload },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.MUSIC_PLAY },
    emit: { channel: MEDIA_CHANNEL_IDS.MUSIC },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.MUSIC_STOP },
    emit: { channel: MEDIA_CHANNEL_IDS.MUSIC, extract: extractNull },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.AMBIENT_PLAY },
    emit: { channel: ambientChannelId },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.AMBIENT_STOP },
    emit: { channel: ambientChannelId, extract: extractNull },
  },

  // ─── Animation events ────────────────────────────────────────────
  {
    when: { eventType: MEDIA_EVENT_TYPES.ANIMATION_PLAY },
    emit: { channel: MEDIA_CHANNEL_IDS.ANIMATION, extract: extractAnimationPlayPayload },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.ANIMATE },
    emit: { channel: MEDIA_CHANNEL_IDS.ANIMATE },
  },

  // ─── Visual events ───────────────────────────────────────────────
  {
    when: { eventType: MEDIA_EVENT_TYPES.TRANSITION },
    emit: { channel: MEDIA_CHANNEL_IDS.TRANSITION },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.LAYOUT_CONFIGURE },
    emit: { channel: MEDIA_CHANNEL_IDS.LAYOUT },
  },
  {
    when: { eventType: MEDIA_EVENT_TYPES.CLEAR },
    emit: { channel: MEDIA_CHANNEL_IDS.CLEAR },
  },
];

/**
 * Add the default media routing rules to the current session.
 *
 * Called by the consumer's bootstrap path after `registerMediaChannels`
 * and `registerPlatformRules`, before story init runs. Stories then
 * register higher-priority rules to override per-event routing.
 */
export function registerMediaRules(): void {
  addRules(mediaRules);
}
