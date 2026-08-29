/**
 * Statement-site tests (ADR-320 D11; Phase 6) — derived from the
 * witnessStatement Behavior Statement: every DOES line asserts on real
 * hearer/speaker trait state (facts, beliefs, told-record, ledger,
 * pressure), never on return values alone.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { unexpectedAct } from "../tick-phases/scaffold-entry";
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  CharacterModelTrait,
  TraitType,
} from '@sharpee/world-model';
import type { RandomService, ISemanticEvent } from '@sharpee/core';
import { witnessStatement } from '../../src/act-detection';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';

function makeActor(world: WorldModel, name: string, modeled: boolean): IFEntity {
  const actor = world.createEntity(name, 'actor');
  actor.add(new IdentityTrait({ name }));
  actor.add(new ActorTrait({ isPlayer: false }));
  actor.add(new ContainerTrait());
  if (modeled) actor.add(new CharacterModelTrait());
  return actor;
}

function traitOf(entity: IFEntity): CharacterModelTrait {
  return entity.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
}

describe('witnessStatement (ADR-320 D11)', () => {
  let world: WorldModel;
  let speaker: IFEntity;
  let hearer: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    speaker = makeActor(world, 'Player', false);
    hearer = makeActor(world, 'Burbage', true);
  });

  it('lands the topic as told/believes knowledge on a modeled hearer', () => {
    const { learned } = witnessStatement(world, speaker.id, 'the play-book', [hearer], 5);

    const trait = traitOf(hearer);
    expect(trait.knows('the play-book')).toBe(true);
    expect(trait.getFact('the play-book')).toMatchObject({ source: 'told', confidence: 'believes' });
    expect(learned[hearer.id]).toEqual(['the play-book']);
  });

  it('an explicit claim tag lands its value as the hearer belief', () => {
    witnessStatement(world, speaker.id, 'kemp', [hearer], 5, {
      factId: 'kemp-leaving',
      value: 'staying',
    });

    expect(traitOf(hearer).getFactBelief('kemp-leaving')).toMatchObject({
      value: 'staying',
      source: 'told',
      confidence: 'believes',
    });
  });

  it('never displaces a belief the hearer already holds (D14 territory)', () => {
    traitOf(hearer).setFactBelief('kemp-leaving', {
      value: 'leaving', confidence: 'certain', source: 'witnessed',
      turnLearned: 1, resistance: 'none',
    });

    witnessStatement(world, speaker.id, 'kemp', [hearer], 5, {
      factId: 'kemp-leaving',
      value: 'staying',
    });

    expect(traitOf(hearer).getFactBelief('kemp-leaving')!.value).toBe('leaving');
  });

  it('a modeled speaker held value rides without a claim tag, and hearers land on the told-record', () => {
    const modeledSpeaker = makeActor(world, 'Agent', true);
    traitOf(modeledSpeaker).setFactBelief('the-globe', {
      value: 'finished', confidence: 'believes', source: 'witnessed',
      turnLearned: 1, resistance: 'none',
    });

    witnessStatement(world, modeledSpeaker.id, 'the-globe', [hearer], 5);

    expect(traitOf(hearer).getFactBelief('the-globe')).toMatchObject({ value: 'finished', source: 'told' });
    expect(traitOf(modeledSpeaker).hasTold(hearer.id, 'the-globe')).toBe(true);
  });

  it('a modeled speaker lying via a claim tag mints a pinned ledger entry per hearer and deposits pressure', () => {
    const modeledSpeaker = makeActor(world, 'Agent', true);
    const second = makeActor(world, 'Kemp', true);
    traitOf(modeledSpeaker).setFactBelief('mission', {
      value: 'poaching', confidence: 'certain', source: 'witnessed',
      turnLearned: 1, resistance: 'none',
    });

    witnessStatement(world, modeledSpeaker.id, 'mission', [hearer, second], 5, {
      factId: 'mission',
      value: 'sightseeing',
    });

    const ledger = traitOf(modeledSpeaker).ledger;
    expect(ledger).toHaveLength(2);
    expect(ledger.map((e) => e.audience).sort()).toEqual([hearer.id, second.id].sort());
    expect(ledger[0]).toMatchObject({ kind: 'claim', factId: 'mission', claimedValue: 'sightseeing', pinned: true });
    expect(traitOf(modeledSpeaker).pressure.value).toBeGreaterThan(0);
  });

  it('skips the speaker and leaves unmodeled hearers untouched', () => {
    const bare = makeActor(world, 'Stagehand', false);
    const modeledSpeaker = makeActor(world, 'Agent', true);

    const { learned } = witnessStatement(
      world, modeledSpeaker.id, 'the play-book', [modeledSpeaker, bare, hearer], 5,
    );

    expect(learned[modeledSpeaker.id]).toBeUndefined();
    expect(learned[bare.id]).toBeUndefined();
    expect(traitOf(modeledSpeaker).knows('the play-book')).toBe(false);
    expect(bare.has(TraitType.CHARACTER_MODEL)).toBe(false);
    expect(traitOf(hearer).knows('the play-book')).toBe(true);
  });
});

describe('the observe sub-step statement site (if.event.told)', () => {
  it('a player TELL event lands the normalized topic in every co-located modeled hearer', () => {
    const world = new WorldModel();
    const room = world.createEntity('Globe Stage', 'room');
    room.add(new IdentityTrait({ name: 'Globe Stage' }));
    room.add(new RoomTrait());
    room.add(new ContainerTrait());

    const player = makeActor(world, 'Player', false);
    world.setPlayer(player.id);
    world.moveEntity(player.id, room.id);
    const target = makeActor(world, 'Burbage', true);
    world.moveEntity(target.id, room.id);
    const bystander = makeActor(world, 'Kemp', true);
    world.moveEntity(bystander.id, room.id);

    const told: ISemanticEvent = {
      id: 't1', type: 'if.event.told', timestamp: 0,
      entities: { actor: player.id, target: target.id },
      data: { topic: 'The Play-Book' },
    };

    const events = createCharacterModelPhase(new CharacterPhaseRegistry())([target, bystander], {
      world,
      turn: 1,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
      act: unexpectedAct,
      actionEvents: [told],
    });

    // Both the addressee and the bystander heard it — normalized topic key
    // (normalizeTopic lowercases and strips the leading article)
    expect(traitOf(target).knows('play-book')).toBe(true);
    expect(traitOf(bystander).knows('play-book')).toBe(true);
    const witnessed = events.find((e) => e.type === 'character.author.statement_witnessed');
    expect(witnessed).toBeDefined();
    expect((witnessed!.data as { topic?: string }).topic).toBe('play-book');
  });
});
