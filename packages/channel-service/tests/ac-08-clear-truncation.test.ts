/**
 * AC-8 — `clear` truncation (ADR-163 §10).
 *
 * Story emits 5 entries on the `main` channel, then a `clear` event
 * with `target: 'main'`. The renderer's accumulated `main` buffer is
 * empty after the clear; subsequent appends start fresh.
 *
 * Verifies the §10 invariant — append-mode monotonicity is broken
 * only by `clear`, and the renderer-side handling is correct.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  produceCmgtManifest,
  produceTurnPacket,
  registerHello,
  registerMediaChannels,
  registerMediaRules,
  registerPlatformRules,
  registerStandardChannels,
  resetSession,
} from '../src';
import { SCENARIO_CLEAR_TRUNCATION, event } from '@sharpee/story-channel-service-test';

import { FULL_CAPABILITIES } from './test-helpers/capabilities';
import {
  applyCmgt,
  applyTurnPacket,
  createRenderer,
} from './test-helpers/renderer';

describe('AC-8 — `clear` truncation', () => {
  beforeEach(() => {
    resetSession();
  });

  function bootstrap() {
    registerHello(FULL_CAPABILITIES);
    registerStandardChannels();
    registerMediaChannels();
    registerPlatformRules();
    registerMediaRules();
    return produceCmgtManifest(FULL_CAPABILITIES);
  }

  it('main accumulates across the 5 append turns before the clear', () => {
    const cmgt = bootstrap();
    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    for (const turn of SCENARIO_CLEAR_TRUNCATION.appendTurns) {
      const packet = produceTurnPacket({
        textBlocks: turn.textBlocks,
        events: turn.events,
      });
      applyTurnPacket(renderer, packet);
    }

    expect(renderer.append.get('main')).toHaveLength(5);
  });

  it('clear with target=main empties the accumulated main buffer', () => {
    const cmgt = bootstrap();
    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    // Run the 5 append turns
    for (const turn of SCENARIO_CLEAR_TRUNCATION.appendTurns) {
      applyTurnPacket(
        renderer,
        produceTurnPacket({ textBlocks: turn.textBlocks, events: turn.events }),
      );
    }
    expect(renderer.append.get('main')).toHaveLength(5);

    // Apply the clear turn
    applyTurnPacket(
      renderer,
      produceTurnPacket({
        textBlocks: SCENARIO_CLEAR_TRUNCATION.clearTurn.textBlocks,
        events: SCENARIO_CLEAR_TRUNCATION.clearTurn.events,
      }),
    );

    expect(renderer.append.get('main')).toEqual([]);
  });

  it('post-clear appends start fresh — no contamination from pre-clear entries', () => {
    const cmgt = bootstrap();
    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    // 5 appends + clear
    for (const turn of SCENARIO_CLEAR_TRUNCATION.appendTurns) {
      applyTurnPacket(
        renderer,
        produceTurnPacket({ textBlocks: turn.textBlocks, events: turn.events }),
      );
    }
    applyTurnPacket(
      renderer,
      produceTurnPacket({
        textBlocks: SCENARIO_CLEAR_TRUNCATION.clearTurn.textBlocks,
        events: SCENARIO_CLEAR_TRUNCATION.clearTurn.events,
      }),
    );

    // Post-clear append turn
    applyTurnPacket(
      renderer,
      produceTurnPacket({
        textBlocks: SCENARIO_CLEAR_TRUNCATION.postClearTurn.textBlocks,
        events: SCENARIO_CLEAR_TRUNCATION.postClearTurn.events,
      }),
    );

    const main = renderer.append.get('main');
    expect(main).toHaveLength(1);
    // First (and only) entry is the new "Fresh line after clear"
    expect(main![0]).toEqual(['Fresh line after clear']);
  });

  it('clear with target=all truncates every append-mode channel', () => {
    const cmgt = bootstrap();
    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    // Accumulate to main
    for (const turn of SCENARIO_CLEAR_TRUNCATION.appendTurns) {
      applyTurnPacket(
        renderer,
        produceTurnPacket({ textBlocks: turn.textBlocks, events: turn.events }),
      );
    }
    // (main is the only platform append-mode standard channel)
    expect(renderer.append.get('main')).toHaveLength(5);

    applyTurnPacket(
      renderer,
      produceTurnPacket({
        textBlocks: [],
        events: [event('media.clear', { target: 'all' })],
      }),
    );

    // Every append channel is now empty.
    for (const [, entries] of renderer.append) {
      expect(entries).toHaveLength(0);
    }
  });

  it('clear targeting an unregistered append channel is a no-op', () => {
    const cmgt = bootstrap();
    const renderer = createRenderer();
    applyCmgt(renderer, cmgt);

    // Accumulate something to main
    for (const turn of SCENARIO_CLEAR_TRUNCATION.appendTurns) {
      applyTurnPacket(
        renderer,
        produceTurnPacket({ textBlocks: turn.textBlocks, events: turn.events }),
      );
    }
    expect(renderer.append.get('main')).toHaveLength(5);

    // Clear targeting a channel that does not exist
    applyTurnPacket(
      renderer,
      produceTurnPacket({
        textBlocks: [],
        events: [event('media.clear', { target: 'nonexistent' })],
      }),
    );

    // main is untouched
    expect(renderer.append.get('main')).toHaveLength(5);
  });

  it('emits the clear payload on the clear channel for renderer dispatch', () => {
    bootstrap();

    const packet = produceTurnPacket({
      textBlocks: [],
      events: [event('media.clear', { target: 'main' })],
    });

    expect(packet.payload['clear']).toEqual({ target: 'main' });
  });
});
