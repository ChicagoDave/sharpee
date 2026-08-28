/**
 * off-stage-narration.test.ts — ADR-328 D3 in the character phase: the
 * goal-step and influence narration events fire with the player in ANOTHER
 * room, carrying the room they happened in as `entities.location` (the
 * engine tags `presence` from it and the client decides). Phase 2b retired
 * the `=== playerLocation` gates; this file is the proof the gates are gone,
 * the counterpart of the story-loader's off-stage daemon tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  TraitType,
  NpcTrait,
  CharacterModelTrait,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
} from '@sharpee/world-model';
import type { RandomService, ISemanticEvent } from '@sharpee/core';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';

function createRoom(world: WorldModel, name: string): IFEntity {
  const room = world.createEntity(name, 'room');
  room.add(new IdentityTrait({ name }));
  room.add(new RoomTrait());
  room.add(new ContainerTrait());
  return room;
}

function createNpc(world: WorldModel, name: string, at: IFEntity): IFEntity {
  const npc = world.createEntity(name, 'actor');
  npc.add(new IdentityTrait({ name }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({}));
  npc.add(new CharacterModelTrait());
  world.moveEntity(npc.id, at.id);
  return npc;
}

describe('character narration fires off-stage, located (ADR-328 D3)', () => {
  let world: WorldModel;
  let kitchen: IFEntity;
  let garden: IFEntity;
  let player: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    world = new WorldModel();
    kitchen = createRoom(world, 'Kitchen');
    garden = createRoom(world, 'Garden');
    player = world.createEntity('Player', 'actor');
    player.add(new IdentityTrait({ name: 'Player' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
    world.moveEntity(player.id, garden.id); // the player is NOT in the Kitchen
    registry = new CharacterPhaseRegistry();
  });

  const tick = (npcs: IFEntity[], turn: number): ISemanticEvent[] =>
    createCharacterModelPhase(registry)(npcs, {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: garden.id,
      playerId: player.id,
    });

  const only = (events: ISemanticEvent[], type: string): ISemanticEvent[] => events.filter((e) => e.type === type);

  it('a goal step narrates from the NPC\'s room with the player elsewhere', () => {
    const cook = createNpc(world, 'Cook', kitchen);
    registry.register(cook.id, {
      goalDefs: [{
        id: 'greet', activatesWhen: [], priority: 'medium', mode: 'sequential',
        steps: [{ type: 'act', messageId: 'cook-greets' }],
      }],
    });
    const steps = only(tick([cook], 1), 'character.goal.step');
    expect(steps).toHaveLength(1);
    expect(steps[0].data).toMatchObject({ npcId: cook.id, messageId: 'cook-greets' });
    expect(steps[0].entities.actor).toBe(cook.id);
    expect(steps[0].entities.location).toBe(kitchen.id);
    expect(world.getLocation(player.id)).toBe(garden.id);
  });

  it('influence applied and resisted narrate from the room they happened in with the player elsewhere', () => {
    const colonel = createNpc(world, 'Colonel', kitchen);
    const cook = createNpc(world, 'Cook', kitchen);
    const maid = createNpc(world, 'Maid', kitchen);
    registry.register(colonel.id, {
      influenceDefs: [{
        name: 'intimidation', mode: 'passive', range: 'room',
        effect: { mood: 'nervous' }, duration: 'while present',
        witnessed: 'colonel-looms', resisted: 'colonel-looms-unfazed',
      }],
    });
    registry.register(maid.id, { resistanceDefs: [{ influenceName: 'intimidation' }] });

    const events = tick([colonel, cook, maid], 1);
    // The state change itself happened (the cook carries the effect) …
    const cookTrait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(cookTrait.influencesInForce.some((e) => e.influenceName === 'intimidation')).toBe(true);
    // … and both narrations fired, located at the Kitchen, not dropped.
    const applied = only(events, 'character.influence.applied');
    expect(applied).toHaveLength(1);
    expect(applied[0].data).toMatchObject({ influencerId: colonel.id, targetId: cook.id, messageId: 'colonel-looms' });
    expect(applied[0].entities.location).toBe(kitchen.id);
    const resisted = only(events, 'character.influence.resisted');
    expect(resisted).toHaveLength(1);
    expect(resisted[0].data).toMatchObject({ influencerId: colonel.id, targetId: maid.id, messageId: 'colonel-looms-unfazed' });
    expect(resisted[0].entities.location).toBe(kitchen.id);
  });

  it('an authored expiry narrates from the target\'s room with the player elsewhere', () => {
    const duchess = createNpc(world, 'Duchess', kitchen);
    const cook = createNpc(world, 'Cook', kitchen);
    registry.register(duchess.id, {
      influenceDefs: [{
        name: 'hauteur', mode: 'passive', range: 'room',
        effect: { mood: 'nervous' }, duration: 'while present',
        witnessed: 'duchess-arrives', expired: 'duchess-departs',
      }],
    });
    tick([duchess, cook], 1);
    const cookTrait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(cookTrait.influencesInForce.some((e) => e.influenceName === 'hauteur')).toBe(true);

    const pantry = createRoom(world, 'Pantry');
    world.moveEntity(duchess.id, pantry.id); // separation expires the while-present record
    const events = tick([duchess, cook], 2);
    expect(cookTrait.influencesInForce.some((e) => e.influenceName === 'hauteur')).toBe(false);
    const expired = only(events, 'character.influence.expired').filter(
      (e) => (e.data as { messageId?: string }).messageId === 'duchess-departs',
    );
    expect(expired).toHaveLength(1);
    expect(expired[0].data).toMatchObject({ targetId: cook.id, influencerId: duchess.id });
    expect(expired[0].entities.actor).toBe(duchess.id);
    expect(expired[0].entities.location).toBe(kitchen.id); // the cook's room, not the player's
  });
});
