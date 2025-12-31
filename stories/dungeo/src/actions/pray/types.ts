/**
 * Pray Action Types - Story-specific action for praying
 *
 * Used in the Basin Room for the ghost ritual puzzle.
 */

// Action ID
export const PRAY_ACTION_ID = 'DUNGEO_PRAY' as const;

// Message IDs
export const PrayMessages = {
  PRAY_GENERIC: 'dungeo.pray.generic',
  PRAY_DISARMED: 'dungeo.pray.disarmed',
  PRAY_BLESSED: 'dungeo.pray.blessed',
  PRAY_ALREADY_BLESSED: 'dungeo.pray.already_blessed',
  NOT_IN_BASIN_ROOM: 'dungeo.pray.not_in_basin_room',
} as const;
