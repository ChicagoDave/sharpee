/**
 * Engine player-death routing (ADR-224 Phase 1, AC-1 + AC-3).
 *
 * Exercises the new game-over routing end-to-end through `executeTurn`: a canonical
 * `if.event.player.died` event emitted mid-turn (here by a scheduler-tier daemon
 * plugin, the realistic gas/balloon/cage path) routes to `game.lost` — unless a
 * story reincarnation policy (a lower-priority plugin, the plugin-state-machine
 * shape ADR-224 mandates) gets "first crack" and clears the terminal `HealthTrait`
 * state before the engine's post-dispatch re-check. The engine's final word is the
 * player's *derived* life-state, not the event's `terminal` flag (ADR-224 Q-2).
 */

import { describe, it, expect } from 'vitest';
import { EntityType, TraitType, HealthTrait, HealthBehavior, WorldModel } from '@sharpee/world-model';
import { killPlayer } from '@sharpee/stdlib';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { Story } from '../../src/story';

/** A minimal story that drops the player into a room so `look` succeeds. */
function deathTestStory(): Story {
  return {
    config: { id: 'death-test', title: 'Death Test', author: 'Test', version: '1.0.0' },
    createPlayer: (world: WorldModel) => world.createEntity('You', EntityType.ACTOR),
    initializeWorld: (world: WorldModel) => {
      const room = world.createEntity('Hazard Room', EntityType.ROOM);
      const player = world.getPlayer()!;
      world.moveEntity(player.id, room.id);
    },
  };
}

/**
 * A daemon that emits one canonical death via `killPlayer` on its first tick —
 * stands in for the gas/balloon/cage scheduler daemons of Phase 4.
 */
function gasHazardDaemon(world: WorldModel) {
  let fired = false;
  return {
    id: 'test.gas-hazard',
    priority: 50, // scheduler tier
    onAfterAction() {
      if (fired) return [];
      fired = true;
      const player = world.getPlayer()!;
      const ev = killPlayer(world, player, { cause: 'gas', terminal: true });
      return ev ? [ev] : [];
    },
  };
}

describe('engine player-death routing (ADR-224)', () => {
  it('AC-1: a still-dead player routes to game.lost', async () => {
    const { engine, world } = setupTestEngine();
    engine.setStory(deathTestStory());
    engine.start();

    const lostEvents: unknown[] = [];
    engine.on('event', (e) => {
      if (e.type === 'game.lost') lostEvents.push(e);
    });
    let gameOver = false;
    engine.on('game:over', () => {
      gameOver = true;
    });

    engine.getPluginRegistry().register(gasHazardDaemon(world));

    await engine.executeTurn('look');

    const player = world.getPlayer()!;
    const health = player.get(TraitType.HEALTH) as HealthTrait;
    expect(HealthBehavior.isAlive(health)).toBe(false);
    expect(health.causeOfDeath).toBe('gas');
    // Nobody vetoed → the engine ended the game.
    expect(gameOver).toBe(true);
    expect(lostEvents).toHaveLength(1);
  });

  it('AC-3: a reincarnation policy vetoes game.lost by clearing HealthTrait first', async () => {
    const { engine, world } = setupTestEngine();
    engine.setStory(deathTestStory());
    engine.start();

    const safeRoom = world.createEntity('Safe Room', EntityType.ROOM);

    const lostEvents: unknown[] = [];
    engine.on('event', (e) => {
      if (e.type === 'game.lost') lostEvents.push(e);
    });
    let gameOver = false;
    engine.on('game:over', () => {
      gameOver = true;
    });

    engine.getPluginRegistry().register(gasHazardDaemon(world));
    // Lower priority than the hazard → runs AFTER it in the same tick, sees the
    // death, and reincarnates. This is the "first crack before game.lost" contract.
    engine.getPluginRegistry().register({
      id: 'test.reincarnation',
      priority: 40,
      onAfterAction() {
        const player = world.getPlayer()!;
        const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
        if (health && !HealthBehavior.isAlive(health)) {
          health.dead = false;
          health.causeOfDeath = undefined;
          health.health = health.maxHealth;
          world.moveEntity(player.id, safeRoom.id);
        }
        return [];
      },
    });

    await engine.executeTurn('look');

    const player = world.getPlayer()!;
    const health = player.get(TraitType.HEALTH) as HealthTrait;
    // Reincarnated and relocated; the game did NOT end.
    expect(HealthBehavior.isAlive(health)).toBe(true);
    expect(world.getLocation(player.id)).toBe(safeRoom.id);
    expect(gameOver).toBe(false);
    expect(lostEvents).toHaveLength(0);
  });
});
