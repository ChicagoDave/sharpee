/**
 * Integration test: the assembled character-model tick phase (ADR-310 D15/D17)
 *
 * Exercises the single handler createCharacterModelPhase returns against a
 * real WorldModel: influence → propagation → goals run in order in one call,
 * every mutation lands on CharacterModelTrait state, and witnessed events
 * come back in sub-step order.
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
import type { RandomService } from '@sharpee/core';
import {
  CharacterPhaseRegistry,
  createCharacterModelPhase,
} from '../../src/tick-phases';

function createRoom(world: WorldModel, name: string): IFEntity {
  const room = world.createEntity(name, 'room');
  room.add(new IdentityTrait({ name }));
  room.add(new RoomTrait());
  room.add(new ContainerTrait());
  return room;
}

function createPlayer(world: WorldModel): IFEntity {
  const player = world.createEntity('Player', 'actor');
  player.add(new IdentityTrait({ name: 'Player' }));
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.setPlayer(player.id);
  return player;
}

function createNpc(world: WorldModel, name: string, trait?: CharacterModelTrait): IFEntity {
  const npc = world.createEntity(name, 'actor');
  npc.add(new IdentityTrait({ name }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({}));
  if (trait) npc.add(trait);
  return npc;
}

describe('createCharacterModelPhase — assembled phase over a real world', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let maid: IFEntity;
  let cook: IFEntity;
  let ginger: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    world = new WorldModel();
    room = createRoom(world, 'Kitchen');
    player = createPlayer(world);
    world.moveEntity(player.id, room.id);

    maid = createNpc(world, 'Maid', new CharacterModelTrait({
      knowledge: { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
    }));
    cook = createNpc(world, 'Cook', new CharacterModelTrait());
    ginger = createNpc(world, 'Ginger', new CharacterModelTrait());
    for (const npc of [maid, cook, ginger]) world.moveEntity(npc.id, room.id);

    registry = new CharacterPhaseRegistry();
    registry.register(maid.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone' },
    });
    registry.register(cook.id, {
      propagationProfile: { tendency: 'mute' },
      goalDefs: [{
        id: 'greet',
        activatesWhen: [],
        priority: 'medium',
        mode: 'sequential',
        steps: [{ type: 'act', messageId: 'cook-greets' }],
      }],
    });
    registry.register(ginger.id, {
      influenceDefs: [{
        name: 'seduction',
        mode: 'passive',
        range: 'proximity',
        effect: { focus: 'clouded' },
        duration: 'while present',
        witnessed: 'ginger-brushes-against',
      }],
    });
  });

  function runPhase() {
    const handler = createCharacterModelPhase(registry);
    return handler([maid, cook, ginger], {
      world,
      turn: 1,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
    });
  }

  it('runs all three sub-steps in one call, mutating trait state', () => {
    const events = runPhase();

    // Influence sub-step: NPC targets carry the effect on their own traits
    const cookTrait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(cookTrait.influencesInForce.some(e =>
      e.influenceName === 'seduction' && e.influencerId === ginger.id && e.target === undefined,
    )).toBe(true);

    // ... and the player-targeted record rides the exerter's trait (D17 home rule)
    const gingerTrait = ginger.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(gingerTrait.influencesInForce.some(e => e.target === player.id)).toBe(true);

    // Propagation sub-step: the fact moved, provenance on both sides
    expect(cookTrait.knows('murder')).toBe(true);
    expect(cookTrait.getFact('murder')!.source).toBe('told');
    const maidTrait = maid.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(maidTrait.hasTold(cook.id, 'murder')).toBe(true);

    // Goal sub-step: single-step goal fired its witnessed act and completed
    expect(cookTrait.goalState['greet']).toEqual({
      active: false, currentStep: 0, paused: false, interrupted: false, prepared: false,
    });
    expect(events.some(e => e.type === 'character.goal.step')).toBe(true);
  });

  it('returns events in sub-step order: influence, propagation, goals', () => {
    const events = runPhase();
    const firstInfluence = events.findIndex(e => e.type === 'character.influence.applied');
    const firstPropagation = events.findIndex(e => e.type === 'character.propagation.witnessed');
    const firstGoal = events.findIndex(e => e.type === 'character.goal.step');

    expect(firstInfluence).toBeGreaterThanOrEqual(0);
    expect(firstPropagation).toBeGreaterThan(firstInfluence);
    expect(firstGoal).toBeGreaterThan(firstPropagation);
  });

  it('does not re-propagate on a second run (told-record holds)', () => {
    runPhase();
    const secondRun = runPhase();

    expect(secondRun.some(e => e.type === 'character.propagation.witnessed')).toBe(false);
  });
});
