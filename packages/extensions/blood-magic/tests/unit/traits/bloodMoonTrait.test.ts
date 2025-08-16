import { describe, it, expect, beforeEach } from 'vitest';
import { Entity, World } from '@sharpee/world-model';
import { BloodMoonTrait, BloodMoonBehavior } from '../../../src/traits/bloodMoonTrait';

describe('BloodMoonTrait and BloodMoonBehavior', () => {
  let world: World;
  let moonCarrier: Entity;
  let normalPerson: Entity;

  beforeEach(() => {
    world = new World();
    
    // Create test entities
    moonCarrier = world.createEntity('moon_carrier', 'person with Moon blood');
    normalPerson = world.createEntity('normal_person', 'person without Moon blood');
    
    // Add Moon blood trait
    moonCarrier.addTrait('bloodMoon', {
      active: true,
      invisible: false,
      lastInvisibleTime: null
    } as BloodMoonTrait);
  });

  describe('BloodMoonBehavior.becomeInvisible', () => {
    it('should make active Moon carrier invisible', () => {
      const result = BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      expect(result).toBe(true);
      
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      expect(trait.invisible).toBe(true);
      expect(trait.lastInvisibleTime).not.toBeNull();
    });

    it('should fail when Moon blood is inactive', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.active = false;
      
      const result = BloodMoonBehavior.becomeInvisible(moonCarrier);
      
      expect(result).toBe(false);
      expect(trait.invisible).toBe(false);
    });

    it('should fail for non-Moon carriers', () => {
      const result = BloodMoonBehavior.becomeInvisible(normalPerson);
      
      expect(result).toBe(false);
    });
  });

  describe('BloodMoonBehavior.becomeVisible', () => {
    it('should make invisible carrier visible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = true;
      
      const result = BloodMoonBehavior.becomeVisible(moonCarrier);
      
      expect(result).toBe(true);
      expect(trait.invisible).toBe(false);
    });

    it('should work even when already visible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = false;
      
      const result = BloodMoonBehavior.becomeVisible(moonCarrier);
      
      expect(result).toBe(true);
      expect(trait.invisible).toBe(false);
    });

    it('should fail for non-Moon carriers', () => {
      const result = BloodMoonBehavior.becomeVisible(normalPerson);
      
      expect(result).toBe(false);
    });
  });

  describe('BloodMoonBehavior.isInvisible', () => {
    it('should return true when invisible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = true;
      
      expect(BloodMoonBehavior.isInvisible(moonCarrier)).toBe(true);
    });

    it('should return false when visible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = false;
      
      expect(BloodMoonBehavior.isInvisible(moonCarrier)).toBe(false);
    });

    it('should return false for non-Moon carriers', () => {
      expect(BloodMoonBehavior.isInvisible(normalPerson)).toBe(false);
    });
  });

  describe('BloodMoonBehavior.canBecomeInvisible', () => {
    it('should return true when active and visible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.active = true;
      trait.invisible = false;
      
      expect(BloodMoonBehavior.canBecomeInvisible(moonCarrier)).toBe(true);
    });

    it('should return false when already invisible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.active = true;
      trait.invisible = true;
      
      expect(BloodMoonBehavior.canBecomeInvisible(moonCarrier)).toBe(false);
    });

    it('should return false when inactive', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.active = false;
      trait.invisible = false;
      
      expect(BloodMoonBehavior.canBecomeInvisible(moonCarrier)).toBe(false);
    });

    it('should return false for non-Moon carriers', () => {
      expect(BloodMoonBehavior.canBecomeInvisible(normalPerson)).toBe(false);
    });
  });

  describe('BloodMoonBehavior.canBecomeVisible', () => {
    it('should return true when invisible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = true;
      
      expect(BloodMoonBehavior.canBecomeVisible(moonCarrier)).toBe(true);
    });

    it('should return false when already visible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = false;
      
      expect(BloodMoonBehavior.canBecomeVisible(moonCarrier)).toBe(false);
    });

    it('should return false for non-Moon carriers', () => {
      expect(BloodMoonBehavior.canBecomeVisible(normalPerson)).toBe(false);
    });
  });

  describe('BloodMoonBehavior.activate', () => {
    it('should activate Moon blood abilities', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.active = false;
      
      const result = BloodMoonBehavior.activate(moonCarrier);
      
      expect(result).toBe(true);
      expect(trait.active).toBe(true);
    });

    it('should return false for non-Moon carriers', () => {
      const result = BloodMoonBehavior.activate(normalPerson);
      
      expect(result).toBe(false);
    });
  });

  describe('BloodMoonBehavior.deactivate', () => {
    it('should deactivate Moon blood and make visible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.active = true;
      trait.invisible = true;
      
      const result = BloodMoonBehavior.deactivate(moonCarrier);
      
      expect(result).toBe(true);
      expect(trait.active).toBe(false);
      expect(trait.invisible).toBe(false);
    });

    it('should return false for non-Moon carriers', () => {
      const result = BloodMoonBehavior.deactivate(normalPerson);
      
      expect(result).toBe(false);
    });
  });

  describe('BloodMoonBehavior.isInvisibleInScope', () => {
    it('should return true when invisible regardless of scope', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = true;
      
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'any')).toBe(true);
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'room')).toBe(true);
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'global')).toBe(true);
    });

    it('should return false when visible', () => {
      const trait = moonCarrier.getTrait<BloodMoonTrait>('bloodMoon')!;
      trait.invisible = false;
      
      expect(BloodMoonBehavior.isInvisibleInScope(moonCarrier, 'any')).toBe(false);
    });

    it('should return false for non-Moon carriers', () => {
      expect(BloodMoonBehavior.isInvisibleInScope(normalPerson, 'any')).toBe(false);
    });
  });
});