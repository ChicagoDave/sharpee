/**
 * Grue Death Action Types
 *
 * Player dies when attempting to move in a dark room (with 75% probability).
 * Per Mainframe Zork Fortran source (verbs.f lines 1846-1897).
 */

export const GRUE_DEATH_ACTION_ID = 'dungeo.action.grue_death';

export const GrueDeathMessages = {
  // Message 522: Invalid exit or dark destination
  WALKED_INTO_GRUE: 'dungeo.grue.walked_into',
  // Message 523: Blocked exit (door, conditional)
  SLITHERED_INTO_ROOM: 'dungeo.grue.slithered_into',
  // Message 430: Warning when entering dark room (already in platform)
  PITCH_DARK_WARNING: 'dungeo.grue.pitch_dark_warning'
} as const;
