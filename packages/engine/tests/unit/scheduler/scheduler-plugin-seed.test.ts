/**
 * scheduler-plugin-seed.test.ts — `SchedulerPlugin.onSessionSeed` (ADR-293,
 * re-cut Phase 3).
 *
 * Derived from the Behavior Statement: the hook reseeds the scheduler's
 * internal stream, so daemon draws become a function of the session seed.
 */

import { describe, it, expect } from 'vitest';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';

describe('SchedulerPlugin.onSessionSeed', () => {
  it('reseeds the scheduler stream to the given session seed', () => {
    const plugin = new SchedulerPlugin();
    plugin.onSessionSeed(9999);

    expect(plugin.getScheduler().getRandom().getSeed()).toBe(9999);
  });

  it('two plugins seeded alike draw identical daemon sequences', () => {
    const first = new SchedulerPlugin();
    const second = new SchedulerPlugin();
    first.onSessionSeed(4242);
    second.onSessionSeed(4242);

    const firstDraws = [
      first.getScheduler().getRandom().int(0, 1000000),
      first.getScheduler().getRandom().int(0, 1000000)
    ];
    const secondDraws = [
      second.getScheduler().getRandom().int(0, 1000000),
      second.getScheduler().getRandom().int(0, 1000000)
    ];

    expect(firstDraws).toEqual(secondDraws);
  });

  it('a later setState (save restore) overrides the session seed', () => {
    const plugin = new SchedulerPlugin();
    plugin.onSessionSeed(4242);
    const saved = plugin.getState() as { randomSeed: number };

    const restored = new SchedulerPlugin();
    restored.onSessionSeed(1); // session seed applied first (engine start order)
    restored.setState({ ...saved, randomSeed: 777777 });

    expect(restored.getScheduler().getRandom().getSeed()).toBe(777777);
  });
});
