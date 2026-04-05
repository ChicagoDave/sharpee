/**
 * Integration test: ADR-141 character model end-to-end
 *
 * Verifies all three layers communicate through ADR-070 behavior hooks:
 * - Layer 1: CharacterModelTrait (world-model) stores state
 * - Layer 2: observeEvent / processLucidityDecay (stdlib) updates state
 * - Layer 3: CharacterBuilder (character package) configures state
 *
 * Uses a minimal scenario: NPC "Margaret" witnesses violence, threat increases,
 * mood shifts, lucidity decays back to baseline, predicates evaluate correctly,
 * and NpcTrait functions alongside CharacterModelTrait on the same entity.
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
import {
  observeEvent,
  processLucidityDecay,
  enterLucidityWindow,
  CharacterMessages,
} from '@sharpee/stdlib';
import {
  CharacterBuilder,
  applyCharacter,
  COGNITIVE_PRESETS,
} from '../src';
import { ISemanticEvent } from '@sharpee/core';

// ---------------------------------------------------------------------------
// Test world setup
// ---------------------------------------------------------------------------

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

function createNpc(
  world: WorldModel,
  name: string,
  behaviorId?: string,
): IFEntity {
  const npc = world.createEntity(name, 'actor');
  npc.add(new IdentityTrait({ name }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({ isAlive: true, isConscious: true, behaviorId }));
  return npc;
}

function createAttackEvent(actorId: string, targetId: string): ISemanticEvent {
  return {
    id: `attack_${Date.now()}`,
    type: 'npc.attacked',
    timestamp: Date.now(),
    entities: { actor: actorId, target: targetId },
  };
}

function createGivingEvent(actorId: string): ISemanticEvent {
  return {
    id: `give_${Date.now()}`,
    type: 'if.action.giving',
    timestamp: Date.now(),
    entities: { actor: actorId },
  };
}

// ===========================================================================
// Integration tests
// ===========================================================================

describe('ADR-141 end-to-end integration', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    room = createRoom(world, 'Library');
    player = createPlayer(world);
    world.moveEntity(player.id, room.id);
  });

  it('should build, apply, observe, and decay a full character lifecycle', () => {
    // ----- Layer 3: Build character with CharacterBuilder -----
    const compiled = new CharacterBuilder('margaret')
      .personality('very honest', 'very loyal', 'cowardly')
      .knows('murder', { witnessed: true, confidence: 'certain' })
      .loyalTo('lady-grey')
      .likes('player')
      .mood('nervous')
      .threat('safe')
      .cognitiveProfile('ptsd')
      .filters({ misses: ['quiet actions'], amplifies: ['attacked'] })
      .lucidity({
        baseline: 'drifting',
        triggers: {
          'npc.attacked': { target: 'flashback', transition: 'immediate' },
        },
        decay: 'gradual',
        decayRate: 'fast',
      })
      .goal('protect-lady-grey', 10)
      .definePredicate('in-danger', (t) => t.threatValue > 50)
      .on('player threatens')
        .becomes('panicked')
        .feelsAbout('player', 'wary of')
      .compile();

    // ----- Layer 1: Apply to entity -----
    const margaret = createNpc(world, 'Margaret');
    world.moveEntity(margaret.id, room.id);
    const trait = applyCharacter(margaret, compiled);

    // Verify both traits coexist
    expect(margaret.has(TraitType.NPC)).toBe(true);
    expect(margaret.has(TraitType.CHARACTER_MODEL)).toBe(true);

    // Verify initial state
    expect(trait.getPersonality('honest')).toBe(0.8);
    expect(trait.getPersonality('loyal')).toBe(0.8);
    expect(trait.getPersonality('cowardly')).toBe(0.6);
    expect(trait.getDispositionWord('lady-grey')).toBe('devoted to');
    expect(trait.getDispositionWord('player')).toBe('likes');
    expect(trait.getMood()).toBe('nervous');
    expect(trait.getThreat()).toBe('safe');
    expect(trait.knows('murder')).toBe(true);
    expect(trait.hasGoal('protect-lady-grey')).toBe(true);
    expect(trait.cognitiveProfile.perception).toBe('filtered');
    expect(trait.currentLucidityState).toBe('drifting');

    // Verify predicates
    expect(trait.evaluate('honest')).toBe(true);
    expect(trait.evaluate('cowardly')).toBe(true);
    expect(trait.evaluate('not threatened')).toBe(true);
    expect(trait.evaluate('in-danger')).toBe(false);

    // NpcTrait still works independently
    const npcTrait = margaret.get(TraitType.NPC) as NpcTrait;
    expect(npcTrait.isAlive).toBe(true);
    expect(npcTrait.isConscious).toBe(true);

    // ----- Layer 2: Observe a violence event -----
    const attackEvent = createAttackEvent(player.id, margaret.id);
    const observeEvents = observeEvent(margaret, attackEvent, world, 1);

    // Threat increased (amplified: +30 * 2 = +60)
    expect(trait.threatValue).toBe(60);
    expect(trait.getThreat()).toBe('threatened');
    expect(trait.evaluate('threatened')).toBe(true);
    expect(trait.evaluate('in-danger')).toBe(true);

    // Mood shifted negative
    expect(trait.getMood()).not.toBe('nervous'); // shifted by violence

    // Lucidity trigger fired (npc.attacked → flashback, immediate)
    expect(trait.currentLucidityState).toBe('flashback');

    // Observable events were emitted
    expect(observeEvents.some(e => e.type === CharacterMessages.THREAT_CHANGED)).toBe(true);
    expect(observeEvents.some(e => e.type === CharacterMessages.LUCIDITY_SHIFT)).toBe(true);
    expect(observeEvents.some(e => e.type === CharacterMessages.FACT_LEARNED)).toBe(true);

    // ----- Layer 2: Lucidity decay over turns -----
    enterLucidityWindow(trait, 'flashback'); // 'fast' = 2 turns

    // Turn 2: decay
    let decayEvents = processLucidityDecay(margaret, world, 2);
    expect(decayEvents.length).toBe(0);
    expect(trait.currentLucidityState).toBe('flashback');

    // Turn 3: baseline restored
    decayEvents = processLucidityDecay(margaret, world, 3);
    expect(decayEvents.length).toBe(1);
    expect(decayEvents[0].type).toBe(CharacterMessages.LUCIDITY_BASELINE_RESTORED);
    expect(trait.currentLucidityState).toBe('drifting');

    // ----- Kindness: disposition improves -----
    const giveEvent = createGivingEvent(player.id);
    observeEvent(margaret, giveEvent, world, 4);

    // Disposition adjusts toward the event actor's entity ID.
    // Builder used the string 'player'; the event actor is player.id.
    // Both exist as separate disposition keys — matching story code
    // where authors would use the actual entity ID or a known alias.
    expect(trait.getDispositionValue(player.id)).toBe(10);
    // Original builder-set disposition is unchanged
    expect(trait.getDispositionValue('player')).toBe(40);
  });

  it('should handle NPC with schizophrenic profile and hallucinations', () => {
    const compiled = new CharacterBuilder('eleanor')
      .personality('very curious', 'honest', 'slightly paranoid')
      .cognitiveProfile('schizophrenic')
      .likes('player')
      .mood('anxious')
      .knows('murder', { witnessed: true })
      .lucidity({
        baseline: 'fragmented',
        triggers: {},
        decay: 'gradual',
        decayRate: 'slow',
      })
      .perceives('shadow-figure', {
        when: 'hallucinating',
        as: 'witnessed',
        content: 'shadow-figure',
      })
      .compile();

    const eleanor = createNpc(world, 'Eleanor');
    world.moveEntity(eleanor.id, room.id);
    const trait = applyCharacter(eleanor, compiled);

    // Verify schizophrenic profile
    expect(trait.cognitiveProfile).toEqual(COGNITIVE_PRESETS.schizophrenic);
    expect(trait.evaluate('fragmented')).toBe(true);
    expect(trait.evaluate('belief resistant')).toBe(true);

    // Enter hallucinating state
    trait.enterLucidityState('hallucinating');
    expect(trait.evaluate('hallucinating')).toBe(true);
    expect(trait.evaluate('lucid')).toBe(false);

    // Observe any event — hallucination should be injected
    const someEvent: ISemanticEvent = {
      id: 'test', type: 'npc.spoke', timestamp: Date.now(), entities: {},
    };
    const events = observeEvent(eleanor, someEvent, world, 5);

    // Shadow figure hallucinated
    expect(trait.knows('shadow-figure')).toBe(true);
    expect(trait.getFact('shadow-figure')?.source).toBe('hallucinated');
    expect(events.some(e => e.type === CharacterMessages.HALLUCINATION_ONSET)).toBe(true);
  });

  it('should skip filtered events for PTSD character', () => {
    const compiled = new CharacterBuilder('james')
      .personality('honest', 'very stubborn')
      .cognitiveProfile('ptsd')
      .filters({
        misses: ['quiet'],
        amplifies: ['sudden', 'loud'],
      })
      .mood('calm')
      .threat('safe')
      .compile();

    const james = createNpc(world, 'James');
    world.moveEntity(james.id, room.id);
    const trait = applyCharacter(james, compiled);

    // Quiet event should be missed entirely
    const quietEvent: ISemanticEvent = {
      id: 'q1', type: 'quiet actions', timestamp: Date.now(), entities: {},
    };
    const events = observeEvent(james, quietEvent, world, 1);
    expect(events.length).toBe(0);
    expect(trait.knows('quiet actions')).toBe(false);
    expect(trait.threatValue).toBe(0);
  });

  it('should coexist with NpcTrait without interference', () => {
    const compiled = new CharacterBuilder('guard')
      .personality('stubborn')
      .mood('calm')
      .threat('safe')
      .compile();

    const guard = createNpc(world, 'Guard', 'guard-behavior');
    world.moveEntity(guard.id, room.id);
    applyCharacter(guard, compiled);

    // NpcTrait operations work
    const npcTrait = guard.get(TraitType.NPC) as NpcTrait;
    expect(npcTrait.behaviorId).toBe('guard-behavior');
    npcTrait.isHostile = true;
    expect(npcTrait.isHostile).toBe(true);

    // CharacterModelTrait operations work independently
    const charTrait = guard.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    charTrait.setMood('angry');
    expect(charTrait.getMood()).toBe('angry');

    // NpcTrait unaffected by CharacterModelTrait changes
    expect(npcTrait.isAlive).toBe(true);
    expect(npcTrait.isConscious).toBe(true);
  });
});
