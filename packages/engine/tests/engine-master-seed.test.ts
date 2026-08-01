/**
 * engine-master-seed.test.ts — master-seed plumbing (ADR-293 D1, re-cut Phase 3).
 *
 * Derived from the Behavior Statement: `EngineConfig.seed` becomes the
 * session's master seed; the engine streams and the `RandomService` derive
 * from it; `start()` hands every plugin a name-derived session seed.
 */

import { describe, it, expect } from 'vitest';
import { createSeededRandom, definePoint, deriveStreamSeed } from '@sharpee/core';
import { setupTestEngine } from './test-helpers/setup-test-engine';
import { MinimalTestStory } from './stories/minimal-test-story';
import {
  ACTION_STREAM_POINT_NAME,
  TURN_STREAM_POINT_NAME
} from '../src/engine-random-service';

const SEED = 20260801;

describe('EngineConfig.seed (D1)', () => {
  it('becomes the master seed and seeds the RandomService', () => {
    const { engine } = setupTestEngine({ config: { seed: SEED } });

    expect(engine.getMasterSeed()).toBe(SEED);
    expect(engine.getRandomService().getMasterSeed()).toBe(SEED);
  });

  it('point draws through the engine service derive from the master seed (Phase 4: no legacy streams remain)', () => {
    const { engine } = setupTestEngine({ config: { seed: SEED } });
    const point = definePoint('test-engine-master-seed.derivation');

    expect(engine.getRandomService().int(point, 0, 1000000)).toBe(
      createSeededRandom(
        deriveStreamSeed(SEED, 'test-engine-master-seed.derivation')
      ).int(0, 1000000)
    );
  });

  it('two engines with the same seed produce identical point draws', () => {
    const first = setupTestEngine({ config: { seed: SEED } });
    const second = setupTestEngine({ config: { seed: SEED } });
    const point = definePoint('test-engine-master-seed.identical-draws');

    const firstDraws = [
      first.engine.getRandomService().int(point, 0, 1000000),
      first.engine.getRandomService().int(point, 0, 1000000)
    ];
    const secondDraws = [
      second.engine.getRandomService().int(point, 0, 1000000),
      second.engine.getRandomService().int(point, 0, 1000000)
    ];

    expect(firstDraws).toEqual(secondDraws);
  });

  it('still resolves a master seed without config.seed (clock, read once)', () => {
    const { engine } = setupTestEngine();

    // No seed injected: the master seed exists and is reportable (D14) —
    // its exact value is clock-derived, so only its presence is asserted.
    expect(Number.isInteger(engine.getMasterSeed())).toBe(true);
    expect(engine.getRandomService().getMasterSeed()).toBe(engine.getMasterSeed());
  });

  it('turn and action streams are distinct streams', () => {
    expect(deriveStreamSeed(SEED, TURN_STREAM_POINT_NAME)).not.toBe(
      deriveStreamSeed(SEED, ACTION_STREAM_POINT_NAME)
    );
  });
});

describe('start() session-seed dispatch (re-cut Phase 3)', () => {
  it('hands every registered plugin a seed derived from (masterSeed, plugin id)', () => {
    const { engine } = setupTestEngine({ config: { seed: SEED } });
    const story = new MinimalTestStory();
    engine.setStory(story);

    const captured: number[] = [];
    engine.getPluginRegistry().register({
      id: 'test.seed-capture',
      priority: 1,
      onAfterAction: () => [],
      onSessionSeed: (seed: number) => {
        captured.push(seed);
      }
    });

    engine.start();
    engine.stop();

    expect(captured).toEqual([
      deriveStreamSeed(SEED, 'plugin.test.seed-capture')
    ]);
  });

  it('skips plugins that do not implement onSessionSeed', () => {
    const { engine } = setupTestEngine({ config: { seed: SEED } });
    const story = new MinimalTestStory();
    engine.setStory(story);
    engine.getPluginRegistry().register({
      id: 'test.no-seed-hook',
      priority: 1,
      onAfterAction: () => []
    });

    // The registry holds SceneEvaluationPlugin and this plugin, neither
    // seed-aware: start() must not throw.
    engine.start();
    engine.stop();
  });
});
