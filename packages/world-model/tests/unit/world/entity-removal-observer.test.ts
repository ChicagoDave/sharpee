/**
 * Unit tests for the pre-removal observer seam (ADR-213 §1).
 *
 * Covers Phase 2 of `chord-212-213-seams`: AC-1 (invoked exactly once per
 * successful removal, BEFORE deletion, with the live entity and the correct
 * `lastRoomId` including `null`; failed removal invokes nothing), AC-5 (a
 * throwing observer is logged, does not abort the removal, and does not
 * starve later observers), AC-7 (orphaning via `moveEntity(id, null)`
 * invokes no observer), plus the `AuthorModel.removeEntity` pass-through
 * inheriting the seam with no code change.
 *
 * @see ADR-213, docs/work/chord-212-213-seams/plan.md Phase 2
 */

import { vi } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import type { EntityRemovalObserver } from '../../../src/world/WorldModel';
import { AuthorModel } from '../../../src/world/AuthorModel';
import type { IFEntity } from '../../../src/entities/if-entity';
import { createTestRoom } from '../../fixtures/test-entities';

describe('WorldModel entity removal observers (ADR-213)', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('AC-1: exactly once, before deletion, with live entity and last room', () => {
    it('invokes the observer once with the live entity and its containing room id', () => {
      const room = createTestRoom(world, 'Vestibule');
      const item = world.createEntity('Brass Lamp', 'item');
      world.moveEntity(item.id, room.id);

      const calls: Array<{ entity: IFEntity; lastRoomId: string | null; stillLive: boolean }> = [];
      world.onEntityRemoved((entity, lastRoomId) => {
        calls.push({
          entity,
          lastRoomId,
          // Pre-deletion contract: inside the callback the entity is still
          // queryable through the world — both the store and the spatial index.
          stillLive:
            world.getEntity(entity.id) === entity &&
            world.getContainingRoom(entity.id)?.id === room.id,
        });
      });

      expect(world.removeEntity(item.id)).toBe(true);

      expect(calls).toHaveLength(1);
      expect(calls[0].entity).toBe(item);
      expect(calls[0].lastRoomId).toBe(room.id);
      expect(calls[0].stillLive).toBe(true);
      // And immediately after return, the deletion has really happened — in
      // BOTH stores: the entities map (hasEntity) and the spatial index
      // (getLocation reads the index directly, never the map).
      expect(world.hasEntity(item.id)).toBe(false);
      expect(world.getLocation(item.id)).toBeUndefined();
    });

    it('passes lastRoomId null for a locationless entity', () => {
      const item = world.createEntity('Limbo Stone', 'item'); // never moved anywhere

      const seen: Array<string | null> = [];
      world.onEntityRemoved((_entity, lastRoomId) => seen.push(lastRoomId));

      expect(world.removeEntity(item.id)).toBe(true);
      expect(seen).toEqual([null]);
    });

    it('invokes nothing on a failed removal (unknown id)', () => {
      const observer = vi.fn<EntityRemovalObserver>();
      world.onEntityRemoved(observer);

      expect(world.removeEntity('no-such-id')).toBe(false);
      expect(observer).not.toHaveBeenCalled();
    });

    it('invokes observers in registration order', () => {
      const item = world.createEntity('Ordered Thing', 'item');
      const order: string[] = [];
      world.onEntityRemoved(() => order.push('first'));
      world.onEntityRemoved(() => order.push('second'));

      world.removeEntity(item.id);

      expect(order).toEqual(['first', 'second']);
    });

    it('invokes once per removal — a second removal of the same id fires nothing', () => {
      const item = world.createEntity('Once Only', 'item');
      const observer = vi.fn<EntityRemovalObserver>();
      world.onEntityRemoved(observer);

      world.removeEntity(item.id);
      world.removeEntity(item.id); // now unknown — fails, no observer

      expect(observer).toHaveBeenCalledTimes(1);
    });
  });

  describe('AC-5: a throwing observer is contained', () => {
    it('logs the throw, completes the removal, and still runs later observers', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const item = world.createEntity('Cursed Idol', 'item');

      const survivor = vi.fn<EntityRemovalObserver>();
      world.onEntityRemoved(() => {
        throw new Error('observer bug');
      });
      world.onEntityRemoved(survivor);

      let result: boolean | undefined;
      expect(() => {
        result = world.removeEntity(item.id);
      }).not.toThrow();

      expect(result).toBe(true);
      expect(world.hasEntity(item.id)).toBe(false); // removal really completed
      expect(survivor).toHaveBeenCalledTimes(1); // isolation, not just non-abort
      expect(error).toHaveBeenCalledTimes(1);

      error.mockRestore();
    });
  });

  describe('AC-7: orphaning is not removal', () => {
    it('moveEntity(id, null) invokes no observer and the entity remains queryable', () => {
      const room = createTestRoom(world, 'Parlor');
      const item = world.createEntity('Misplaced Hat', 'item');
      world.moveEntity(item.id, room.id);

      const observer = vi.fn<EntityRemovalObserver>();
      world.onEntityRemoved(observer);

      expect(world.moveEntity(item.id, null)).toBe(true);

      expect(observer).not.toHaveBeenCalled();
      expect(world.hasEntity(item.id)).toBe(true);
      expect(world.getEntity(item.id)).toBe(item);
      expect(world.getLocation(item.id)).toBeUndefined(); // orphaned, not gone
    });
  });

  describe('AuthorModel pass-through', () => {
    it('a removal through AuthorModel.removeEntity fires observers registered on the world', () => {
      const author = new AuthorModel(world.getDataStore(), world);
      const room = createTestRoom(world, 'Workshop');
      const item = world.createEntity('Prototype', 'item');
      world.moveEntity(item.id, room.id);

      const seen: Array<string | null> = [];
      world.onEntityRemoved((_entity, lastRoomId) => seen.push(lastRoomId));

      expect(author.removeEntity(item.id)).toBe(true);

      expect(seen).toEqual([room.id]);
      expect(world.hasEntity(item.id)).toBe(false);
    });
  });
});
