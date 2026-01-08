/**
 * Commanding Action Messages
 *
 * Message IDs for robot/NPC commanding responses.
 * Based on FORTRAN Zork timefnc.for lines 954-984.
 */

export const CommandingMessages = {
  // Validation errors
  NO_TARGET: 'dungeo.commanding.no_target',
  CANT_COMMAND: 'dungeo.commanding.cant_command',
  CANT_SEE: 'dungeo.commanding.cant_see',

  // Robot responses (from FORTRAN)
  WHIRR_BUZZ_CLICK: 'dungeo.commanding.whirr_buzz_click',      // FORTRAN message 930
  STUPID_ROBOT: 'dungeo.commanding.stupid_robot',              // FORTRAN message 570
} as const;

export type CommandingMessageId = typeof CommandingMessages[keyof typeof CommandingMessages];

export const COMMANDING_ACTION_ID = 'dungeo.action.commanding';
