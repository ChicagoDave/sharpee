/**
 * Treasure Trait
 *
 * Platform trait for marking entities as treasures with scoring values.
 *
 * From MDL source (mdlzork_810722):
 * - OFVAL (Object Find Value) = treasureValue (points for taking)
 * - OTVAL (Object Trophy Value) = trophyCaseValue (points for placing in case)
 *
 * This trait persists through checkpoint save/restore, unlike custom properties.
 */

import { ITrait } from '../trait';

/**
 * Configuration for the treasure trait
 */
export interface TreasureTraitConfig {
  /** Unique identifier for the treasure (used by scoring system) */
  treasureId: string;

  /** Points awarded when first taking the treasure (OFVAL) */
  treasureValue: number;

  /** Points awarded when placing in trophy case (OTVAL) */
  trophyCaseValue: number;
}

/**
 * Treasure Trait
 *
 * Entities with this trait are considered treasures and can be:
 * - Scored when first taken (treasureValue points)
 * - Scored when placed in trophy case (trophyCaseValue points)
 *
 * The scoring service tracks which treasures have been scored to prevent
 * double-scoring.
 */
export class TreasureTrait implements ITrait {
  static readonly type = 'treasure' as const;

  readonly type = TreasureTrait.type;

  /** Unique identifier for the treasure (used by scoring system) */
  treasureId: string;

  /** Points awarded when first taking the treasure (OFVAL) */
  treasureValue: number;

  /** Points awarded when placing in trophy case (OTVAL) */
  trophyCaseValue: number;

  constructor(config: TreasureTraitConfig) {
    this.treasureId = config.treasureId;
    this.treasureValue = config.treasureValue;
    this.trophyCaseValue = config.trophyCaseValue;
  }
}
