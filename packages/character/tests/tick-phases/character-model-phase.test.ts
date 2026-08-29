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

  function runPhase(turn = 1) {
    const handler = createCharacterModelPhase(registry);
    return handler([maid, cook, ginger], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
      act: () => { throw new Error('no act expected in this test'); },
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
    // (conditionHeld: the edge sample that activated it — seam-1 ruling)
    expect(cookTrait.goalState['greet']).toEqual({
      active: false, currentStep: 0, paused: false, interrupted: false, prepared: false,
      conditionHeld: true,
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

  describe('influence edge minting and overlay (ADR-310 D8)', () => {
    it('mints ONE witnessed event per exertion, however many co-located targets', () => {
      const events = runPhase();

      const applied = events.filter(e => e.type === 'character.influence.applied');
      expect(applied).toHaveLength(1);
      const data = applied[0].data as { messageId: string; targetIds: string[] };
      expect(data.messageId).toBe('ginger-brushes-against');
      expect(data.targetIds.sort()).toEqual([cook.id, maid.id, player.id].sort());
    });

    it('mints nothing while the influence stays in force — events mark transitions', () => {
      runPhase(1);
      const second = runPhase(2);
      const third = runPhase(3);

      expect(second.some(e => e.type === 'character.influence.applied')).toBe(false);
      expect(third.some(e => e.type === 'character.influence.applied')).toBe(false);
    });

    it('separation expires while-present records; re-entry re-transitions and re-fires', () => {
      runPhase(1);
      const cookTrait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
      expect(cookTrait.influencesInForce.some(e => e.influenceName === 'seduction')).toBe(true);

      const elsewhere = createRoom(world, 'Garden');
      world.moveEntity(ginger.id, elsewhere.id);
      const afterLeave = runPhase(2);

      expect(cookTrait.influencesInForce.some(e => e.influenceName === 'seduction')).toBe(false);
      expect(afterLeave.some(e => e.type === 'character.influence.expired')).toBe(true);
      expect(afterLeave.some(e => e.type === 'character.influence.applied')).toBe(false);

      world.moveEntity(ginger.id, room.id);
      const afterReturn = runPhase(3);

      expect(cookTrait.influencesInForce.some(e => e.influenceName === 'seduction')).toBe(true);
      expect(afterReturn.filter(e => e.type === 'character.influence.applied')).toHaveLength(1);
    });

    it('mints resisted per resisting target on its own transition, once', () => {
      const colonel = createNpc(world, 'Colonel', new CharacterModelTrait());
      world.moveEntity(colonel.id, room.id);
      registry.register(colonel.id, {
        influenceDefs: [{
          name: 'intimidation',
          mode: 'passive',
          range: 'room',
          effect: { mood: 'nervous' },
          duration: 'while present',
          witnessed: 'colonel-looms',
          resisted: 'colonel-looms-unfazed',
        }],
      });
      // The maid alone resists; the cook and player are still applied targets.
      registry.register(maid.id, {
        propagationProfile: { tendency: 'chatty', audience: 'anyone' },
        resistanceDefs: [{ influenceName: 'intimidation' }],
      });
      const handler = createCharacterModelPhase(registry);
      const tick = (turn: number) => handler([maid, cook, ginger, colonel], {
        world, turn, random: {} as unknown as RandomService,
        playerLocation: room.id, playerId: player.id,
      act: () => { throw new Error('no act expected in this test'); },
      });

      const first = tick(1);
      const maidTrait = maid.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
      const record = maidTrait.influencesInForce.find(e => e.influenceName === 'intimidation');
      expect(record?.status).toBe('resisted');
      // The resisted overlay never masks the maid's own state.
      expect(maidTrait.evaluate('nervous')).toBe(false);

      const resisted = first.filter(e => e.type === 'character.influence.resisted');
      expect(resisted).toHaveLength(1);
      expect(resisted[0].data).toMatchObject({
        influencerId: colonel.id, targetId: maid.id, messageId: 'colonel-looms-unfazed',
      });

      // While the resistance holds it is a level, not a transition: no re-mint.
      const second = tick(2);
      expect(second.some(e => e.type === 'character.influence.resisted')).toBe(false);
    });

    it('expiry mints the authored release phrase as messageId; unauthored expiry stays textless', () => {
      const duchess = createNpc(world, 'Duchess', new CharacterModelTrait());
      world.moveEntity(duchess.id, room.id);
      registry.register(duchess.id, {
        influenceDefs: [{
          name: 'hauteur',
          mode: 'passive',
          range: 'room',
          effect: { mood: 'nervous' },
          duration: 'while present',
          witnessed: 'duchess-arrives',
          expired: 'duchess-departs',
        }],
      });
      const handler = createCharacterModelPhase(registry);
      const tick = (turn: number) => handler([maid, cook, ginger, duchess], {
        world, turn, random: {} as unknown as RandomService,
        playerLocation: room.id, playerId: player.id,
      act: () => { throw new Error('no act expected in this test'); },
      });

      tick(1);
      const elsewhere = createRoom(world, 'Conservatory');
      world.moveEntity(duchess.id, elsewhere.id);
      world.moveEntity(ginger.id, elsewhere.id); // ginger's def authors no expired phrase
      const after = tick(2);

      const expired = after.filter(e => e.type === 'character.influence.expired');
      const authored = expired.filter(e => (e.data as { messageId?: string }).messageId !== undefined);
      const silent = expired.filter(e => (e.data as { messageId?: string }).messageId === undefined);

      expect(authored.length).toBeGreaterThan(0);
      expect(authored[0].data).toMatchObject({
        influenceName: 'hauteur',
        messageId: 'duchess-departs',
        influencerId: duchess.id,
        influencerName: 'Duchess',
      });
      // Ginger's seduction expiries carry no messageId — silence is the default.
      expect(silent.length).toBeGreaterThan(0);
      expect(silent.every(e => (e.data as { influenceName: string }).influenceName === 'seduction')).toBe(true);
    });

    it('overlays effective mood and threat on targets while in force, reverting on separation', () => {
      const john = createNpc(world, 'John', new CharacterModelTrait());
      world.moveEntity(john.id, room.id);
      registry.register(john.id, {
        influenceDefs: [{
          name: 'menace',
          mode: 'passive',
          range: 'room',
          effect: { mood: 'nervous', threat: 'wary' },
          duration: 'while present',
          witnessed: 'john-menace-noticed',
        }],
      });
      const handler = createCharacterModelPhase(registry);
      const tick = (turn: number) => handler([maid, cook, ginger, john], {
        world, turn, random: {} as unknown as RandomService,
        playerLocation: room.id, playerId: player.id,
      act: () => { throw new Error('no act expected in this test'); },
      });

      tick(1);
      const cookTrait = cook.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
      // Effective state carries the influence; base state is untouched.
      expect(cookTrait.evaluate('nervous')).toBe(true);
      expect(cookTrait.getMood()).toBe('calm');
      expect(cookTrait.getEffectiveThreatValue()).toBeGreaterThan(cookTrait.threatValue);

      const elsewhere = createRoom(world, 'Cellar');
      world.moveEntity(john.id, elsewhere.id);
      tick(2);
      // Instant unmasking — nothing to undo because nothing was written.
      expect(cookTrait.evaluate('nervous')).toBe(false);
      expect(cookTrait.evaluate('calm')).toBe(true);
      expect(cookTrait.getEffectiveThreatValue()).toBe(cookTrait.threatValue);
    });
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
      act: () => { throw new Error('no act expected in this test'); },
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
      act: () => { throw new Error('no act expected in this test'); },
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
      act: () => { throw new Error('no act expected in this test'); },
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
      act: () => { throw new Error('no act expected in this test'); },
    });

    // A double decay (old inline call + phase sub-step) would leave 1
    expect(trait.lucidityWindowTurns).toBe(2);
  });
});
