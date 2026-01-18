/**
 * Egg Trait
 *
 * Trait for the jewel-encrusted egg. Claims capability for:
 * - 'if.action.opening': Blocks player from opening (only thief can open)
 *
 * From MDL source (demo.327):
 * "You have neither the tools nor the expertise."
 *
 * The thief has unique skills to open the delicate egg without destroying it.
 * If the player tries to force it open, they would destroy the contents.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the egg trait
 */
export interface EggTraitConfig {
  /** Whether the egg has been opened (by thief) */
  hasBeenOpened?: boolean;
}

/**
 * Egg Trait
 *
 * Entities with this trait have their opening action intercepted
 * by the EggOpeningBehavior which blocks player opening attempts.
 */
export class EggTrait implements ITrait {
  static readonly type = 'dungeo.trait.egg' as const;
  static readonly capabilities = [
    'if.action.opening'   // Block player opening
  ] as const;

  readonly type = EggTrait.type;

  /** Whether the egg has been opened (by thief) */
  hasBeenOpened: boolean;

  constructor(config: EggTraitConfig = {}) {
    this.hasBeenOpened = config.hasBeenOpened ?? false;
  }
}

// Ensure the class implements ITraitConstructor
export const EggTraitConstructor: ITraitConstructor<EggTrait> = EggTrait;
