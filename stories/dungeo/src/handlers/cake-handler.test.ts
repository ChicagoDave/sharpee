/**
 * Tests for the cake Action Interceptors (ADR-227 Phase 2).
 *
 * Drives the interceptor hooks directly and asserts on actual world state
 * (player location, room contents, HealthTrait, pool dissolve state) — not
 * just emitted effects. The transcript suite covers the end-to-end narration;
 * these pin the mutations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  TraitType,
  HealthTrait,
  IdentityTrait,
  IdentityBehavior,
  EntityType,
  InterceptorSharedData
} from '@sharpee/world-model';
import { PLAYER_DIED_EVENT } from '@sharpee/stdlib';
import { CakeTrait, CakeType } from '../traits/cake-trait';
import { CakeEatingInterceptor, CakeThrowingInterceptor, CakeMessages } from './cake-handler';

type Entity = ReturnType<WorldModel['createEntity']>;

describe('Cake interceptors (ADR-118 / ADR-227 Phase 2)', () => {
  let world: WorldModel;
  let teaRoom: Entity;
  let postsRoom: Entity;
  let poolRoom: Entity;
  let pool: Entity;
  let spices: Entity;
  let player: Entity;

  const makeCake = (cakeType: CakeType, location: string): Entity => {
    const cake = world.createEntity(`${cakeType} cake`, EntityType.ITEM);
    cake.add(new CakeTrait({ cakeType }));
    world.moveEntity(cake.id, location);
    return cake;
  };

  /** Run postExecute then postReport, returning the emitted effects. */
  const drive = (interceptor: typeof CakeEatingInterceptor, cake: Entity) => {
    const data: InterceptorSharedData = {};
    interceptor.postExecute!(cake, world, player.id, data);
    const report = interceptor.postReport!(cake, world, player.id, data);
    return report?.emit ?? [];
  };

  beforeEach(() => {
    world = new WorldModel();

    teaRoom = world.createEntity('Tea Room', EntityType.ROOM);
    teaRoom.add({ type: 'room' });
    postsRoom = world.createEntity('Posts Room', EntityType.ROOM);
    postsRoom.add({ type: 'room' });
    poolRoom = world.createEntity('Pool Room', EntityType.ROOM);
    poolRoom.add({ type: 'room' });
    poolRoom.add(new IdentityTrait({ name: 'Pool Room', description: 'goop everywhere' }));

    pool = world.createEntity('pool of goop', EntityType.ITEM);
    pool.add(new IdentityTrait({ name: 'pool of goop' }));
    world.moveEntity(pool.id, poolRoom.id);

    spices = world.createEntity('tin of spices', EntityType.ITEM);
    spices.add(new IdentityTrait({ name: 'tin of spices', concealed: true }));
    world.moveEntity(spices.id, poolRoom.id);

    world.setStateValue('dungeo.tea_room.id', teaRoom.id);
    world.setStateValue('dungeo.posts_room.id', postsRoom.id);
    world.setStateValue('dungeo.pool_room.room_id', poolRoom.id);
    world.setStateValue('dungeo.pool_room.pool_id', pool.id);
    world.setStateValue('dungeo.pool_room.spices_id', spices.id);

    player = world.createEntity('player', EntityType.ACTOR);
    player.add({ type: 'actor' });
    world.moveEntity(player.id, teaRoom.id);
    world.setPlayer(player.id);
  });

  describe('CakeEatingInterceptor', () => {
    it('eat-me in Tea Room teleports the player and the loose contents to Posts Room', () => {
      const cake = makeCake('eat-me', player.id);
      const loose = world.createEntity('red cake', EntityType.ITEM);
      loose.add(new CakeTrait({ cakeType: 'red-icing' }));
      world.moveEntity(loose.id, teaRoom.id);

      const effects = drive(CakeEatingInterceptor, cake);

      expect(world.getLocation(player.id)).toBe(postsRoom.id);
      expect(world.getLocation(loose.id)).toBe(postsRoom.id);
      expect(effects.some(e => (e.payload as any).messageId === CakeMessages.EAT_ME_SHRINK)).toBe(true);
    });

    it('blue in Posts Room teleports back to Tea Room', () => {
      world.moveEntity(player.id, postsRoom.id);
      const cake = makeCake('blue-icing', player.id);

      const effects = drive(CakeEatingInterceptor, cake);

      expect(world.getLocation(player.id)).toBe(teaRoom.id);
      expect(effects.some(e => (e.payload as any).messageId === CakeMessages.BLUE_ENLARGE)).toBe(true);
    });

    it('blue in Tea Room crushes the player — terminal death (HealthTrait mutation)', () => {
      const cake = makeCake('blue-icing', player.id);

      const effects = drive(CakeEatingInterceptor, cake);

      const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
      expect(health?.dead).toBe(true);
      expect(health?.causeOfDeath).toBe('cake_crush');
      expect(effects.some(e => e.type === PLAYER_DIED_EVENT)).toBe(true);
      expect(effects.some(e => (e.payload as any).messageId === CakeMessages.BLUE_CRUSH)).toBe(true);
    });

    it('orange explodes anywhere — terminal death', () => {
      world.moveEntity(player.id, postsRoom.id);
      const cake = makeCake('orange-icing', player.id);

      const effects = drive(CakeEatingInterceptor, cake);

      const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
      expect(health?.dead).toBe(true);
      expect(health?.causeOfDeath).toBe('cake_explosion');
      expect(effects.some(e => e.type === PLAYER_DIED_EVENT)).toBe(true);
    });

    it('red is a no-op — alive, no effects (standard eating narrative only)', () => {
      const cake = makeCake('red-icing', player.id);

      const effects = drive(CakeEatingInterceptor, cake);

      expect(effects).toHaveLength(0);
      expect(player.get(TraitType.HEALTH)).toBeUndefined();
      expect(world.getLocation(player.id)).toBe(teaRoom.id);
    });
  });

  describe('CakeThrowingInterceptor', () => {
    it('orange thrown anywhere — terminal death', () => {
      const cake = makeCake('orange-icing', player.id);

      const effects = drive(CakeThrowingInterceptor, cake);

      const health = player.get(TraitType.HEALTH) as HealthTrait | undefined;
      expect(health?.dead).toBe(true);
      expect(health?.causeOfDeath).toBe('cake_explosion');
      expect(effects.some(e => e.type === PLAYER_DIED_EVENT)).toBe(true);
    });

    it('red thrown in the Pool Room dissolves the pool and reveals the spices', () => {
      world.moveEntity(player.id, poolRoom.id);
      const cake = makeCake('red-icing', player.id);

      // Preconditions
      expect(world.getStateValue('dungeo.pool.dissolved')).toBeFalsy();
      expect(IdentityBehavior.isConcealed(spices)).toBe(true);

      const effects = drive(CakeThrowingInterceptor, cake);

      // THE mutations: pool state, concealment flips, room description
      expect(world.getStateValue('dungeo.pool.dissolved')).toBe(true);
      expect(IdentityBehavior.isConcealed(pool)).toBe(true);
      expect(IdentityBehavior.isConcealed(spices)).toBe(false);
      const desc = (poolRoom.get(TraitType.IDENTITY) as IdentityTrait).description;
      expect(desc).toContain('hardened calciumite');
      expect(effects.some(e => (e.payload as any).messageId === CakeMessages.RED_POOL_DISSOLVE)).toBe(true);
      // Not a death
      expect(player.get(TraitType.HEALTH)).toBeUndefined();
    });

    it('red thrown outside the Pool Room is a no-op', () => {
      const cake = makeCake('red-icing', player.id);

      const effects = drive(CakeThrowingInterceptor, cake);

      expect(effects).toHaveLength(0);
      expect(world.getStateValue('dungeo.pool.dissolved')).toBeFalsy();
      expect(IdentityBehavior.isConcealed(spices)).toBe(true);
    });

    it('blue thrown is a pure pass-through', () => {
      const cake = makeCake('blue-icing', player.id);

      const effects = drive(CakeThrowingInterceptor, cake);

      expect(effects).toHaveLength(0);
      expect(player.get(TraitType.HEALTH)).toBeUndefined();
    });
  });
});
