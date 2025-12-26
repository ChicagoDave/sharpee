import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestructibleBehavior } from '../../../src/traits/destructible/destructibleBehavior';
import { IFEntity, TraitType } from '../../../src';
import { DestructibleTrait } from '../../../src/traits/destructible/destructibleTrait';
import { WeaponTrait } from '../../../src/traits/weapon/weaponTrait';

describe('DestructibleBehavior', () => {
  let wall: IFEntity;
  let mockWorld: any;

  beforeEach(() => {
    wall = new IFEntity('wall', 'barrier');
    wall.add({
      type: TraitType.DESTRUCTIBLE,
      hitPoints: 10,
      maxHitPoints: 10,
      armor: 0,
      requiresWeapon: true,
      requiresType: 'blunt',
      transformTo: 'rubble',
      revealExit: 'north'
    } as DestructibleTrait);

    mockWorld = {
      getEntity: vi.fn(() => wall),
      updateEntity: vi.fn(),
      removeEntity: vi.fn(),
      createEntity: vi.fn((name, type) => {
        const entity = new IFEntity(`${type}_${Date.now()}`, type);
        return entity;
      }),
      moveEntity: vi.fn(),
      getLocation: vi.fn(() => 'room'),
      getRoom: vi.fn(() => ({ id: 'room', exits: {} })),
      updateRoom: vi.fn()
    };
  });

  describe('canDamage', () => {
    it('should return true when weapon requirements are met', () => {
      const weapon = new IFEntity('hammer', 'weapon');
      weapon.add({
        type: TraitType.WEAPON,
        weaponType: 'blunt',
        minDamage: 5,
        maxDamage: 10
      } as WeaponTrait);
      
      expect(DestructibleBehavior.canDamage(wall, 'blunt')).toBe(true);
    });

    it('should return false when wrong weapon type', () => {
      expect(DestructibleBehavior.canDamage(wall, 'blade')).toBe(false);
    });

    it('should return false when no weapon provided but required', () => {
      expect(DestructibleBehavior.canDamage(wall)).toBe(false);
    });

    it('should return true when no weapon required', () => {
      const simpleWall = new IFEntity('simple-wall', 'barrier');
      simpleWall.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 10,
        maxHitPoints: 10,
        armor: 0,
        requiresWeapon: false
      } as DestructibleTrait);
      
      expect(DestructibleBehavior.canDamage(simpleWall)).toBe(true);
    });

    it('should return false for non-destructible entities', () => {
      const nonDestructible = new IFEntity('solid', 'item');
      expect(DestructibleBehavior.canDamage(nonDestructible)).toBe(false);
    });
  });

  describe('damage', () => {
    it('should reduce hit points by damage amount', () => {
      const result = DestructibleBehavior.damage(wall, 3, 'blunt', mockWorld);
      
      expect(result.success).toBe(true);
      expect(result.destroyed).toBe(false);
      expect(result.damage).toBe(3);
      expect(result.remainingHitPoints).toBe(7);
      
      // Check that hit points were reduced
      const destructibleTrait = wall.get(TraitType.DESTRUCTIBLE) as DestructibleTrait;
      expect(destructibleTrait.hitPoints).toBe(7);
    });

    it('should destroy entity when hit points reach 0', () => {
      const result = DestructibleBehavior.damage(wall, 10, 'blunt', mockWorld);
      
      expect(result.success).toBe(true);
      expect(result.destroyed).toBe(true);
      expect(result.remainingHitPoints).toBe(0);
      expect(mockWorld.removeEntity).toHaveBeenCalledWith('wall');
    });

    it('should create transformation entity when destroyed', () => {
      const result = DestructibleBehavior.damage(wall, 10, 'blunt', mockWorld);
      
      expect(mockWorld.createEntity).toHaveBeenCalledWith('transformed wall', 'rubble');
      expect(mockWorld.moveEntity).toHaveBeenCalled();
      expect(result.transformedTo).toBeDefined();
    });

    it('should reveal exit when destroyed', () => {
      const result = DestructibleBehavior.damage(wall, 10, 'blunt', mockWorld);
      
      expect(result.exitRevealed).toBe('north');
    });

    it('should handle overkill damage', () => {
      const result = DestructibleBehavior.damage(wall, 20, 'blunt', mockWorld);
      
      expect(result.destroyed).toBe(true);
      expect(result.remainingHitPoints).toBe(0);
    });

    it('should fail for non-destructible entities', () => {
      const nonDestructible = new IFEntity('solid', 'item');
      const result = DestructibleBehavior.damage(nonDestructible, 5, 'blunt', mockWorld);
      
      expect(result.success).toBe(false);
      expect(mockWorld.updateEntity).not.toHaveBeenCalled();
    });
  });

  describe('isDestroyed', () => {
    it('should return true when hit points are 0', () => {
      const destroyedWall = new IFEntity('destroyed', 'barrier');
      destroyedWall.add({
        type: TraitType.DESTRUCTIBLE,
        hitPoints: 0,
        maxHitPoints: 10,
        armor: 0
      } as DestructibleTrait);
      
      expect(DestructibleBehavior.isDestroyed(destroyedWall)).toBe(true);
    });

    it('should return false when hit points are positive', () => {
      expect(DestructibleBehavior.isDestroyed(wall)).toBe(false);
    });

    it('should return false for non-destructible entities', () => {
      const nonDestructible = new IFEntity('solid', 'item');
      expect(DestructibleBehavior.isDestroyed(nonDestructible)).toBe(false);
    });
  });
});