/**
 * evaluator-registry.test.ts — ADR-240 Phase 1: the generic per-world
 * evaluator registry and the darkness read points consulting it live.
 * Asserts on registry state semantics (undefined-when-unregistered,
 * idempotent last-wins, per-world isolation, AuthorModel delegation) and
 * on all three VisibilityBehavior read sites honoring a registered
 * `dark.<roomId>` evaluator in BOTH directions, with the unregistered
 * fall-through unchanged.
 */
import { WorldModel } from '../../../src/world/WorldModel';
import { AuthorModel } from '../../../src/world/AuthorModel';
import { VisibilityBehavior, darkKey } from '../../../src/world/VisibilityBehavior';
import { IFEntity } from '../../../src/entities/if-entity';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';

describe('ADR-240 evaluator registry', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  it('evaluate() returns undefined for an unregistered key — never throws, never false', () => {
    expect(world.evaluate('dark.nowhere')).toBeUndefined();
  });

  it('runs the registered evaluator against the LIVE world at every consult', () => {
    let flag = false;
    world.registerEvaluator('test.flag', () => flag);
    expect(world.evaluate('test.flag')).toBe(false);
    flag = true; // mutations are instant — the next consult sees current truth
    expect(world.evaluate('test.flag')).toBe(true);
  });

  it('re-registration is idempotent last-wins', () => {
    world.registerEvaluator('test.k', () => 1);
    world.registerEvaluator('test.k', () => 2);
    expect(world.evaluate('test.k')).toBe(2);
  });

  it('is scoped per world instance', () => {
    const other = new WorldModel();
    world.registerEvaluator('test.k', () => 'mine');
    expect(other.evaluate('test.k')).toBeUndefined();
  });

  it('AuthorModel delegates registration to the underlying world', () => {
    const author = new AuthorModel(world.getDataStore(), world);
    author.registerEvaluator('test.k', () => 'via-author');
    expect(world.evaluate('test.k')).toBe('via-author');
  });
});

describe('ADR-240 darkness read points consult the registry first', () => {
  let world: WorldModel;
  let room: IFEntity;
  let observer: IFEntity;
  let target: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Vault', 'room');
    room.add(new RoomTrait()); // requiresLight defaults false (lit room)
    room.add(new ContainerTrait());
    observer = world.createEntity('Observer', 'actor');
    observer.add(new ActorTrait());
    observer.add(new ContainerTrait());
    target = world.createEntity('Coin', 'object');
    world.moveEntity(observer.id, room.id);
    world.moveEntity(target.id, room.id);
  });

  it('a registered dark.<roomId> → true overrides a lit room at all three sites', () => {
    world.registerEvaluator(darkKey(room.id), () => true);
    expect(VisibilityBehavior.isDark(room, world)).toBe(true);
    expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
    expect(VisibilityBehavior.getVisible(observer, world).map((e) => e.id)).not.toContain(target.id);
  });

  it('a registered dark.<roomId> → false overrides a stamped-dark room', () => {
    (room.get('room') as RoomTrait).requiresLight = true; // stamped dark
    world.registerEvaluator(darkKey(room.id), () => false);
    expect(VisibilityBehavior.isDark(room, world)).toBe(false);
    expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    expect(VisibilityBehavior.getVisible(observer, world).map((e) => e.id)).toContain(target.id);
  });

  it('unregistered rooms use the stamped trait fact unchanged (fall-through)', () => {
    expect(VisibilityBehavior.isDark(room, world)).toBe(false);
    (room.get('room') as RoomTrait).requiresLight = true;
    expect(VisibilityBehavior.isDark(room, world)).toBe(true);
    expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
  });

  it('the answer is LIVE: flipping the condition flips visibility with no event in between', () => {
    let sealed = false;
    world.registerEvaluator(darkKey(room.id), () => sealed);
    expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    sealed = true; // no platform event fires — point-of-use truth only
    expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
  });
});
