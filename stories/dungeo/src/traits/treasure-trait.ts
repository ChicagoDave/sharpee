/**
 * Story-Level Treasure Trait (ADR-129)
 *
 * Zork-specific trait for items that award points when placed in the trophy case.
 * Platform-level take-scoring uses IdentityTrait.points instead.
 *
 * From MDL source (mdlzork_810722):
 * - OTVAL (Object Trophy Value) = trophyCaseValue (points for placing in case)
 */

import { ITrait } from '@sharpee/world-model';

export interface TreasureTraitConfig {
  /** Points awarded when placing in trophy case (MDL: OTVAL) */
  trophyCaseValue: number;
  /** Description for score ledger entry (defaults to entity name) */
  trophyCaseDescription?: string;
}

export class TreasureTrait implements ITrait {
  static readonly type = 'dungeo.trait.treasure' as const;
  readonly type = TreasureTrait.type;

  trophyCaseValue: number;
  trophyCaseDescription?: string;

  constructor(config: TreasureTraitConfig) {
    this.trophyCaseValue = config.trophyCaseValue;
    this.trophyCaseDescription = config.trophyCaseDescription;
  }
}
