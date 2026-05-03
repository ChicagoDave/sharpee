/**
 * @sharpee/stdlib/channels — media `IOChannel` definitions.
 *
 * Owner context: stdlib language layer. The platform media-channel
 * vocabulary from ADR-163 §7. Each channel is capability-gated; the
 * `ChannelService` filters gated channels out of the per-client
 * manifest using `IOChannel.gatedBy`.
 *
 * Closures listen for the corresponding `media.*` event type on the
 * turn's `events` array and project the event's payload (with the two
 * ADR-163 §7 renames: `media.sound.play` `channel?` → `bus?`;
 * `media.image.show` hotspots `action` → `command`; and the §9 drop
 * of `media.animation.play.onComplete`).
 *
 * Hide/stop events (`media.image.hide`, `media.music.stop`,
 * `media.ambient.stop`) emit `null` on the corresponding replace-mode
 * media channel — the renderer interprets `null` as "hide / stop".
 *
 * **Dynamic channels** — `image:<layer>` (custom layer beyond
 * `image:background`/`image:main`/`image:overlay`) and `ambient:<id>`
 * are NOT registered here. Stories register them through their own
 * `Story.registerChannels` hook; `createAmbientChannel(id)` and
 * `createImageChannel(layer)` are convenience builders.
 *
 * @see ADR-163 — Channel-Service Platform — §6, §7, §9
 */

import type { IOChannel, ChannelProduceContext } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

/**
 * Media event types from ADR-101 (folded into channel emissions per
 * ADR-163 §7).
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

/**
 * Find the most recent event of the given type in this turn's events,
 * or `undefined` if none. Last-wins per turn (replace mode) — when an
 * action fires the same media event twice in one turn, the renderer
 * sees the second one.
 */
function lastEventOfType(
  ctx: ChannelProduceContext,
  type: string,
): ISemanticEvent | undefined {
  let last: ISemanticEvent | undefined;
  for (const event of ctx.events) {
    if (event.type === type) last = event;
  }
  return last;
}

/**
 * Iterate every event of the given type — used by event-mode media
 * channels where multiple firings within one turn collapse to the
 * last (event channels carry the closure's last return value per
 * ChannelService). For these the iteration order is irrelevant —
 * `lastEventOfType` is sufficient.
 */
const _firstEventOfType = lastEventOfType;
void _firstEventOfType;

/**
 * `media.sound.play` payload rename: `channel?` field on the event
 * becomes `bus?` on the wire. Other fields pass through. The rename
 * avoids confusion with the wire's "channel" concept (ADR-163 §7).
 */
function renameSoundChannelToBus(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const record = data as Record<string, unknown>;
  if (!('channel' in record)) return record;
  const { channel, ...rest } = record;
  return { ...rest, bus: channel };
}

/**
 * `media.image.show` hotspot rename: `hotspots[].action` → `command`
 * (ADR-163 §7). Other hotspot and payload fields pass through.
 */
function renameImageHotspotsActionToCommand(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const record = data as Record<string, unknown>;
  const hotspots = record.hotspots;
  if (!Array.isArray(hotspots)) return record;
  return {
    ...record,
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
 * `media.animation.play` payload drop: remove `onComplete`. ADR-163
 * §9 declares triggers one-way; the engine doesn't track UI
 * completion, so the field has no semantic carrier.
 */
function dropOnComplete(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const record = data as Record<string, unknown>;
  if (!('onComplete' in record)) return record;
  const { onComplete: _drop, ...rest } = record;
  return rest;
}

/**
 * Resolve the `image:<layer>` channel id from a `media.image.show` /
 * `media.image.hide` event payload. Defaults to `image:main`.
 */
export function imageChannelIdFromEvent(event: ISemanticEvent): string {
  const data = event.data as { layer?: string } | undefined;
  const layer = data?.layer ?? 'main';
  return `image:${layer}`;
}

// ────────────────────────────────────────────────────────────────────
//  Standard image-layer channels (image:background / :main / :overlay)
// ────────────────────────────────────────────────────────────────────

function imageLayerProduce(layer: string) {
  const channelId = `image:${layer}`;
  return (ctx: ChannelProduceContext): unknown => {
    let lastShow: ISemanticEvent | undefined;
    let lastHide: ISemanticEvent | undefined;
    for (const event of ctx.events) {
      if (event.type === MEDIA_EVENT_TYPES.IMAGE_SHOW) {
        if (imageChannelIdFromEvent(event) === channelId) lastShow = event;
      } else if (event.type === MEDIA_EVENT_TYPES.IMAGE_HIDE) {
        if (imageChannelIdFromEvent(event) === channelId) lastHide = event;
      }
    }
    // Hide-after-show within the same turn → hide wins.
    if (lastHide && (!lastShow || ctx.events.indexOf(lastHide) > ctx.events.indexOf(lastShow))) {
      return null;
    }
    if (lastShow) return renameImageHotspotsActionToCommand(lastShow.data);
    return undefined;
  };
}

/**
 * Construct an `image:<layer>` `IOChannel`. Standard layers
 * (`background`, `main`, `overlay`) are pre-registered; stories add
 * additional layers via this builder.
 */
export function createImageChannel(layer: string): IOChannel {
  return {
    id: `image:${layer}`,
    contentType: 'json',
    mode: 'replace',
    emit: 'always',
    gatedBy: 'images',
    produce: imageLayerProduce(layer),
  };
}

export const imageBackgroundChannel: IOChannel = createImageChannel('background');
export const imageMainChannel: IOChannel = createImageChannel('main');
export const imageOverlayChannel: IOChannel = createImageChannel('overlay');

/**
 * `image:preload` — event-mode preload trigger. Renderers download
 * the asset; not displayed.
 */
export const imagePreloadChannel: IOChannel = {
  id: 'image:preload',
  contentType: 'json',
  mode: 'event',
  emit: 'sparse',
  gatedBy: 'images',
  produce: (ctx) => {
    const event = lastEventOfType(ctx, MEDIA_EVENT_TYPES.IMAGE_PRELOAD);
    return event ? event.data : undefined;
  },
};

// ────────────────────────────────────────────────────────────────────
//  Audio channels
// ────────────────────────────────────────────────────────────────────

/**
 * `sound` — event-mode sound effect.
 */
export const soundChannel: IOChannel = {
  id: 'sound',
  contentType: 'json',
  mode: 'event',
  emit: 'sparse',
  gatedBy: 'sound',
  produce: (ctx) => {
    const event = lastEventOfType(ctx, MEDIA_EVENT_TYPES.SOUND_PLAY);
    if (!event) return undefined;
    return renameSoundChannelToBus(event.data);
  },
};

/**
 * `music` — replace-mode music track. `null` emission (from
 * `media.music.stop`) signals "stop".
 */
export const musicChannel: IOChannel = {
  id: 'music',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  gatedBy: 'music',
  produce: (ctx) => {
    let lastPlay: ISemanticEvent | undefined;
    let lastStop: ISemanticEvent | undefined;
    for (const event of ctx.events) {
      if (event.type === MEDIA_EVENT_TYPES.MUSIC_PLAY) lastPlay = event;
      else if (event.type === MEDIA_EVENT_TYPES.MUSIC_STOP) lastStop = event;
    }
    if (lastStop && (!lastPlay || ctx.events.indexOf(lastStop) > ctx.events.indexOf(lastPlay))) {
      return null;
    }
    if (lastPlay) return lastPlay.data;
    return undefined;
  },
};

// ────────────────────────────────────────────────────────────────────
//  Ambient channels — dynamic, story-registered
// ────────────────────────────────────────────────────────────────────

/**
 * Construct an `ambient:<id>` `IOChannel`. Ambient channels are
 * inherently story-defined (ADR-163 §7) — the platform has no
 * predetermined ambient ids. Stories call this once per ambient
 * layer they need.
 *
 * @param ambientId — suffix portion (e.g., `'wind'` registers
 *   `ambient:wind`).
 */
export function createAmbientChannel(ambientId: string): IOChannel {
  const channelId = `ambient:${ambientId}`;
  return {
    id: channelId,
    contentType: 'json',
    mode: 'replace',
    emit: 'always',
    gatedBy: 'sound',
    produce: (ctx) => {
      let lastPlay: ISemanticEvent | undefined;
      let lastStop: ISemanticEvent | undefined;
      for (const event of ctx.events) {
        const data = event.data as { channel?: string } | undefined;
        if (data?.channel !== ambientId) continue;
        if (event.type === MEDIA_EVENT_TYPES.AMBIENT_PLAY) lastPlay = event;
        else if (event.type === MEDIA_EVENT_TYPES.AMBIENT_STOP) lastStop = event;
      }
      if (lastStop && (!lastPlay || ctx.events.indexOf(lastStop) > ctx.events.indexOf(lastPlay))) {
        return null;
      }
      if (lastPlay) return lastPlay.data;
      return undefined;
    },
  };
}

// ────────────────────────────────────────────────────────────────────
//  Animation / transition / layout / clear
// ────────────────────────────────────────────────────────────────────

/**
 * `animation` — event-mode CSS-style animation. Drops `onComplete`
 * per ADR-163 §9.
 */
export const animationChannel: IOChannel = {
  id: 'animation',
  contentType: 'json',
  mode: 'event',
  emit: 'sparse',
  gatedBy: 'animations',
  produce: (ctx) => {
    const event = lastEventOfType(ctx, MEDIA_EVENT_TYPES.ANIMATION_PLAY);
    if (!event) return undefined;
    return dropOnComplete(event.data);
  },
};

/**
 * `animate` — event-mode generic animation directive.
 */
export const animateChannel: IOChannel = {
  id: 'animate',
  contentType: 'json',
  mode: 'event',
  emit: 'sparse',
  gatedBy: 'animations',
  produce: (ctx) => {
    const event = lastEventOfType(ctx, MEDIA_EVENT_TYPES.ANIMATE);
    return event ? event.data : undefined;
  },
};

/**
 * `transition` — event-mode scene transition.
 */
export const transitionChannel: IOChannel = {
  id: 'transition',
  contentType: 'json',
  mode: 'event',
  emit: 'sparse',
  gatedBy: 'transitions',
  produce: (ctx) => {
    const event = lastEventOfType(ctx, MEDIA_EVENT_TYPES.TRANSITION);
    return event ? event.data : undefined;
  },
};

/**
 * `layout` — replace-mode layout configuration. Persistent across
 * mid-session joins so a late-joining renderer sees the current
 * layout without waiting for a re-emission.
 */
export const layoutChannel: IOChannel = {
  id: 'layout',
  contentType: 'json',
  mode: 'replace',
  emit: 'always',
  gatedBy: 'splitPane',
  produce: (ctx) => {
    const event = lastEventOfType(ctx, MEDIA_EVENT_TYPES.LAYOUT_CONFIGURE);
    return event ? event.data : undefined;
  },
};

/**
 * `clear` — event-mode truncation signal. Operates on append-mode
 * channels (notably `main`); ungated because every renderer needs to
 * be able to reset accumulated prose.
 */
export const clearChannel: IOChannel = {
  id: 'clear',
  contentType: 'json',
  mode: 'event',
  emit: 'sparse',
  // Intentionally not gated — clear must be available on every surface.
  produce: (ctx) => {
    const event = lastEventOfType(ctx, MEDIA_EVENT_TYPES.CLEAR);
    return event ? (event.data ?? {}) : undefined;
  },
};

/**
 * Static media channels in iteration order — the ones the platform
 * pre-registers regardless of story. Dynamic image layers (beyond
 * the three above) and ambient channels are story-registered.
 */
export const MEDIA_CHANNELS: ReadonlyArray<IOChannel> = [
  imagePreloadChannel,
  imageBackgroundChannel,
  imageMainChannel,
  imageOverlayChannel,
  soundChannel,
  musicChannel,
  animationChannel,
  animateChannel,
  transitionChannel,
  layoutChannel,
  clearChannel,
];

/**
 * Channel id literals for the static media set.
 */
export const MEDIA_CHANNEL_IDS = {
  IMAGE_PRELOAD: 'image:preload',
  IMAGE_BACKGROUND: 'image:background',
  IMAGE_MAIN: 'image:main',
  IMAGE_OVERLAY: 'image:overlay',
  SOUND: 'sound',
  MUSIC: 'music',
  ANIMATION: 'animation',
  ANIMATE: 'animate',
  TRANSITION: 'transition',
  LAYOUT: 'layout',
  CLEAR: 'clear',
} as const;

export type MediaChannelId =
  (typeof MEDIA_CHANNEL_IDS)[keyof typeof MEDIA_CHANNEL_IDS];
