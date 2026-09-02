/**
 * ADR-320 D10a (2026-09-02) — the tick's step 4a guard: an NPC whose
 * `opens when` thread is ready takes the floor from the scene the player
 * is seated in, through the same intrusion call the world-act and
 * player-address paths make. Asserted on persisted scene and thread
 * state, never on events alone.
 *
 * Owner context: @sharpee/character / tick-phases tests
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { scaffoldEntry } from './scaffold-entry';
import {
  WorldModel,
  IFEntity,
  NpcTrait,
  CharacterModelTrait,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
} from '@sharpee/world-model';
import type { RandomService, ISemanticEvent } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';
import { registerCharacterScenes, createTraitMemoryAccess } from '../../src/conversation/scene-binding';
import { readSceneStore, sceneWith } from '../../src/conversation/scene-store';
import { openScene } from '../../src/conversation/scene-runtime';
import { openThread, threadStateFor } from '../../src/conversation/thread-runtime';

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, 'room');
  r.add(new IdentityTrait({ name }));
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function actorIn(world: WorldModel, name: string, at: IFEntity, opts?: { player?: boolean }): IFEntity {
  const e = world.createEntity(name, 'actor');
  e.add(new IdentityTrait({ name }));
  e.add(new ActorTrait({ isPlayer: opts?.player ?? false }));
  e.add(new ContainerTrait());
  if (!opts?.player) {
    e.add(new NpcTrait({}));
    e.add(new CharacterModelTrait());
  }
  world.moveEntity(e.id, at.id);
  return e;
}

describe('step 4a — an opens-when thread interrupts the player\'s scene (D10a)', () => {
  let world: WorldModel;
  let ballroom: IFEntity;
  let player: IFEntity;
  let jacobs: IFEntity;
  let princess: IFEntity;
  let registry: CharacterPhaseRegistry;
  let sounds: ISound[];
  /** Which NPC is "dancing" — whose thread is ready toward the player. */
  let ready: Set<string>;
  /** Declared strength per thread key (the loader's IR read, stubbed). */
  let strengths: Record<string, 'passive' | 'assertive' | 'blocking'>;
  /** Thread turns served, in order. */
  let served: string[];

  beforeEach(() => {
    world = new WorldModel();
    ballroom = room(world, 'Ballroom');
    player = actorIn(world, 'Jacqueline', ballroom, { player: true });
    world.setPlayer(player.id);
    jacobs = actorIn(world, 'Jacobs', ballroom);
    princess = actorIn(world, 'Princess', ballroom);
    registry = new CharacterPhaseRegistry();
    sounds = [];
    ready = new Set();
    strengths = {};
    served = [];
    registerCharacterScenes(world, createTraitMemoryAccess(world), {
      threadTurnReady: (ownerId) => ready.has(ownerId),
      threadTurn: (ownerId, partnerId, sceneId) => {
        served.push(ownerId);
        const key = `${ownerId}-hand`;
        if (threadStateFor(world, ownerId, partnerId, key) === undefined) {
          openThread(world, sceneId, ownerId, partnerId, key);
        }
        return { events: [], spokenMessageId: `beat.${key}` };
      },
      activeThreadStrength: (_o, _p, key) => strengths[key],
      partingLine: (ownerId, partnerId, key) => ({ messageId: `parting.${key}`, params: { owner: ownerId, to: partnerId } }),
    });
  });

  function tick(turn: number): ISemanticEvent[] {
    return createCharacterModelPhase(registry)([jacobs, princess], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: ballroom.id,
      playerId: player.id,
      act: scaffoldEntry(world).act,
      actionEvents: [],
      emitSound: (s) => sounds.push(s),
    });
  }

  /** Seat the player with Jacobs, his thread ACTIVE at cursor 1. */
  function seatedWithJacobs(strength: 'passive' | 'assertive' | 'blocking') {
    const { scene } = openScene(world, {
      participantIds: [jacobs.id, player.id],
      openedBy: { kind: 'initiative', openerId: jacobs.id },
    });
    const key = `${jacobs.id}-hand`;
    openThread(world, scene.id, jacobs.id, player.id, key);
    threadStateFor(world, jacobs.id, player.id, key)!.beatCursor = 1;
    strengths[key] = strength;
    return scene;
  }

  it('a passive scene yields: Jacobs parks with his parting line, the Princess opens her scene and speaks', () => {
    const jacobsScene = seatedWithJacobs('passive');
    ready.add(princess.id);

    const events = tick(3);

    // Persisted state: Jacobs's scene gone, his thread parked at its cursor; the Princess seated with the player.
    expect(readSceneStore(world).scenes[jacobsScene.id]).toBeUndefined();
    const parked = threadStateFor(world, jacobs.id, player.id, `${jacobs.id}-hand`)!;
    expect(parked.status).toBe('parked');
    expect(parked.beatCursor).toBe(1);
    const now = sceneWith(world, player.id)!;
    expect(new Set(now.participantIds)).toEqual(new Set([princess.id, player.id]));
    expect(now.openedBy).toEqual({ kind: 'initiative', openerId: princess.id });
    expect(threadStateFor(world, princess.id, player.id, `${princess.id}-hand`)?.status).toBe('active');
    expect(served).toEqual([princess.id]);

    // The wire, in order: the challenge, the park with its parting, the close, then the new scene.
    const kinds = events.filter((e) => e.type.startsWith('character.scene.')).map((e) => e.type);
    expect(kinds.slice(0, 4)).toEqual([
      'character.scene.interruption',
      'character.scene.thread-parked',
      'character.scene.thread-parting',
      'character.scene.scene-closed',
    ]);
    expect(kinds).toContain('character.scene.scene-opened');
    // The prose event for the parting line, with the id the pipeline renders by.
    const parting = events.find((e) => e.type === 'character.thread.parting');
    expect(parting?.data).toMatchObject({ ownerId: jacobs.id, partnerId: player.id, messageId: `parting.${jacobs.id}-hand` });
    // The Princess's beat is voiced through the sound path, as every floor turn is.
    expect(sounds.map((s) => (s.content as { messageId: string }).messageId)).toContain(`beat.${princess.id}-hand`);
  });

  it('a blocking thread holds: nothing changes, the Princess is skipped this turn and tried again next', () => {
    const jacobsScene = seatedWithJacobs('blocking');
    ready.add(princess.id);

    const events = tick(3);

    expect(readSceneStore(world).scenes[jacobsScene.id]).toBeDefined();
    expect(threadStateFor(world, jacobs.id, player.id, `${jacobs.id}-hand`)?.status).toBe('active');
    expect(sceneWith(world, princess.id)).toBeUndefined();
    expect(threadStateFor(world, princess.id, player.id, `${princess.id}-hand`)).toBeUndefined();
    expect(served).toEqual([]);
    const interruption = events.find((e) => e.type === 'character.scene.interruption');
    expect(interruption?.data).toMatchObject({ interrupterId: princess.id, outcome: 'blocks' });
    expect(events.find((e) => e.type === 'character.thread.parting')).toBeUndefined();

    // Next turn, Jacobs's thread concluded out of the way: the same candidate now takes the floor.
    strengths[`${jacobs.id}-hand`] = 'passive';
    tick(4);
    expect(sceneWith(world, princess.id)).toBeDefined();
    expect(served).toEqual([princess.id]);
  });

  it('the NPC already seated with the player is not an intruder: the shared scene simply serves', () => {
    seatedWithJacobs('blocking');
    ready.add(jacobs.id);

    const events = tick(3);

    expect(events.find((e) => e.type === 'character.scene.interruption')).toBeUndefined();
    expect(served).toEqual([jacobs.id]);
    expect(threadStateFor(world, jacobs.id, player.id, `${jacobs.id}-hand`)?.status).toBe('active');
  });

  it('no scene to interrupt: the guard is inert and the thread opens as before', () => {
    ready.add(princess.id);

    const events = tick(3);

    expect(events.find((e) => e.type === 'character.scene.interruption')).toBeUndefined();
    expect(sceneWith(world, princess.id)).toBeDefined();
    expect(served).toEqual([princess.id]);
  });
});
