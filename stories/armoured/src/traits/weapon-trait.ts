import { ITrait } from '@sharpee/world-model';

/**
 * Weapon category - affects combat behavior and skills.
 */
export type WeaponCategory = 'melee' | 'ranged';

/**
 * Damage type - for resistances and flavor text.
 */
export type DamageType = 'slashing' | 'piercing' | 'bludgeoning';

/**
 * WeaponTrait - Provides offensive capabilities when wielded.
 *
 * This trait is focused solely on combat properties.
 * Cost and weight are handled by other traits.
 *
 * Usage:
 *   longsword.add(new WeaponTrait({
 *     damage: 8,
 *     damageType: 'slashing',
 *     category: 'melee'
 *   }));
 */
export class WeaponTrait implements ITrait {
  static readonly type = 'armoured.trait.weapon' as const;
  readonly type = WeaponTrait.type;

  /**
   * Base damage dealt on a successful hit.
   * In a full system this might be a dice expression like "1d8".
   */
  damage: number;

  /**
   * Type of damage dealt - can affect resistances.
   */
  damageType: DamageType;

  /**
   * Melee or ranged - affects valid targets and combat flow.
   */
  category: WeaponCategory;

  constructor(config: {
    damage: number;
    damageType: DamageType;
    category: WeaponCategory;
  }) {
    this.damage = config.damage;
    this.damageType = config.damageType;
    this.category = config.category;
  }
}
