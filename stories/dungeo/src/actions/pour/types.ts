/**
 * Pour Action Types
 *
 * Used for pouring liquids, primarily for the bucket/well puzzle.
 * Pour water into bucket → bucket rises (counterweight mechanism)
 */

export const POUR_ACTION_ID = 'dungeo.action.pour' as const;

export const PourMessages = {
  SUCCESS: 'dungeo.pour.success',
  INTO_BUCKET: 'dungeo.pour.into_bucket',
  BUCKET_RISES: 'dungeo.pour.bucket_rises',
  BUCKET_AT_TOP: 'dungeo.pour.bucket_at_top',
  NO_WATER: 'dungeo.pour.no_water',
  NO_TARGET: 'dungeo.pour.no_target',
  NOTHING_HAPPENS: 'dungeo.pour.nothing_happens',
  NOT_IN_BUCKET: 'dungeo.pour.not_in_bucket'
} as const;
