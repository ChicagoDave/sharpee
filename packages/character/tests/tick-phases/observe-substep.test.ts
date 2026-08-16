/**
 * observe-substep.test.ts — ADR-310 Phase 5: the observe sub-step
 * forwards the turn's player-action events (ctx.actionEvents) to
 * co-located character-model NPCs through stdlib's observeEvent.
 * Assertions land on trait state: threat/mood deltas and the witnessed
 * fact. Room-scoped; traitless NPCs untouched (D7); absent actionEvents
 * observe nothing.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  NpcTrait,
  CharacterModelTrait,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
  TraitType,
} from '@sharpee/world-model';
import type { RandomService, ISemanticEvent } from '@sharpee/core';
import { CharacterPhaseRegistry, createCharacterModelPhase, CHARACTER_TURN_KEY } from '../../src/tick-phases';

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, 'room');
  r.add(new IdentityTrait({ name }));
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function npcIn(world: WorldModel, name: string, at: IFEntity, withModel: boolean): IFEntity {
  const npc = world.createEntity(name, 'actor');
  npc.add(new IdentityTrait({ name }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({}));
  if (withModel) npc.add(new CharacterModelTrait());
  world.moveEntity(npc.id, at.id);
  return npc;
}

const ATTACK_EVENT: ISemanticEvent = {
  id: 'e1',
  type: 'if.event.attacked',
  timestamp: 0,
  entities: { actor: 'player' },
  data: {},
};

describe('Phase 5 — observe sub-step over ctx.actionEvents', () => {
  let world: WorldModel;
  let kitchen: IFEntity;
  let cellar: IFEntity;
  let player: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    world = new WorldModel();
    kitchen = room(world, 'Kitchen');
    cellar = room(world, 'Cellar');
    player = world.createEntity('Player', 'actor');
    player.add(new IdentityTrait({ name: 'Player' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
    world.moveEntity(player.id, kitchen.id);
    registry = new CharacterPhaseRegistry();
  });

  function runPhase(npcs: IFEntity[], actionEvents?: ISemanticEvent[]) {
    return createCharacterModelPhase(registry)(npcs, {
      world,
      turn: 3,
      random: {} as unknown as RandomService,
      playerLocation: kitchen.id,
      playerId: player.id,
      ...(actionEvents ? { actionEvents } : {}),
    });
  }

  it('a co-located character-model NPC observes the action: threat rises, the fact is witnessed', () => {
    const cook = npcIn(world, 'Cook', kitchen, true);
    const trait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    const threatBefore = trait.threatValue;

    runPhase([cook], [ATTACK_EVENT]);

    expect(trait.threatValue).toBeGreaterThan(threatBefore);
    expect(trait.knowledge['if.event.attacked']).toMatchObject({ source: 'witnessed', turnLearned: 3 });
  });

  it('an NPC in another room observes nothing', () => {
    const ghost = npcIn(world, 'Ghost', cellar, true);
    const trait = ghost.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

    runPhase([ghost], [ATTACK_EVENT]);

    expect(trait.threatValue).toBe(0);
    expect(trait.knowledge['if.event.attacked']).toBeUndefined();
  });

  it('no actionEvents in the context observes nothing (older callers unchanged)', () => {
    const cook = npcIn(world, 'Cook', kitchen, true);
    const trait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

    runPhase([cook]);

    expect(trait.threatValue).toBe(0);
    expect(trait.knowledge['if.event.attacked']).toBeUndefined();
  });

  it('every tick mirrors its turn into world state (the dialogue surfaces read it back)', () => {
    const cook = npcIn(world, 'Cook', kitchen, true);
    expect(world.getStateValue(CHARACTER_TURN_KEY)).toBeUndefined();
    runPhase([cook]);
    expect(world.getStateValue(CHARACTER_TURN_KEY)).toBe(3);
  });

  it('an NPC without the trait is untouched and produces no events (D7)', () => {
    const guard = npcIn(world, 'Guard', kitchen, false);
    const events = runPhase([guard], [ATTACK_EVENT]);
    expect(events).toEqual([]);
    expect(guard.has(TraitType.CHARACTER_MODEL)).toBe(false);
  });

  it('act detection: a witnessed theft lands the derived topic — aliased when the story declares one (D12a)', () => {
    const cook = npcIn(world, 'Cook', kitchen, true);
    const victim = npcIn(world, 'Victim', kitchen, true);
    const thief = npcIn(world, 'Thief', kitchen, false);
    registry.setWitnessedAliases([
      { actor: thief.id, act: 'steal', alias: 'the-kitchen-theft' },
    ]);

    const theft: ISemanticEvent = {
      id: 'e2',
      type: 'if.event.taken',
      timestamp: 0,
      entities: { actor: thief.id },
      data: { fromLocation: victim.id },
    };
    const events = runPhase([cook, victim, thief], [theft]);

    // Both character-model observers learn the ALIASED topic as witnessed fact.
    const cookTrait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(cookTrait.knowledge['the-kitchen-theft']).toMatchObject({ source: 'witnessed', turnLearned: 3 });
    const victimTrait = victim.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(victimTrait.knowledge['the-kitchen-theft']).toMatchObject({ source: 'witnessed' });
    expect(events.some((e) => e.type === 'character.author.act_witnessed')).toBe(true);
  });

  it('act detection without a declared alias records the deterministic derived topic', () => {
    const cook = npcIn(world, 'Cook', kitchen, true);
    const victim = npcIn(world, 'Victim', kitchen, true);
    const thief = npcIn(world, 'Thief', kitchen, false);

    const theft: ISemanticEvent = {
      id: 'e3',
      type: 'if.event.taken',
      timestamp: 0,
      entities: { actor: thief.id },
      data: { fromLocation: victim.id },
    };
    runPhase([cook, victim, thief], [theft]);

    const cookTrait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(cookTrait.knowledge['Thief stole']).toMatchObject({ source: 'witnessed' });
  });
});
