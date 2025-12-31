/**
 * Break Action Types - Story-specific action for breaking items
 *
 * Used primarily for breaking the empty frame in the ghost ritual puzzle.
 */

// Action ID
export const BREAK_ACTION_ID = 'DUNGEO_BREAK' as const;

// Message IDs
export const BreakMessages = {
  BREAK_SUCCESS: 'dungeo.break.success',
  BREAK_FRAME: 'dungeo.break.frame',
  CANT_BREAK: 'dungeo.break.cant_break',
  NO_TARGET: 'dungeo.break.no_target',
  NOT_VISIBLE: 'dungeo.break.not_visible',
} as const;
