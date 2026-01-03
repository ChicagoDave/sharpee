/**
 * Fill Action Types
 *
 * Used for filling containers with liquids, primarily for the bucket/well puzzle.
 * Fill bottle from bucket → bucket descends (counterweight mechanism)
 */

export const FILL_ACTION_ID = 'dungeo.action.fill' as const;

export const FillMessages = {
  SUCCESS: 'dungeo.fill.success',
  FROM_BUCKET: 'dungeo.fill.from_bucket',
  BUCKET_DESCENDS: 'dungeo.fill.bucket_descends',
  BUCKET_AT_BOTTOM: 'dungeo.fill.bucket_at_bottom',
  NO_BOTTLE: 'dungeo.fill.no_bottle',
  BOTTLE_FULL: 'dungeo.fill.bottle_full',
  NO_SOURCE: 'dungeo.fill.no_source',
  NO_WATER_IN_BUCKET: 'dungeo.fill.no_water_in_bucket',
  NOTHING_HAPPENS: 'dungeo.fill.nothing_happens'
} as const;
