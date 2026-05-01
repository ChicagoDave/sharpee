/**
 * AC-6 — Media channel mappings (ADR-163 §7).
 *
 * Per-event tests: each ADR-101 media event routes to the correct
 * channel with the correct payload, including the two ADR-163-mandated
 * renames (`channel?` → `bus?` on sound, `action` → `command` on
 * image-show hotspots) and the `onComplete` drop on animations.
 *
 * Tests run end-to-end through `produceTurnPacket` against the
 * registered media channels — no shortcut into rule internals.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  MEDIA_CHANNEL_IDS,
  produceCmgtManifest,
  produceTurnPacket,
  registerAmbientChannel,
  registerHello,
  registerMediaChannels,
  registerMediaRules,
  registerPlatformRules,
  registerStandardChannels,
  resetSession,
} from '../src';
import { MEDIA_SCENARIOS } from '@sharpee/story-channel-service-test';

import { FULL_CAPABILITIES } from './test-helpers/capabilities';

/**
 * Bootstrap a fully-graphical session with the platform standard +
 * media channels and rules registered. Story channels are added by
 * the per-test setup as needed.
 */
function bootstrap() {
  registerHello(FULL_CAPABILITIES);
  registerStandardChannels();
  registerMediaChannels();
  registerPlatformRules();
  registerMediaRules();
}

describe('AC-6 — Media channel mappings', () => {
  beforeEach(() => {
    resetSession();
  });

  // ─── Image events ────────────────────────────────────────────────

  it('media.image.show → image:<layer>', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.imageShow],
    });

    // imageShow has layer: 'main' → routes to image:main
    expect(packet.payload[MEDIA_CHANNEL_IDS.IMAGE_MAIN]).toEqual({
      src: 'rooms/west-of-house.png',
      layer: 'main',
      transition: { type: 'fade', duration: 500 },
    });
  });

  it('media.image.show renames hotspot.action → hotspot.command', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.imageShowWithHotspots],
    });

    // imageShowWithHotspots has layer: 'overlay'
    const overlay = packet.payload[MEDIA_CHANNEL_IDS.IMAGE_OVERLAY] as {
      hotspots: Array<Record<string, unknown>>;
    };

    expect(overlay).toBeDefined();
    expect(overlay.hotspots).toHaveLength(3);

    // Every hotspot has `command` (renamed from `action`); none retain `action`.
    for (const hotspot of overlay.hotspots) {
      expect(hotspot).toHaveProperty('command');
      expect(hotspot).not.toHaveProperty('action');
    }
    expect(overlay.hotspots[0]).toMatchObject({
      id: 'dial1',
      bounds: { x: 10, y: 50, w: 30, h: 30 },
      command: 'turn dial 1',
    });
  });

  it('media.image.hide emits null on image:<layer>', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    // First show, then hide — verify hide emits null on the same channel.
    produceTurnPacket({ textBlocks: [], events: [MEDIA_SCENARIOS.imageShow] });
    const hidePacket = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.imageHide],
    });

    // imageHide has layer: 'main'
    expect(hidePacket.payload).toHaveProperty(MEDIA_CHANNEL_IDS.IMAGE_MAIN);
    expect(hidePacket.payload[MEDIA_CHANNEL_IDS.IMAGE_MAIN]).toBe(null);
  });

  it('media.image.preload → image:preload (event-mode)', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.imagePreload],
    });

    expect(packet.payload[MEDIA_CHANNEL_IDS.IMAGE_PRELOAD]).toEqual({
      src: ['rooms/cave-1.png', 'rooms/cave-2.png'],
    });
  });

  // ─── Sound (channel → bus rename) ────────────────────────────────

  it('media.sound.play renames channel → bus', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.soundPlay],
    });

    const sound = packet.payload[MEDIA_CHANNEL_IDS.SOUND] as Record<string, unknown>;
    expect(sound).toEqual({
      src: 'sfx/door-open.mp3',
      bus: 'sfx',
      volume: 0.8,
    });
    expect(sound).not.toHaveProperty('channel');
  });

  it('media.sound.play without channel field is unchanged', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.soundPlayNoBus],
    });

    expect(packet.payload[MEDIA_CHANNEL_IDS.SOUND]).toEqual({
      src: 'sfx/footstep.mp3',
      volume: 0.5,
    });
  });

  // ─── Music (replace mode + null stop) ────────────────────────────

  it('media.music.play → music', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.musicPlay],
    });

    expect(packet.payload[MEDIA_CHANNEL_IDS.MUSIC]).toEqual({
      src: 'music/exploration.mp3',
      fadeIn: 1000,
      loop: true,
      volume: 0.4,
    });
  });

  it('media.music.stop emits null on music', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    produceTurnPacket({ textBlocks: [], events: [MEDIA_SCENARIOS.musicPlay] });
    const stopPacket = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.musicStop],
    });

    expect(stopPacket.payload[MEDIA_CHANNEL_IDS.MUSIC]).toBe(null);
  });

  // ─── Ambient (dynamic ambient:<id>) ──────────────────────────────

  it('media.ambient.play → ambient:<id> resolved from payload.channel', () => {
    bootstrap();
    registerAmbientChannel('wind');
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.ambientPlay],
    });

    // ambientPlay's payload.channel = 'wind' → routes to ambient:wind
    expect(packet.payload['ambient:wind']).toEqual({
      src: 'audio/wind.mp3',
      channel: 'wind',
      volume: 0.3,
      loop: true,
    });
  });

  it('media.ambient.stop emits null on ambient:<id>', () => {
    bootstrap();
    registerAmbientChannel('wind');
    produceCmgtManifest(FULL_CAPABILITIES);

    produceTurnPacket({ textBlocks: [], events: [MEDIA_SCENARIOS.ambientPlay] });
    const stopPacket = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.ambientStop],
    });

    expect(stopPacket.payload['ambient:wind']).toBe(null);
  });

  it('ambient routing to an unregistered channel id silently drops', () => {
    bootstrap();
    // No registerAmbientChannel('wind') — the rule resolves to
    // 'ambient:wind' but the channel is not registered, so nothing
    // appears in the payload.
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.ambientPlay],
    });

    expect(packet.payload).not.toHaveProperty('ambient:wind');
  });

  // ─── Animation (onComplete drop) ─────────────────────────────────

  it('media.animation.play drops onComplete', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.animationPlay],
    });

    const animation = packet.payload[MEDIA_CHANNEL_IDS.ANIMATION] as Record<string, unknown>;
    expect(animation).toEqual({
      src: 'animations/torch-flicker.json',
      layer: 'main',
      loop: true,
    });
    expect(animation).not.toHaveProperty('onComplete');
  });

  it('media.animate → animate', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.animate],
    });

    expect(packet.payload[MEDIA_CHANNEL_IDS.ANIMATE]).toEqual({
      target: { layer: 'main' },
      properties: { opacity: 0, x: 100 },
      duration: 750,
      easing: 'ease-out',
    });
  });

  // ─── Visual ──────────────────────────────────────────────────────

  it('media.transition → transition', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.transition],
    });

    expect(packet.payload[MEDIA_CHANNEL_IDS.TRANSITION]).toEqual({
      transition: { type: 'fade', duration: 500 },
    });
  });

  it('media.layout.configure → layout', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.layoutConfigure],
    });

    const layout = packet.payload[MEDIA_CHANNEL_IDS.LAYOUT] as { layout: Record<string, unknown> };
    expect(layout.layout).toMatchObject({
      main: { type: 'text', position: 'left', width: '60%' },
      graphics: { type: 'image', position: 'right', width: '40%' },
      status: { type: 'status', position: 'top', height: '32px' },
    });
  });

  it('media.clear → clear', () => {
    bootstrap();
    produceCmgtManifest(FULL_CAPABILITIES);

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.clearMain],
    });

    expect(packet.payload[MEDIA_CHANNEL_IDS.CLEAR]).toEqual({ target: 'main' });
  });

  // ─── Capability filtering ────────────────────────────────────────

  it('media channels are gated by capabilities — text-only client sees no media', () => {
    // Re-bootstrap with a text-only capability set.
    registerHello({
      text: true,
      images: false,
      animations: false,
      video: false,
      sound: false,
      music: false,
      speech: false,
      splitPane: false,
      statusBar: false,
      sidebar: false,
      clickableText: false,
      clickableImage: false,
      dragDrop: false,
      transitions: false,
      layers: false,
      customFonts: false,
    });
    registerStandardChannels();
    registerMediaChannels();
    const cmgt = produceCmgtManifest({
      text: true,
      images: false,
      animations: false,
      video: false,
      sound: false,
      music: false,
      speech: false,
      splitPane: false,
      statusBar: false,
      sidebar: false,
      clickableText: false,
      clickableImage: false,
      dragDrop: false,
      transitions: false,
      layers: false,
      customFonts: false,
    });

    const ids = cmgt.channels.map((c) => c.id);
    // No image:*, no sound, no music, no animation/animate, no
    // transition, no layout — but `clear` (ungated) appears.
    expect(ids).not.toContain(MEDIA_CHANNEL_IDS.IMAGE_MAIN);
    expect(ids).not.toContain(MEDIA_CHANNEL_IDS.SOUND);
    expect(ids).not.toContain(MEDIA_CHANNEL_IDS.MUSIC);
    expect(ids).not.toContain(MEDIA_CHANNEL_IDS.ANIMATION);
    expect(ids).not.toContain(MEDIA_CHANNEL_IDS.TRANSITION);
    expect(ids).not.toContain(MEDIA_CHANNEL_IDS.LAYOUT);
    expect(ids).toContain(MEDIA_CHANNEL_IDS.CLEAR);
    // Standard channels still present.
    expect(ids).toContain('main');
    expect(ids).toContain('location');
  });
});
