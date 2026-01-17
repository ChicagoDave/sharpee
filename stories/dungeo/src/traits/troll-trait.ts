/**
 * Troll Trait
 *
 * Trait for the troll NPC that claims capabilities for custom action handling:
 * - 'if.action.giving': Catch/eat items, throw knife back (GIVE TO TROLL)
 * - 'if.action.throwing': Same as giving (THROW AT TROLL)
 * - 'if.action.taking': Block taking the troll ("spits in your face")
 * - 'if.action.attacking': Mock unarmed attacks ("laughs at your puny gesture")
 * - 'if.action.talking': Custom response when incapacitated
 *
 * From MDL source (act1.254, dung.355)
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the troll trait
 */
export interface TrollTraitConfig {
  /** Room ID where troll resides (for exit blocking) */
  roomId: string;
  /** Entity ID of troll's axe */
  axeId: string;
}

/**
 * Troll Trait
 *
 * Entities with this trait intercept various player actions and provide
 * custom troll-specific responses via capability dispatch.
 */
export class TrollTrait implements ITrait {
  static readonly type = 'dungeo.trait.troll' as const;
  // Note: GIVING and THROWING are handled via event handlers on the troll entity
  // because they need access to both the item and recipient, which capability
  // dispatch doesn't support well for multi-object actions.
  static readonly capabilities = [
    'if.action.taking',    // Block TAKE TROLL
    'if.action.attacking', // Mock unarmed attacks
    'if.action.talking'    // Custom response when incapacitated
  ] as const;

  readonly type = TrollTrait.type;

  /** Room ID where troll resides */
  roomId: string;

  /** Entity ID of troll's axe */
  axeId: string;

  constructor(config: TrollTraitConfig) {
    this.roomId = config.roomId;
    this.axeId = config.axeId;
  }
}

// Ensure the class implements ITraitConstructor
export const TrollTraitConstructor: ITraitConstructor<TrollTrait> = TrollTrait;
