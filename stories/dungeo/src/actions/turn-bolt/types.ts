/**
 * Turn Bolt Action Types
 *
 * For turning the bolt on Flood Control Dam #3
 */

export const TURN_BOLT_ACTION_ID = 'dungeo.action.turn_bolt';

export const TurnBoltMessages = {
  // Match existing message keys in extendLanguage
  NOT_A_BOLT: 'dungeo.turn_bolt.not_a_bolt',
  WONT_TURN: 'dungeo.turn_bolt.wont_turn',       // Gate not enabled (yellow button not pressed)
  NO_TOOL: 'dungeo.turn_bolt.no_tool',           // No wrench
  WRONG_TOOL: 'dungeo.turn_bolt.wrong_tool',
  GATES_OPEN: 'dungeo.turn_bolt.gates_open',     // Dam opened/draining
  GATES_CLOSE: 'dungeo.turn_bolt.gates_close',   // Dam closed

  // For compatibility with action
  NO_BOLT: 'dungeo.turn_bolt.not_a_bolt',
  GATE_LOCKED: 'dungeo.turn_bolt.wont_turn',
  NO_WRENCH: 'dungeo.turn_bolt.no_tool',
  DAM_OPENED: 'dungeo.turn_bolt.gates_open',
  DAM_CLOSED: 'dungeo.turn_bolt.gates_close',
  DAM_ALREADY_OPEN: 'dungeo.turn_bolt.gates_open'  // Same message for already open
};
