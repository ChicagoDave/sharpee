/**
 * Hades Entry Trait
 *
 * Trait for tracking whether evil spirits block the entrance to Hades.
 * The exorcism ritual clears the spirits and opens the passage.
 *
 * Replaces the anti-pattern of:
 * - (room as any).spiritsBlocking = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the hades entry trait
 */
export interface HadesEntryTraitConfig {
  /** Whether evil spirits are blocking the passage */
  spiritsBlocking: boolean;
}

/**
 * Hades Entry Trait
 *
 * Tracks whether evil spirits block the entrance to Hades.
 * Performing the exorcism ritual (bell, book, candles) clears them.
 */
export class HadesEntryTrait implements ITrait {
  static readonly type = 'dungeo.trait.hades_entry' as const;

  readonly type = HadesEntryTrait.type;

  /** Whether evil spirits are blocking the passage */
  spiritsBlocking: boolean;

  constructor(config: HadesEntryTraitConfig) {
    this.spiritsBlocking = config.spiritsBlocking;
  }
}

// Ensure the class implements ITraitConstructor
export const HadesEntryTraitConstructor: ITraitConstructor<HadesEntryTrait> = HadesEntryTrait;
