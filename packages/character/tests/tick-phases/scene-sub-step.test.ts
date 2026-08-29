/**
 * scene-sub-step.test.ts — ADR-320 Phase 8: NPC↔NPC scenes as propagation
 * made visible (D10). Every assertion lands on real scene-store / trait /
 * memory state through the real tick phase, with sounds captured off the
 * context seam — never on return values alone.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { scaffoldEntry } from "./scaffold-entry";
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
  type SceneOccasion,
} from '@sharpee/world-model';
import type { RandomService, ISemanticEvent } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';
import {
  registerCharacterScenes,
  createTraitMemoryAccess,
} from '../../src/conversation/scene-binding';
import { readSceneStore } from '../../src/conversation/scene-store';
import { openScene } from '../../src/conversation/scene-runtime';

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, 'room');
  r.add(new IdentityTrait({ name }));
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function connect(a: IFEntity, b: IFEntity, dir: string, back: string): void {
  (a.get(TraitType.ROOM) as RoomTrait).exits[dir] = { destination: b.id };
  (b.get(TraitType.ROOM) as RoomTrait).exits[back] = { destination: a.id };
}

function actorIn(
  world: WorldModel,
  name: string,
  at: IFEntity,
  opts?: { player?: boolean; model?: boolean },
): IFEntity {
  const e = world.createEntity(name, 'actor');
  e.add(new IdentityTrait({ name }));
  e.add(new ActorTrait({ isPlayer: opts?.player ?? false }));
  e.add(new ContainerTrait());
  if (!opts?.player) e.add(new NpcTrait({}));
  if (opts?.model) e.add(new CharacterModelTrait());
  world.moveEntity(e.id, at.id);
  return e;
}

function traitOf(e: IFEntity): CharacterModelTrait {
  return e.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
}

describe('Phase 8 — the scenes sub-step (D10: propagation made visible)', () => {
  let world: WorldModel;
  let parlor: IFEntity;
  let hall: IFEntity;
  let player: IFEntity;
  let alice: IFEntity;
  let bert: IFEntity;
  let registry: CharacterPhaseRegistry;
  let sounds: ISound[];

  beforeEach(() => {
    world = new WorldModel();
    parlor = room(world, 'Parlor');
    hall = room(world, 'Hall');
    connect(parlor, hall, 'north', 'south');
    player = actorIn(world, 'Player', parlor, { player: true });
    world.setPlayer(player.id);
    alice = actorIn(world, 'Alice', parlor, { model: true });
    bert = actorIn(world, 'Bert', parlor, { model: true });
    registry = new CharacterPhaseRegistry();
    sounds = [];
    registerCharacterScenes(world, createTraitMemoryAccess(world));
  });

  function tick(
    turn: number,
    opts?: { npcs?: IFEntity[]; playerAt?: string; actionEvents?: ISemanticEvent[] },
  ): ISemanticEvent[] {
    return createCharacterModelPhase(registry)(opts?.npcs ?? [alice, bert], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: opts?.playerAt ?? world.getLocation(player.id)!,
      playerId: player.id,
      act: scaffoldEntry(world).act,
      actionEvents: opts?.actionEvents ?? [],
      emitSound: (s) => sounds.push(s),
    });
  }

  function chattyProfile(coloring?: 'conspiratorial' | 'dramatic' | 'neutral') {
    return {
      tendency: 'chatty' as const,
      audience: 'anyone' as const,
      pace: 'eager' as const,
      ...(coloring ? { coloring } : {}),
    };
  }

  function attackEvent(): ISemanticEvent {
    return {
      id: 'evt-attack-1',
      type: 'if.event.attacked',
      timestamp: 0,
      entities: { actor: player.id },
      data: { target: alice.id },
    };
  }

  describe('open on transfer', () => {
    beforeEach(() => {
      traitOf(alice).addFact('the-fire', 'witnessed', 'knows', 0);
      registry.register(alice.id, { propagationProfile: chattyProfile('conspiratorial') });
      registry.register(bert.id, { propagationProfile: { tendency: 'mute' } });
    });

    it('a wrappable transfer opens a scene with full bookkeeping on real state', () => {
      const events = tick(1);

      const scenes = Object.values(readSceneStore(world).scenes);
      expect(scenes).toHaveLength(1);
      const scene = scenes[0];
      expect(new Set(scene.participantIds)).toEqual(new Set([alice.id, bert.id]));
      expect(scene.openedBy).toEqual({ kind: 'initiative', openerId: alice.id });
      expect(scene.floorHolderId).toBe(alice.id);
      expect(scene.currentTopic).toBe('the-fire');
      // Scene stamps ride the dialogue-turn scale (mirror + 1).
      expect(scene.lastMoveTurn).toBe(2);

      // The fact actually moved (effects land) and both sides discussed it.
      expect(traitOf(bert).knows('the-fire')).toBe(true);
      expect(traitOf(alice).conversationMemory?.[bert.id]?.discussedTopics).toContain('the-fire');
      expect(traitOf(bert).conversationMemory?.[alice.id]?.discussedTopics).toContain('the-fire');

      // D16: the scene move stamps both participants' markers (dialogue-turn scale).
      expect(traitOf(alice).activeConversation).toMatchObject({ lastTurn: 2 });
      expect(traitOf(bert).activeConversation).toMatchObject({ lastTurn: 2 });

      // One surface: no legacy witnessed event, scene wire instead.
      expect(events.find((e) => e.type === 'character.propagation.witnessed')).toBeUndefined();
      expect(events.find((e) => e.type === 'character.scene.scene-opened')).toBeDefined();
      expect(events.find((e) => e.type === 'character.scene.utterance')).toBeDefined();

      // The conversation sound: coloring conspiratorial → whisper.
      expect(sounds).toHaveLength(1);
      expect(sounds[0]).toMatchObject({
        kind: 'speech',
        volumeTier: 'whisper',
        sourceEntity: alice.id,
        sourceLocation: parlor.id,
      });
      expect(sounds[0].content?.messageId).toBeDefined();
    });

    it('mutations land identically with the player elsewhere (AC8 unobserved face)', () => {
      tick(1, { playerAt: hall.id });

      const scenes = Object.values(readSceneStore(world).scenes);
      expect(scenes).toHaveLength(1);
      expect(traitOf(bert).knows('the-fire')).toBe(true);
      // The sound still emits — reception (silent vs graded) is the
      // dispatcher's job, not the tick's.
      expect(sounds).toHaveLength(1);
    });

    it('a party seated elsewhere keeps the transfer ambient (legacy witnessed event)', () => {
      const cara = actorIn(world, 'Cara', parlor, { model: true });
      openScene(world, {
        participantIds: [bert.id, cara.id],
        openedBy: { kind: 'initiative', openerId: bert.id },
      });

      const events = tick(1, { npcs: [alice, bert, cara] });

      // No second scene minted; Alice stays unseated.
      const scenes = Object.values(readSceneStore(world).scenes);
      expect(scenes).toHaveLength(1);
      expect(scenes[0].participantIds).not.toContain(alice.id);
      // The ambient path renders the legacy event (player present).
      expect(events.find((e) => e.type === 'character.propagation.witnessed')).toBeDefined();
      expect(sounds).toHaveLength(0);
    });
  });

  describe('open on goal say', () => {
    it('a completed say at a co-located modeled partner opens the scene and rides the sound path only', () => {
      registry.register(alice.id, {
        goalDefs: [{
          id: 'greet-bert',
          activatesWhen: [],
          priority: 'high',
          mode: 'sequential',
          steps: [{ type: 'say', messageId: 'alice-greets-bert', target: bert.id }],
        }],
      });

      const events = tick(1);

      const scenes = Object.values(readSceneStore(world).scenes);
      expect(scenes).toHaveLength(1);
      expect(scenes[0].openedBy).toEqual({ kind: 'initiative', openerId: alice.id });

      // One surface: the goal.step witnessed mint is suppressed for the
      // wrapped say — the utterance + sound carry it.
      expect(events.find((e) => e.type === 'character.goal.step')).toBeUndefined();
      const utterance = events.find((e) => e.type === 'character.scene.utterance');
      expect(utterance).toBeDefined();
      expect((utterance!.data as { messageId?: string }).messageId).toBe('alice-greets-bert');
      expect(sounds).toHaveLength(1);
      expect(sounds[0].content?.messageId).toBe('alice-greets-bert');
      expect(sounds[0].volumeTier).toBe('normal');
    });

    it('a say at an unmodeled partner keeps the legacy witnessed path', () => {
      const dora = actorIn(world, 'Dora', parlor); // no character model
      registry.register(alice.id, {
        goalDefs: [{
          id: 'greet-dora',
          activatesWhen: [],
          priority: 'high',
          mode: 'sequential',
          steps: [{ type: 'say', messageId: 'alice-greets-dora', target: dora.id }],
        }],
      });

      const events = tick(1, { npcs: [alice, bert, dora] });

      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(0);
      const step = events.find((e) => e.type === 'character.goal.step');
      expect(step).toBeDefined();
      expect((step!.data as { messageId?: string }).messageId).toBe('alice-greets-dora');
      expect(sounds).toHaveLength(0);
    });
  });

  describe('scene lifecycle across turns', () => {
    beforeEach(() => {
      traitOf(alice).addFact('the-fire', 'witnessed', 'knows', 0);
      registry.register(alice.id, { propagationProfile: chattyProfile() });
      registry.register(bert.id, { propagationProfile: { tendency: 'mute' } });
    });

    it('a seated participant whose goal moves it away closes the scene on exit', () => {
      openScene(world, {
        participantIds: [alice.id, bert.id],
        openedBy: { kind: 'initiative', openerId: alice.id },
      });
      registry.register(alice.id, {
        goalDefs: [{
          id: 'errand',
          activatesWhen: [],
          priority: 'high',
          mode: 'sequential',
          steps: [{ type: 'moveTo', target: hall.id }],
        }],
      });

      const events = tick(1);

      expect(world.getLocation(alice.id)).toBe(hall.id);
      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(0);
      const closed = events.find((e) => e.type === 'character.scene.scene-closed');
      expect(closed).toBeDefined();
      expect((closed!.data as { boundary?: string }).boundary).toBe('exit');
      expect(traitOf(alice).conversationMemory?.[bert.id]?.visits).toBe(1);
      expect(traitOf(bert).conversationMemory?.[alice.id]?.visits).toBe(1);
    });

    it('D16 holds a seated NPC in place until the conversation decays, then pursuit resumes', () => {
      registry.register(alice.id, {
        propagationProfile: chattyProfile(),
        goalDefs: [{
          id: 'errand',
          activatesWhen: [],
          priority: 'high',
          mode: 'sequential',
          steps: [{ type: 'moveTo', target: hall.id }],
        }],
      });

      // Turn 1: the goal has not yet been suppressed (no marker) — Alice
      // moves AND the transfer computed at co-location wraps; the scenes
      // sub-step then closes the just-opened scene on exit. To hold her,
      // seat the scene first so turn 1's goal check sees the marker.
      tick(1); // transfer opens scene + stamps markers (clock turn 2)
      // Alice moved turn 1 (marker not yet stamped when goals ran), so
      // the scene closed on exit the same turn — the emergent same-turn
      // race. Reset her for the suppression window proper.
      world.moveEntity(alice.id, parlor.id);
      (traitOf(alice).goalState['errand'] as { currentStep: number }).currentStep = 0;

      // Markers stamped at clock turn 2: suppression holds while
      // turnsSince(t, 2) < 4 — ticks 2 through 5.
      for (const t of [2, 3, 4, 5]) {
        tick(t);
        expect(world.getLocation(alice.id)).toBe(parlor.id);
      }

      // Tick 6: the window lapsed — pursuit resumes.
      tick(6);
      expect(world.getLocation(alice.id)).toBe(hall.id);
    });

    it('an unattended scene decays into a silence close at the threshold', () => {
      tick(1); // opens; lastMoveTurn 1; nothing further to tell
      for (const t of [2, 3, 4]) {
        tick(t);
        expect(Object.values(readSceneStore(world).scenes)).toHaveLength(1);
      }
      const events = tick(5); // 5 - 1 >= 4 → silence
      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(0);
      const closed = events.find((e) => e.type === 'character.scene.scene-closed');
      expect((closed!.data as { boundary?: string }).boundary).toBe('silence');
      expect(traitOf(alice).conversationMemory?.[bert.id]?.visits).toBe(1);
    });
  });

  describe('world acts and occasions', () => {
    it('a world act breaks even a blocking scene (D8 exemption)', () => {
      openScene(world, {
        participantIds: [alice.id, bert.id],
        openedBy: { kind: 'initiative', openerId: alice.id },
        strength: 'blocking',
      });

      const events = tick(1, { actionEvents: [attackEvent()] });

      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(0);
      const interruption = events.find((e) => e.type === 'character.scene.interruption');
      expect(interruption).toBeDefined();
      expect((interruption!.data as { outcome?: string }).outcome).toBe('yields');
      expect(traitOf(alice).conversationMemory?.[bert.id]?.visits).toBe(1);
    });

    it('a witnessed act seizes through the registered runner and opens a scene with the actor', () => {
      const calls: Array<{ pid: string; occasion: SceneOccasion; action?: string; audience?: string }> = [];
      registerCharacterScenes(world, createTraitMemoryAccess(world), {
        seizeInitiative: (pid, occasion, witnessedAction, audienceId) => {
          calls.push({ pid, occasion, action: witnessedAction, audience: audienceId });
          if (occasion.kind !== 'witnessed-event') return undefined;
          return {
            events: [],
            spokenMessageId: 'alice-condemns',
          };
        },
      });

      const events = tick(1, { npcs: [bert, alice], actionEvents: [attackEvent()] });

      // The first candidate in id order seized; the call carried the
      // committed action id and the act's actor as audience.
      const seizureCall = calls.find((c) => c.occasion.kind === 'witnessed-event');
      expect(seizureCall).toBeDefined();
      expect(seizureCall!.action).toBe('harm');
      expect(seizureCall!.audience).toBe(player.id);

      const scenes = Object.values(readSceneStore(world).scenes);
      expect(scenes).toHaveLength(1);
      expect(scenes[0].participantIds).toContain(player.id);
      const utterance = events.find((e) => e.type === 'character.scene.utterance');
      expect((utterance!.data as { messageId?: string }).messageId).toBe('alice-condemns');
      expect(sounds.some((s) => s.content?.messageId === 'alice-condemns')).toBe(true);
    });

    it('no forcing row means no seizure — disposition alone never seizes', () => {
      registerCharacterScenes(world, createTraitMemoryAccess(world), {
        seizeInitiative: () => undefined,
      });

      tick(1, { actionEvents: [attackEvent()] });

      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(0);
      expect(sounds).toHaveLength(0);
    });

    it('a subject change this turn offers the occasion with the abandoned topic', () => {
      traitOf(alice).addFact('the-fire', 'witnessed', 'knows', 0);
      traitOf(alice).addFact('the-will', 'witnessed', 'knows', 0);
      registry.register(alice.id, { propagationProfile: chattyProfile() });
      registry.register(bert.id, { propagationProfile: { tendency: 'mute' } });

      const occasions: SceneOccasion[] = [];
      registerCharacterScenes(world, createTraitMemoryAccess(world), {
        seizeInitiative: (pid, occasion) => {
          occasions.push(occasion);
          return undefined;
        },
      });

      tick(1); // eager pace shares both facts — second move abandons the first thread

      const change = occasions.find((o) => o.kind === 'subject-change');
      expect(change).toBeDefined();
      expect((change as Extract<SceneOccasion, { kind: 'subject-change' }>).abandonedTopicId)
        .toBe('the-fire');
    });

    it('a silence occasion one turn before decay can keep the scene alive', () => {
      traitOf(alice).addFact('the-fire', 'witnessed', 'knows', 0);
      registry.register(alice.id, { propagationProfile: chattyProfile() });
      registry.register(bert.id, { propagationProfile: { tendency: 'mute' } });

      registerCharacterScenes(world, createTraitMemoryAccess(world), {
        seizeInitiative: (pid, occasion) =>
          occasion.kind === 'silence'
            ? { events: [], spokenMessageId: 'alice-fills-the-silence' }
            : undefined,
      });

      tick(1); // opens, lastMoveTurn 2 (dialogue-turn scale)
      tick(2);
      tick(3);
      tick(4); // clock 5 - 2 === 3 → silence occasion fires, seizure is a move
      let scene = Object.values(readSceneStore(world).scenes)[0];
      expect(scene).toBeDefined();
      expect(scene.lastMoveTurn).toBe(5);

      tick(5); // clock 6 - 5 = 1 — alive
      scene = Object.values(readSceneStore(world).scenes)[0];
      expect(scene).toBeDefined();
      expect(sounds.some((s) => s.content?.messageId === 'alice-fills-the-silence')).toBe(true);
    });
  });

  describe('resolveIntrusion (binding)', () => {
    it('a passive scene yields to a non-world challenge — closed, memory folded', () => {
      const { scene } = openScene(world, {
        participantIds: [alice.id, bert.id],
        openedBy: { kind: 'initiative', openerId: alice.id },
      });

      const res = world.getSceneRuntime()!.resolveIntrusion(scene.id, player.id, false);

      expect(res.outcome).toBe('yields');
      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(0);
      expect(traitOf(alice).conversationMemory?.[bert.id]?.visits).toBe(1);
    });

    it('a blocking scene blocks a non-world challenge — nothing mutates', () => {
      const { scene } = openScene(world, {
        participantIds: [alice.id, bert.id],
        openedBy: { kind: 'initiative', openerId: alice.id },
        strength: 'blocking',
      });

      const res = world.getSceneRuntime()!.resolveIntrusion(scene.id, player.id, false);

      expect(res.outcome).toBe('blocks');
      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(1);
      expect(traitOf(alice).conversationMemory?.[bert.id]?.visits ?? 0).toBe(0);
    });

    it('an assertive scene protests then yields — closed, with the protest on the wire', () => {
      const { scene } = openScene(world, {
        participantIds: [alice.id, bert.id],
        openedBy: { kind: 'initiative', openerId: alice.id },
        strength: 'assertive',
      });

      const res = world.getSceneRuntime()!.resolveIntrusion(scene.id, player.id, false);

      expect(res.outcome).toBe('protests');
      expect(res.wireEvents[0]).toMatchObject({ kind: 'interruption', outcome: 'protests' });
      expect(Object.values(readSceneStore(world).scenes)).toHaveLength(0);
    });
  });

  describe('seized then-asks exchange (#273; ADR-320 Phase 10.3)', () => {
    const seizedExchange = () => ({
      exchangeId: 'alice.the-question',
      speakerId: alice.id,
      openedTurn: 1,
      responses: [],
    });

    it('an NPC-opened ask-beat opens its exchange against a player scene — no throw', () => {
      registerCharacterScenes(world, createTraitMemoryAccess(world), {
        seizeInitiative: (pid, occasion) =>
          occasion.kind === 'witnessed-event'
            ? {
                events: [],
                spokenMessageId: 'alice-demands',
                openExchange: seizedExchange(),
                openWord: 'asks',
              }
            : undefined,
      });

      const events = tick(1, { actionEvents: [attackEvent()] });

      // The scene opened with the actor (the player) and carries the open
      // exchange on real store state — the wedge case now serves.
      const scenes = Object.values(readSceneStore(world).scenes);
      expect(scenes).toHaveLength(1);
      expect(scenes[0].participantIds).toContain(player.id);
      expect(scenes[0].openExchange).toMatchObject({ exchangeId: 'alice.the-question' });
      const opened = events.find((e) => e.type === 'character.exchange.opened');
      expect(opened).toBeDefined();
      expect(opened!.data).toMatchObject({ exchangeId: 'alice.the-question', word: 'asks' });
    });

    it('an NPC↔NPC seizure drops the open silently — an exchange targets the player', () => {
      openScene(world, {
        participantIds: [alice.id, bert.id],
        openedBy: { kind: 'initiative', openerId: alice.id },
      });
      registerCharacterScenes(world, createTraitMemoryAccess(world), {
        seizeInitiative: (pid, occasion) =>
          occasion.kind === 'silence'
            ? {
                events: [],
                spokenMessageId: 'alice-fills-the-silence',
                openExchange: seizedExchange(),
                openWord: 'asks',
              }
            : undefined,
      });

      tick(1);
      tick(2);
      const events = tick(3); // silence occasion fires one turn before decay

      const scene = Object.values(readSceneStore(world).scenes)[0];
      expect(scene).toBeDefined();
      expect(scene.openExchange).toBeNull();
      expect(events.find((e) => e.type === 'character.exchange.opened')).toBeUndefined();
      // The seizure itself still served (the phrase spoke).
      expect(sounds.some((s) => s.content?.messageId === 'alice-fills-the-silence')).toBe(true);
    });
  });
});
