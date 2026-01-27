/**
 * Bucket Trait
 *
 * Trait for tracking whether the bucket contains water.
 * Used for the well puzzle and watering the hot peppers.
 *
 * Replaces the anti-pattern of:
 * - (bucket as any).hasWater = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the bucket trait
 */
export interface BucketTraitConfig {
  /** Whether the bucket contains water */
  hasWater: boolean;
}

/**
 * Bucket Trait
 *
 * Tracks whether the bucket is filled with water.
 * Water can be poured from/into the bucket.
 */
export class BucketTrait implements ITrait {
  static readonly type = 'dungeo.trait.bucket' as const;

  readonly type = BucketTrait.type;

  /** Whether the bucket contains water */
  hasWater: boolean;

  constructor(config: BucketTraitConfig) {
    this.hasWater = config.hasWater;
  }
}

// Ensure the class implements ITraitConstructor
export const BucketTraitConstructor: ITraitConstructor<BucketTrait> = BucketTrait;
