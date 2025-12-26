import { describe, it, expect, beforeEach } from 'vitest';
import { WeaponBehavior } from '../../../src/traits/weapon/weaponBehavior';
import { IFEntity, TraitType } from '../../../src';
import { WeaponTrait } from '../../../src/traits/weapon/weaponTrait';

describe('WeaponBehavior', () => {
  let weapon: IFEntity;

  beforeEach(() => {
    weapon = new IFEntity('sword', 'weapon');
    weapon.add({
      type: TraitType.WEAPON,
      minDamage: 5,
      maxDamage: 10,
      weaponType: 'blade',
      twoHanded: false
    } as WeaponTrait);
  });

  describe('calculateDamage', () => {
    it('should return damage within min-max range', () => {
      for (let i = 0; i < 20; i++) {
        const result = WeaponBehavior.calculateDamage(weapon);
        expect(result.damage).toBeGreaterThanOrEqual(5);
        expect(result.damage).toBeLessThanOrEqual(20); // Could be critical hit (2x)
      }
    });

    it('should throw for non-weapon entities', () => {
      const nonWeapon = new IFEntity('item', 'item');
      expect(() => WeaponBehavior.calculateDamage(nonWeapon)).toThrow();
    });

    it('should handle broken weapons', () => {
      const brokenWeapon = new IFEntity('broken-sword', 'weapon');
      brokenWeapon.add({
        type: TraitType.WEAPON,
        minDamage: 5,
        maxDamage: 10,
        weaponType: 'blade',
        durability: 0,
        breakable: true
      } as WeaponTrait);
      const result = WeaponBehavior.calculateDamage(brokenWeapon);
      expect(result.weaponBroke).toBe(true);
    });

    it('should return exact damage for equal min-max', () => {
      const fixedWeapon = new IFEntity('fixed-damage', 'weapon');
      fixedWeapon.add({
        type: TraitType.WEAPON,
        minDamage: 7,
        maxDamage: 7,
        weaponType: 'blade'
      } as WeaponTrait);
      const result = WeaponBehavior.calculateDamage(fixedWeapon);
      expect(result.damage).toBe(7);
    });
  });

  describe('canDamage', () => {
    it('should return true for most target types', () => {
      expect(WeaponBehavior.canDamage(weapon, 'wood')).toBe(true);
      expect(WeaponBehavior.canDamage(weapon, 'flesh')).toBe(true);
    });

    it('should return false for ghosts without magic weapon', () => {
      expect(WeaponBehavior.canDamage(weapon, 'ghost')).toBe(false);
      expect(WeaponBehavior.canDamage(weapon, 'spirit')).toBe(false);
    });

    it('should return true when no specific type required', () => {
      expect(WeaponBehavior.canDamage(weapon)).toBe(true);
    });

    it('should return false for non-weapons', () => {
      const nonWeapon = new IFEntity('item', 'item');
      expect(WeaponBehavior.canDamage(nonWeapon, 'wood')).toBe(false);
    });
  });

  describe('isBroken', () => {
    it('should return false for weapon without durability', () => {
      expect(WeaponBehavior.isBroken(weapon)).toBe(false);
    });

    it('should return true for weapon with 0 durability', () => {
      const brokenWeapon = new IFEntity('broken', 'weapon');
      brokenWeapon.add({
        type: TraitType.WEAPON,
        minDamage: 5,
        maxDamage: 10,
        weaponType: 'blade',
        breakable: true,
        durability: 0
      } as WeaponTrait);
      expect(WeaponBehavior.isBroken(brokenWeapon)).toBe(true);
    });

    it('should return false for weapon with positive durability', () => {
      const durableWeapon = new IFEntity('durable', 'weapon');
      durableWeapon.add({
        type: TraitType.WEAPON,
        minDamage: 5,
        maxDamage: 10,
        weaponType: 'blade',
        breakable: true,
        durability: 5
      } as WeaponTrait);
      expect(WeaponBehavior.isBroken(durableWeapon)).toBe(false);
    });

    it('should return false for non-weapons', () => {
      const nonWeapon = new IFEntity('item', 'item');
      expect(WeaponBehavior.isBroken(nonWeapon)).toBe(false);
    });
  });
});