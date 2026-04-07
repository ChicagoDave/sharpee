// packages/world-model/tests/unit/traits/container.test.ts

import { IFEntity } from '../../../src/entities/if-entity';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { createTestContainer, createTestItem } from '../../fixtures/test-entities';

describe('ContainerTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });
  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new ContainerTrait();
      
      expect(trait.type).toBe(TraitType.CONTAINER);
      expect(trait.capacity).toBeUndefined();
      expect(trait.isTransparent).toBe(false);
      expect(trait.enterable).toBe(false);
      expect(trait.allowedTypes).toBeUndefined();
      expect(trait.excludedTypes).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new ContainerTrait({
        capacity: {
          maxWeight: 10,
          maxVolume: 5,
          maxItems: 3
        },
        isTransparent: true,
        enterable: false,
        allowedTypes: ['item', 'key'],
        excludedTypes: ['actor']
      });
      
      expect(trait.capacity).toEqual({
        maxWeight: 10,
        maxVolume: 5,
        maxItems: 3
      });
      expect(trait.isTransparent).toBe(true);
      expect(trait.enterable).toBe(false);
      expect(trait.allowedTypes).toEqual(['item', 'key']);
      expect(trait.excludedTypes).toEqual(['actor']);
    });
  });

  describe('capacity constraints', () => {
    it('should handle weight limit', () => {
      const container = createTestContainer(world, 'backpack');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.capacity = { maxWeight: 20 }; // 20kg limit
      
      expect(trait.capacity.maxWeight).toBe(20);
      expect(trait.capacity.maxVolume).toBeUndefined();
      expect(trait.capacity.maxItems).toBeUndefined();
    });

    it('should handle volume limit', () => {
      const container = createTestContainer(world, 'bottle');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.capacity = { maxVolume: 1 }; // 1 liter
      
      expect(trait.capacity.maxVolume).toBe(1);
      expect(trait.capacity.maxWeight).toBeUndefined();
      expect(trait.capacity.maxItems).toBeUndefined();
    });

    it('should handle item count limit', () => {
      const container = createTestContainer(world, 'small pouch');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.capacity = { maxItems: 5 };
      
      expect(trait.capacity.maxItems).toBe(5);
      expect(trait.capacity.maxWeight).toBeUndefined();
      expect(trait.capacity.maxVolume).toBeUndefined();
    });

    it('should handle multiple constraints', () => {
      const container = createTestContainer(world, 'treasure chest');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.capacity = {
        maxWeight: 50,
        maxVolume: 100,
        maxItems: 20
      };
      
      expect(trait.capacity.maxWeight).toBe(50);
      expect(trait.capacity.maxVolume).toBe(100);
      expect(trait.capacity.maxItems).toBe(20);
    });

    it('should handle unlimited capacity', () => {
      const container = createTestContainer(world, 'magical bag');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      // No capacity set means unlimited
      
      expect(trait.capacity).toBeUndefined();
    });
  });

  describe('transparency', () => {
    it('should default to opaque', () => {
      const container = createTestContainer(world, 'wooden box');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      
      expect(trait.isTransparent).toBe(false);
    });

    it('should handle transparent containers', () => {
      const container = createTestContainer(world, 'glass jar');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.isTransparent = true;
      
      expect(trait.isTransparent).toBe(true);
    });
  });

  describe('enterable containers', () => {
    it('should default to not enterable', () => {
      const container = createTestContainer(world, 'box');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      
      expect(trait.enterable).toBe(false);
    });

    it('should handle enterable containers', () => {
      const container = createTestContainer(world, 'large crate');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.enterable = true;
      
      expect(trait.enterable).toBe(true);
    });
  });

  describe('type restrictions', () => {
    it('should handle allowed types', () => {
      const container = createTestContainer(world, 'keyring');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.allowedTypes = ['key'];
      
      expect(trait.allowedTypes).toEqual(['key']);
      expect(trait.excludedTypes).toBeUndefined();
    });

    it('should handle excluded types', () => {
      const container = createTestContainer(world, 'delicate basket');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.excludedTypes = ['heavy', 'sharp'];
      
      expect(trait.excludedTypes).toEqual(['heavy', 'sharp']);
      expect(trait.allowedTypes).toBeUndefined();
    });

    it('should handle both allowed and excluded types', () => {
      const container = createTestContainer(world, 'specimen jar');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.allowedTypes = ['specimen', 'sample'];
      trait.excludedTypes = ['living'];
      
      expect(trait.allowedTypes).toEqual(['specimen', 'sample']);
      expect(trait.excludedTypes).toEqual(['living']);
    });

    it('should handle no type restrictions', () => {
      const container = createTestContainer(world, 'general container');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      
      expect(trait.allowedTypes).toBeUndefined();
      expect(trait.excludedTypes).toBeUndefined();
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = new IFEntity('test-1', 'object');
      const trait = new ContainerTrait({
        capacity: { maxItems: 10 }
      });
      
      entity.add(trait);
      
      expect(entity.has(TraitType.CONTAINER)).toBe(true);
      const retrievedTrait = entity.get(TraitType.CONTAINER) as ContainerTrait;
      expect(retrievedTrait.capacity?.maxItems).toBe(10);
    });

    it('should warn and keep original container trait', () => {
      const entity = createTestContainer(world, 'box');
      // Entity already has a container trait from createTestContainer
      const originalTrait = entity.get(TraitType.CONTAINER) as ContainerTrait;
      
      const newTrait = new ContainerTrait({
        capacity: { maxWeight: 100 },
        isTransparent: true
      });
      
      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      entity.add(newTrait);
      
      const trait = entity.get(TraitType.CONTAINER) as ContainerTrait;
      // Should keep original trait, not the new one
      expect(trait).toBe(originalTrait);
      
      // Should have warned about duplicate
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('already has trait: container')
      );
      
      warnSpy.mockRestore();
    });
  });

  describe('special container types', () => {
    it('should handle transparent container setup', () => {
      const container = createTestContainer(world, 'aquarium');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.isTransparent = true;
      trait.allowedTypes = ['fish', 'decoration'];
      
      expect(trait.isTransparent).toBe(true);
      expect(trait.allowedTypes).toContain('fish');
    });

    it('should handle secure container setup', () => {
      const container = createTestContainer(world, 'safe');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.capacity = { maxWeight: 50, maxVolume: 20 };
      trait.excludedTypes = ['explosive', 'liquid'];
      
      expect(trait.capacity.maxWeight).toBe(50);
      expect(trait.excludedTypes).toContain('explosive');
    });

    it('should handle nested container setup', () => {
      const outerContainer = createTestContainer(world, 'suitcase');
      const innerContainer = createTestContainer(world, 'toiletry bag');
      
      const outerTrait = outerContainer.get(TraitType.CONTAINER) as ContainerTrait;
      const innerTrait = innerContainer.get(TraitType.CONTAINER) as ContainerTrait;
      
      outerTrait.capacity = { maxWeight: 30 };
      innerTrait.capacity = { maxWeight: 2 };
      
      expect(outerTrait.capacity.maxWeight).toBe(30);
      expect(innerTrait.capacity.maxWeight).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty capacity object', () => {
      const container = createTestContainer(world, 'strange box');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.capacity = {};
      
      expect(trait.capacity).toEqual({});
      expect(trait.capacity.maxWeight).toBeUndefined();
      expect(trait.capacity.maxVolume).toBeUndefined();
      expect(trait.capacity.maxItems).toBeUndefined();
    });

    it('should handle empty arrays for type restrictions', () => {
      const container = createTestContainer(world, 'permissive container');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.allowedTypes = [];
      trait.excludedTypes = [];
      
      expect(trait.allowedTypes).toEqual([]);
      expect(trait.excludedTypes).toEqual([]);
    });

    it('should handle zero capacity values', () => {
      const container = createTestContainer(world, 'decorative box');
      const trait = container.get(TraitType.CONTAINER) as ContainerTrait;
      trait.capacity = {
        maxWeight: 0,
        maxVolume: 0,
        maxItems: 0
      };

      expect(trait.capacity.maxWeight).toBe(0);
      expect(trait.capacity.maxVolume).toBe(0);
      expect(trait.capacity.maxItems).toBe(0);
    });
  });

  describe('World State Behaviors', () => {
    it('should accept items via moveEntity and reflect in getContents', () => {
      const room = world.createEntity('Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      const box = createTestContainer(world, 'box');
      world.moveEntity(box.id, room.id);

      const coin = createTestItem(world, 'gold coin');
      world.moveEntity(coin.id, room.id);

      // PRECONDITION: coin is in room, not in box
      expect(world.getLocation(coin.id)).toBe(room.id);
      expect(world.getContents(box.id).map(e => e.id)).not.toContain(coin.id);

      // ACT: move coin into box
      const result = world.moveEntity(coin.id, box.id);

      // POSTCONDITION: coin is now inside box
      expect(result).toBe(true);
      expect(world.getLocation(coin.id)).toBe(box.id);
      expect(world.getContents(box.id).map(e => e.id)).toContain(coin.id);
      expect(world.getContents(room.id).map(e => e.id)).not.toContain(coin.id);
    });

    it('should remove items from container via moveEntity', () => {
      const room = world.createEntity('Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      const box = createTestContainer(world, 'box');
      world.moveEntity(box.id, room.id);

      const key = createTestItem(world, 'key');
      world.moveEntity(key.id, box.id);

      // PRECONDITION
      expect(world.getLocation(key.id)).toBe(box.id);

      // ACT: move key out to room
      world.moveEntity(key.id, room.id);

      // POSTCONDITION
      expect(world.getLocation(key.id)).toBe(room.id);
      expect(world.getContents(box.id).map(e => e.id)).not.toContain(key.id);
    });

    it('should support nested containers via moveEntity', () => {
      const room = world.createEntity('Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      const suitcase = createTestContainer(world, 'suitcase');
      world.moveEntity(suitcase.id, room.id);

      const pouch = createTestContainer(world, 'pouch');
      world.moveEntity(pouch.id, suitcase.id);

      const gem = createTestItem(world, 'gem');
      world.moveEntity(gem.id, pouch.id);

      // POSTCONDITION: gem is inside pouch, pouch is inside suitcase
      expect(world.getLocation(gem.id)).toBe(pouch.id);
      expect(world.getLocation(pouch.id)).toBe(suitcase.id);
      expect(world.getContents(pouch.id).map(e => e.id)).toContain(gem.id);
      expect(world.getContents(suitcase.id).map(e => e.id)).toContain(pouch.id);
    });

    it('should prevent circular containment', () => {
      const box1 = createTestContainer(world, 'box1');
      const box2 = createTestContainer(world, 'box2');
      world.moveEntity(box2.id, box1.id);

      // ACT: try to put box1 inside box2 (would create a loop)
      const result = world.moveEntity(box1.id, box2.id);

      // POSTCONDITION: move rejected, locations unchanged
      expect(result).toBe(false);
      expect(world.getLocation(box2.id)).toBe(box1.id);
    });
  });
});
