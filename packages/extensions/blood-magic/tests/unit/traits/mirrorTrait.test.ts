import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, World } from '@sharpee/world-model';
import { MirrorTrait, MirrorBehavior } from '../../../src/traits/mirrorTrait';
import { BloodSilverTrait } from '../../../src/traits/bloodSilverTrait';

describe('MirrorTrait and MirrorBehavior', () => {
  let world: World;
  let mirror1: Entity;
  let mirror2: Entity;
  let actor: Entity;

  beforeEach(() => {
    world = new World();
    
    // Create test entities
    mirror1 = world.createEntity('mirror1', 'bathroom mirror');
    mirror2 = world.createEntity('mirror2', 'hallway mirror');
    actor = world.createEntity('player', 'test player');
    
    // Add mirror traits
    mirror1.addTrait('mirror', {
      orientation: 'wall',
      state: 'normal',
      quality: 0.9,
      connectedTo: null,
      signatures: []
    } as MirrorTrait);
    
    mirror2.addTrait('mirror', {
      orientation: 'wall',
      state: 'normal',
      quality: 0.8,
      connectedTo: null,
      signatures: []
    } as MirrorTrait);
  });

  describe('MirrorBehavior.canEnter', () => {
    it('should allow entry when mirror is connected and normal', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.connectedTo = mirror2.id;
      
      expect(MirrorBehavior.canEnter(mirror1)).toBe(true);
    });

    it('should prevent entry when mirror is broken', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.connectedTo = mirror2.id;
      trait1.state = 'broken';
      
      expect(MirrorBehavior.canEnter(mirror1)).toBe(false);
    });

    it('should prevent entry when mirror is face-down', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.connectedTo = mirror2.id;
      trait1.state = 'face-down';
      
      expect(MirrorBehavior.canEnter(mirror1)).toBe(false);
    });

    it('should prevent entry when mirror has no connection', () => {
      expect(MirrorBehavior.canEnter(mirror1)).toBe(false);
    });
  });

  describe('MirrorBehavior.canLookThrough', () => {
    it('should allow looking through connected normal mirror', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.connectedTo = mirror2.id;
      
      expect(MirrorBehavior.canLookThrough(mirror1)).toBe(true);
    });

    it('should prevent looking through broken mirror', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.connectedTo = mirror2.id;
      trait1.state = 'broken';
      
      expect(MirrorBehavior.canLookThrough(mirror1)).toBe(false);
    });

    it('should prevent looking through covered mirror', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.connectedTo = mirror2.id;
      trait1.state = 'covered';
      
      expect(MirrorBehavior.canLookThrough(mirror1)).toBe(false);
    });
  });

  describe('MirrorBehavior.getViewQuality', () => {
    it('should return clear for high quality mirrors', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.quality = 0.9;
      
      expect(MirrorBehavior.getViewQuality(mirror1)).toBe('clear');
    });

    it('should return distorted for medium quality mirrors', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.quality = 0.5;
      
      expect(MirrorBehavior.getViewQuality(mirror1)).toBe('distorted');
    });

    it('should return murky for low quality mirrors', () => {
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      trait1.quality = 0.2;
      
      expect(MirrorBehavior.getViewQuality(mirror1)).toBe('murky');
    });
  });

  describe('MirrorBehavior.connectMirrors', () => {
    it('should establish bidirectional connection between mirrors', () => {
      // Add Silver blood to actor
      actor.addTrait('bloodSilver', {
        active: true,
        mirrorsUsed: [],
        lastMirrorUsed: null
      } as BloodSilverTrait);
      
      const result = MirrorBehavior.connectMirrors(mirror1, mirror2, actor);
      
      expect(result).toBe(true);
      
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      const trait2 = mirror2.getTrait<MirrorTrait>('mirror')!;
      
      expect(trait1.connectedTo).toBe(mirror2.id);
      expect(trait2.connectedTo).toBe(mirror1.id);
    });

    it('should record signatures when connecting', () => {
      actor.addTrait('bloodSilver', {
        active: true,
        mirrorsUsed: [],
        lastMirrorUsed: null
      } as BloodSilverTrait);
      
      MirrorBehavior.connectMirrors(mirror1, mirror2, actor);
      
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      const trait2 = mirror2.getTrait<MirrorTrait>('mirror')!;
      
      expect(trait1.signatures.length).toBe(1);
      expect(trait1.signatures[0].entityId).toBe(actor.id);
      expect(trait1.signatures[0].action).toBe('connect');
      
      expect(trait2.signatures.length).toBe(1);
      expect(trait2.signatures[0].entityId).toBe(actor.id);
      expect(trait2.signatures[0].action).toBe('connect');
    });

    it('should fail without Silver blood', () => {
      const result = MirrorBehavior.connectMirrors(mirror1, mirror2, actor);
      
      expect(result).toBe(false);
      
      const trait1 = mirror1.getTrait<MirrorTrait>('mirror')!;
      const trait2 = mirror2.getTrait<MirrorTrait>('mirror')!;
      
      expect(trait1.connectedTo).toBe(null);
      expect(trait2.connectedTo).toBe(null);
    });
  });

  describe('MirrorBehavior.recordUsage', () => {
    it('should add signature when mirror is used', () => {
      MirrorBehavior.recordUsage(mirror1, actor, 'touch');
      
      const trait = mirror1.getTrait<MirrorTrait>('mirror')!;
      
      expect(trait.signatures.length).toBe(1);
      expect(trait.signatures[0].entityId).toBe(actor.id);
      expect(trait.signatures[0].action).toBe('touch');
    });

    it('should record multiple uses', () => {
      MirrorBehavior.recordUsage(mirror1, actor, 'touch');
      MirrorBehavior.recordUsage(mirror1, actor, 'enter');
      MirrorBehavior.recordUsage(mirror1, actor, 'look');
      
      const trait = mirror1.getTrait<MirrorTrait>('mirror')!;
      
      expect(trait.signatures.length).toBe(3);
      expect(trait.signatures[0].action).toBe('touch');
      expect(trait.signatures[1].action).toBe('enter');
      expect(trait.signatures[2].action).toBe('look');
    });
  });

  describe('MirrorBehavior.hasSignatureFaded', () => {
    it('should identify fresh signatures', () => {
      const signature = {
        entityId: actor.id,
        timestamp: Date.now(),
        action: 'touch'
      };
      
      // Using current time as story time for this test
      expect(MirrorBehavior.hasSignatureFaded(signature, Date.now())).toBe(false);
    });

    it('should identify faded signatures', () => {
      const signature = {
        entityId: actor.id,
        timestamp: Date.now() - (3 * 60 * 1000), // 3 hours ago in ms
        action: 'touch'
      };
      
      // Using a time 3 hours later as story time
      expect(MirrorBehavior.hasSignatureFaded(signature, Date.now())).toBe(true);
    });
  });
});