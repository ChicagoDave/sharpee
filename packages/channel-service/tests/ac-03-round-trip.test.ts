/**
 * AC-3 — Round-trip platform test (ADR-163 §12, §1).
 *
 * Exercises produceCmgtManifest → produceTurnPacket → reference
 * renderer for a single representative turn. Asserts on the final
 * rendered values for the four most-exercised platform channels:
 * `main`, `location`, `score`, `turn`.
 *
 * Uses scripted fixture data from `@sharpee/story-channel-service-test`
 * — no real engine, no transport, no platform consumer. Validates that
 * the platform's default routing (standard channels + platform rules)
 * works end-to-end without any story-specific configuration.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  produceCmgtManifest,
  produceTurnPacket,
  registerHello,
  registerStandardChannels,
  registerPlatformRules,
  resetSession,
} from '../src';
import { SCENARIO_BASIC_TURN } from '@sharpee/story-channel-service-test';

import { FULL_CAPABILITIES } from './test-helpers/capabilities';
import {
  applyCmgt,
  applyTurnPacket,
  createRenderer,
} from './test-helpers/renderer';

describe('AC-3 — Round-trip platform test', () => {
  beforeEach(() => {
    resetSession();
  });

  function bootstrap() {
    registerHello(FULL_CAPABILITIES);
    registerStandardChannels();
    registerPlatformRules();
    return produceCmgtManifest(FULL_CAPABILITIES);
  }

  it('produces a CMGT manifest containing the ten standard channels', () => {
    const cmgt = bootstrap();
    const ids = cmgt.channels.map((c) => c.id).sort();
    // The ten standards from ADR-163 §4 — full set must appear for a
    // pure-text bootstrap (no media channels registered yet).
    expect(ids).toEqual(
      ['death', 'endgame', 'ifid', 'info', 'location', 'main', 'prompt', 'score', 'score_notify', 'turn'].sort(),
    );
  });

  it('routes scripted blocks through default rules into the four canonical channels', () => {
    const cmgt = bootstrap();
    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    const turnPacket = produceTurnPacket({
      textBlocks: SCENARIO_BASIC_TURN.textBlocks,
      events: SCENARIO_BASIC_TURN.events,
    });

    applyTurnPacket(renderer, turnPacket);

    // ── Replace-mode channels ──────────────────────────────────────
    expect(renderer.replace.get('location')).toBe('West of House');
    expect(renderer.replace.get('score')).toEqual({ current: 0, max: 350 });
    expect(renderer.replace.get('turn')).toBe(1);

    // ── Append-mode `main` ─────────────────────────────────────────
    // Three contributing blocks — room.name, room.description,
    // room.contents — each routed to main with `extract: 'content'`.
    const main = renderer.append.get('main');
    expect(main).toBeDefined();
    expect(main).toHaveLength(3);

    // First entry preserves the room decoration.
    expect(main![0]).toEqual([{ type: 'room', content: ['West of House'] }]);
    // Second entry is the plain description string array.
    expect(main![1]).toEqual([
      'You are standing in an open field west of a white house, with a boarded front door.',
    ]);
    expect(main![2]).toEqual(['There is a small mailbox here.']);
  });

  it('emits a turn packet with stable shape and id', () => {
    bootstrap();
    const turnPacket = produceTurnPacket({
      textBlocks: SCENARIO_BASIC_TURN.textBlocks,
      events: SCENARIO_BASIC_TURN.events,
    });

    expect(turnPacket.kind).toBe('turn');
    expect(turnPacket.turn_id).toBe('turn-1');
    expect(typeof turnPacket.payload).toBe('object');

    // The four AC-3 canonical channels are present this turn — each has
    // either a contribution from the scripted blocks (location, score,
    // turn, main). `prompt` is also emit:'always' but has no platform
    // rule and no prior value, so the producer skips it; `info`, `ifid`,
    // `death`, `endgame`, `score_notify` likewise. The always-emit
    // re-emission rule (AC-9a) only fires once a prior value exists.
    expect(turnPacket.payload).toHaveProperty('main');
    expect(turnPacket.payload).toHaveProperty('location');
    expect(turnPacket.payload).toHaveProperty('score');
    expect(turnPacket.payload).toHaveProperty('turn');
  });

  it('multi-turn drive accumulates main across turns', () => {
    const cmgt = bootstrap();
    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    // Turn 1
    applyTurnPacket(
      renderer,
      produceTurnPacket({
        textBlocks: SCENARIO_BASIC_TURN.textBlocks,
        events: SCENARIO_BASIC_TURN.events,
      }),
    );

    // Turn 2 — same blocks again
    applyTurnPacket(
      renderer,
      produceTurnPacket({
        textBlocks: SCENARIO_BASIC_TURN.textBlocks,
        events: SCENARIO_BASIC_TURN.events,
      }),
    );

    // main accumulates 6 entries (3 + 3); replace channels stay
    // current (no clear means we keep the same values).
    expect(renderer.append.get('main')).toHaveLength(6);
    expect(renderer.replace.get('location')).toBe('West of House');
    expect(renderer.lastTurnId).toBe('turn-2');
  });
});
