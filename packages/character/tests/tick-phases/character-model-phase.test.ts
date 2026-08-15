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
  registerCharacterModelPhase,
  CHARACTER_MODEL_PHASE_NAME,
} from '../../src/tick-phases';
import { createNpcService, CharacterMessages } from '@sharpee/stdlib';

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

describe('decay sub-step (ADR-310 D6 — runtime-owned curves)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let npc: IFEntity;
  let trait: CharacterModelTrait;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    world = new WorldModel();
    room = createRoom(world, 'Parlor');
    player = createPlayer(world);
    world.moveEntity(player.id, room.id);

    trait = new CharacterModelTrait({ mood: 'calm' });
    npc = createNpc(world, 'Vicar', trait);
    world.moveEntity(npc.id, room.id);

    registry = new CharacterPhaseRegistry();
  });

  function runPhase(turn = 1) {
    const handler = createCharacterModelPhase(registry);
    return handler([npc], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
    });
  }

  it('moves mood valence-arousal toward the configured baseline each turn', () => {
    registry.register(npc.id, {
      baselineMood: { valence: trait.moodValence, arousal: trait.moodArousal },
    });
    const baseValence = trait.moodValence;
    const baseArousal = trait.moodArousal;
    trait.setMood('furious');
    const disturbedValence = trait.moodValence;
    const disturbedArousal = trait.moodArousal;

    runPhase();

    // One step closer to baseline on both axes, not yet arrived
    expect(Math.abs(trait.moodValence - baseValence)).toBeLessThan(Math.abs(disturbedValence - baseValence));
    expect(Math.abs(trait.moodArousal - baseArousal)).toBeLessThan(Math.abs(disturbedArousal - baseArousal));
    expect(trait.getMood()).not.toBe('calm');

    // Enough turns settle it exactly at baseline (snap threshold ends the drift)
    for (let t = 2; t < 60; t++) runPhase(t);
    expect(trait.moodValence).toBe(baseValence);
    expect(trait.moodArousal).toBe(baseArousal);
    expect(trait.getMood()).toBe('calm');
  });

  it('emits MOOD_CHANGED when the drift crosses a mood-word boundary', () => {
    registry.register(npc.id, {
      baselineMood: { valence: trait.moodValence, arousal: trait.moodArousal },
    });
    trait.setMood('furious');

    const seen: string[] = [];
    for (let t = 1; t < 60; t++) {
      for (const e of runPhase(t)) {
        if (e.type === CharacterMessages.MOOD_CHANGED) {
          seen.push((e.data as { to: string }).to);
        }
      }
    }

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBe('calm');
  });

  it('leaves mood untouched when no baseline is configured', () => {
    registry.register(npc.id, {});
    trait.setMood('furious');
    const valence = trait.moodValence;
    const arousal = trait.moodArousal;

    const events = runPhase();

    expect(trait.moodValence).toBe(valence);
    expect(trait.moodArousal).toBe(arousal);
    expect(events.some(e => e.type === CharacterMessages.MOOD_CHANGED)).toBe(false);
  });

  it('counts down the lucidity window and restores baseline (the NpcService fold)', () => {
    trait.lucidityConfig = {
      baseline: 'settled',
      triggers: {},
      decay: 'gradual',
      decayRate: 'fast',
    };
    trait.enterLucidityState('elsewhere', 2);

    const first = runPhase(1);
    expect(trait.currentLucidityState).toBe('elsewhere');
    expect(trait.lucidityWindowTurns).toBe(1);
    expect(first.some(e => e.type === CharacterMessages.LUCIDITY_BASELINE_RESTORED)).toBe(false);

    const second = runPhase(2);
    expect(trait.currentLucidityState).toBe('settled');
    expect(second.some(e => e.type === CharacterMessages.LUCIDITY_BASELINE_RESTORED)).toBe(true);
  });

  it('runs decay before influence in the assembled phase', () => {
    registry.register(npc.id, {
      baselineMood: { valence: trait.moodValence, arousal: trait.moodArousal },
    });
    const influencer = createNpc(world, 'Ginger', new CharacterModelTrait());
    world.moveEntity(influencer.id, room.id);
    registry.register(influencer.id, {
      influenceDefs: [{
        name: 'seduction',
        mode: 'passive',
        range: 'proximity',
        effect: { focus: 'clouded' },
        duration: 'while present',
        witnessed: 'ginger-brushes-against',
      }],
    });
    trait.setMood('furious');

    const handler = createCharacterModelPhase(registry);
    const events = handler([npc, influencer], {
      world, turn: 1, random: {} as unknown as RandomService,
      playerLocation: room.id, playerId: player.id,
    });

    const firstDecay = events.findIndex(e => e.type === CharacterMessages.MOOD_CHANGED);
    const firstInfluence = events.findIndex(e => e.type === 'character.influence.applied');
    expect(firstDecay).toBeGreaterThanOrEqual(0);
    expect(firstInfluence).toBeGreaterThan(firstDecay);
  });
});

describe('registerCharacterModelPhase — real NpcService socket (ADR-310 D15)', () => {
  it('registers under the contract name and runs during service.tick()', () => {
    const world = new WorldModel();
    const room = createRoom(world, 'Kitchen');
    const player = createPlayer(world);
    world.moveEntity(player.id, room.id);

    const trait = new CharacterModelTrait({ mood: 'calm' });
    const npc = createNpc(world, 'Vicar', trait);
    world.moveEntity(npc.id, room.id);

    const registry = new CharacterPhaseRegistry();
    registry.register(npc.id, {
      baselineMood: { valence: trait.moodValence, arousal: trait.moodArousal },
    });
    trait.setMood('furious');
    const disturbedValence = trait.moodValence;

    expect(CHARACTER_MODEL_PHASE_NAME).toBe('character-model');

    const service = createNpcService();
    registerCharacterModelPhase(service, registry);

    service.tick({
      world,
      turn: 1,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
    });

    // The phase actually ran inside the service's turn: the decay sub-step
    // moved the trait's mood axes.
    expect(trait.moodValence).not.toBe(disturbedValence);
  });

  it('lucidity decays exactly once per tick (inline NpcService decay is gone)', () => {
    const world = new WorldModel();
    const room = createRoom(world, 'Kitchen');
    const player = createPlayer(world);
    world.moveEntity(player.id, room.id);

    const trait = new CharacterModelTrait({ mood: 'calm' });
    trait.lucidityConfig = {
      baseline: 'settled',
      triggers: {},
      decay: 'gradual',
      decayRate: 'slow',
    };
    const npc = createNpc(world, 'Vicar', trait);
    world.moveEntity(npc.id, room.id);

    const registry = new CharacterPhaseRegistry();
    registry.register(npc.id, {});
    trait.enterLucidityState('elsewhere', 3);

    const service = createNpcService();
    registerCharacterModelPhase(service, registry);

    service.tick({
      world, turn: 1, random: {} as unknown as RandomService,
      playerLocation: room.id, playerId: player.id,
    });

    // A double decay (old inline call + phase sub-step) would leave 1
    expect(trait.lucidityWindowTurns).toBe(2);
  });
});
