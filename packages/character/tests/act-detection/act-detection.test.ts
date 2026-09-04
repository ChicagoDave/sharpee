/**
 * Act-detection tests (ADR-318 D4/D7/D12a)
 *
 * The three named sites fire against real dispatched state: taking →
 * steal-candidate (through the real NpcService), combat → harm, reveal →
 * topic delivery. witnessActs assertions land on observer trait knowledge.
 */

import { describe, it, expect } from 'vitest';
import {
  WorldModel,
  IFEntity,
  TraitType,
  NpcTrait,
  CharacterModelTrait,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
} from '@sharpee/world-model';
import type { ISemanticEvent } from '@sharpee/core';
import {
  detectActs,
  revealConfidedTopic,
  witnessActs,
  derivedTopicFor,
} from '../../src/act-detection';

function makeWorld() {
  const world = new WorldModel();
  const room = world.createEntity('Parlor', 'room');
  room.add(new RoomTrait());
  room.add(new ContainerTrait());
  const player = world.createEntity('Player', 'actor');
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.setPlayer(player.id);
  world.moveEntity(player.id, room.id);
  return { world, room, player };
}

function makeNpc(world: WorldModel, name: string, behaviorId?: string): IFEntity {
  const npc = world.createEntity(name, 'actor');
  npc.add(new IdentityTrait({ name }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait(behaviorId ? { behaviorId } : {}));
  npc.add(new CharacterModelTrait({}));
  return npc;
}

describe('derivedTopicFor (D12a — deterministic actor × act names)', () => {
  it('derives past-tense names for categories and face-acts', () => {
    expect(derivedTopicFor('the Colonel', 'backs down')).toBe('the Colonel backed down');
    expect(derivedTopicFor('the Steward', 'steal')).toBe('the Steward stole');
    expect(derivedTopicFor('the Maid', 'betray a confidence')).toBe('the Maid betrayed a confidence');
    expect(derivedTopicFor('the Cook', 'caught lying')).toBe('the Cook was caught lying');
  });
});

describe('taking site → steal-candidate', () => {
  it('classifies an NPC take out of another actor\'s possession via if.event.taken (the pipeline\'s own fact, ADR-328 D5)', () => {
    const { world, room } = makeWorld();
    const thief = makeNpc(world, 'Weasel');
    const victim = makeNpc(world, 'Colonel');
    world.moveEntity(thief.id, room.id);
    world.moveEntity(victim.id, room.id);

    // The taking action, run as the thief, emits `if.event.taken` with the
    // prior holder in `fromLocation` — the same fact a player take carries.
    const event: ISemanticEvent = {
      id: 'e0', type: 'if.event.taken', timestamp: 0,
      entities: { actor: thief.id },
      data: { item: 'gold watch', fromLocation: victim.id },
    };

    expect(detectActs(event, world)).toEqual([{
      category: 'steal',
      actorId: thief.id,
      targetId: victim.id,
      derivedTopic: 'Weasel stole',
    }]);
  });

  it('does not fire for a take from the floor', () => {
    const { world, room } = makeWorld();
    const npc = makeNpc(world, 'Weasel');
    world.moveEntity(npc.id, room.id);
    const coin = world.createEntity('coin', 'object');
    world.moveEntity(coin.id, room.id);      // on the floor, owned by no one

    const event: ISemanticEvent = {
      id: 'e1', type: 'if.event.taken', timestamp: 0,
      entities: { actor: npc.id },
      data: { item: 'coin', fromLocation: room.id },
    };

    expect(detectActs(event, world)).toEqual([]);
  });

  it('classifies a player take out of an actor inventory via if.event.taken', () => {
    const { world, player } = makeWorld();
    const victim = makeNpc(world, 'Colonel');

    const event: ISemanticEvent = {
      id: 'e2', type: 'if.event.taken', timestamp: 0,
      entities: { actor: player.id },
      data: { item: 'gold watch', fromLocation: victim.id },
    };

    const acts = detectActs(event, world);
    expect(acts).toHaveLength(1);
    expect(acts[0].category).toBe('steal');
    expect(acts[0].actorId).toBe(player.id);
    expect(acts[0].targetId).toBe(victim.id);
    // ADR-310 D10: player-actor topics derive from the stable token, not
    // the self-referential display name ('yourself stole').
    expect(acts[0].derivedTopic).toBe('the player stole');
  });
});

describe('combat site → harm', () => {
  it('classifies an NPC\'s if.event.attacked into a harm act', () => {
    const { world } = makeWorld();
    const brute = makeNpc(world, 'Brute');
    const victim = makeNpc(world, 'Vicar');

    const event: ISemanticEvent = {
      id: 'e3', type: 'if.event.attacked', timestamp: 0,
      entities: { actor: brute.id },
      data: { target: victim.id },
    };

    expect(detectActs(event, world)).toEqual([{
      category: 'harm',
      actorId: brute.id,
      targetId: victim.id,
      derivedTopic: 'Brute harmed',
    }]);
  });
});

describe('reveal site → topic delivery', () => {
  it('detects betrayal only for topics marked confided', () => {
    const { world } = makeWorld();
    const maid = makeNpc(world, 'Maid');
    const trait = maid.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.knowledge['the secret'] = {
      source: 'told', confidence: 'certain', turnLearned: 0, confided: true,
    };
    trait.knowledge['the weather'] = {
      source: 'witnessed', confidence: 'certain', turnLearned: 0,
    };

    const betrayal = revealConfidedTopic(maid, trait, 'the secret');
    expect(betrayal).toEqual({
      category: 'betray a confidence',
      actorId: maid.id,
      derivedTopic: 'Maid betrayed a confidence',
    });

    expect(revealConfidedTopic(maid, trait, 'the weather')).toBeUndefined();
    expect(revealConfidedTopic(maid, trait, 'unknown-topic')).toBeUndefined();
  });
});

describe('witnessActs (D12a minting onto observer knowledge)', () => {
  it('records the derived topic on every modeled observer except the actor', () => {
    const { world } = makeWorld();
    const brute = makeNpc(world, 'Brute');
    const vicar = makeNpc(world, 'Vicar');
    const maid = makeNpc(world, 'Maid');

    const act = {
      category: 'harm' as const,
      actorId: brute.id,
      targetId: vicar.id,
      derivedTopic: 'Brute harmed',
    };

    const learned = witnessActs([act], [brute, vicar, maid], 4);

    const vicarTrait = vicar.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    const maidTrait = maid.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    const bruteTrait = brute.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

    expect(vicarTrait.getFact('Brute harmed')).toMatchObject({
      source: 'witnessed', confidence: 'certain', turnLearned: 4,
    });
    expect(maidTrait.knows('Brute harmed')).toBe(true);
    expect(bruteTrait.knows('Brute harmed')).toBe(false);
    expect(learned).toEqual({
      [vicar.id]: ['Brute harmed'],
      [maid.id]: ['Brute harmed'],
    });
  });

  it('does not re-learn or overwrite an already-known topic', () => {
    const { world } = makeWorld();
    const brute = makeNpc(world, 'Brute');
    const vicar = makeNpc(world, 'Vicar');
    const trait = vicar.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.addFact('Brute harmed', 'told', 'suspects', 1);

    const learned = witnessActs([{
      category: 'harm', actorId: brute.id, derivedTopic: 'Brute harmed',
    }], [vicar], 9);

    // The earlier, weaker fact survives — witnessing does not upgrade it here
    expect(trait.getFact('Brute harmed')).toMatchObject({
      source: 'told', confidence: 'suspects', turnLearned: 1,
    });
    expect(learned).toEqual({});
  });
});
