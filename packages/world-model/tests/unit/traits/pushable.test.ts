/**
 * Tests for PushableTrait
 */

import { PushableTrait } from '../../../src/traits/pushable/pushableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('PushableTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new PushableTrait();
      
      expect(trait.type).toBe(TraitType.PUSHABLE);
      expect(trait.pushType).toBe('button');
      expect(trait.revealsPassage).toBeUndefined();
      expect(trait.pushSound).toBeUndefined();
      expect(trait.requiresStrength).toBeUndefined();
      expect(trait.repeatable).toBe(true);
      expect(trait.state).toBe('default');
      expect(trait.pushCount).toBe(0);
      expect(trait.maxPushes).toBeUndefined();
      expect(trait.pushDirection).toBeUndefined();
      expect(trait.activates).toBeUndefined();
      expect(trait.effects).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new PushableTrait({
        pushType: 'heavy',
        revealsPassage: true,
        pushSound: 'stone_grinding.mp3',
        requiresStrength: 30,
        repeatable: false,
        state: 'pushed',
        pushCount: 1,
        maxPushes: 1,
        pushDirection: 'north',
        activates: 'secret-door-001',
        effects: {
          onPush: 'if.event.wall_moves',
          onMaxPushes: 'if.event.mechanism_locks',
          onMove: 'if.event.passage_revealed'
        }
      });
      
      expect(trait.pushType).toBe('heavy');
      expect(trait.revealsPassage).toBe(true);
      expect(trait.pushSound).toBe('stone_grinding.mp3');
      expect(trait.requiresStrength).toBe(30);
      expect(trait.repeatable).toBe(false);
      expect(trait.state).toBe('pushed');
      expect(trait.pushCount).toBe(1);
      expect(trait.maxPushes).toBe(1);
      expect(trait.pushDirection).toBe('north');
      expect(trait.activates).toBe('secret-door-001');
      expect(trait.effects?.onPush).toBe('if.event.wall_moves');
      expect(trait.effects?.onMaxPushes).toBe('if.event.mechanism_locks');
      expect(trait.effects?.onMove).toBe('if.event.passage_revealed');
    });

    it('should handle all push types', () => {
      const buttonTrait = new PushableTrait({ pushType: 'button' });
      expect(buttonTrait.pushType).toBe('button');
      
      const heavyTrait = new PushableTrait({ pushType: 'heavy' });
      expect(heavyTrait.pushType).toBe('heavy');
      
      const moveableTrait = new PushableTrait({ pushType: 'moveable' });
      expect(moveableTrait.pushType).toBe('moveable');
    });
  });

  describe('state management', () => {
    it('should track push count', () => {
      const trait = new PushableTrait();
      
      expect(trait.pushCount).toBe(0);
      
      // Simulate pushes
      trait.pushCount++;
      expect(trait.pushCount).toBe(1);
      
      trait.pushCount++;
      expect(trait.pushCount).toBe(2);
    });

    it('should manage state transitions', () => {
      const trait = new PushableTrait();
      
      expect(trait.state).toBe('default');
      
      trait.state = 'pushed';
      expect(trait.state).toBe('pushed');
      
      trait.state = 'activated';
      expect(trait.state).toBe('activated');
    });

    it('should respect max pushes', () => {
      const trait = new PushableTrait({ maxPushes: 5 });
      
      expect(trait.pushCount).toBe(0);
      expect(trait.maxPushes).toBe(5);
      
      // Simulate reaching max
      trait.pushCount = 5;
      
      // Check if at max (logic would be in action)
      expect(trait.pushCount).toBe(trait.maxPushes);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Red Button', 'object');
      const trait = new PushableTrait({ pushType: 'button' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(entity.getTrait(TraitType.PUSHABLE)).toBe(trait);
    });

    it('should work with multiple pushable objects', () => {
      const button = world.createEntity('Control Button', 'object');
      button.add(new PushableTrait({ 
        pushType: 'button',
        activates: 'alarm-001'
      }));
      
      const boulder = world.createEntity('Heavy Boulder', 'object');
      boulder.add(new PushableTrait({
        pushType: 'heavy',
        revealsPassage: true,
        requiresStrength: 40
      }));
      
      const buttonTrait = button.getTrait(TraitType.PUSHABLE) as PushableTrait;
      const boulderTrait = boulder.getTrait(TraitType.PUSHABLE) as PushableTrait;
      
      expect(buttonTrait.pushType).toBe('button');
      expect(buttonTrait.activates).toBe('alarm-001');
      expect(boulderTrait.pushType).toBe('heavy');
      expect(boulderTrait.revealsPassage).toBe(true);
      expect(boulderTrait.requiresStrength).toBe(40);
    });
  });

  describe('push type behaviors', () => {
    it('should handle button configuration', () => {
      const trait = new PushableTrait({
        pushType: 'button',
        activates: 'elevator-001',
        pushSound: 'button_click.mp3',
        repeatable: true
      });
      
      expect(trait.pushType).toBe('button');
      expect(trait.activates).toBe('elevator-001');
      expect(trait.repeatable).toBe(true);
    });

    it('should handle heavy configuration', () => {
      const trait = new PushableTrait({
        pushType: 'heavy',
        revealsPassage: true,
        requiresStrength: 50,
        pushDirection: 'east',
        maxPushes: 1
      });
      
      expect(trait.pushType).toBe('heavy');
      expect(trait.revealsPassage).toBe(true);
      expect(trait.requiresStrength).toBe(50);
      expect(trait.pushDirection).toBe('east');
      expect(trait.maxPushes).toBe(1);
    });

    it('should handle moveable configuration', () => {
      const trait = new PushableTrait({
        pushType: 'moveable',
        pushDirection: 'any',
        pushSound: 'furniture_scrape.mp3',
        effects: {
          onMove: 'if.event.crate_moved'
        }
      });
      
      expect(trait.pushType).toBe('moveable');
      expect(trait.pushDirection).toBe('any');
      expect(trait.pushSound).toBe('furniture_scrape.mp3');
      expect(trait.effects?.onMove).toBe('if.event.crate_moved');
    });
  });

  describe('direction handling', () => {
    it('should handle all push directions', () => {
      const northPush = new PushableTrait({ pushDirection: 'north' });
      expect(northPush.pushDirection).toBe('north');
      
      const southPush = new PushableTrait({ pushDirection: 'south' });
      expect(southPush.pushDirection).toBe('south');
      
      const eastPush = new PushableTrait({ pushDirection: 'east' });
      expect(eastPush.pushDirection).toBe('east');
      
      const westPush = new PushableTrait({ pushDirection: 'west' });
      expect(westPush.pushDirection).toBe('west');
      
      const anyPush = new PushableTrait({ pushDirection: 'any' });
      expect(anyPush.pushDirection).toBe('any');
    });

    it('should default to no specific direction', () => {
      const trait = new PushableTrait();
      expect(trait.pushDirection).toBeUndefined();
    });
  });

  describe('special effects', () => {
    it('should store custom effect events', () => {
      const trait = new PushableTrait({
        effects: {
          onPush: 'if.event.mechanism_activates',
          onMaxPushes: 'if.event.button_stuck',
          onMove: 'if.event.object_slides'
        }
      });
      
      expect(trait.effects).toBeDefined();
      expect(trait.effects?.onPush).toBe('if.event.mechanism_activates');
      expect(trait.effects?.onMaxPushes).toBe('if.event.button_stuck');
      expect(trait.effects?.onMove).toBe('if.event.object_slides');
    });

    it('should handle partial effects', () => {
      const trait = new PushableTrait({
        effects: {
          onPush: 'if.event.button_pressed'
        }
      });
      
      expect(trait.effects?.onPush).toBe('if.event.button_pressed');
      expect(trait.effects?.onMaxPushes).toBeUndefined();
      expect(trait.effects?.onMove).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new PushableTrait({});
      
      expect(trait.pushType).toBe('button');
      expect(trait.repeatable).toBe(true);
      expect(trait.state).toBe('default');
      expect(trait.pushCount).toBe(0);
    });

    it('should handle undefined options', () => {
      const trait = new PushableTrait(undefined);
      
      expect(trait.pushType).toBe('button');
      expect(trait.repeatable).toBe(true);
      expect(trait.state).toBe('default');
      expect(trait.pushCount).toBe(0);
    });

    it('should maintain type constant', () => {
      expect(PushableTrait.type).toBe(TraitType.PUSHABLE);
      
      const trait = new PushableTrait();
      expect(trait.type).toBe(TraitType.PUSHABLE);
      expect(trait.type).toBe(PushableTrait.type);
    });

    it('should handle strength requirements', () => {
      const easyPush = new PushableTrait({ requiresStrength: 10 });
      const hardPush = new PushableTrait({ requiresStrength: 60 });
      
      expect(easyPush.requiresStrength).toBe(10);
      expect(hardPush.requiresStrength).toBe(60);
    });

    it('should handle non-repeatable pushes', () => {
      const trait = new PushableTrait({
        repeatable: false,
        maxPushes: 1
      });
      
      expect(trait.repeatable).toBe(false);
      expect(trait.maxPushes).toBe(1);
    });

    it('should handle passage revealing', () => {
      const trait = new PushableTrait({
        pushType: 'heavy',
        revealsPassage: true,
        activates: 'hidden-door-001'
      });
      
      expect(trait.revealsPassage).toBe(true);
      expect(trait.activates).toBe('hidden-door-001');
    });
  });
});
