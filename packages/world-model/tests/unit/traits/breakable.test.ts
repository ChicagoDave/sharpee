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
      
      expect(trait.type).toBe(TraitType.BREAKABLE);
      expect(trait.breakMethod).toBe('force');
      expect(trait.requiresTool).toBeUndefined();
      expect(trait.strengthRequired).toBeUndefined();
      expect(trait.breakSound).toBeUndefined();
      expect(trait.breaksInto).toBeUndefined();
      expect(trait.partiallyBroken).toBe(false);
      expect(trait.hitsToBreak).toBe(1);
      expect(trait.hitsTaken).toBe(0);
      expect(trait.revealsContents).toBe(false);
      expect(trait.effects).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new BreakableTrait({
        breakMethod: 'cutting',
        requiresTool: 'axe',
        strengthRequired: 25,
        breakSound: 'wood_crack.mp3',
        breaksInto: ['plank-001', 'plank-002'],
        partiallyBroken: true,
        hitsToBreak: 5,
        hitsTaken: 2,
        revealsContents: true,
        effects: {
          onBreak: 'if.event.chest_breaks',
          onPartialBreak: 'if.event.wood_cracks'
        }
      });
      
      expect(trait.breakMethod).toBe('cutting');
      expect(trait.requiresTool).toBe('axe');
      expect(trait.strengthRequired).toBe(25);
      expect(trait.breakSound).toBe('wood_crack.mp3');
      expect(trait.breaksInto).toEqual(['plank-001', 'plank-002']);
      expect(trait.partiallyBroken).toBe(true);
      expect(trait.hitsToBreak).toBe(5);
      expect(trait.hitsTaken).toBe(2);
      expect(trait.revealsContents).toBe(true);
      expect(trait.effects?.onBreak).toBe('if.event.chest_breaks');
      expect(trait.effects?.onPartialBreak).toBe('if.event.wood_cracks');
    });

    it('should handle all break methods', () => {
      const forceTrait = new BreakableTrait({ breakMethod: 'force' });
      expect(forceTrait.breakMethod).toBe('force');
      
      const cuttingTrait = new BreakableTrait({ breakMethod: 'cutting' });
      expect(cuttingTrait.breakMethod).toBe('cutting');
      
      const heatTrait = new BreakableTrait({ breakMethod: 'heat' });
      expect(heatTrait.breakMethod).toBe('heat');
      
      const anyTrait = new BreakableTrait({ breakMethod: 'any' });
      expect(anyTrait.breakMethod).toBe('any');
    });
  });

  describe('breaking mechanics', () => {
    it('should track hits taken', () => {
      const trait = new BreakableTrait({
        hitsToBreak: 3,
        hitsTaken: 0
      });
      
      expect(trait.hitsTaken).toBe(0);
      expect(trait.hitsToBreak).toBe(3);
      
      // Simulate hitting
      trait.hitsTaken++;
      expect(trait.hitsTaken).toBe(1);
      
      trait.hitsTaken++;
      expect(trait.hitsTaken).toBe(2);
      
      trait.hitsTaken++;
      expect(trait.hitsTaken).toBe(3);
      expect(trait.hitsTaken).toBe(trait.hitsToBreak);
    });

    it('should track partial breaking', () => {
      const trait = new BreakableTrait();
      
      expect(trait.partiallyBroken).toBe(false);
      
      // Simulate partial break
      trait.partiallyBroken = true;
      expect(trait.partiallyBroken).toBe(true);
    });

    it('should handle tool requirements', () => {
      const trait = new BreakableTrait({
        breakMethod: 'cutting',
        requiresTool: 'saw'
      });
      
      expect(trait.breakMethod).toBe('cutting');
      expect(trait.requiresTool).toBe('saw');
    });

    it('should handle strength requirements', () => {
      const weakBreak = new BreakableTrait({ strengthRequired: 10 });
      expect(weakBreak.strengthRequired).toBe(10);
      
      const strongBreak = new BreakableTrait({ strengthRequired: 50 });
      expect(strongBreak.strengthRequired).toBe(50);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = world.createEntity('Wooden Door', 'object');
      const trait = new BreakableTrait({ breakMethod: 'force' });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.BREAKABLE)).toBe(true);
      expect(entity.getTrait(TraitType.BREAKABLE)).toBe(trait);
    });

    it('should work with multiple breakable objects', () => {
      const door = world.createEntity('Wooden Door', 'object');
      door.add(new BreakableTrait({
        breakMethod: 'force',
        hitsToBreak: 10,
        strengthRequired: 30,
        breakSound: 'door_splinter.mp3'
      }));
      
      const crate = world.createEntity('Wooden Crate', 'object');
      crate.add(new BreakableTrait({
        breakMethod: 'any',
        hitsToBreak: 3,
        revealsContents: true,
        breaksInto: ['wooden-plank-001', 'wooden-plank-002']
      }));
      
      const doorTrait = door.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      const crateTrait = crate.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(doorTrait.hitsToBreak).toBe(10);
      expect(doorTrait.strengthRequired).toBe(30);
      expect(crateTrait.hitsToBreak).toBe(3);
      expect(crateTrait.revealsContents).toBe(true);
    });
  });

  describe('break results', () => {
    it('should handle breaking into pieces', () => {
      const trait = new BreakableTrait({
        breaksInto: ['piece-001', 'piece-002', 'piece-003']
      });
      
      expect(trait.breaksInto).toHaveLength(3);
      expect(trait.breaksInto).toContain('piece-001');
      expect(trait.breaksInto).toContain('piece-002');
      expect(trait.breaksInto).toContain('piece-003');
    });

    it('should handle revealing contents', () => {
      const trait = new BreakableTrait({
        revealsContents: true
      });
      
      expect(trait.revealsContents).toBe(true);
    });

    it('should handle no break products', () => {
      const trait = new BreakableTrait({
        revealsContents: false,
        breaksInto: undefined
      });
      
      expect(trait.revealsContents).toBe(false);
      expect(trait.breaksInto).toBeUndefined();
    });
  });

  describe('special effects', () => {
    it('should store custom effect events', () => {
      const trait = new BreakableTrait({
        effects: {
          onBreak: 'if.event.barrier_destroyed',
          onPartialBreak: 'if.event.barrier_damaged'
        }
      });
      
      expect(trait.effects).toBeDefined();
      expect(trait.effects?.onBreak).toBe('if.event.barrier_destroyed');
      expect(trait.effects?.onPartialBreak).toBe('if.event.barrier_damaged');
    });

    it('should handle partial effects', () => {
      const trait = new BreakableTrait({
        effects: {
          onBreak: 'if.event.wall_collapses'
        }
      });
      
      expect(trait.effects?.onBreak).toBe('if.event.wall_collapses');
      expect(trait.effects?.onPartialBreak).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new BreakableTrait({});
      
      expect(trait.breakMethod).toBe('force');
      expect(trait.partiallyBroken).toBe(false);
      expect(trait.hitsToBreak).toBe(1);
      expect(trait.hitsTaken).toBe(0);
      expect(trait.revealsContents).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new BreakableTrait(undefined);
      
      expect(trait.breakMethod).toBe('force');
      expect(trait.partiallyBroken).toBe(false);
      expect(trait.hitsToBreak).toBe(1);
      expect(trait.hitsTaken).toBe(0);
      expect(trait.revealsContents).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(BreakableTrait.type).toBe(TraitType.BREAKABLE);
      
      const trait = new BreakableTrait();
      expect(trait.type).toBe(TraitType.BREAKABLE);
      expect(trait.type).toBe(BreakableTrait.type);
    });
  });

  describe('realistic scenarios', () => {
    it('should create a breakable wooden door', () => {
      const entity = world.createEntity('Wooden Door', 'object');
      
      entity.add(new BreakableTrait({
        breakMethod: 'force',
        strengthRequired: 40,
        hitsToBreak: 8,
        breakSound: 'wood_splinter.mp3',
        breaksInto: ['broken-door-001'],
        effects: {
          onPartialBreak: 'if.event.door_cracks',
          onBreak: 'if.event.door_destroyed'
        }
      }));
      
      const trait = entity.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(trait.breakMethod).toBe('force');
      expect(trait.hitsToBreak).toBe(8);
      expect(trait.strengthRequired).toBe(40);
    });

    it('should create a cuttable rope', () => {
      const entity = world.createEntity('Thick Rope', 'object');
      
      entity.add(new BreakableTrait({
        breakMethod: 'cutting',
        requiresTool: 'knife',
        hitsToBreak: 1,
        breakSound: 'rope_snap.mp3',
        breaksInto: ['rope-end-001', 'rope-end-002']
      }));
      
      const trait = entity.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(trait.breakMethod).toBe('cutting');
      expect(trait.requiresTool).toBe('knife');
      expect(trait.hitsToBreak).toBe(1);
    });

    it('should create a meltable ice barrier', () => {
      const entity = world.createEntity('Ice Wall', 'object');
      
      entity.add(new BreakableTrait({
        breakMethod: 'heat',
        requiresTool: 'torch',
        breakSound: 'ice_melt.mp3',
        hitsToBreak: 20, // Takes time to melt
        effects: {
          onPartialBreak: 'if.event.ice_drips',
          onBreak: 'if.event.ice_melts_away'
        }
      }));
      
      const trait = entity.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(trait.breakMethod).toBe('heat');
      expect(trait.requiresTool).toBe('torch');
      expect(trait.hitsToBreak).toBe(20);
    });

    it('should create a container that reveals contents', () => {
      const entity = world.createEntity('Locked Chest', 'object');
      
      entity.add(new BreakableTrait({
        breakMethod: 'force',
        strengthRequired: 35,
        hitsToBreak: 5,
        breakSound: 'chest_break.mp3',
        revealsContents: true,
        partiallyBroken: false,
        effects: {
          onBreak: 'if.event.chest_spills_contents'
        }
      }));
      
      const trait = entity.getTrait(TraitType.BREAKABLE) as BreakableTrait;
      
      expect(trait.revealsContents).toBe(true);
      expect(trait.hitsToBreak).toBe(5);
    });
  });
});
