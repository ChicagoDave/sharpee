import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BreakableBehavior } from '../../../src/traits/breakable/breakableBehavior';
import { IFEntity, TraitType } from '../../../src';
import { BreakableTrait } from '../../../src/traits/breakable/breakableTrait';

describe('BreakableBehavior', () => {
  let vase: IFEntity;
  let mockWorld: any;

  beforeEach(() => {
    vase = new IFEntity('vase', 'container');
    vase.add({
      type: TraitType.BREAKABLE,
      broken: false
    } as BreakableTrait);

    mockWorld = {
      getEntity: vi.fn(() => vase),
      updateEntity: vi.fn(),
      removeEntity: vi.fn(),
      createEntity: vi.fn((name, type) => {
        const entity = new IFEntity(`${type}_${Date.now()}`, type);
        return entity;
      }),
      moveEntity: vi.fn(),
      getLocation: vi.fn(() => 'room')
    };
  });

  describe('canBreak', () => {
    it('should return true for unbroken breakable items', () => {
      expect(BreakableBehavior.canBreak(vase)).toBe(true);
    });

    it('should return false for already broken items', () => {
      const brokenVase = new IFEntity('broken-vase', 'container');
      brokenVase.add({
        type: TraitType.BREAKABLE,
        broken: true
      } as BreakableTrait);
      expect(BreakableBehavior.canBreak(brokenVase)).toBe(false);
    });

    it('should return false for non-breakable items', () => {
      const nonBreakable = new IFEntity('item', 'item');
      expect(BreakableBehavior.canBreak(nonBreakable)).toBe(false);
    });
  });

  describe('break', () => {
    it('should mark item as broken', () => {
      const result = BreakableBehavior.break(vase, mockWorld);
      
      expect(result.success).toBe(true);
      
      // Check that the trait was modified directly
      const breakableTrait = vase.get(TraitType.BREAKABLE);
      expect(breakableTrait.broken).toBe(true);
    });

    it('should not create debris (handled by story)', () => {
      const result = BreakableBehavior.break(vase, mockWorld);
      
      expect(mockWorld.createEntity).not.toHaveBeenCalled();
      expect(mockWorld.moveEntity).not.toHaveBeenCalled();
      expect(result.debrisCreated).toBeUndefined();
    });

    it('should not remove items (handled by story)', () => {
      const replaceableVase = new IFEntity('replaceable', 'container');
      replaceableVase.add({
        type: TraitType.BREAKABLE,
        broken: false
      } as BreakableTrait);
      
      mockWorld.getEntity = vi.fn(() => replaceableVase);
      
      const result = BreakableBehavior.break(replaceableVase, mockWorld);
      
      // Note: The actual implementation doesn't remove the entity directly
      // It just marks itemRemoved as false and lets the action decide
      expect(result.success).toBe(true);
      expect(result.itemRemoved).toBe(false);
    });

    it('should fail if item is already broken', () => {
      const brokenVase = new IFEntity('broken', 'container');
      brokenVase.add({
        type: TraitType.BREAKABLE,
        broken: true
      } as BreakableTrait);
      
      const result = BreakableBehavior.break(brokenVase, mockWorld);
      
      expect(result.success).toBe(false);
      expect(result.alreadyBroken).toBe(true);
    });

    it('should fail if item is not breakable', () => {
      const nonBreakable = new IFEntity('solid', 'item');
      const result = BreakableBehavior.break(nonBreakable, mockWorld);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Entity is not breakable');
    });
  });

  describe('isBroken', () => {
    it('should return true for broken items', () => {
      const brokenVase = new IFEntity('broken', 'container');
      brokenVase.add({
        type: TraitType.BREAKABLE,
        broken: true
      } as BreakableTrait);
      expect(BreakableBehavior.isBroken(brokenVase)).toBe(true);
    });

    it('should return false for unbroken items', () => {
      expect(BreakableBehavior.isBroken(vase)).toBe(false);
    });

    it('should return false for non-breakable items', () => {
      const nonBreakable = new IFEntity('item', 'item');
      expect(BreakableBehavior.isBroken(nonBreakable)).toBe(false);
    });
  });
});