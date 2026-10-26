/**
 * Bucket Trait
 *
 * Trait for tracking whether the bucket contains water.
 * Used for the well puzzle and watering the hot peppers.
 *
 * Replaces the anti-pattern of:
 * - bucket['hasWater'] = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { type IFEntity, type ITrait, type ITraitConstructor, VehicleTrait } from '@sharpee/world-model';

/**
 * The bucket's two stops, read from its line (written top first). The
 * bucket's position is its location, never a copy.
 *
 * @returns the top and bottom room ids, or undefined when the entity has no line
 */
export function wellStops(bucket: IFEntity): { top: string; bottom: string } | undefined {
  const model = bucket.get(VehicleTrait)?.movement;
  if (model?.kind !== 'line') return undefined;
  const [top, bottom] = model.stops;
  return { top, bottom };
}

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
