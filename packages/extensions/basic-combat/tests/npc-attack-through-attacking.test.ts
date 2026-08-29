/**
 * npc-attack-through-attacking.test.ts — an NPC's blow is the real
 * attacking action (ADR-328 D5), resolved by the same BasicCombatInterceptor
 * the player's blows use, and a lethal blow on the PLAYER routes through
 * `killPlayer` — the canonical `if.event.player.died {cause:'combat'}`
 * (ADR-227 AC-5), not the legacy unrouted `if.event.death`.
 *
 * REAL-PATH: real WorldModel, the real attacking action run as the NPC
 * through the real action context, the real interceptor registered by
 * `registerBasicCombat`. Assertions on HealthTrait state and the emitted
 * events.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { registerBasicCombat } from '../src';
import { createFixtureRandomService } from './fixture-random-service';
import {
  IFEntity,
  WorldModel,
  TraitType,
  ActorTrait,
  ContainerTrait,
  CombatantTrait,
  HealthTrait,
  RoomTrait,
  EntityType,
} from '@sharpee/world-model';
import {
  attackingAction,
  createActionContext,
  IFActions,
  PLAYER_DIED_EVENT,
  type ValidatedCommand,
} from '@sharpee/stdlib';

describe('an NPC attacks through the real attacking action (ADR-328 D5; ADR-227 AC-5)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let npc: IFEntity;
  let player: IFEntity;

  /** Run the attacking action's four phases as `attacker` against `target`; returns the report's events. */
  const attackOnce = (attacker: IFEntity, target: IFEntity, random: ReturnType<typeof createFixtureRandomService>) => {
    const command: ValidatedCommand = {
      parsed: {
        rawInput: `attack ${target.name}`,
        action: IFActions.ATTACKING,
        tokens: [],
        structure: { verb: { tokens: [0], text: 'attack', head: 'attack' } },
        pattern: 'PROGRAMMATIC',
        confidence: 1.0,
      },
      actionId: IFActions.ATTACKING,
      directObject: { entity: target, parsed: { text: target.name, candidates: [target.name] } },
    };
    const context = createActionContext(world, player, attackingAction, command, random, undefined, attacker);
    const validation = attackingAction.validate(context);
    if (!validation.valid) return { valid: false as const, events: attackingAction.blocked!(context, validation) };
    context.validationResult = validation;
    attackingAction.execute(context);
    return { valid: true as const, events: attackingAction.report(context) };
  };

  /** Attack `target` repeatedly (fixed seed) until a killing blow lands. */
  const attackUntilKilled = (target: IFEntity, maxRounds = 50) => {
    const random = createFixtureRandomService(12345);
    for (let i = 0; i < maxRounds; i++) {
      const { valid, events } = attackOnce(npc, target, random);
      expect(valid, 'the interceptor is registered, so the blow validates').toBe(true);
      const health = target.get(TraitType.HEALTH) as HealthTrait;
      if (health.dead) return events;
    }
    throw new Error(`target not killed within ${maxRounds} rounds`);
  };

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Arena', EntityType.ROOM);
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    registerBasicCombat(world);

    player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    player.add(new CombatantTrait({ skill: 5, baseDamage: 1 }));
    player.add(new HealthTrait({ health: 2 }));
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    npc = world.createEntity('ogre', EntityType.ACTOR);
    npc.add(new ActorTrait());
    npc.add(new ContainerTrait());
    npc.add(new CombatantTrait({ skill: 95, baseDamage: 10 }));
    npc.add(new HealthTrait({ health: 100 }));
    world.moveEntity(npc.id, room.id);
  });

  it('a lethal blow on the PLAYER emits if.event.player.died via killPlayer, not if.event.death', () => {
    const events = attackUntilKilled(player);
    const types = events.map(e => e.type);

    expect(types).toContain('if.event.attacked');
    expect(types).toContain(PLAYER_DIED_EVENT);
    expect(types).not.toContain('if.event.death');

    const attacked = events.find(e => e.type === 'if.event.attacked')!;
    expect(attacked.entities.actor).toBe(npc.id);

    const died = events.find(e => e.type === PLAYER_DIED_EVENT)!;
    expect(died.data).toMatchObject({ cause: 'combat', messageId: 'combat.player_died', terminal: true });

    // State mutation: terminally dead with the combat cause.
    const health = player.get(TraitType.HEALTH) as HealthTrait;
    expect(health.dead).toBe(true);
    expect(health.causeOfDeath).toBe('combat');
  });

  it('a lethal blow on an NPC target still emits the generic if.event.death (regression)', () => {
    const victim = world.createEntity('goblin', EntityType.ACTOR);
    victim.add(new ActorTrait());
    victim.add(new ContainerTrait());
    victim.add(new CombatantTrait({ skill: 5, baseDamage: 1 }));
    victim.add(new HealthTrait({ health: 2 }));
    world.moveEntity(victim.id, room.id);

    const events = attackUntilKilled(victim);
    const types = events.map(e => e.type);

    expect(types).toContain('if.event.death');
    expect(types).not.toContain(PLAYER_DIED_EVENT);
    expect((victim.get(TraitType.HEALTH) as HealthTrait).dead).toBe(true);
  });

  it('an unarmed NPC blow at a combatant with no interceptor is refused by attacking, never resolved by hand', () => {
    const bare = new WorldModel();
    const hall = bare.createEntity('Hall', EntityType.ROOM);
    hall.add(new RoomTrait());
    hall.add(new ContainerTrait());
    const you = bare.createEntity('yourself', EntityType.ACTOR);
    you.add(new ActorTrait({ isPlayer: true }));
    you.add(new ContainerTrait());
    you.add(new CombatantTrait({ skill: 5, baseDamage: 1 }));
    you.add(new HealthTrait({ health: 2 }));
    bare.moveEntity(you.id, hall.id);
    bare.setPlayer(you.id);
    const brute = bare.createEntity('brute', EntityType.ACTOR);
    brute.add(new ActorTrait());
    brute.add(new ContainerTrait());
    brute.add(new CombatantTrait({ skill: 95, baseDamage: 10 }));
    bare.moveEntity(brute.id, hall.id);

    const command: ValidatedCommand = {
      parsed: {
        rawInput: 'attack yourself',
        action: IFActions.ATTACKING,
        tokens: [],
        structure: { verb: { tokens: [0], text: 'attack', head: 'attack' } },
        pattern: 'PROGRAMMATIC',
        confidence: 1.0,
      },
      actionId: IFActions.ATTACKING,
      directObject: { entity: you, parsed: { text: 'yourself', candidates: ['yourself'] } },
    };
    const context = createActionContext(bare, you, attackingAction, command, createFixtureRandomService(1), undefined, brute);
    expect(attackingAction.validate(context)).toMatchObject({ valid: false, error: 'violence_not_the_answer' });
    expect((you.get(TraitType.HEALTH) as HealthTrait).health).toBe(2);
  });
});
