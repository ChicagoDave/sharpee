/**
 * Tests for the media `IOChannel` closures (ADR-163 §7).
 *
 * Each closure is invoked with a hand-built context plus a list of
 * media events. Asserts the return value matches the §7 mapping table,
 * including the two payload renames (sound `channel?` → `bus?`; image
 * hotspots `action` → `command`) and the `onComplete` drop on
 * `media.animation.play`.
 */

import { describe, expect, it } from 'vitest';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import {
  imageBackgroundChannel,
  imageMainChannel,
  imageOverlayChannel,
  imagePreloadChannel,
  soundChannel,
  musicChannel,
  animationChannel,
  animateChannel,
  transitionChannel,
  layoutChannel,
  clearChannel,
  createImageChannel,
  createAmbientChannel,
  imageChannelIdFromEvent,
  MEDIA_EVENT_TYPES,
} from '../../src/channels';

function makeCtx(events: ReadonlyArray<unknown>): ChannelProduceContext {
  return {
    world: undefined,
    events: events as never,
    blocks: [],
    turn: 1,
    prevValue: undefined,
  };
}

function ev(type: string, data: Record<string, unknown> = {}) {
  return { id: `e-${type}`, type, timestamp: 0, entities: {}, data };
}

// ────────────────────────────────────────────────────────────────────
//  Image layers
// ────────────────────────────────────────────────────────────────────

describe('image layer channels', () => {
  it('image:main shows the main-layer image when layer omitted', () => {
    const events = [ev(MEDIA_EVENT_TYPES.IMAGE_SHOW, { src: 'pic.png' })];
    expect(imageMainChannel.produce(makeCtx(events))).toEqual({ src: 'pic.png' });
  });

  it('image:background shows only when layer matches', () => {
    const events = [ev(MEDIA_EVENT_TYPES.IMAGE_SHOW, { layer: 'background', src: 'bg.png' })];
    expect(imageBackgroundChannel.produce(makeCtx(events))).toEqual({
      layer: 'background',
      src: 'bg.png',
    });
    expect(imageMainChannel.produce(makeCtx(events))).toBeUndefined();
  });

  it('image:overlay returns null on hide', () => {
    const events = [
      ev(MEDIA_EVENT_TYPES.IMAGE_SHOW, { layer: 'overlay', src: 'o.png' }),
      ev(MEDIA_EVENT_TYPES.IMAGE_HIDE, { layer: 'overlay' }),
    ];
    expect(imageOverlayChannel.produce(makeCtx(events))).toBeNull();
  });

  it('renames hotspot action → command in image:show payload', () => {
    const events = [
      ev(MEDIA_EVENT_TYPES.IMAGE_SHOW, {
        src: 'p.png',
        hotspots: [
          { x: 1, y: 2, action: 'press button' },
          { x: 3, y: 4 },
        ],
      }),
    ];
    const result = imageMainChannel.produce(makeCtx(events)) as {
      hotspots: Array<{ command?: string; action?: string; x?: number }>;
    };
    expect(result.hotspots[0].command).toBe('press button');
    expect(result.hotspots[0].action).toBeUndefined();
    expect(result.hotspots[1]).toEqual({ x: 3, y: 4 });
  });

  it('imageChannelIdFromEvent defaults missing layer to "main"', () => {
    expect(imageChannelIdFromEvent(ev(MEDIA_EVENT_TYPES.IMAGE_SHOW))).toBe('image:main');
    expect(
      imageChannelIdFromEvent(ev(MEDIA_EVENT_TYPES.IMAGE_HIDE, { layer: 'overlay' })),
    ).toBe('image:overlay');
  });

  it('createImageChannel builds a custom layer channel', () => {
    const portrait = createImageChannel('portrait');
    expect(portrait.id).toBe('image:portrait');
    expect(portrait.gatedBy).toBe('images');
    const events = [ev(MEDIA_EVENT_TYPES.IMAGE_SHOW, { layer: 'portrait', src: 'p.png' })];
    expect(portrait.produce(makeCtx(events))).toEqual({ layer: 'portrait', src: 'p.png' });
  });
});

describe('imagePreloadChannel', () => {
  it('forwards the preload payload', () => {
    const events = [ev(MEDIA_EVENT_TYPES.IMAGE_PRELOAD, { src: 'p.png' })];
    expect(imagePreloadChannel.produce(makeCtx(events))).toEqual({ src: 'p.png' });
  });

  it('returns undefined when no preload event fired', () => {
    expect(imagePreloadChannel.produce(makeCtx([]))).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────
//  Audio
// ────────────────────────────────────────────────────────────────────

describe('soundChannel', () => {
  it('renames channel? → bus? on the wire', () => {
    const events = [ev(MEDIA_EVENT_TYPES.SOUND_PLAY, { src: 'beep.wav', channel: 'fx' })];
    expect(soundChannel.produce(makeCtx(events))).toEqual({
      src: 'beep.wav',
      bus: 'fx',
    });
  });

  it('passes through other fields untouched', () => {
    const events = [ev(MEDIA_EVENT_TYPES.SOUND_PLAY, { src: 'beep.wav' })];
    expect(soundChannel.produce(makeCtx(events))).toEqual({ src: 'beep.wav' });
  });
});

describe('musicChannel', () => {
  it('emits the play payload', () => {
    const events = [ev(MEDIA_EVENT_TYPES.MUSIC_PLAY, { src: 'song.ogg' })];
    expect(musicChannel.produce(makeCtx(events))).toEqual({ src: 'song.ogg' });
  });

  it('emits null on stop', () => {
    expect(
      musicChannel.produce(makeCtx([ev(MEDIA_EVENT_TYPES.MUSIC_STOP)])),
    ).toBeNull();
  });

  it('stop-after-play within one turn → emits null', () => {
    const events = [
      ev(MEDIA_EVENT_TYPES.MUSIC_PLAY, { src: 'a.ogg' }),
      ev(MEDIA_EVENT_TYPES.MUSIC_STOP),
    ];
    expect(musicChannel.produce(makeCtx(events))).toBeNull();
  });

  it('play-after-stop within one turn → emits play', () => {
    const events = [
      ev(MEDIA_EVENT_TYPES.MUSIC_STOP),
      ev(MEDIA_EVENT_TYPES.MUSIC_PLAY, { src: 'b.ogg' }),
    ];
    expect(musicChannel.produce(makeCtx(events))).toEqual({ src: 'b.ogg' });
  });
});

// ────────────────────────────────────────────────────────────────────
//  Ambient
// ────────────────────────────────────────────────────────────────────

describe('createAmbientChannel', () => {
  it('emits play payloads for the matching ambient id', () => {
    const wind = createAmbientChannel('wind');
    expect(wind.id).toBe('ambient:wind');
    const events = [ev(MEDIA_EVENT_TYPES.AMBIENT_PLAY, { channel: 'wind', src: 'w.ogg' })];
    expect(wind.produce(makeCtx(events))).toEqual({ channel: 'wind', src: 'w.ogg' });
  });

  it('ignores events for other ambient ids', () => {
    const wind = createAmbientChannel('wind');
    const events = [ev(MEDIA_EVENT_TYPES.AMBIENT_PLAY, { channel: 'rain' })];
    expect(wind.produce(makeCtx(events))).toBeUndefined();
  });

  it('emits null on matching stop', () => {
    const wind = createAmbientChannel('wind');
    const events = [ev(MEDIA_EVENT_TYPES.AMBIENT_STOP, { channel: 'wind' })];
    expect(wind.produce(makeCtx(events))).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────
//  Animation / animate / transition / layout / clear
// ────────────────────────────────────────────────────────────────────

describe('animationChannel', () => {
  it('drops onComplete from the payload', () => {
    const events = [
      ev(MEDIA_EVENT_TYPES.ANIMATION_PLAY, {
        target: 'box',
        keyframes: [],
        onComplete: 'callback',
      }),
    ];
    const result = animationChannel.produce(makeCtx(events)) as Record<string, unknown>;
    expect(result.onComplete).toBeUndefined();
    expect(result.target).toBe('box');
  });
});

describe('animateChannel', () => {
  it('passes through the animate payload', () => {
    const events = [ev(MEDIA_EVENT_TYPES.ANIMATE, { target: 'foo', duration: 500 })];
    expect(animateChannel.produce(makeCtx(events))).toEqual({ target: 'foo', duration: 500 });
  });
});

describe('transitionChannel', () => {
  it('passes through the transition payload', () => {
    const events = [ev(MEDIA_EVENT_TYPES.TRANSITION, { kind: 'fade', durationMs: 250 })];
    expect(transitionChannel.produce(makeCtx(events))).toEqual({
      kind: 'fade',
      durationMs: 250,
    });
  });
});

describe('layoutChannel', () => {
  it('passes through the layout configuration', () => {
    const events = [
      ev(MEDIA_EVENT_TYPES.LAYOUT_CONFIGURE, { rows: ['status', 'main', 'input'] }),
    ];
    expect(layoutChannel.produce(makeCtx(events))).toEqual({
      rows: ['status', 'main', 'input'],
    });
  });

  it('returns undefined when no layout event fires', () => {
    expect(layoutChannel.produce(makeCtx([]))).toBeUndefined();
  });
});

describe('clearChannel', () => {
  it('emits the clear payload', () => {
    const events = [ev(MEDIA_EVENT_TYPES.CLEAR, { target: 'main' })];
    expect(clearChannel.produce(makeCtx(events))).toEqual({ target: 'main' });
  });

  it('emits an empty object when the event fires with no data', () => {
    const events = [ev(MEDIA_EVENT_TYPES.CLEAR)];
    expect(clearChannel.produce(makeCtx(events))).toEqual({});
  });

  it('returns undefined when no clear event fires', () => {
    expect(clearChannel.produce(makeCtx([]))).toBeUndefined();
  });

  it('is not capability-gated', () => {
    expect(clearChannel.gatedBy).toBeUndefined();
  });
});
