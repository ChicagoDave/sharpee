import { describe, it, expect } from 'vitest';
import {
  BloodMoonTrait,
  createBloodMoonTrait,
  activateInvisibility,
  deactivateInvisibility
} from '../../src/traits/bloodMoonTrait/bloodMoonTrait';

describe('BloodMoonTrait', () => {
  describe('createBloodMoonTrait', () => {
    it('should create a moon trait with default properties', () => {
      const trait = createBloodMoonTrait();
      
      expect(trait.type).toBe('blood_moon');
      expect(trait.isInvisible).toBe(false);
      expect(trait.timesActivated).toBe(0);
      expect(trait.lastActivationTime).toBeUndefined();
      expect(trait.totalInvisibleTime).toBe(0);
      expect(trait.focusObject).toBeUndefined();
    });

    it('should create a moon trait with custom properties', () => {
      const trait = createBloodMoonTrait({
        isInvisible: true,
        timesActivated: 3,
        lastActivationTime: 100,
        totalInvisibleTime: 25,
        focusObject: 'moon_necklace'
      });
      
      expect(trait.isInvisible).toBe(true);
      expect(trait.timesActivated).toBe(3);
      expect(trait.lastActivationTime).toBe(100);
      expect(trait.totalInvisibleTime).toBe(25);
      expect(trait.focusObject).toBe('moon_necklace');
    });
  });

  describe('activateInvisibility', () => {
    it('should activate invisibility when not invisible', () => {
      const trait = createBloodMoonTrait();
      const storyTime = 50;
      
      activateInvisibility(trait, storyTime);
      
      expect(trait.isInvisible).toBe(true);
      expect(trait.timesActivated).toBe(1);
      expect(trait.lastActivationTime).toBe(50);
    });

    it('should not re-activate if already invisible', () => {
      const trait = createBloodMoonTrait({
        isInvisible: true,
        timesActivated: 2,
        lastActivationTime: 30
      });
      
      activateInvisibility(trait, 50);
      
      expect(trait.isInvisible).toBe(true);
      expect(trait.timesActivated).toBe(2); // Should not increment
      expect(trait.lastActivationTime).toBe(30); // Should not change
    });
  });

  describe('deactivateInvisibility', () => {
    it('should deactivate invisibility and track duration', () => {
      const trait = createBloodMoonTrait({
        isInvisible: true,
        lastActivationTime: 30,
        totalInvisibleTime: 10
      });
      const storyTime = 50;
      
      deactivateInvisibility(trait, storyTime);
      
      expect(trait.isInvisible).toBe(false);
      expect(trait.totalInvisibleTime).toBe(30); // 10 + (50 - 30)
    });

    it('should not deactivate if not invisible', () => {
      const trait = createBloodMoonTrait({
        isInvisible: false,
        totalInvisibleTime: 10
      });
      
      deactivateInvisibility(trait, 50);
      
      expect(trait.isInvisible).toBe(false);
      expect(trait.totalInvisibleTime).toBe(10); // Should not change
    });

    it('should handle deactivation without activation time', () => {
      const trait = createBloodMoonTrait({
        isInvisible: true,
        totalInvisibleTime: 10
        // No lastActivationTime
      });
      
      deactivateInvisibility(trait, 50);
      
      expect(trait.isInvisible).toBe(false);
      expect(trait.totalInvisibleTime).toBe(10); // Should not change without activation time
    });
  });

  describe('invisibility tracking', () => {
    it('should track multiple invisibility sessions', () => {
      const trait = createBloodMoonTrait();
      
      // First session: 10-20 (10 hours)
      activateInvisibility(trait, 10);
      deactivateInvisibility(trait, 20);
      expect(trait.totalInvisibleTime).toBe(10);
      expect(trait.timesActivated).toBe(1);
      
      // Second session: 30-45 (15 hours)
      activateInvisibility(trait, 30);
      deactivateInvisibility(trait, 45);
      expect(trait.totalInvisibleTime).toBe(25);
      expect(trait.timesActivated).toBe(2);
      
      // Third session: 50-55 (5 hours)
      activateInvisibility(trait, 50);
      deactivateInvisibility(trait, 55);
      expect(trait.totalInvisibleTime).toBe(30);
      expect(trait.timesActivated).toBe(3);
    });
  });
});