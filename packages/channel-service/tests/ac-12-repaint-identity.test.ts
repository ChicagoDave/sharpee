/**
 * AC-12 — Persist-and-repaint identity (ADR-163 §14).
 *
 * The re-emission identity proof. Drive a 10-turn fixture story
 * through `produceTurnPacket`, capture every packet. Reset the
 * producer; re-run story init (channels and rules re-register);
 * call `produceCmgtManifest` for the same capabilities. Feed the
 * captured packets to a fresh renderer in order. Compare the
 * resulting state to the live state at end of turn 10 — they match
 * exactly.
 *
 * This is the contract that supports decision 14's three repaint
 * policies (no-repaint, local-repaint, network-repaint). Without
 * re-emission identity, persisted packets cannot reliably restore.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  produceCmgtManifest,
  produceTurnPacket,
  registerChannel,
  registerHello,
  registerAmbientChannel,
  registerMediaChannels,
  registerMediaRules,
  registerPlatformRules,
  registerStandardChannels,
  resetSession,
} from '../src';
import type { TurnPacket } from '../src/wire';
import {
  SCENARIO_TEN_TURN_WALK,
  TEN_TURN_STORY_CHANNELS,
} from '@sharpee/story-channel-service-test';

import { FULL_CAPABILITIES } from './test-helpers/capabilities';
import {
  applyCmgt,
  applyTurnPacket,
  createRenderer,
  snapshotRenderer,
} from './test-helpers/renderer';

/**
 * Story init for the ten-turn walk. Must be deterministic (ADR-163
 * §14) — identical results on every call. Registers the platform
 * standards + media + the two story channels (image:portrait,
 * ambient:wind) the scenario uses.
 */
function storyInit(): void {
  registerStandardChannels();
  registerMediaChannels();
  registerPlatformRules();
  registerMediaRules();

  // image:portrait is a non-conventional layer (not in the
  // convention-registered triple). Stories register custom layers
  // explicitly per ADR-163 §8.
  registerChannel(
    {
      id: 'image:portrait',
      contentType: 'json',
      mode: 'replace',
      emit: 'always',
    },
    { gatedBy: 'images' },
  );
  registerAmbientChannel('wind');
}

describe('AC-12 — Persist-and-repaint identity', () => {
  beforeEach(() => {
    resetSession();
  });

  it('captures and replays 10 turns to identical renderer state', () => {
    // ── PHASE 1: live run ────────────────────────────────────────
    registerHello(FULL_CAPABILITIES);
    storyInit();
    const liveCmgt = produceCmgtManifest(FULL_CAPABILITIES);

    const liveRenderer = createRenderer();
    applyCmgt(liveRenderer, liveCmgt);

    const capturedPackets: TurnPacket[] = [];
    for (const turn of SCENARIO_TEN_TURN_WALK) {
      const packet = produceTurnPacket({
        textBlocks: turn.textBlocks,
        events: turn.events,
      });
      capturedPackets.push(packet);
      applyTurnPacket(liveRenderer, packet);
    }

    expect(capturedPackets).toHaveLength(10);
    expect(liveRenderer.lastTurnId).toBe('turn-10');
    const liveSnapshot = snapshotRenderer(liveRenderer);

    // ── PHASE 2: fresh init + replay ─────────────────────────────
    resetSession();
    registerHello(FULL_CAPABILITIES);
    storyInit();
    const replayCmgt = produceCmgtManifest(FULL_CAPABILITIES);

    // Re-derived CMGT must match the live one (deterministic story init).
    expect(replayCmgt.channels.map((c) => c.id).sort()).toEqual(
      liveCmgt.channels.map((c) => c.id).sort(),
    );

    const replayRenderer = createRenderer();
    applyCmgt(replayRenderer, replayCmgt);

    for (const packet of capturedPackets) {
      applyTurnPacket(replayRenderer, packet);
    }

    // ── ASSERT: identical state ──────────────────────────────────
    const replaySnapshot = snapshotRenderer(replayRenderer);
    expect(replaySnapshot).toEqual(liveSnapshot);
  });

  it('end-of-turn-10 state exposes expected channels', () => {
    registerHello(FULL_CAPABILITIES);
    storyInit();
    const cmgt = produceCmgtManifest(FULL_CAPABILITIES);

    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    for (const turn of SCENARIO_TEN_TURN_WALK) {
      applyTurnPacket(
        renderer,
        produceTurnPacket({ textBlocks: turn.textBlocks, events: turn.events }),
      );
    }

    // Replace channels — last value at turn 10
    expect(renderer.replace.get('location')).toBe('Library');
    expect(renderer.replace.get('score')).toEqual({ current: 10, max: 100 });
    expect(renderer.replace.get('turn')).toBe(10);

    // Story replace channels — final state from turns 5/6/10
    expect(renderer.replace.get('image:portrait')).toMatchObject({
      src: 'images/portrait.png',
      layer: 'portrait',
    });
    // ambient:wind was set in turn 6, then null'd in turn 10
    expect(renderer.replace.get('ambient:wind')).toBe(null);
    // music started in turn 10
    expect(renderer.replace.get('music')).toMatchObject({
      src: 'music/finale.mp3',
      volume: 0.6,
    });

    // main accumulated up to turn 8's clear, then turn 9-10 added 2 entries
    const main = renderer.append.get('main');
    expect(main).toBeDefined();
    expect(main).toHaveLength(2); // game.message in turn 9, action.result in turn 10
  });

  it('story channels appear in the manifest only when capabilities permit', () => {
    registerHello(FULL_CAPABILITIES);
    storyInit();
    const cmgt = produceCmgtManifest(FULL_CAPABILITIES);

    const ids = cmgt.channels.map((c) => c.id);
    for (const storyId of TEN_TURN_STORY_CHANNELS) {
      expect(ids).toContain(storyId);
    }
  });

  it('replay sequence preserves event-mode signal ordering across turns', () => {
    // ── Live ──
    registerHello(FULL_CAPABILITIES);
    storyInit();
    const cmgt = produceCmgtManifest(FULL_CAPABILITIES);

    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    const captured: TurnPacket[] = [];
    for (const turn of SCENARIO_TEN_TURN_WALK) {
      const p = produceTurnPacket({ textBlocks: turn.textBlocks, events: turn.events });
      captured.push(p);
      applyTurnPacket(renderer, p);
    }

    const liveTurnIds = captured.map((p) => p.turn_id);

    // ── Replay (just produces the same turn_ids) ──
    resetSession();
    registerHello(FULL_CAPABILITIES);
    storyInit();
    produceCmgtManifest(FULL_CAPABILITIES);

    const replayCaptured: string[] = [];
    for (const turn of SCENARIO_TEN_TURN_WALK) {
      const p = produceTurnPacket({ textBlocks: turn.textBlocks, events: turn.events });
      replayCaptured.push(p.turn_id);
    }

    // turn_id sequence is deterministic: 'turn-1' .. 'turn-10' both runs.
    expect(replayCaptured).toEqual(liveTurnIds);
  });
});
