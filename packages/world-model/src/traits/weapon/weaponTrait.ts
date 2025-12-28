/**
 * Weapon trait for entities that can be used to attack
 */

import { ITrait } from '../trait';

export interface IWeaponData {
  /** Damage bonus added to attacks - ADR-072 */
  damage?: number;

  /** Skill bonus when wielding this weapon - ADR-072 */
  skillBonus?: number;

  /** Extra damage to undead/spirits - ADR-072 */
  isBlessed?: boolean;

  /** Whether this weapon glows near danger (e.g., elvish sword) - ADR-072 */
  glowsNearDanger?: boolean;

  /** Whether this weapon is currently glowing - ADR-072 */
  isGlowing?: boolean;

  /** Required trait to wield effectively - ADR-072 */
  requiredTrait?: string;

  /** Minimum damage this weapon can inflict (legacy, use damage) */
  minDamage?: number;

  /** Maximum damage this weapon can inflict (legacy, use damage) */
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

  // ADR-072 properties
  damage: number;
  skillBonus: number;
  isBlessed: boolean;
  glowsNearDanger: boolean;
  isGlowing: boolean;
  requiredTrait?: string;

  // Legacy/additional properties
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
    // ADR-072 properties
    this.damage = data.damage ?? data.maxDamage ?? 1;
    this.skillBonus = data.skillBonus ?? 0;
    this.isBlessed = data.isBlessed ?? false;
    this.glowsNearDanger = data.glowsNearDanger ?? false;
    this.isGlowing = data.isGlowing ?? false;
    this.requiredTrait = data.requiredTrait;

    // Legacy properties (for backward compatibility)
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

  /**
   * Set the glow state (for elvish sword behavior)
   */
  setGlowing(glowing: boolean): void {
    this.isGlowing = glowing;
  }
}