import { ITrait } from '@sharpee/world-model';

/**
 * Armor slot - where on the body this armor is worn.
 */
export type ArmorSlot = 'body' | 'shield';

/**
 * ArmorTrait - Provides armor class (AC) protection when worn.
 *
 * This trait is focused solely on defensive properties.
 * Cost and weight are handled by other traits (ValueTrait, IdentityTrait).
 *
 * Usage:
 *   chainmail.add(new ArmorTrait({ armorClass: 15, slot: 'body' }));
 */
export class ArmorTrait implements ITrait {
  static readonly type = 'armoured.trait.armor' as const;
  readonly type = ArmorTrait.type;

  /**
   * Armor Class - the difficulty to hit someone wearing this armor.
   * Higher is better. Base AC (unarmored) is typically 10.
   */
  armorClass: number;

  /**
   * Where this armor is worn. Body armor and shields stack.
   */
  slot: ArmorSlot;

  constructor(config: { armorClass: number; slot: ArmorSlot }) {
    this.armorClass = config.armorClass;
    this.slot = config.slot;
  }
}
