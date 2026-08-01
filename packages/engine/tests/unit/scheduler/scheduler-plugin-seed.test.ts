/**
 * scheduler-plugin-seed.test.ts — scheduler randomness under ADR-293.
 *
 * Phase 4 arc: the scheduler owns NO stream of its own. `SchedulerPlugin`
 * threads the turn context's `RandomService` into `tick()`, so daemon draws
 * land on declared points whose streams derive from the master seed and ride
 * the save's `streamStates` map. (The Phase 3 `onSessionSeed` reseed impl was
 * deleted with the internal stream; the generic TurnPlugin hook remains for
 * plugins that do own internal randomness.)
 */

import { describe, it, expect } from 'vitest';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import type { TurnPluginContext } from '@sharpee/plugins';
import { definePoint } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { EngineRandomService } from '../../../src/engine-random-service';

const DAEMON_POINT = definePoint('test-scheduler-plugin.daemon-draw');

function buildTurnContext(random: EngineRandomService): TurnPluginContext {
  return {
    world: new WorldModel(),
    turn: 1,
    playerId: 'player',
    playerLocation: 'room-1',
    random
  };
}

describe('SchedulerPlugin randomness (ADR-293)', () => {
  it('threads the turn context RandomService into daemon contexts', () => {
    const plugin = new SchedulerPlugin();
    const random = new EngineRandomService(4242);
    let seen: unknown = null;

    plugin.getScheduler().registerDaemon({
      id: 'capture',
      name: 'Capture',
      run: (ctx) => {
        seen = ctx.random;
        return [];
      }
    });
    plugin.onAfterAction(buildTurnContext(random));

    expect(seen).toBe(random);
  });

  it('daemon draws are a function of the master seed, reproducible across plugins', () => {
    const draws: number[][] = [];
    for (let i = 0; i < 2; i++) {
      const plugin = new SchedulerPlugin();
      const random = new EngineRandomService(20260801);
      const collected: number[] = [];
      plugin.getScheduler().registerDaemon({
        id: 'drawer',
        name: 'Drawer',
        run: (ctx) => {
          collected.push(ctx.random.int(DAEMON_POINT, 0, 1000000));
          return [];
        }
      });
      plugin.onAfterAction(buildTurnContext(random));
      plugin.onAfterAction(buildTurnContext(random));
      draws.push(collected);
    }

    expect(draws[0]).toEqual(draws[1]);
    expect(draws[0]).toHaveLength(2);
  });

  it('scheduler state no longer carries a randomSeed — stream state rides the engine save (D7)', () => {
    const plugin = new SchedulerPlugin();

    expect(plugin.getState()).not.toHaveProperty('randomSeed');
  });
});
