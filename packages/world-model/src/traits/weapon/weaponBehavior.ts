/**
 * Behavior for weapon entities
 */

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { WeaponTrait } from './weaponTrait';

/**
 * Result of a weapon damage calculation
 */
export interface IWeaponDamageResult {
  damage: number;
  weaponType: string;
  criticalHit?: boolean;
  weaponBroke?: boolean;
}

/**
 * Behavior for weapon entities.
 * 
 * Handles damage calculation and weapon durability.
 */
export class WeaponBehavior extends Behavior {
  static requiredTraits = [TraitType.WEAPON];
  
  /**
   * Calculate damage for a weapon
   */
  static calculateDamage(weapon: IFEntity): IWeaponDamageResult {
    if (!weapon.has(TraitType.WEAPON)) {
      throw new Error(`Entity "${weapon.id}" is not a weapon`);
    }
    const weaponTrait = weapon.get<WeaponTrait>(TraitType.WEAPON)!;
    
    // Calculate base damage (random between min and max)
    const range = weaponTrait.maxDamage - weaponTrait.minDamage;
    const damage = weaponTrait.minDamage + Math.floor(Math.random() * (range + 1));
    
    // Check for critical hit (10% chance)
    const criticalHit = Math.random() < 0.1;
    const finalDamage = criticalHit ? damage * 2 : damage;
    
    // Handle durability if weapon is breakable
    let weaponBroke = false;
    if (weaponTrait.breakable && weaponTrait.durability !== undefined) {
      weaponTrait.durability--;
      if (weaponTrait.durability <= 0) {
        weaponBroke = true;
      }
    }
    
    return {
      damage: finalDamage,
      weaponType: weaponTrait.weaponType,
      criticalHit,
      weaponBroke
    };
  }
  
  /**
   * Check if a weapon can damage a specific target type
   */
  static canDamage(weapon: IFEntity, targetType?: string): boolean {
    if (!weapon.has(TraitType.WEAPON)) {
      return false;
    }
    if (!targetType) return true;
    
    const weaponTrait = weapon.get<WeaponTrait>(TraitType.WEAPON)!;
    
    // Special logic for weapon types vs target types
    // This can be expanded based on game needs
    switch (targetType) {
      case 'ghost':
      case 'spirit':
        return weaponTrait.weaponType === 'magic' || weaponTrait.weaponType === 'blessed';
      case 'armor':
      case 'metal':
        return weaponTrait.weaponType === 'piercing' || weaponTrait.weaponType === 'magic';
      default:
        return true;
    }
  }
  
  /**
   * Get weapon type
   */
  static getWeaponType(weapon: IFEntity): string {
    const weaponTrait = WeaponBehavior.require<WeaponTrait>(weapon, TraitType.WEAPON);
    return weaponTrait.weaponType;
  }
  
  /**
   * Check if weapon requires two hands
   */
  static isTwoHanded(weapon: IFEntity): boolean {
    const weaponTrait = WeaponBehavior.require<WeaponTrait>(weapon, TraitType.WEAPON);
    return weaponTrait.twoHanded;
  }
  
  /**
   * Repair weapon (restore durability)
   */
  static repair(weapon: IFEntity): boolean {
    const weaponTrait = WeaponBehavior.require<WeaponTrait>(weapon, TraitType.WEAPON);
    
    if (!weaponTrait.breakable) return false;
    
    weaponTrait.durability = weaponTrait.maxDurability;
    return true;
  }
  
  /**
   * Check if weapon is broken
   */
  static isBroken(weapon: IFEntity): boolean {
    if (!weapon.has(TraitType.WEAPON)) {
      return false;
    }
    const weaponTrait = weapon.get<WeaponTrait>(TraitType.WEAPON)!;
    
    if (!weaponTrait.breakable) return false;
    return weaponTrait.durability !== undefined && weaponTrait.durability <= 0;
  }
}