/**
 * Turn Bolt Action Types - Story-specific action for dam bolt
 *
 * Per FORTRAN source:
 * - Requires wrench to turn
 * - Only turns if yellow button was pressed (GATEF=TRUE)
 * - Toggles dam open/closed state
 */

// Action ID
export const TURN_BOLT_ACTION_ID = 'DUNGEO_TURN_BOLT' as const;

// Message IDs
export const TurnBoltMessages = {
  WRONG_TOOL: 'dungeo.bolt.wrong_tool',
  WONT_TURN: 'dungeo.bolt.wont_turn',
  GATES_OPEN: 'dungeo.bolt.gates_open',
  GATES_CLOSE: 'dungeo.bolt.gates_close',
  NOT_A_BOLT: 'dungeo.bolt.not_a_bolt',
  NO_TOOL: 'dungeo.bolt.no_tool',
} as const;
