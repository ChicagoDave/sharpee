/**
 * Ring Action Types - Story-specific action for ringing items
 *
 * Used primarily for ringing the brass bell in the exorcism ritual.
 */

// Action ID
export const RING_ACTION_ID = 'DUNGEO_RING' as const;

// Message IDs
export const RingMessages = {
  RING_SUCCESS: 'dungeo.ring.success',
  RING_BELL: 'dungeo.ring.bell',
  NOT_RINGABLE: 'dungeo.ring.not_ringable',
  NO_TARGET: 'dungeo.ring.no_target',
} as const;
