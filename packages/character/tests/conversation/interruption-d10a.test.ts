/**
 * ADR-320 D10a (2026-09-02) — the interruption rule as built, at the
 * scene-runtime and binding level: the thread-aware grip, and the parting
 * line rendered on every park-on-close path.
 *
 * Owner context: @sharpee/character / conversation tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  CharacterModelTrait,
} from '@sharpee/world-model';
import {
  strongerStrength,
  openScene,
  closeScene,
  applySceneDirectives,
  ageScenes,
  sceneOf,
  sceneWith,
  openThread,
  threadStateFor,
  createTraitMemoryAccess,
  registerCharacterScenes,
  type PartingLine,
} from '../../src/conversation';
import { CHARACTER_TURN_KEY } from '../../src/character-clock';

function person(world: WorldModel, name: string, player = false): IFEntity {
  const e = world.createEntity(name, 'actor');
  e.add(new IdentityTrait({ name }));
  e.add(new ActorTrait({ isPlayer: player }));
  e.add(new ContainerTrait());
  if (!player) e.add(new CharacterModelTrait());
  return e;
}

describe('strongerStrength (D10a — the thread-aware grip order)', () => {
  it('ranks blocking over assertive over passive, either argument order', () => {
    expect(strongerStrength('passive', 'blocking')).toBe('blocking');
    expect(strongerStrength('blocking', 'passive')).toBe('blocking');
    expect(strongerStrength('passive', 'assertive')).toBe('assertive');
    expect(strongerStrength('assertive', 'passive')).toBe('assertive');
    expect(strongerStrength('assertive', 'blocking')).toBe('blocking');
    expect(strongerStrength('passive', 'passive')).toBe('passive');
  });
});

describe('closeScene renders on parting on every park (D10a ruling 3)', () => {
  let world: WorldModel;
  let alice: IFEntity;
  let player: IFEntity;
  const memory = () => createTraitMemoryAccess(world);
  const lines: string[] = [];
  const partingLine: PartingLine = (ownerId, partnerId, threadKey) => {
    lines.push(`${ownerId}>${partnerId}:${threadKey}`);
    return threadKey === 'silent-thread' ? undefined : { messageId: `parting.${threadKey}`, params: { to: partnerId } };
  };

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 4);
    alice = person(world, 'Alice');
    player = person(world, 'Player', true);
    world.setPlayer(player.id);
    lines.length = 0;
  });

  it('an exit close parks the ACTIVE thread with its partner on the wire and delivers its parting line', () => {
    const { scene } = openScene(world, { participantIds: [alice.id, player.id], openedBy: { kind: 'address', openerId: player.id } });
    openThread(world, scene.id, alice.id, player.id, 'jacobs-hand');
    expect(threadStateFor(world, alice.id, player.id, 'jacobs-hand')?.status).toBe('active');

    const wire = closeScene(world, scene.id, 'exit', memory(), partingLine);

    expect(sceneOf(world, scene.id)).toBeUndefined();
    expect(threadStateFor(world, alice.id, player.id, 'jacobs-hand')?.status).toBe('parked');
    expect(wire.map((w) => w.kind)).toEqual(['thread-parked', 'thread-parting', 'scene-closed']);
    const parked = wire[0] as Extract<(typeof wire)[number], { kind: 'thread-parked' }>;
    expect(parked.partnerId).toBe(player.id);
    const parting = wire[1] as Extract<(typeof wire)[number], { kind: 'thread-parting' }>;
    expect(parting).toMatchObject({ ownerId: alice.id, partnerId: player.id, threadKey: 'jacobs-hand', messageId: 'parting.jacobs-hand', params: { to: player.id } });
    expect(lines).toEqual([`${alice.id}>${player.id}:jacobs-hand`]);
  });

  it('a thread with no authored parting parks silently — no thread-parting on the wire', () => {
    const { scene } = openScene(world, { participantIds: [alice.id, player.id], openedBy: { kind: 'address', openerId: player.id } });
    openThread(world, scene.id, alice.id, player.id, 'silent-thread');

    const wire = closeScene(world, scene.id, 'exit', memory(), partingLine);

    expect(threadStateFor(world, alice.id, player.id, 'silent-thread')?.status).toBe('parked');
    expect(wire.map((w) => w.kind)).toEqual(['thread-parked', 'scene-closed']);
  });

  it('no deliverer bound: today\'s behaviour, the park is silent', () => {
    const { scene } = openScene(world, { participantIds: [alice.id, player.id], openedBy: { kind: 'address', openerId: player.id } });
    openThread(world, scene.id, alice.id, player.id, 'jacobs-hand');

    const wire = closeScene(world, scene.id, 'exit', memory());

    expect(wire.map((w) => w.kind)).toEqual(['thread-parked', 'scene-closed']);
  });

  it('a silence close (ageScenes) and a close-scene directive both render the parting', () => {
    const a = openScene(world, { participantIds: [alice.id, player.id], openedBy: { kind: 'address', openerId: player.id } });
    openThread(world, a.scene.id, alice.id, player.id, 'jacobs-hand');
    world.setStateValue(CHARACTER_TURN_KEY, 40); // long past any decay threshold
    const aged = ageScenes(world, memory(), undefined, partingLine);
    expect(aged.map((w) => w.kind)).toEqual(['thread-parked', 'thread-parting', 'scene-closed']);
    expect(threadStateFor(world, alice.id, player.id, 'jacobs-hand')?.status).toBe('parked');

    const b = openScene(world, { participantIds: [alice.id, player.id], openedBy: { kind: 'address', openerId: player.id } });
    // A parked thread resumes, not re-opens: open a second key instead.
    openThread(world, b.scene.id, alice.id, player.id, 'second-hand');
    const directed = applySceneDirectives(world, b.scene.id, [{ kind: 'close-scene', boundary: 'exit' }], memory(), partingLine);
    expect(directed.map((w) => w.kind)).toEqual(['thread-parked', 'thread-parting', 'scene-closed']);
    expect(sceneWith(world, alice.id)).toBeUndefined();
  });
});

describe('resolveIntrusion meets a thread-aware grip (D10a ruling 2)', () => {
  let world: WorldModel;
  let alice: IFEntity;
  let bert: IFEntity;
  let player: IFEntity;
  const strengths: Record<string, 'passive' | 'assertive' | 'blocking'> = {};

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 4);
    alice = person(world, 'Alice');
    bert = person(world, 'Bert');
    player = person(world, 'Player', true);
    world.setPlayer(player.id);
    for (const k of Object.keys(strengths)) delete strengths[k];
    registerCharacterScenes(world, createTraitMemoryAccess(world), {
      activeThreadStrength: (_owner, _partner, key) => strengths[key],
      partingLine: (_owner, partner, key) => ({ messageId: `parting.${key}`, params: { to: partner } }),
    });
  });

  function seated(threadKey: string) {
    const { scene } = openScene(world, { participantIds: [alice.id, player.id], openedBy: { kind: 'address', openerId: player.id } });
    openThread(world, scene.id, alice.id, player.id, threadKey);
    return scene;
  }

  it('a blocking thread holds: the scene stays live, the thread stays active, nothing renders', () => {
    strengths['the-defection'] = 'blocking';
    const scene = seated('the-defection');

    const { outcome, wireEvents } = world.getSceneRuntime()!.resolveIntrusion(scene.id, bert.id, false);

    expect(outcome).toBe('blocks');
    expect(sceneOf(world, scene.id)).toBeDefined();
    expect(threadStateFor(world, alice.id, player.id, 'the-defection')?.status).toBe('active');
    expect(wireEvents.map((w) => w.kind)).toEqual(['interruption']);
  });

  it('a passive thread yields: the scene closes, the thread parks, its parting line rides the wire', () => {
    strengths['jacobs-hand'] = 'passive';
    const scene = seated('jacobs-hand');

    const { outcome, wireEvents } = world.getSceneRuntime()!.resolveIntrusion(scene.id, bert.id, false);

    expect(outcome).toBe('yields');
    expect(sceneOf(world, scene.id)).toBeUndefined();
    expect(threadStateFor(world, alice.id, player.id, 'jacobs-hand')?.status).toBe('parked');
    expect(wireEvents.map((w) => w.kind)).toEqual(['interruption', 'thread-parked', 'thread-parting', 'scene-closed']);
  });

  it('an assertive thread protests then yields', () => {
    strengths['kemp-hand'] = 'assertive';
    const scene = seated('kemp-hand');

    const { outcome } = world.getSceneRuntime()!.resolveIntrusion(scene.id, bert.id, false);

    expect(outcome).toBe('protests');
    expect(sceneOf(world, scene.id)).toBeUndefined();
    expect(threadStateFor(world, alice.id, player.id, 'kemp-hand')?.status).toBe('parked');
  });

  it('a world act breaks even a blocking thread (D8 exemption unchanged)', () => {
    strengths['the-defection'] = 'blocking';
    const scene = seated('the-defection');

    const { outcome } = world.getSceneRuntime()!.resolveIntrusion(scene.id, bert.id, true);

    expect(outcome).toBe('yields');
    expect(threadStateFor(world, alice.id, player.id, 'the-defection')?.status).toBe('parked');
  });

  it('the player addressing another NPC meets the same thread-aware grip (the pre-existing hole closes with it)', () => {
    strengths['the-defection'] = 'blocking';
    const scene = seated('the-defection');

    const { outcome } = world.getSceneRuntime()!.resolveIntrusion(scene.id, player.id, false);

    expect(outcome).toBe('blocks');
    expect(sceneOf(world, scene.id)).toBeDefined();
  });
});
