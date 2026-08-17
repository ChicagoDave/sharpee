/**
 * Scene runtime tests (ADR-320 D4/D6; Phase 5) — every assertion lands on
 * real store/memory state read back from the world, not on return values.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import {
  CHARACTER_SCENES_KEY,
  readSceneStore,
  liveScenes,
  sceneOf,
  sceneWith,
  openScene,
  closeScene,
  recordSceneMove,
  applySceneDirectives,
  ageScenes,
  createMapMemoryAccess,
} from '../../src/conversation';
import { CHARACTER_TURN_KEY } from '../../src/character-clock';

describe('openScene', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 4); // dialogueTurn = 5
  });

  it('persists the scene under character.scenes with a minted id and clock-seam turns', () => {
    const { scene } = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    });

    const stored = sceneOf(world, scene.id);
    expect(scene.id).toBe('scene-1');
    expect(stored).toBeDefined();
    expect(stored!.participantIds).toEqual(['npc-kemp', 'pc']);
    expect(stored!.openedTurn).toBe(5);
    expect(stored!.lastMoveTurn).toBe(5);
    expect(readSceneStore(world).nextSceneSeq).toBe(2);
  });

  it('gives an addressing opener the floor and emits scene-opened + floor-change', () => {
    const { scene, wireEvents } = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    });

    expect(sceneOf(world, scene.id)!.floorHolderId).toBe('pc');
    expect(wireEvents.map((e) => e.kind)).toEqual(['scene-opened', 'floor-change']);
  });

  it('leaves the floor contested on a witnessed-event opening', () => {
    const { scene, wireEvents } = openScene(world, {
      participantIds: ['npc-kemp', 'npc-burbage'],
      openedBy: { kind: 'witnessed-event', eventId: 'evt-1' },
    });

    expect(sceneOf(world, scene.id)!.floorHolderId).toBeNull();
    expect(wireEvents.map((e) => e.kind)).toEqual(['scene-opened']);
  });

  it('rejects fewer than two participants', () => {
    expect(() =>
      openScene(world, { participantIds: ['pc'], openedBy: { kind: 'address', openerId: 'pc' } }),
    ).toThrowError(/at least two participants/);
    expect(liveScenes(world)).toEqual([]);
  });

  it('rejects a participant already in a live scene, naming it', () => {
    openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    });

    expect(() =>
      openScene(world, {
        participantIds: ['pc', 'npc-burbage'],
        openedBy: { kind: 'address', openerId: 'pc' },
      }),
    ).toThrowError(/`pc` is already in scene `scene-1`/);
    expect(liveScenes(world)).toHaveLength(1);
  });
});

describe('closeScene', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 9); // dialogueTurn = 10
  });

  it('removes the scene and folds a visit into every ordered pair memory', () => {
    const memory = createMapMemoryAccess();
    const { scene } = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    });

    const events = closeScene(world, scene.id, 'exit', memory);

    expect(sceneOf(world, scene.id)).toBeUndefined();
    expect(sceneWith(world, 'pc')).toBeUndefined();
    expect(events).toEqual([{ kind: 'scene-closed', sceneId: scene.id, boundary: 'exit' }]);
    for (const [holder, partner] of [['npc-kemp', 'pc'], ['pc', 'npc-kemp']] as const) {
      const m = memory.get(holder, partner);
      expect(m?.visits).toBe(1);
      expect(m?.lastSceneClosedTurn).toBe(10);
    }
  });

  it('is idempotent: a dead id returns no events and touches no memory', () => {
    const memory = createMapMemoryAccess();
    expect(closeScene(world, 'scene-99', 'exit', memory)).toEqual([]);
    expect(memory.get('pc', 'npc-kemp')).toBeUndefined();
  });
});

describe('recordSceneMove', () => {
  it('stamps lastMoveTurn from the clock seam', () => {
    const world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 4);
    const { scene } = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    });

    world.setStateValue(CHARACTER_TURN_KEY, 7); // dialogueTurn = 8
    recordSceneMove(world, scene.id);

    expect(sceneOf(world, scene.id)!.lastMoveTurn).toBe(8);
    expect(sceneOf(world, scene.id)!.openedTurn).toBe(5);
  });
});

describe('applySceneDirectives', () => {
  let world: WorldModel;
  let sceneId: string;

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 4);
    sceneId = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    }).scene.id;
  });

  it('open-exchange sets the open exchange and stamps the move clock; close-exchange clears it', () => {
    const memory = createMapMemoryAccess();
    world.setStateValue(CHARACTER_TURN_KEY, 6); // dialogueTurn = 7

    applySceneDirectives(world, sceneId, [
      {
        kind: 'open-exchange',
        exchange: { exchangeId: 'the-offer', speakerId: 'npc-kemp', openedTurn: 7 },
      },
    ], memory);

    let scene = sceneOf(world, sceneId)!;
    expect(scene.openExchange?.exchangeId).toBe('the-offer');
    expect(scene.lastMoveTurn).toBe(7);

    applySceneDirectives(world, sceneId, [{ kind: 'close-exchange' }], memory);
    scene = sceneOf(world, sceneId)!;
    expect(scene.openExchange).toBeNull();
  });

  it('a second open-exchange replaces the first (at most one open)', () => {
    const memory = createMapMemoryAccess();
    applySceneDirectives(world, sceneId, [
      { kind: 'open-exchange', exchange: { exchangeId: 'first', speakerId: 'npc-kemp', openedTurn: 5 } },
      { kind: 'open-exchange', exchange: { exchangeId: 'second', speakerId: 'npc-kemp', openedTurn: 5 } },
    ], memory);

    expect(sceneOf(world, sceneId)!.openExchange?.exchangeId).toBe('second');
  });

  it('set-floor writes the holder and emits floor-change', () => {
    const memory = createMapMemoryAccess();
    const events = applySceneDirectives(world, sceneId, [
      { kind: 'set-floor', holderId: 'npc-kemp' },
    ], memory);

    expect(sceneOf(world, sceneId)!.floorHolderId).toBe('npc-kemp');
    expect(events).toEqual([{ kind: 'floor-change', sceneId, holderId: 'npc-kemp' }]);
  });

  it('close-scene closes with the boundary, folds memory, and ends the walk', () => {
    const memory = createMapMemoryAccess();
    const events = applySceneDirectives(world, sceneId, [
      { kind: 'close-scene', boundary: 'exit' },
      { kind: 'set-floor', holderId: 'npc-kemp' }, // after the close: must not apply
    ], memory);

    expect(sceneOf(world, sceneId)).toBeUndefined();
    expect(events).toEqual([{ kind: 'scene-closed', sceneId, boundary: 'exit' }]);
    expect(memory.get('pc', 'npc-kemp')?.visits).toBe(1);
  });

  it('a dead scene id is a no-op', () => {
    const memory = createMapMemoryAccess();
    expect(applySceneDirectives(world, 'scene-99', [{ kind: 'set-floor', holderId: 'pc' }], memory))
      .toEqual([]);
  });
});

describe('ageScenes', () => {
  it('closes scenes silent past the threshold on the silence boundary; fresh scenes live on', () => {
    const world = new WorldModel();
    const memory = createMapMemoryAccess();
    world.setStateValue(CHARACTER_TURN_KEY, 0); // dialogueTurn = 1
    const stale = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    }).scene;

    world.setStateValue(CHARACTER_TURN_KEY, 3); // dialogueTurn = 4
    const fresh = openScene(world, {
      participantIds: ['npc-burbage', 'npc-shakespeare'],
      openedBy: { kind: 'initiative', openerId: 'npc-burbage' },
    }).scene;

    world.setStateValue(CHARACTER_TURN_KEY, 4); // dialogueTurn = 5; stale silent 4 >= neutral 4
    const events = ageScenes(world, memory);

    expect(sceneOf(world, stale.id)).toBeUndefined();
    expect(sceneOf(world, fresh.id)).toBeDefined();
    expect(events).toEqual([{ kind: 'scene-closed', sceneId: stale.id, boundary: 'silence' }]);
    expect(memory.get('npc-kemp', 'pc')?.visits).toBe(1);
    expect(memory.get('npc-burbage', 'npc-shakespeare')).toBeUndefined();
  });

  it('an explicit threshold overrides the neutral default', () => {
    const world = new WorldModel();
    const memory = createMapMemoryAccess();
    world.setStateValue(CHARACTER_TURN_KEY, 0);
    const scene = openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    }).scene;

    world.setStateValue(CHARACTER_TURN_KEY, 2); // silent 2 turns
    ageScenes(world, memory, 2);

    expect(sceneOf(world, scene.id)).toBeUndefined();
  });
});

describe('interruption against a live scene (Acceptance 6)', () => {
  it('a blocking scene holds against a motivated interrupter; a world act breaks it and the close lands', async () => {
    const { scoreFloor: _unused, resolveInterruption, sceneGrip } = await import('../../src/conversation');
    const world = new WorldModel();
    const memory = createMapMemoryAccess();
    world.setStateValue(CHARACTER_TURN_KEY, 0);
    const { scene } = openScene(world, {
      participantIds: ['npc-kemp', 'npc-burbage'],
      openedBy: { kind: 'initiative', openerId: 'npc-kemp' },
      strength: 'blocking',
    });

    const challenge = (worldAct: boolean) => ({
      sceneId: scene.id,
      interrupterId: 'pc',
      bid: {
        participantId: 'pc',
        occasion: { kind: 'open-floor' as const, sceneId: scene.id },
        readings: [{ force: 'desire' as const, intensity: 0.9, live: true, feed: 'goal:poach-kemp' }],
      },
      worldAct,
    });

    // The live scene's grip blocks a mere motivated interjection...
    expect(resolveInterruption(challenge(false), sceneGrip(sceneOf(world, scene.id)!))).toBe('blocks');
    expect(sceneOf(world, scene.id)).toBeDefined();

    // ...but a world act breaks even blocking (D8), and the close mutates the store.
    expect(resolveInterruption(challenge(true), sceneGrip(sceneOf(world, scene.id)!))).toBe('yields');
    applySceneDirectives(world, scene.id, [{ kind: 'close-scene', boundary: 'exit' }], memory);
    expect(sceneOf(world, scene.id)).toBeUndefined();
    expect(memory.get('npc-kemp', 'npc-burbage')?.visits).toBe(1);
  });
});

describe('scene store serialization home', () => {
  it('the whole store rides the character.scenes world-state key', () => {
    const world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 0);
    openScene(world, {
      participantIds: ['npc-kemp', 'pc'],
      openedBy: { kind: 'address', openerId: 'pc' },
    });

    const raw = world.getStateValue(CHARACTER_SCENES_KEY) as { scenes: Record<string, unknown> };
    expect(Object.keys(raw.scenes)).toEqual(['scene-1']);
  });
});
