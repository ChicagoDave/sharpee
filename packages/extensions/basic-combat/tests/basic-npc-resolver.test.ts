/**
 * basicNpcResolver — player-kill routing through killPlayer (ADR-227 Phase 3,
 * AC-5).
 *
 * A basic-combat NPC lethal blow on the PLAYER must emit the canonical
 * `if.event.player.died {cause:'combat'}` (via the killPlayer sink, so the
 * engine routes game-over), not the legacy unrouted `if.event.death`. An
 * NPC-target kill keeps the generic death event unchanged.
 *
 * Ordering trap pinned here: killPlayer must run BEFORE applyCombatResult
 * (which flips HealthTrait.dead itself) or the idempotence guard swallows
 * the canonical event entirely.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { basicNpcResolver } from '../src';
import { createSeededRandom } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  CombatantTrait,
  HealthTrait,
  EntityType,
} from '@sharpee/world-model';
import { PLAYER_DIED_EVENT } from '@sharpee/stdlib';

describe('basicNpcResolver — death event routing (ADR-227 AC-5)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let npc: IFEntity;

  /** Attack `target` repeatedly (fixed seed) until a killing blow lands. */
  const attackUntilKilled = (target: IFEntity, maxRounds = 50) => {
    const random = createSeededRandom(12345);
    for (let i = 0; i < maxRounds; i++) {
      const events = basicNpcResolver(npc, target, world, random);
      const health = target.get(TraitType.HEALTH) as HealthTrait;
      if (health.dead) return events;
    }
    throw new Error(`target not killed within ${maxRounds} rounds`);
  };

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Arena', EntityType.ROOM);
    room.add({ type: 'room' });

    npc = world.createEntity('ogre', EntityType.ACTOR);
    npc.add({ type: TraitType.ACTOR });
    npc.add(new CombatantTrait({ skill: 95, baseDamage: 10 }));
    npc.add(new HealthTrait({ health: 100 }));
    world.moveEntity(npc.id, room.id);
  });

  it('a lethal blow on the PLAYER emits if.event.player.died via killPlayer, not if.event.death', () => {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR });
    player.add(new CombatantTrait({ skill: 5, baseDamage: 1 }));
    player.add(new HealthTrait({ health: 2 }));
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    const events = attackUntilKilled(player);
    const types = events.map(e => e.type);

    // The canonical event IS emitted (the ordering trap would swallow it).
    expect(types).toContain(PLAYER_DIED_EVENT);
    expect(types).not.toContain('if.event.death');

    const died = events.find(e => e.type === PLAYER_DIED_EVENT)!;
    expect(died.data).toMatchObject({
      cause: 'combat',
      messageId: 'combat.player_died',
      terminal: true,
    });

    // State mutation: terminally dead with the combat cause.
    const health = player.get(TraitType.HEALTH) as HealthTrait;
    expect(health.dead).toBe(true);
    expect(health.causeOfDeath).toBe('combat');
  });

  it('a lethal blow on an NPC target still emits the generic if.event.death (regression)', () => {
    // A player must exist so the player-check has something to compare against.
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR });
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    const victim = world.createEntity('goblin', EntityType.ACTOR);
    victim.add({ type: TraitType.ACTOR });
    victim.add(new CombatantTrait({ skill: 5, baseDamage: 1 }));
    victim.add(new HealthTrait({ health: 2 }));
    world.moveEntity(victim.id, room.id);

    const events = attackUntilKilled(victim);
    const types = events.map(e => e.type);

    expect(types).toContain('if.event.death');
    expect(types).not.toContain(PLAYER_DIED_EVENT);

    const death = events.find(e => e.type === 'if.event.death')!;
    expect(death.data).toMatchObject({ target: victim.id, killedBy: npc.id });

    // The player is untouched.
    expect((player.get(TraitType.HEALTH) as HealthTrait | undefined)?.dead ?? false).toBe(false);
  });
});
