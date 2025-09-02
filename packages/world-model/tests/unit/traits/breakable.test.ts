/**
 * Tests for BreakableTrait
 */

import { BreakableTrait } from '../../../src/traits/breakable/breakableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('BreakableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new BreakableTrait();
      
      expect(trait.type).toBe('breakable');
      expect(trait.broken).toBe(false);
    });

    it('should create trait with broken state false', () => {
      const trait = new BreakableTrait({
        broken: false
      });
      
      expect(trait.broken).toBe(false);
    });

    it('should create trait with broken state true', () => {
      const trait = new BreakableTrait({
        broken: true
      });
      
      expect(trait.broken).toBe(true);
    });
  });

  describe('breaking state', () => {
    it('should track broken state', () => {
      const trait = new BreakableTrait({
        broken: false
      });
      
      expect(trait.broken).toBe(false);
      
      // Simulate breaking
      trait.broken = true;
      expect(trait.broken).toBe(true);
    });

    it('should handle already broken items', () => {
      const trait = new BreakableTrait({
        broken: true
      });
      
      expect(trait.broken).toBe(true);
    });

    it('should be mutable', () => {
      const trait = new BreakableTrait();
      
      expect(trait.broken).toBe(false);
      trait.broken = true;
      expect(trait.broken).toBe(true);
      trait.broken = false;
      expect(trait.broken).toBe(false);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Glass Vase', 'object');
      const trait = new BreakableTrait();
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.BREAKABLE)).toBe(true);
      expect(entity.getTrait(TraitType.BREAKABLE)).toBe(trait);
    });

    it('should work with multiple breakable objects', () => {
      const vase = world.createEntity('Glass Vase', 'object');
      vase.add(new BreakableTrait({
        broken: false
      }));
      
      const brokenCrate = world.createEntity('Broken Crate', 'object');
      brokenCrate.add(new BreakableTrait({
        broken: true
      }));
      
      const vaseTrait = vase.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      const crateTrait = brokenCrate.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(vaseTrait.broken).toBe(false);
      expect(crateTrait.broken).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new BreakableTrait({});
      
      expect(trait.broken).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new BreakableTrait(undefined);
      
      expect(trait.broken).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(BreakableTrait.type).toBe('breakable');
      
      const trait = new BreakableTrait();
      expect(trait.type).toBe('breakable');
      expect(trait.type).toBe(BreakableTrait.type);
    });
  });

  describe('usage scenarios', () => {
    it('should track state changes during gameplay', () => {
      const entity = world.createEntity('Window', 'object');
      const trait = new BreakableTrait();
      entity.add(trait);
      
      // Initially unbroken
      expect(trait.broken).toBe(false);
      
      // After attack action
      trait.broken = true;
      expect(trait.broken).toBe(true);
      
      // Verify entity still has the trait
      const retrievedTrait = entity.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      expect(retrievedTrait.broken).toBe(true);
    });

    it('should distinguish between broken and unbroken items', () => {
      const intact = world.createEntity('Intact Vase', 'object');
      intact.add(new BreakableTrait({ broken: false }));
      
      const broken = world.createEntity('Broken Vase', 'object');
      broken.add(new BreakableTrait({ broken: true }));
      
      const intactTrait = intact.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      const brokenTrait = broken.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(intactTrait.broken).toBe(false);
      expect(brokenTrait.broken).toBe(true);
    });
  });
});