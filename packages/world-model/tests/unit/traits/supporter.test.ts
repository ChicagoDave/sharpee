// tests/unit/traits/supporter.test.ts

import { SupporterTrait } from '../../../src/traits/supporter/supporterTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { SceneryTrait } from '../../../src/traits/scenery/sceneryTrait';

describe('SupporterTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new SupporterTrait();
      
      expect(trait.type).toBe(TraitType.SUPPORTER);
      expect(trait.capacity).toBeUndefined();
      expect(trait.enterable).toBe(false);
      expect(trait.allowedTypes).toBeUndefined();
      expect(trait.excludedTypes).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxWeight: 50,
          maxItems: 5
        },
        enterable: true,
        allowedTypes: ['item', 'container'],
        excludedTypes: ['liquid', 'gas']
      });
      
      expect(trait.capacity).toEqual({
        maxWeight: 50,
        maxItems: 5
      });
      expect(trait.enterable).toBe(true);
      expect(trait.allowedTypes).toEqual(['item', 'container']);
      expect(trait.excludedTypes).toEqual(['liquid', 'gas']);
    });

    it('should handle partial capacity initialization', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxWeight: 100
          // No maxItems
        }
      });
      
      expect(trait.capacity?.maxWeight).toBe(100);
      expect(trait.capacity?.maxItems).toBeUndefined();
    });

    it('should handle only enterable property', () => {
      const trait = new SupporterTrait({
        enterable: true
      });
      
      expect(trait.enterable).toBe(true);
      expect(trait.capacity).toBeUndefined();
      expect(trait.allowedTypes).toBeUndefined();
    });
  });

  describe('capacity management', () => {
    it('should support weight-based capacity', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxWeight: 25
        }
      });
      
      expect(trait.capacity?.maxWeight).toBe(25);
      expect(trait.capacity?.maxItems).toBeUndefined();
    });

    it('should support item count capacity', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxItems: 3
        }
      });
      
      expect(trait.capacity?.maxItems).toBe(3);
      expect(trait.capacity?.maxWeight).toBeUndefined();
    });

    it('should support both weight and item limits', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxWeight: 50,
          maxItems: 10
        }
      });
      
      expect(trait.capacity?.maxWeight).toBe(50);
      expect(trait.capacity?.maxItems).toBe(10);
    });

    it('should handle unlimited capacity', () => {
      const trait = new SupporterTrait();
      
      expect(trait.capacity).toBeUndefined();
    });

    it('should handle zero capacity', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxWeight: 0,
          maxItems: 0
        }
      });
      
      expect(trait.capacity?.maxWeight).toBe(0);
      expect(trait.capacity?.maxItems).toBe(0);
    });
  });

  describe('type restrictions', () => {
    it('should handle allowed types', () => {
      const trait = new SupporterTrait({
        allowedTypes: ['book', 'scroll', 'paper']
      });
      
      expect(trait.allowedTypes).toEqual(['book', 'scroll', 'paper']);
      expect(trait.excludedTypes).toBeUndefined();
    });

    it('should handle excluded types', () => {
      const trait = new SupporterTrait({
        excludedTypes: ['liquid', 'fire', 'ghost']
      });
      
      expect(trait.excludedTypes).toEqual(['liquid', 'fire', 'ghost']);
      expect(trait.allowedTypes).toBeUndefined();
    });

    it('should handle both allowed and excluded types', () => {
      const trait = new SupporterTrait({
        allowedTypes: ['container'],
        excludedTypes: ['open_container']
      });
      
      expect(trait.allowedTypes).toEqual(['container']);
      expect(trait.excludedTypes).toEqual(['open_container']);
    });

    it('should handle empty type arrays', () => {
      const trait = new SupporterTrait({
        allowedTypes: [],
        excludedTypes: []
      });
      
      expect(trait.allowedTypes).toEqual([]);
      expect(trait.excludedTypes).toEqual([]);
    });
  });

  describe('enterable property', () => {
    it('should handle non-enterable supporters', () => {
      const trait = new SupporterTrait({
        enterable: false
      });
      
      expect(trait.enterable).toBe(false);
    });

    it('should handle enterable supporters', () => {
      const trait = new SupporterTrait({
        enterable: true
      });
      
      expect(trait.enterable).toBe(true);
    });

    it('should default to non-enterable', () => {
      const trait = new SupporterTrait();
      
      expect(trait.enterable).toBe(false);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('table', 'Wooden Table');
      const trait = new SupporterTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.SUPPORTER)).toBe(true);
      expect(entity.getTrait(TraitType.SUPPORTER)).toBe(trait);
    });

    it('should create various supporter entities', () => {
      const table = world.createEntity('table', 'Dining Table');
      table.add(new SupporterTrait({
        capacity: { maxWeight: 100, maxItems: 20 }
      }));
      
      const shelf = world.createEntity('shelf', 'Bookshelf');
      shelf.add(new SupporterTrait({
        capacity: { maxWeight: 50 },
        allowedTypes: ['book', 'scroll', 'box']
      }));
      
      const altar = world.createEntity('altar', 'Stone Altar');
      altar.add(new SupporterTrait({
        capacity: { maxItems: 3 },
        excludedTypes: ['cursed']
      }));
      
      expect(table.hasTrait(TraitType.SUPPORTER)).toBe(true);
      expect(shelf.hasTrait(TraitType.SUPPORTER)).toBe(true);
      expect(altar.hasTrait(TraitType.SUPPORTER)).toBe(true);
    });

    it('should work with scenery supporters', () => {
      const counter = world.createEntity('counter', 'Kitchen Counter');
      
      counter.add(new SceneryTrait({
        cantTakeMessage: 'The counter is built into the kitchen.'
      }));
      counter.add(new SupporterTrait({
        capacity: { maxWeight: 200 }
      }));
      
      expect(counter.hasTrait(TraitType.SCENERY)).toBe(true);
      expect(counter.hasTrait(TraitType.SUPPORTER)).toBe(true);
    });

    it('should work with enterable supporters', () => {
      const bed = world.createEntity('bed', 'Comfortable Bed');
      bed.add(new SupporterTrait({
        enterable: true,
        capacity: { maxWeight: 200 }
      }));
      
      const chair = world.createEntity('chair', 'Wooden Chair');
      chair.add(new SupporterTrait({
        enterable: true,
        capacity: { maxWeight: 150, maxItems: 1 }
      }));
      
      const bench = world.createEntity('bench', 'Park Bench');
      bench.add(new SupporterTrait({
        enterable: true,
        capacity: { maxWeight: 300 }
      }));
      
      expect((bed.getTrait(TraitType.SUPPORTER) as SupporterTrait).enterable).toBe(true);
      expect((chair.getTrait(TraitType.SUPPORTER) as SupporterTrait).enterable).toBe(true);
      expect((bench.getTrait(TraitType.SUPPORTER) as SupporterTrait).enterable).toBe(true);
    });
  });

  describe('supporter types', () => {
    it('should handle furniture supporters', () => {
      const desk = new SupporterTrait({
        capacity: { maxWeight: 75, maxItems: 15 }
      });
      
      const nightstand = new SupporterTrait({
        capacity: { maxWeight: 10, maxItems: 5 }
      });
      
      const diningTable = new SupporterTrait({
        capacity: { maxWeight: 150, maxItems: 30 }
      });
      
      expect(desk.capacity?.maxWeight).toBe(75);
      expect(nightstand.capacity?.maxItems).toBe(5);
      expect(diningTable.capacity?.maxWeight).toBe(150);
    });

    it('should handle specialized supporters', () => {
      const bookshelf = new SupporterTrait({
        allowedTypes: ['book', 'scroll'],
        capacity: { maxItems: 20 }
      });
      
      const weaponRack = new SupporterTrait({
        allowedTypes: ['weapon'],
        capacity: { maxItems: 6 }
      });
      
      const displayCase = new SupporterTrait({
        allowedTypes: ['artifact', 'jewelry'],
        capacity: { maxItems: 1 }
      });
      
      expect(bookshelf.allowedTypes).toContain('book');
      expect(weaponRack.allowedTypes).toContain('weapon');
      expect(displayCase.capacity?.maxItems).toBe(1);
    });

    it('should handle natural supporters', () => {
      const rock = new SupporterTrait({
        capacity: { maxWeight: 500 }
      });
      
      const treeBranch = new SupporterTrait({
        capacity: { maxWeight: 20 },
        excludedTypes: ['heavy']
      });
      
      const ledge = new SupporterTrait({
        capacity: { maxWeight: 100, maxItems: 10 }
      });
      
      expect(rock.capacity?.maxWeight).toBe(500);
      expect(treeBranch.excludedTypes).toContain('heavy');
      expect(ledge.capacity?.maxItems).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new SupporterTrait({});
      
      expect(trait.capacity).toBeUndefined();
      expect(trait.enterable).toBe(false);
      expect(trait.allowedTypes).toBeUndefined();
      expect(trait.excludedTypes).toBeUndefined();
    });

    it('should handle undefined options', () => {
      const trait = new SupporterTrait(undefined);
      
      expect(trait.capacity).toBeUndefined();
      expect(trait.enterable).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(SupporterTrait.type).toBe(TraitType.SUPPORTER);
      
      const trait = new SupporterTrait();
      expect(trait.type).toBe(TraitType.SUPPORTER);
      expect(trait.type).toBe(SupporterTrait.type);
    });

    it('should handle negative capacity values', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxWeight: -10,
          maxItems: -5
        }
      });
      
      expect(trait.capacity?.maxWeight).toBe(-10);
      expect(trait.capacity?.maxItems).toBe(-5);
    });

    it('should handle fractional capacity values', () => {
      const trait = new SupporterTrait({
        capacity: {
          maxWeight: 12.5,
          maxItems: 3.5
        }
      });
      
      expect(trait.capacity?.maxWeight).toBe(12.5);
      expect(trait.capacity?.maxItems).toBe(3.5);
    });

    it('should preserve array references', () => {
      const allowed = ['type1', 'type2'];
      const excluded = ['type3', 'type4'];
      
      const trait = new SupporterTrait({
        allowedTypes: allowed,
        excludedTypes: excluded
      });
      
      // Modify original arrays
      allowed.push('type5');
      excluded.push('type6');
      
      // Trait should have references (not copies)
      expect(trait.allowedTypes).toContain('type5');
      expect(trait.excludedTypes).toContain('type6');
    });
  });

  describe('complex scenarios', () => {
    it('should handle multi-purpose supporters', () => {
      const workbench = world.createEntity('workbench', 'Crafting Workbench');
      
      workbench.add(new SupporterTrait({
        capacity: { maxWeight: 100, maxItems: 20 },
        allowedTypes: ['tool', 'material', 'project'],
        enterable: false
      }));
      
      workbench.add(new ContainerTrait()); // Also has storage
      
      const supporter = workbench.getTrait(TraitType.SUPPORTER) as SupporterTrait;
      expect(supporter.allowedTypes).toContain('tool');
      expect(supporter.capacity?.maxWeight).toBe(100);
    });

    it('should handle tiered supporters', () => {
      // Shelf with multiple tiers (abstracted as one supporter)
      const multiShelf = new SupporterTrait({
        capacity: { 
          maxWeight: 150, // Total for all shelves
          maxItems: 30
        },
        excludedTypes: ['oversized']
      });
      
      expect(multiShelf.capacity?.maxWeight).toBe(150);
      expect(multiShelf.excludedTypes).toContain('oversized');
    });

    it('should handle magical supporters', () => {
      const floatingPlatform = new SupporterTrait({
        capacity: { maxWeight: 1000 }, // Magically enhanced
        excludedTypes: ['antimagic']
      });
      
      const dimensionalShelf = new SupporterTrait({
        capacity: { maxItems: 100 }, // Bigger on the inside
        allowedTypes: ['magical_item']
      });
      
      expect(floatingPlatform.capacity?.maxWeight).toBe(1000);
      expect(dimensionalShelf.capacity?.maxItems).toBe(100);
    });

    it('should handle dynamic supporter states', () => {
      const drawbridge = world.createEntity('drawbridge', 'Drawbridge');
      
      const supporterTrait = new SupporterTrait({
        enterable: true,
        capacity: { maxWeight: 5000 }
      });
      
      drawbridge.add(supporterTrait);
      
      // When raised, might change properties
      supporterTrait.enterable = false;
      supporterTrait.capacity = { maxWeight: 0 };
      
      expect(supporterTrait.enterable).toBe(false);
      expect(supporterTrait.capacity?.maxWeight).toBe(0);
    });
  });
});