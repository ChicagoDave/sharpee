/**
 * Tests for LeverTrait
 */

import { LeverTrait } from '../../../src/traits/lever/leverTrait';
import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('LeverTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new LeverTrait();
      
      expect(trait.type).toBe(TraitType.LEVER);
      expect(trait.position).toBe('neutral');
      expect(trait.controls).toBeUndefined();
      expect(trait.springLoaded).toBe(false);
      expect(trait.stuck).toBe(false);
      expect(trait.leverSound).toBeUndefined();
      expect(trait.positionNames).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new LeverTrait({
        position: 'up',
        controls: 'gate-001',
        springLoaded: true,
        stuck: false,
        leverSound: 'lever_click.mp3',
        positionNames: {
          up: 'raised',
          down: 'lowered',
          neutral: 'center'
        }
      });
      
      expect(trait.position).toBe('up');
      expect(trait.controls).toBe('gate-001');
      expect(trait.springLoaded).toBe(true);
      expect(trait.stuck).toBe(false);
      expect(trait.leverSound).toBe('lever_click.mp3');
      expect(trait.positionNames?.up).toBe('raised');
      expect(trait.positionNames?.down).toBe('lowered');
      expect(trait.positionNames?.neutral).toBe('center');
    });

    it('should handle all positions', () => {
      const upLever = new LeverTrait({ position: 'up' });
      expect(upLever.position).toBe('up');
      
      const downLever = new LeverTrait({ position: 'down' });
      expect(downLever.position).toBe('down');
      
      const neutralLever = new LeverTrait({ position: 'neutral' });
      expect(neutralLever.position).toBe('neutral');
    });
  });

  describe('lever mechanics', () => {
    it('should track position changes', () => {
      const trait = new LeverTrait();
      
      expect(trait.position).toBe('neutral');
      
      trait.position = 'up';
      expect(trait.position).toBe('up');
      
      trait.position = 'down';
      expect(trait.position).toBe('down');
      
      trait.position = 'neutral';
      expect(trait.position).toBe('neutral');
    });

    it('should handle spring-loaded behavior', () => {
      const trait = new LeverTrait({
        springLoaded: true,
        position: 'up'
      });
      
      expect(trait.springLoaded).toBe(true);
      expect(trait.position).toBe('up');
      
      // Note: Actual spring-back logic would be in the action
      // This just stores the configuration
    });

    it('should handle stuck state', () => {
      const trait = new LeverTrait({
        stuck: true,
        position: 'down'
      });
      
      expect(trait.stuck).toBe(true);
      expect(trait.position).toBe('down');
    });
  });

  describe('entity integration', () => {
    it('should work with pullable trait', () => {
      const entity = world.createEntity('Control Lever', 'object');
      
      entity.add(new PullableTrait({
        pullType: 'lever',
        linkedTo: 'gate-001'
      }));
      
      entity.add(new LeverTrait({
        position: 'up',
        controls: 'gate-001'
      }));
      
      expect(entity.hasTrait(TraitType.PULLABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.LEVER)).toBe(true);
      
      const pullable = entity.getTrait(TraitType.PULLABLE) as PullableTrait;
      const lever = entity.getTrait(TraitType.LEVER) as LeverTrait;
      
      expect(pullable.pullType).toBe('lever');
      expect(lever.controls).toBe('gate-001');
      expect(pullable.linkedTo).toBe(lever.controls);
    });

    it('should handle multiple levers in world', () => {
      const lever1 = world.createEntity('Gate Lever', 'object');
      lever1.add(new LeverTrait({
        position: 'up',
        controls: 'north-gate'
      }));
      
      const lever2 = world.createEntity('Trap Lever', 'object');
      lever2.add(new LeverTrait({
        position: 'down',
        controls: 'trap-door',
        stuck: true
      }));
      
      const trait1 = lever1.getTrait(TraitType.LEVER) as LeverTrait;
      const trait2 = lever2.getTrait(TraitType.LEVER) as LeverTrait;
      
      expect(trait1.controls).toBe('north-gate');
      expect(trait1.position).toBe('up');
      expect(trait1.stuck).toBe(false);
      
      expect(trait2.controls).toBe('trap-door');
      expect(trait2.position).toBe('down');
      expect(trait2.stuck).toBe(true);
    });
  });

  describe('custom position names', () => {
    it('should store custom position names', () => {
      const trait = new LeverTrait({
        positionNames: {
          up: 'engaged',
          down: 'disengaged'
        }
      });
      
      expect(trait.positionNames?.up).toBe('engaged');
      expect(trait.positionNames?.down).toBe('disengaged');
      expect(trait.positionNames?.neutral).toBeUndefined();
    });

    it('should handle partial position names', () => {
      const trait = new LeverTrait({
        positionNames: {
          up: 'active'
        }
      });
      
      expect(trait.positionNames?.up).toBe('active');
      expect(trait.positionNames?.down).toBeUndefined();
      expect(trait.positionNames?.neutral).toBeUndefined();
    });
  });

  describe('sound effects', () => {
    it('should store lever sound', () => {
      const trait = new LeverTrait({
        leverSound: 'mechanical_click.mp3'
      });
      
      expect(trait.leverSound).toBe('mechanical_click.mp3');
    });

    it('should handle missing sound', () => {
      const trait = new LeverTrait();
      
      expect(trait.leverSound).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new LeverTrait({});
      
      expect(trait.position).toBe('neutral');
      expect(trait.controls).toBeUndefined();
      expect(trait.springLoaded).toBe(false);
      expect(trait.stuck).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new LeverTrait(undefined);
      
      expect(trait.position).toBe('neutral');
      expect(trait.springLoaded).toBe(false);
      expect(trait.stuck).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(LeverTrait.type).toBe(TraitType.LEVER);
      
      const trait = new LeverTrait();
      expect(trait.type).toBe(TraitType.LEVER);
      expect(trait.type).toBe(LeverTrait.type);
    });

    it('should handle stuck spring-loaded lever', () => {
      const trait = new LeverTrait({
        springLoaded: true,
        stuck: true,
        position: 'down'
      });
      
      expect(trait.springLoaded).toBe(true);
      expect(trait.stuck).toBe(true);
      expect(trait.position).toBe('down');
      
      // A stuck spring-loaded lever won't spring back
    });
  });
});
