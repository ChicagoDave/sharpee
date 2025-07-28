/**
 * Tests for CordTrait
 */

import { CordTrait } from '../../../src/traits/cord/cordTrait';
import { PullableTrait } from '../../../src/traits/pullable/pullableTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('CordTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with default values', () => {
      const trait = new CordTrait();
      
      expect(trait.type).toBe(TraitType.CORD);
      expect(trait.cordType).toBe('cord');
      expect(trait.activates).toBeUndefined();
      expect(trait.tension).toBe('slack');
      expect(trait.maxLength).toBeUndefined();
      expect(trait.currentLength).toBeUndefined();
      expect(trait.breakable).toBe(false);
      expect(trait.breakStrength).toBeUndefined();
      expect(trait.pullSound).toBeUndefined();
      expect(trait.breakSound).toBeUndefined();
    });

    it('should create trait with provided data', () => {
      const trait = new CordTrait({
        cordType: 'rope',
        activates: 'bell-001',
        tension: 'taut',
        maxLength: 10,
        currentLength: 5,
        breakable: true,
        breakStrength: 25,
        pullSound: 'rope_strain.mp3',
        breakSound: 'rope_snap.mp3'
      });
      
      expect(trait.cordType).toBe('rope');
      expect(trait.activates).toBe('bell-001');
      expect(trait.tension).toBe('taut');
      expect(trait.maxLength).toBe(10);
      expect(trait.currentLength).toBe(5);
      expect(trait.breakable).toBe(true);
      expect(trait.breakStrength).toBe(25);
      expect(trait.pullSound).toBe('rope_strain.mp3');
      expect(trait.breakSound).toBe('rope_snap.mp3');
    });

    it('should handle all cord types', () => {
      const rope = new CordTrait({ cordType: 'rope' });
      expect(rope.cordType).toBe('rope');
      
      const cord = new CordTrait({ cordType: 'cord' });
      expect(cord.cordType).toBe('cord');
      
      const chain = new CordTrait({ cordType: 'chain' });
      expect(chain.cordType).toBe('chain');
      
      const string = new CordTrait({ cordType: 'string' });
      expect(string.cordType).toBe('string');
      
      const cable = new CordTrait({ cordType: 'cable' });
      expect(cable.cordType).toBe('cable');
      
      const wire = new CordTrait({ cordType: 'wire' });
      expect(wire.cordType).toBe('wire');
    });
  });

  describe('cord mechanics', () => {
    it('should track tension state', () => {
      const trait = new CordTrait();
      
      expect(trait.tension).toBe('slack');
      
      trait.tension = 'taut';
      expect(trait.tension).toBe('taut');
      
      trait.tension = 'slack';
      expect(trait.tension).toBe('slack');
    });

    it('should handle length properties', () => {
      const trait = new CordTrait({
        maxLength: 20,
        currentLength: 10
      });
      
      expect(trait.maxLength).toBe(20);
      expect(trait.currentLength).toBe(10);
      
      // Simulate extending
      trait.currentLength = 15;
      expect(trait.currentLength).toBe(15);
      
      // At max length
      trait.currentLength = 20;
      expect(trait.currentLength).toBe(trait.maxLength);
    });

    it('should handle breakable cords', () => {
      const trait = new CordTrait({
        breakable: true,
        breakStrength: 30
      });
      
      expect(trait.breakable).toBe(true);
      expect(trait.breakStrength).toBe(30);
    });

    it('should handle unbreakable cords', () => {
      const trait = new CordTrait({
        cordType: 'chain',
        breakable: false
      });
      
      expect(trait.cordType).toBe('chain');
      expect(trait.breakable).toBe(false);
      expect(trait.breakStrength).toBeUndefined();
    });
  });

  describe('entity integration', () => {
    it('should work with pullable trait', () => {
      const entity = world.createEntity('Bell Rope', 'object');
      
      entity.add(new PullableTrait({
        pullType: 'cord',
        activates: 'chapel-bell'
      }));
      
      entity.add(new CordTrait({
        cordType: 'rope',
        activates: 'chapel-bell',
        tension: 'slack'
      }));
      
      expect(entity.hasTrait(TraitType.PULLABLE)).toBe(true);
      expect(entity.hasTrait(TraitType.CORD)).toBe(true);
      
      const pullable = entity.getTrait(TraitType.PULLABLE) as PullableTrait;
      const cord = entity.getTrait(TraitType.CORD) as CordTrait;
      
      expect(pullable.pullType).toBe('cord');
      expect(cord.cordType).toBe('rope');
      expect(pullable.activates).toBe(cord.activates);
    });

    it('should handle different cord materials', () => {
      const rope = world.createEntity('Thick Rope', 'object');
      rope.add(new CordTrait({
        cordType: 'rope',
        breakable: true,
        breakStrength: 50
      }));
      
      const chain = world.createEntity('Iron Chain', 'object');
      chain.add(new CordTrait({
        cordType: 'chain',
        breakable: false,
        pullSound: 'chain_rattle.mp3'
      }));
      
      const string = world.createEntity('Thin String', 'object');
      string.add(new CordTrait({
        cordType: 'string',
        breakable: true,
        breakStrength: 5
      }));
      
      const ropeTrait = rope.getTrait(TraitType.CORD) as CordTrait;
      const chainTrait = chain.getTrait(TraitType.CORD) as CordTrait;
      const stringTrait = string.getTrait(TraitType.CORD) as CordTrait;
      
      expect(ropeTrait.breakable).toBe(true);
      expect(ropeTrait.breakStrength).toBe(50);
      
      expect(chainTrait.breakable).toBe(false);
      expect(chainTrait.pullSound).toBe('chain_rattle.mp3');
      
      expect(stringTrait.breakable).toBe(true);
      expect(stringTrait.breakStrength).toBe(5);
    });
  });

  describe('activation behavior', () => {
    it('should store activation target', () => {
      const trait = new CordTrait({
        activates: 'mechanism-001'
      });
      
      expect(trait.activates).toBe('mechanism-001');
    });

    it('should handle cords without activation', () => {
      const trait = new CordTrait({
        cordType: 'rope',
        // Just a rope, doesn't activate anything
      });
      
      expect(trait.activates).toBeUndefined();
    });
  });

  describe('sound effects', () => {
    it('should store pull and break sounds', () => {
      const trait = new CordTrait({
        pullSound: 'rope_creak.mp3',
        breakSound: 'loud_snap.mp3'
      });
      
      expect(trait.pullSound).toBe('rope_creak.mp3');
      expect(trait.breakSound).toBe('loud_snap.mp3');
    });

    it('should handle cords without sounds', () => {
      const trait = new CordTrait();
      
      expect(trait.pullSound).toBeUndefined();
      expect(trait.breakSound).toBeUndefined();
    });

    it('should have different sounds for different materials', () => {
      const chain = new CordTrait({
        cordType: 'chain',
        pullSound: 'metal_clink.mp3'
      });
      
      const rope = new CordTrait({
        cordType: 'rope',
        pullSound: 'fiber_stretch.mp3'
      });
      
      expect(chain.pullSound).toBe('metal_clink.mp3');
      expect(rope.pullSound).toBe('fiber_stretch.mp3');
    });
  });

  describe('edge cases', () => {
    it('should handle empty options object', () => {
      const trait = new CordTrait({});
      
      expect(trait.cordType).toBe('cord');
      expect(trait.tension).toBe('slack');
      expect(trait.breakable).toBe(false);
    });

    it('should handle undefined options', () => {
      const trait = new CordTrait(undefined);
      
      expect(trait.cordType).toBe('cord');
      expect(trait.tension).toBe('slack');
      expect(trait.breakable).toBe(false);
    });

    it('should maintain type constant', () => {
      expect(CordTrait.type).toBe(TraitType.CORD);
      
      const trait = new CordTrait();
      expect(trait.type).toBe(TraitType.CORD);
      expect(trait.type).toBe(CordTrait.type);
    });

    it('should handle cord at max extension', () => {
      const trait = new CordTrait({
        maxLength: 10,
        currentLength: 10,
        tension: 'taut'
      });
      
      expect(trait.currentLength).toBe(trait.maxLength);
      expect(trait.tension).toBe('taut');
    });

    it('should handle very weak cord', () => {
      const trait = new CordTrait({
        cordType: 'string',
        breakable: true,
        breakStrength: 1
      });
      
      expect(trait.breakable).toBe(true);
      expect(trait.breakStrength).toBe(1);
    });
  });
});
