/**
 * Message constants for the closing action
 * Used by validate() and blocked() for consistent error messages
 */
export const ClosingMessages = {
  NO_TARGET: 'no_target',
  NOT_CLOSABLE: 'not_closable',
  ALREADY_CLOSED: 'already_closed',
  PREVENTS_CLOSING: 'prevents_closing',
  CANT_CLOSE: 'cant_close',
  CANNOT_CLOSE: 'cannot_close',
  CLOSED: 'closed'
} as const;
