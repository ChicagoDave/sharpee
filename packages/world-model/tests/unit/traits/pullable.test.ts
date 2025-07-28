/**
 * Tests for PullableTrait
 */

import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('PullableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new PullableTrait();
      
      expect(trait.type).toBe(TraitType.PULLABLE);
      expect(trait.pullType).toBe('lever');
      expect(trait.activates).toBeUndefined();
      expect(trait.linkedTo).toBeUndefined();
      expect(trait.pullSound).toBeUndefined();
      expect(trait.requiresStrength).toBeUndefined();
      expect(trait.repeatable).toBe(true);
      expect(trait.state).toBe('default');
      expect(trait.pullCount).toBe(0);
      expect(trait.maxPulls).toBeUndefined();
      expect(trait.detachesOnPull).toBe(false);
      expect(trait.effects).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new PullableTrait({
        pullType: 'cord',
        activates: 'bell-001',
        linkedTo: 'gate-001',
        pullSound: 'chain_rattle.mp3',
        requiresStrength: 15,
        repeatable: false,
        state: 'pulled',
        pullCount: 1,
        maxPulls: 3,
        detachesOnPull: true,
        effects: {
          onPull: 'if.event.bell_rings',
          onMaxPulls: 'if.event.mechanism_jams',
          onDetach: 'if.event.cord_snaps'
        }
      });
      
      expect(trait.pullType).toBe('cord');
      expect(trait.activates).toBe('bell-001');
      expect(trait.linkedTo).toBe('gate-001');
      expect(trait.pullSound).toBe('chain_rattle.mp3');
      expect(trait.requiresStrength).toBe(15);
      expect(trait.repeatable).toBe(false);
      expect(trait.state).toBe('pulled');
      expect(trait.pullCount).toBe(1);
      expect(trait.maxPulls).toBe(3);
      expect(trait.detachesOnPull).toBe(true);
      expect(trait.effects?.onPull).toBe('if.event.bell_rings');
      expect(trait.effects?.onMaxPulls).toBe('if.event.mechanism_jams');
      expect(trait.effects?.onDetach).toBe('if.event.cord_snaps');
    });

    it('should handle all pull types', () => {
      const leverTrait = new PullableTrait({ pullType: 'lever' });
      expect(leverTrait.pullType).toBe('lever');
      
      const cordTrait = new PullableTrait({ pullType: 'cord' });
      expect(cordTrait.pullType).toBe('cord');
      
      const attachedTrait = new PullableTrait({ pullType: 'attached' });
      expect(attachedTrait.pullType).toBe('attached');
      
      const heavyTrait = new PullableTrait({ pullType: 'heavy' });
      expect(heavyTrait.pullType).toBe('heavy');
    });
  });

  describe('state management', () => {
    it('should track pull count', () => {
      const trait = new PullableTrait();
      
      expect(trait.pullCount).toBe(0);
      
      // Simulate pulls
      trait.pullCount++;
      expect(trait.pullCount).toBe(1);
      
      trait.pullCount++;
      expect(trait.pullCount).toBe(2);
    });

    it('should manage state transitions', () => {
      const trait = new PullableTrait();
      
      expect(trait.state).toBe('default');
      
      trait.state = 'pulled';
      expect(trait.state).toBe('pulled');
      
      trait.state = 'activated';
      expect(trait.state).toBe('activated');
    });

    it('should respect max pulls', () => {
      const trait = new PullableTrait({ maxPulls: 3 });
      
      expect(trait.pullCount).toBe(0);
      expect(trait.maxPulls).toBe(3);
      
      // Simulate reaching max
      trait.pullCount = 3;
      
      // Check if at max (logic would be in action)
      expect(trait.pullCount).toBe(trait.maxPulls);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Heavy Lever', 'object');
      const trait = new PullableTrait({ pullType: 'lever' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.PULLABLE)).toBe(true);
      expect(entity.getTrait(TraitType.PULLABLE)).toBe(trait);
    });

    it('should work with multiple pullable objects', () => {
      const lever = world.createEntity('Control Lever', 'object');
      lever.add(new PullableTrait({ 
        pullType: 'lever',
        linkedTo: 'gate-001'
      }));
      
      const cord = world.createEntity('Bell Cord', 'object');
      cord.add(new PullableTrait({
        pullType: 'cord',
        activates: 'bell-001'
      }));
      
      const leverTrait = lever.getTrait(TraitType.PULLABLE) as PullableTrait;
      const cordTrait = cord.getTrait(TraitType.PULLABLE) as PullableTrait;
      
      expect(leverTrait.pullType).toBe('lever');
      expect(leverTrait.linkedTo).toBe('gate-001');
      expect(cordTrait.pullType).toBe('cord');
      expect(cordTrait.activates).toBe('bell-001');
    });
  });

  describe('pull type behaviors', () => {
    it('should handle lever configuration', () => {
      const trait = new PullableTrait({
        pullType: 'lever',
        linkedTo: 'secret-door-001',
        pullSound: 'stone_grinding.mp3',
        repeatable: true
      });
      
      expect(trait.pullType).toBe('lever');
      expect(trait.linkedTo).toBe('secret-door-001');
      expect(trait.repeatable).toBe(true);
    });

    it('should handle cord configuration', () => {
      const trait = new PullableTrait({
        pullType: 'cord',
        activates: 'bell-tower',
        detachesOnPull: false,
        maxPulls: 10
      });
      
      expect(trait.pullType).toBe('cord');
      expect(trait.activates).toBe('bell-tower');
      expect(trait.detachesOnPull).toBe(false);
      expect(trait.maxPulls).toBe(10);
    });

    it('should handle attached configuration', () => {
      const trait = new PullableTrait({
        pullType: 'attached',
        detachesOnPull: true,
        requiresStrength: 20,
        effects: {
          onDetach: 'if.event.poster_tears'
        }
      });
      
      expect(trait.pullType).toBe('attached');
      expect(trait.detachesOnPull).toBe(true);
      expect(trait.requiresStrength).toBe(20);
      expect(trait.effects?.onDetach).toBe('if.event.poster_tears');
    });

    it('should handle heavy configuration', () => {
      const trait = new PullableTrait({
        pullType: 'heavy',
        requiresStrength: 50,
        pullSound: 'scraping_stone.mp3',
        repeatable: false
      });
      
      expect(trait.pullType).toBe('heavy');
      expect(trait.requiresStrength).toBe(50);
      expect(trait.repeatable).toBe(false);
    });
  });

  describe('special effects', () => {
    it('should store custom effect events', () => {
      const trait = new PullableTrait({
        effects: {
          onPull: 'if.event.mechanism_clicks',
          onMaxPulls: 'if.event.lever_breaks',
          onDetach: 'if.event.handle_comes_off'
        }
      });
      
      expect(trait.effects).toBeDefined();
      expect(trait.effects?.onPull).toBe('if.event.mechanism_clicks');
      expect(trait.effects?.onMaxPulls).toBe('if.event.lever_breaks');
      expect(trait.effects?.onDetach).toBe('if.event.handle_comes_off');
    });

    it('should handle partial effects', () => {
      const trait = new PullableTrait({
        effects: {
          onPull: 'if.event.bell_rings'
        }
      });
      
      expect(trait.effects?.onPull).toBe('if.event.bell_rings');
      expect(trait.effects?.onMaxPulls).toBeUndefined();
      expect(trait.effects?.onDetach).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new PullableTrait({});
      
      expect(trait.pullType).toBe('lever');
      expect(trait.repeatable).toBe(true);
      expect(trait.state).toBe('default');
      expect(trait.pullCount).toBe(0);
      expect(trait.detachesOnPull).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new PullableTrait(undefined);
      
      expect(trait.pullType).toBe('lever');
      expect(trait.repeatable).toBe(true);
      expect(trait.state).toBe('default');
      expect(trait.pullCount).toBe(0);
      expect(trait.detachesOnPull).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(PullableTrait.type).toBe(TraitType.PULLABLE);
      
      const trait = new PullableTrait();
      expect(trait.type).toBe(TraitType.PULLABLE);
      expect(trait.type).toBe(PullableTrait.type);
    });

    it('should handle strength requirements', () => {
      const weakPull = new PullableTrait({ requiresStrength: 5 });
      const strongPull = new PullableTrait({ requiresStrength: 50 });
      
      expect(weakPull.requiresStrength).toBe(5);
      expect(strongPull.requiresStrength).toBe(50);
    });

    it('should handle non-repeatable pulls', () => {
      const trait = new PullableTrait({
        repeatable: false,
        maxPulls: 1
      });
      
      expect(trait.repeatable).toBe(false);
      expect(trait.maxPulls).toBe(1);
    });
  });
});
