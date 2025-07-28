// packages/world-model/tests/unit/traits/container.test.ts

import { IFEntity } from '../../../src/entities/if-entity';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
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

    it('should replace existing container trait', () => {
      const entity = createTestContainer(world, 'box');
      const newTrait = new ContainerTrait({
        capacity: { maxWeight: 100 },
        isTransparent: true
      });
      
      entity.add(newTrait);
      
      const trait = entity.get(TraitType.CONTAINER) as ContainerTrait;
      expect(trait.capacity?.maxWeight).toBe(100);
      expect(trait.isTransparent).toBe(true);
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
});
