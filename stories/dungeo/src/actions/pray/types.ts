/**
 * Pray Action Types - Story-specific action for praying
 *
 * Per Fortran source (sverbs.for V79):
 * - At Altar: Teleport to Forest
 * - Elsewhere: Generic joke response
 */

// Action ID
export const PRAY_ACTION_ID = 'DUNGEO_PRAY' as const;

// Message IDs
export const PrayMessages = {
  PRAY_GENERIC: 'dungeo.pray.generic',    // Generic prayer response
  PRAY_TELEPORT: 'dungeo.pray.teleport',  // Teleport from Altar to Forest
} as const;
