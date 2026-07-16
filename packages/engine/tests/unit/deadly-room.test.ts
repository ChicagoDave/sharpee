/**
 * Deadly-room end-to-end (ADR-224 Phase 2, AC-2 Sharpee-Way half).
 *
 * Drives a real turn through the engine to prove the whole chain: the auto-registered
 * deadly-room transformer sees a `DeadlyRoomTrait` on the player's room, redirects a
 * non-safe verb to the generic `if.action.deadly_room_death` action, which calls
 * `killPlayer` → the canonical death event → engine `game.lost`. A safe verb
 * (LOOK/EXAMINE) is untouched and the player lives. (The Chord-Way half — identical
 * behavior authored from `.story` — closes in Phase 5.)
 */

import { describe, it, expect } from 'vitest';
import { EntityType, TraitType, HealthTrait, HealthBehavior, DeadlyRoomTrait, WorldModel } from '@sharpee/world-model';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { Story } from '../../src/story';

/** A story whose one room is a deadly room (falls-style: only LOOK/EXAMINE are safe). */
function deadlyRoomStory(): Story {
  return {
    config: { id: 'deadly-room-test', title: 'Deadly Room', author: 'Test', version: '1.0.0' },
    createPlayer: (world: WorldModel) => world.createEntity('You', EntityType.ACTOR),
    initializeWorld: (world: WorldModel) => {
      const room = world.createEntity('Aragain Falls', EntityType.ROOM);
      room.add(new DeadlyRoomTrait({ cause: 'fall', safeVerbs: ['looking', 'examining'] }));
      const player = world.getPlayer()!;
      world.moveEntity(player.id, room.id);
    },
  };
}

describe('deadly-room end-to-end (ADR-224)', () => {
  it('a non-safe verb (WAIT) in a deadly room kills the player and ends the game', async () => {
    const { engine, world } = setupTestEngine();
    engine.setStory(deadlyRoomStory());
    engine.start();

    let gameOver = false;
    const lost: unknown[] = [];
    engine.on('game:over', () => {
      gameOver = true;
    });
    engine.on('event', (e) => {
      if (e.type === 'game.lost') lost.push(e);
    });

    await engine.executeTurn('wait');

    const player = world.getPlayer()!;
    const health = player.get(TraitType.HEALTH) as HealthTrait;
    expect(health).toBeDefined(); // killPlayer lazily attached it
    expect(HealthBehavior.isAlive(health)).toBe(false);
    expect(health.causeOfDeath).toBe('fall');
    expect(gameOver).toBe(true);
    expect(lost).toHaveLength(1);
  });

  it('a safe verb (LOOK) in a deadly room is harmless — player lives, game continues', async () => {
    const { engine, world } = setupTestEngine();
    engine.setStory(deadlyRoomStory());
    engine.start();

    let gameOver = false;
    engine.on('game:over', () => {
      gameOver = true;
    });

    await engine.executeTurn('look');

    const player = world.getPlayer()!;
    const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
    // Never killed → no HealthTrait was attached, and the game did not end.
    expect(health).toBeUndefined();
    expect(gameOver).toBe(false);
  });
});
