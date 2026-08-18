/**
 * Modeled-PC tick coverage (adr-320 contracts.md §2.1; Phase 5) — a player
 * entity carrying CharacterModelTrait gets interior upkeep (mood decay)
 * from the character-model phase without joining NPC turn scheduling: the
 * goal sub-step never runs for the PC.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
  CharacterModelTrait,
  TraitType,
} from '@sharpee/world-model';
import type { RandomService } from '@sharpee/core';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';

describe('modeled PC in the character-model phase', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Tiring House', 'room');
    room.add(new IdentityTrait({ name: 'Tiring House' }));
    room.add(new RoomTrait());
    room.add(new ContainerTrait());

    player = world.createEntity('Player', 'actor');
    player.add(new IdentityTrait({ name: 'Player' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    player.add(new CharacterModelTrait());
    world.setPlayer(player.id);
    world.moveEntity(player.id, room.id);

    registry = new CharacterPhaseRegistry();
  });

  function runPhase(npcs: IFEntity[] = []) {
    return createCharacterModelPhase(registry)(npcs, {
      world,
      turn: 1,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
    });
  }

  it('decays a modeled PC mood toward its baseline without NPC scheduling', () => {
    const trait = player.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.adjustMood(0.6, 0.6);
    const before = trait.moodValence;
    registry.register(player.id, { baselineMood: { valence: 0, arousal: 0 } });

    runPhase();

    expect(trait.moodValence).toBeLessThan(before);
    expect(trait.moodValence).toBeGreaterThan(0);
  });

  it('never routes the PC through the goal sub-step', () => {
    registry.register(player.id, {
      baselineMood: { valence: 0, arousal: 0 },
      goalDefs: [{
        id: 'pc-goal',
        activatesWhen: [],
        priority: 'medium',
        mode: 'sequential',
        steps: [{ type: 'act', messageId: 'pc-acts' }],
      }],
    });

    const events = runPhase();

    expect(events.filter((e) => e.type === 'character.goal.step')).toEqual([]);
  });

  it('an unmodeled PC is untouched (no model, no change)', () => {
    const bare = world.createEntity('Bare Player', 'actor');
    bare.add(new IdentityTrait({ name: 'Bare Player' }));
    bare.add(new ActorTrait({ isPlayer: true }));
    bare.add(new ContainerTrait());
    world.setPlayer(bare.id);
    world.moveEntity(bare.id, room.id);

    const events = createCharacterModelPhase(registry)([], {
      world,
      turn: 1,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: bare.id,
    });

    expect(events).toEqual([]);
  });
});
