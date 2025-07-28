// tests/unit/entities/entity-store.test.ts
// Tests for the EntityStore class

import { EntityStore } from '../../../src/entities/entity-store';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';

describe('EntityStore', () => {
  let store: EntityStore;

  beforeEach(() => {
    store = new EntityStore();
  });

  describe('basic operations', () => {
    it('should add and retrieve entities', () => {
      const entity = new IFEntity('test-1', 'object');
      store.add(entity);
      
      expect(store.has('test-1')).toBe(true);
      expect(store.get('test-1')).toBe(entity);
    });

    it('should return undefined for non-existent entities', () => {
      expect(store.get('non-existent')).toBeUndefined();
      expect(store.has('non-existent')).toBe(false);
    });

    it('should remove entities and clear traits', () => {
      const entity = new IFEntity('test-1', 'object');
      entity.add(new IdentityTrait());
      
      store.add(entity);
      const removed = store.remove('test-1');
      
      expect(removed).toBe(true);
      expect(store.has('test-1')).toBe(false);
      expect(entity.getTraits()).toHaveLength(0); // Traits should be cleared
    });

    it('should clear all entities', () => {
      const e1 = new IFEntity('e1', 'object');
      const e2 = new IFEntity('e2', 'object');
      e1.add(new IdentityTrait());
      e2.add(new ContainerTrait());
      
      store.add(e1);
      store.add(e2);
      
      store.clear();
      
      expect(store.size).toBe(0);
      expect(e1.getTraits()).toHaveLength(0);
      expect(e2.getTraits()).toHaveLength(0);
    });
  });

  describe('querying', () => {
    let room: IFEntity;
    let container: IFEntity;
    let item: IFEntity;

    beforeEach(() => {
      room = new IFEntity('room-1', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());
      
      container = new IFEntity('box-1', 'container');
      container.add(new ContainerTrait());
      container.add(new IdentityTrait());
      
      item = new IFEntity('item-1', 'item');
      item.add(new IdentityTrait());
      
      store.add(room);
      store.add(container);
      store.add(item);
    });

    it('should get all entities', () => {
      const all = store.getAll();
      expect(all).toHaveLength(3);
      expect(all).toContain(room);
      expect(all).toContain(container);
      expect(all).toContain(item);
    });

    it('should get entities by type', () => {
      const rooms = store.getByType('room');
      expect(rooms).toHaveLength(1);
      expect(rooms[0]).toBe(room);
      
      const containers = store.getByType('container');
      expect(containers).toHaveLength(1);
      expect(containers[0]).toBe(container);
    });

    it('should find entities with specific trait', () => {
      const withContainer = store.findWithTrait(TraitType.CONTAINER);
      expect(withContainer).toHaveLength(2); // room and container
      expect(withContainer).toContain(room);
      expect(withContainer).toContain(container);
      
      const withRoom = store.findWithTrait(TraitType.ROOM);
      expect(withRoom).toHaveLength(1);
      expect(withRoom[0]).toBe(room);
    });

    it('should find entities with all specified traits', () => {
      const roomContainers = store.findWithAllTraits(TraitType.ROOM, TraitType.CONTAINER);
      expect(roomContainers).toHaveLength(1);
      expect(roomContainers[0]).toBe(room);
      
      const nonExistent = store.findWithAllTraits(TraitType.ROOM, TraitType.DOOR);
      expect(nonExistent).toHaveLength(0);
    });

    it('should find entities with any specified traits', () => {
      const roomsOrContainers = store.findWithAnyTraits(TraitType.ROOM, TraitType.CONTAINER);
      expect(roomsOrContainers).toHaveLength(2);
      expect(roomsOrContainers).toContain(room);
      expect(roomsOrContainers).toContain(container);
    });
  });

  describe('iteration', () => {
    it('should be iterable', () => {
      const entities = [
        new IFEntity('e1', 'object'),
        new IFEntity('e2', 'object'),
        new IFEntity('e3', 'object')
      ];
      
      entities.forEach(e => store.add(e));
      
      const collected: IFEntity[] = [];
      for (const entity of store) {
        collected.push(entity);
      }
      
      expect(collected).toHaveLength(3);
      entities.forEach(e => expect(collected).toContain(e));
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const e1 = new IFEntity('e1', 'object', { attributes: { name: 'Entity 1' } });
      const e2 = new IFEntity('e2', 'room');
      e2.add(new RoomTrait());
      
      store.add(e1);
      store.add(e2);
      
      const json = store.toJSON();
      
      expect(json).toHaveLength(2);
      expect(json[0]).toMatchObject({
        id: 'e1',
        type: 'object',
        attributes: { name: 'Entity 1' }
      });
      expect(json[1]).toMatchObject({
        id: 'e2',
        type: 'room'
      });
    });

    it('should deserialize from JSON', () => {
      const json = [
        {
          id: 'restored-1',
          type: 'object',
          attributes: { name: 'Item 1' },
          relationships: {},
          traits: []
        },
        {
          id: 'restored-2',
          type: 'room',
          attributes: {},
          relationships: {},
          traits: [{ type: TraitType.ROOM }]
        }
      ];
      
      const restored = EntityStore.fromJSON(json);
      
      expect(restored.size).toBe(2);
      expect(restored.has('restored-1')).toBe(true);
      expect(restored.has('restored-2')).toBe(true);
      
      const room = restored.get('restored-2');
      expect(room?.has(TraitType.ROOM)).toBe(true);
    });
  });

  describe('size property', () => {
    it('should reflect number of entities', () => {
      expect(store.size).toBe(0);
      
      store.add(new IFEntity('e1', 'object'));
      expect(store.size).toBe(1);
      
      store.add(new IFEntity('e2', 'object'));
      expect(store.size).toBe(2);
      
      store.remove('e1');
      expect(store.size).toBe(1);
      
      store.clear();
      expect(store.size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle removing non-existent entity', () => {
      expect(store.remove('non-existent')).toBe(false);
    });

    it('should handle duplicate adds gracefully', () => {
      const entity = new IFEntity('duplicate', 'object');
      
      store.add(entity);
      store.add(entity); // Adding same entity again
      
      expect(store.size).toBe(1);
    });

    it('should work with empty store', () => {
      expect(store.getAll()).toEqual([]);
      expect(store.getByType('any')).toEqual([]);
      expect(store.findWithTrait('any')).toEqual([]);
      
      const collected = [];
      for (const entity of store) {
        collected.push(entity);
      }
      expect(collected).toEqual([]);
    });
  });
});
