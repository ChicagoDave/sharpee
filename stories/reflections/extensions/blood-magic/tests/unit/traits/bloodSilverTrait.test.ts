import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, World } from '@sharpee/world-model';
import { BloodSilverTrait, BloodSilverBehavior } from '../../../src/traits/bloodSilverTrait';
import { MirrorTrait } from '../../../src/traits/mirrorTrait';

describe('BloodSilverTrait and BloodSilverBehavior', () => {
  let world: World;
  let silverCarrier: Entity;
  let normalPerson: Entity;
  let mirror1: Entity;
  let mirror2: Entity;

  beforeEach(() => {
    world = new World();
    
    // Create test entities
    silverCarrier = world.createEntity('silver_carrier', 'person with Silver blood');
    normalPerson = world.createEntity('normal_person', 'person without Silver blood');
    mirror1 = world.createEntity('mirror1', 'bathroom mirror');
    mirror2 = world.createEntity('mirror2', 'hallway mirror');
    
    // Add Silver blood trait
    silverCarrier.addTrait('bloodSilver', {
      active: true,
      mirrorsUsed: [],
      lastMirrorUsed: null
    } as BloodSilverTrait);
    
    // Add mirror traits
    mirror1.addTrait('mirror', {
      orientation: 'wall',
      state: 'normal',
      quality: 0.9,
      connectedTo: mirror2.id,
      signatures: []
    } as MirrorTrait);
    
    mirror2.addTrait('mirror', {
      orientation: 'wall',
      state: 'normal',
      quality: 0.8,
      connectedTo: mirror1.id,
      signatures: []
    } as MirrorTrait);
  });

  describe('BloodSilverBehavior.canSenseRipples', () => {
    it('should return true for active Silver carriers', () => {
      expect(BloodSilverBehavior.canSenseRipples(silverCarrier)).toBe(true);
    });

    it('should return false for inactive Silver carriers', () => {
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      trait.active = false;
      
      expect(BloodSilverBehavior.canSenseRipples(silverCarrier)).toBe(false);
    });

    it('should return false for non-Silver carriers', () => {
      expect(BloodSilverBehavior.canSenseRipples(normalPerson)).toBe(false);
    });
  });

  describe('BloodSilverBehavior.detectRipple', () => {
    it('should detect ripples in mirrors Silver carrier has used', () => {
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      trait.mirrorsUsed.push(mirror1.id);
      
      expect(BloodSilverBehavior.detectRipple(silverCarrier, mirror1)).toBe(true);
    });

    it('should detect ripples in connected mirrors', () => {
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      trait.mirrorsUsed.push(mirror1.id);
      
      // Should detect ripple in mirror2 since it's connected to mirror1
      expect(BloodSilverBehavior.detectRipple(silverCarrier, mirror2)).toBe(true);
    });

    it('should not detect ripples in unrelated mirrors', () => {
      const unrelatedMirror = world.createEntity('mirror3', 'unrelated mirror');
      unrelatedMirror.addTrait('mirror', {
        orientation: 'wall',
        state: 'normal',
        quality: 0.5,
        connectedTo: null,
        signatures: []
      } as MirrorTrait);
      
      expect(BloodSilverBehavior.detectRipple(silverCarrier, unrelatedMirror)).toBe(false);
    });

    it('should not detect ripples when Silver blood is inactive', () => {
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      trait.mirrorsUsed.push(mirror1.id);
      trait.active = false;
      
      expect(BloodSilverBehavior.detectRipple(silverCarrier, mirror1)).toBe(false);
    });
  });

  describe('BloodSilverBehavior.recordMirrorUse', () => {
    it('should record first use of a mirror', () => {
      BloodSilverBehavior.recordMirrorUse(silverCarrier, mirror1);
      
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      
      expect(trait.mirrorsUsed).toContain(mirror1.id);
      expect(trait.lastMirrorUsed).toBe(mirror1.id);
    });

    it('should not duplicate mirror IDs', () => {
      BloodSilverBehavior.recordMirrorUse(silverCarrier, mirror1);
      BloodSilverBehavior.recordMirrorUse(silverCarrier, mirror1);
      BloodSilverBehavior.recordMirrorUse(silverCarrier, mirror1);
      
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      
      expect(trait.mirrorsUsed.length).toBe(1);
      expect(trait.mirrorsUsed[0]).toBe(mirror1.id);
    });

    it('should update lastMirrorUsed', () => {
      BloodSilverBehavior.recordMirrorUse(silverCarrier, mirror1);
      BloodSilverBehavior.recordMirrorUse(silverCarrier, mirror2);
      
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      
      expect(trait.lastMirrorUsed).toBe(mirror2.id);
      expect(trait.mirrorsUsed.length).toBe(2);
    });

    it('should do nothing for non-Silver carriers', () => {
      BloodSilverBehavior.recordMirrorUse(normalPerson, mirror1);
      
      const trait = normalPerson.getTrait<BloodSilverTrait>('bloodSilver');
      expect(trait).toBeUndefined();
    });
  });

  describe('BloodSilverBehavior.activate', () => {
    it('should activate Silver blood abilities', () => {
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      trait.active = false;
      
      const result = BloodSilverBehavior.activate(silverCarrier);
      
      expect(result).toBe(true);
      expect(trait.active).toBe(true);
    });

    it('should return false for non-Silver carriers', () => {
      const result = BloodSilverBehavior.activate(normalPerson);
      
      expect(result).toBe(false);
    });
  });

  describe('BloodSilverBehavior.deactivate', () => {
    it('should deactivate Silver blood abilities', () => {
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      trait.active = true;
      
      const result = BloodSilverBehavior.deactivate(silverCarrier);
      
      expect(result).toBe(true);
      expect(trait.active).toBe(false);
    });

    it('should return false for non-Silver carriers', () => {
      const result = BloodSilverBehavior.deactivate(normalPerson);
      
      expect(result).toBe(false);
    });
  });

  describe('BloodSilverBehavior.canConnect', () => {
    it('should return true for active Silver carriers', () => {
      expect(BloodSilverBehavior.canConnect(silverCarrier)).toBe(true);
    });

    it('should return false for inactive Silver carriers', () => {
      const trait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver')!;
      trait.active = false;
      
      expect(BloodSilverBehavior.canConnect(silverCarrier)).toBe(false);
    });

    it('should return false for non-Silver carriers', () => {
      expect(BloodSilverBehavior.canConnect(normalPerson)).toBe(false);
    });
  });
});