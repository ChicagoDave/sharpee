/**
 * AC-7 — Synthesized command from hotspot click (ADR-163 §9).
 *
 * A renderer that receives an `image:<layer>` payload with hotspots
 * and simulates a click on a hotspot emits a `CommandPacket`
 * indistinguishable from a typed command. Tests run against the
 * platform's wire types in isolation — no engine, no parser, no
 * transport.
 *
 * Also verifies the AC-6 hotspot rename (`action` → `command`) is
 * honored end-to-end: routing through `produceTurnPacket` produces a
 * payload the synthesis helper can consume directly.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  MEDIA_CHANNEL_IDS,
  produceCmgtManifest,
  produceTurnPacket,
  registerHello,
  registerMediaChannels,
  registerMediaRules,
  registerPlatformRules,
  registerStandardChannels,
  resetSession,
} from '../src';
import type { CommandPacket } from '../src/wire';
import { MEDIA_SCENARIOS } from '@sharpee/story-channel-service-test';

import { FULL_CAPABILITIES } from './test-helpers/capabilities';
import {
  hitTest,
  synthesizeHotspotCommand,
  type ImagePayloadWithHotspots,
} from './test-helpers/hotspot';

describe('AC-7 — Synthesized command from hotspot click', () => {
  beforeEach(() => {
    resetSession();
    registerHello(FULL_CAPABILITIES);
    registerStandardChannels();
    registerMediaChannels();
    registerPlatformRules();
    registerMediaRules();
    produceCmgtManifest(FULL_CAPABILITIES);
  });

  /**
   * Drive the full path: emit the imageShowWithHotspots event through
   * the producer, pull the resulting `image:overlay` payload, and let
   * the renderer-side helper synthesize commands from clicks.
   */
  function getOverlayPayload(): ImagePayloadWithHotspots {
    const packet = produceTurnPacket({
      textBlocks: [],
      events: [MEDIA_SCENARIOS.imageShowWithHotspots],
    });
    const overlay = packet.payload[MEDIA_CHANNEL_IDS.IMAGE_OVERLAY] as ImagePayloadWithHotspots;
    expect(overlay).toBeDefined();
    return overlay;
  }

  it('hotspot payload uses `command` not `action` (AC-6 rename feeds AC-7)', () => {
    const overlay = getOverlayPayload();
    expect(overlay.hotspots).toBeDefined();
    expect(overlay.hotspots).toHaveLength(3);
    for (const h of overlay.hotspots!) {
      expect(h).toHaveProperty('command');
      expect(h).not.toHaveProperty('action');
    }
  });

  it('hit-test resolves a click inside a hotspot to that hotspot', () => {
    const overlay = getOverlayPayload();
    // dial1 bounds: { x: 10, y: 50, w: 30, h: 30 } → covers (10..40, 50..80)
    const hit = hitTest(overlay, { x: 25, y: 65 });
    expect(hit?.id).toBe('dial1');
    expect(hit?.command).toBe('turn dial 1');
  });

  it('hit-test outside any hotspot returns null', () => {
    const overlay = getOverlayPayload();
    expect(hitTest(overlay, { x: 200, y: 200 })).toBeNull();
    expect(hitTest(overlay, { x: 5, y: 5 })).toBeNull();
  });

  it('synthesizes a CommandPacket for a hotspot click', () => {
    const overlay = getOverlayPayload();
    const packet = synthesizeHotspotCommand(overlay, { x: 100, y: 65 });

    // dial3 bounds: { x: 90, y: 50, w: 30, h: 30 } → covers (90..120, 50..80)
    expect(packet).not.toBeNull();
    expect(packet!.kind).toBe('command');
    expect(packet!.text).toBe('turn dial 3');
  });

  it('synthesized packet shape is structurally a CommandPacket — no extra fields', () => {
    const overlay = getOverlayPayload();
    const packet = synthesizeHotspotCommand(overlay, { x: 25, y: 65 })!;

    // The packet has exactly the two required CommandPacket fields:
    // 'kind' and 'text'. A typed command would produce the same shape.
    expect(Object.keys(packet).sort()).toEqual(['kind', 'text']);

    // Type-level conformance: assignable to CommandPacket.
    const typed: CommandPacket = packet;
    expect(typed.kind).toBe('command');
  });

  it('a click that misses every hotspot synthesizes no packet', () => {
    const overlay = getOverlayPayload();
    expect(synthesizeHotspotCommand(overlay, { x: 200, y: 200 })).toBeNull();
  });

  it('hotspot click is indistinguishable from a typed command', () => {
    const overlay = getOverlayPayload();
    const synthesized = synthesizeHotspotCommand(overlay, { x: 25, y: 65 })!;
    const typed: CommandPacket = { kind: 'command', text: 'turn dial 1' };

    // Same shape, same payload, same wire surface — the engine's
    // parser cannot tell which source produced this.
    expect(synthesized).toEqual(typed);
  });
});
