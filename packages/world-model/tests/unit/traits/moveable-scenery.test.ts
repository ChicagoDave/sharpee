/**
 * Tests for MoveableSceneryTrait
 */

import { MoveableSceneryTrait } from '../../../src/traits/moveable-scenery/moveableSceneryTrait';
import { PushableTrait } from '../../../src/traits/pushable/pushableTrait';
import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('MoveableSceneryTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new MoveableSceneryTrait();
      
      expect(trait.type).toBe(TraitType.MOVEABLE_SCENERY);
      expect(trait.weightClass).toBe('heavy');
      expect(trait.revealsWhenMoved).toBe(false);
      expect(trait.reveals).toBeUndefined();
      expect(trait.blocksExits).toBe(false);
      expect(trait.blockedExits).toBeUndefined();
      expect(trait.moved).toBe(false);
      expect(trait.originalRoom).toBeUndefined();
      expect(trait.moveSound).toBeUndefined();
      expect(trait.requiresMultiplePeople).toBe(false);
      expect(trait.peopleRequired).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new MoveableSceneryTrait({
        weightClass: 'immense',
        revealsWhenMoved: true,
        reveals: 'secret-passage-001',
        blocksExits: true,
        blockedExits: ['north', 'east'],
        moved: true,
        originalRoom: 'great-hall',
        moveSound: 'stone_grinding.mp3',
        requiresMultiplePeople: true,
        peopleRequired: 3
      });
      
      expect(trait.weightClass).toBe('immense');
      expect(trait.revealsWhenMoved).toBe(true);
      expect(trait.reveals).toBe('secret-passage-001');
      expect(trait.blocksExits).toBe(true);
      expect(trait.blockedExits).toEqual(['north', 'east']);
      expect(trait.moved).toBe(true);
      expect(trait.originalRoom).toBe('great-hall');
      expect(trait.moveSound).toBe('stone_grinding.mp3');
      expect(trait.requiresMultiplePeople).toBe(true);
      expect(trait.peopleRequired).toBe(3);
    });

    it('should handle all weight classes', () => {
      const lightTrait = new MoveableSceneryTrait({ weightClass: 'light' });
      expect(lightTrait.weightClass).toBe('light');
      
      const mediumTrait = new MoveableSceneryTrait({ weightClass: 'medium' });
      expect(mediumTrait.weightClass).toBe('medium');
      
      const heavyTrait = new MoveableSceneryTrait({ weightClass: 'heavy' });
      expect(heavyTrait.weightClass).toBe('heavy');
      
      const immenseTrait = new MoveableSceneryTrait({ weightClass: 'immense' });
      expect(immenseTrait.weightClass).toBe('immense');
    });
  });

  describe('blocking behavior', () => {
    it('should track blocked exits', () => {
      const trait = new MoveableSceneryTrait({
        blocksExits: true,
        blockedExits: ['north', 'south']
      });
      
      expect(trait.blocksExits).toBe(true);
      expect(trait.blockedExits).toHaveLength(2);
      expect(trait.blockedExits).toContain('north');
      expect(trait.blockedExits).toContain('south');
    });

    it('should handle single blocked exit', () => {
      const trait = new MoveableSceneryTrait({
        blocksExits: true,
        blockedExits: ['west']
      });
      
      expect(trait.blocksExits).toBe(true);
      expect(trait.blockedExits).toHaveLength(1);
      expect(trait.blockedExits?.[0]).toBe('west');
    });

    it('should handle no blocked exits when not blocking', () => {
      const trait = new MoveableSceneryTrait({
        blocksExits: false
      });
      
      expect(trait.blocksExits).toBe(false);
      expect(trait.blockedExits).toBeUndefined();
    });
  });

  describe('reveal behavior', () => {
    it('should track what is revealed when moved', () => {
      const trait = new MoveableSceneryTrait({
        revealsWhenMoved: true,
        reveals: 'hidden-door-001'
      });
      
      expect(trait.revealsWhenMoved).toBe(true);
      expect(trait.reveals).toBe('hidden-door-001');
    });

    it('should handle no reveal', () => {
      const trait = new MoveableSceneryTrait({
        revealsWhenMoved: false
      });
      
      expect(trait.revealsWhenMoved).toBe(false);
      expect(trait.reveals).toBeUndefined();
    });
  });

  describe('movement tracking', () => {
    it('should track if moved', () => {
      const trait = new MoveableSceneryTrait();
      
      expect(trait.moved).toBe(false);
      
      // Simulate moving
      trait.moved = true;
      expect(trait.moved).toBe(true);
    });

    it('should track original room', () => {
      const trait = new MoveableSceneryTrait({
        originalRoom: 'library'
      });
      
      expect(trait.originalRoom).toBe('library');
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Heavy Statue', 'object');
      const trait = new MoveableSceneryTrait({ weightClass: 'heavy' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.MOVEABLE_SCENERY)).toBe(true);
      expect(entity.getTrait(TraitType.MOVEABLE_SCENERY)).toBe(trait);
    });

    it('should work with PushableTrait', () => {
      const entity = world.createEntity('Stone Boulder', 'object');
      
      entity.add(new MoveableSceneryTrait({
        weightClass: 'immense',
        revealsWhenMoved: true,
        reveals: 'cave-entrance',
        blocksExits: true,
        blockedExits: ['north']
      }));
      
      entity.add(new PushableTrait({
        pushType: 'heavy',
        requiresStrength: 50,
        pushDirection: 'north',
        pushSound: 'boulder_roll.mp3'
      }));
      
      const moveableTrait = entity.getTrait(TraitType.MOVEABLE_SCENERY) as MoveableSceneryTrait;
      const pushableTrait = entity.getTrait(TraitType.PUSHABLE) as PushableTrait;
      
      expect(moveableTrait.weightClass).toBe('immense');
      expect(moveableTrait.revealsWhenMoved).toBe(true);
      expect(pushableTrait.requiresStrength).toBe(50);
    });

    it('should work with both PushableTrait and PullableTrait', () => {
      const entity = world.createEntity('Heavy Crate', 'object');
      
      entity.add(new MoveableSceneryTrait({
        weightClass: 'medium',
        moveSound: 'wooden_scrape.mp3'
      }));
      
      entity.add(new PushableTrait({
        pushType: 'moveable',
        pushDirection: 'any'
      }));
      
      entity.add(new PullableTrait({
        pullType: 'heavy',
        requiresStrength: 20
      }));
      
      expect(entity.hasTrait(TraitType.MOVEABLE_SCENERY)).toBe(true);
      expect(entity.hasTrait(TraitType.PUSHABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.PULLABLE)).toBe(true);
    });
  });

  describe('multi-person requirements', () => {
    it('should handle single person movement', () => {
      const trait = new MoveableSceneryTrait({
        requiresMultiplePeople: false
      });
      
      expect(trait.requiresMultiplePeople).toBe(false);
      expect(trait.peopleRequired).toBeUndefined();
    });

    it('should handle multi-person movement', () => {
      const trait = new MoveableSceneryTrait({
        requiresMultiplePeople: true,
        peopleRequired: 4
      });
      
      expect(trait.requiresMultiplePeople).toBe(true);
      expect(trait.peopleRequired).toBe(4);
    });

    it('should default people required when multi-person is true', () => {
      const trait = new MoveableSceneryTrait({
        requiresMultiplePeople: true
        // peopleRequired not specified
      });
      
      expect(trait.requiresMultiplePeople).toBe(true);
      expect(trait.peopleRequired).toBeUndefined(); // Action would default to 2
    });
  });

  describe('sound effects', () => {
    it('should store movement sounds', () => {
      const stoneTrait = new MoveableSceneryTrait({
        moveSound: 'stone_grinding.mp3'
      });
      expect(stoneTrait.moveSound).toBe('stone_grinding.mp3');
      
      const woodTrait = new MoveableSceneryTrait({
        moveSound: 'wood_creaking.mp3'
      });
      expect(woodTrait.moveSound).toBe('wood_creaking.mp3');
      
      const metalTrait = new MoveableSceneryTrait({
        moveSound: 'metal_scraping.mp3'
      });
      expect(metalTrait.moveSound).toBe('metal_scraping.mp3');
    });

    it('should handle no sound', () => {
      const trait = new MoveableSceneryTrait();
      expect(trait.moveSound).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new MoveableSceneryTrait({});
      
      expect(trait.weightClass).toBe('heavy');
      expect(trait.revealsWhenMoved).toBe(false);
      expect(trait.blocksExits).toBe(false);
      expect(trait.moved).toBe(false);
      expect(trait.requiresMultiplePeople).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new MoveableSceneryTrait(undefined);
      
      expect(trait.weightClass).toBe('heavy');
      expect(trait.revealsWhenMoved).toBe(false);
      expect(trait.blocksExits).toBe(false);
      expect(trait.moved).toBe(false);
      expect(trait.requiresMultiplePeople).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(MoveableSceneryTrait.type).toBe(TraitType.MOVEABLE_SCENERY);
      
      const trait = new MoveableSceneryTrait();
      expect(trait.type).toBe(TraitType.MOVEABLE_SCENERY);
      expect(trait.type).toBe(MoveableSceneryTrait.type);
    });
  });

  describe('realistic scenarios', () => {
    it('should create a blocking boulder', () => {
      const entity = world.createEntity('Massive Boulder', 'object');
      
      entity.add(new MoveableSceneryTrait({
        weightClass: 'immense',
        blocksExits: true,
        blockedExits: ['north'],
        revealsWhenMoved: true,
        reveals: 'cave-mouth',
        moveSound: 'boulder_rumble.mp3',
        requiresMultiplePeople: true,
        peopleRequired: 3
      }));
      
      entity.add(new PushableTrait({
        pushType: 'heavy',
        pushDirection: 'north',
        requiresStrength: 60,
        maxPushes: 1
      }));
      
      const moveableTrait = entity.getTrait(TraitType.MOVEABLE_SCENERY) as MoveableSceneryTrait;
      
      expect(moveableTrait.blocksExits).toBe(true);
      expect(moveableTrait.blockedExits).toContain('north');
      expect(moveableTrait.revealsWhenMoved).toBe(true);
      expect(moveableTrait.requiresMultiplePeople).toBe(true);
    });

    it('should create a moveable bookshelf', () => {
      const entity = world.createEntity('Heavy Bookshelf', 'object');
      
      entity.add(new MoveableSceneryTrait({
        weightClass: 'heavy',
        revealsWhenMoved: true,
        reveals: 'secret-room',
        moveSound: 'furniture_slide.mp3',
        originalRoom: 'library'
      }));
      
      entity.add(new PushableTrait({
        pushType: 'heavy',
        pushDirection: 'east',
        requiresStrength: 30,
        revealsPassage: true
      }));
      
      const moveableTrait = entity.getTrait(TraitType.MOVEABLE_SCENERY) as MoveableSceneryTrait;
      const pushableTrait = entity.getTrait(TraitType.PUSHABLE) as PushableTrait;
      
      expect(moveableTrait.revealsWhenMoved).toBe(true);
      expect(moveableTrait.reveals).toBe('secret-room');
      expect(pushableTrait.revealsPassage).toBe(true);
    });

    it('should create a light moveable crate', () => {
      const entity = world.createEntity('Wooden Crate', 'object');
      
      entity.add(new MoveableSceneryTrait({
        weightClass: 'light',
        moveSound: 'crate_slide.mp3'
      }));
      
      entity.add(new PushableTrait({
        pushType: 'moveable',
        pushDirection: 'any',
        requiresStrength: 10
      }));
      
      entity.add(new PullableTrait({
        pullType: 'heavy',
        requiresStrength: 10
      }));
      
      const moveableTrait = entity.getTrait(TraitType.MOVEABLE_SCENERY) as MoveableSceneryTrait;
      
      expect(moveableTrait.weightClass).toBe('light');
      expect(moveableTrait.requiresMultiplePeople).toBe(false);
    });
  });
});
