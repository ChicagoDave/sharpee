/**
 * Weapon trait for entities that can be used to attack
 */

import { ITrait } from '../trait';

export interface IWeaponData {
  /** Minimum damage this weapon can inflict */
  minDamage?: number;
  
  /** Maximum damage this weapon can inflict */
  maxDamage?: number;
  
  /** Type of weapon (blade, blunt, piercing, magic, etc.) */
  weaponType?: string;
  
  /** Whether this weapon requires two hands */
  twoHanded?: boolean;
  
  /** Custom attack message when using this weapon */
  attackMessage?: string;
  
  /** Custom sound when weapon hits */
  hitSound?: string;
  
  /** Whether this weapon can break */
  breakable?: boolean;
  
  /** Durability remaining (if breakable) */
  durability?: number;
  
  /** Maximum durability (if breakable) */
  maxDurability?: number;
}

/**
 * Weapon trait indicates an entity can be used to attack.
 * 
 * This trait contains only data - all combat logic
 * is in WeaponBehavior and AttackBehavior.
 */
export class WeaponTrait implements ITrait, IWeaponData {
  static readonly type = 'weapon' as const;
  readonly type = 'weapon' as const;
  
  // WeaponData properties
  minDamage: number;
  maxDamage: number;
  weaponType: string;
  twoHanded: boolean;
  attackMessage?: string;
  hitSound?: string;
  breakable: boolean;
  durability?: number;
  maxDurability?: number;
  
  constructor(data: IWeaponData = {}) {
    // Set defaults and merge with provided data
    this.minDamage = data.minDamage ?? 1;
    this.maxDamage = data.maxDamage ?? data.minDamage ?? 1;
    this.weaponType = data.weaponType ?? 'blunt';
    this.twoHanded = data.twoHanded ?? false;
    this.attackMessage = data.attackMessage;
    this.hitSound = data.hitSound;
    this.breakable = data.breakable ?? false;
    this.durability = data.durability;
    this.maxDurability = data.maxDurability;
  }
}