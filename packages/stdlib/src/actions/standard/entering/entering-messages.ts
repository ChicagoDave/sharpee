/**
 * Message constants for the entering action
 * Used by validate() and blocked() for consistent error messages
 */
export const EnteringMessages = {
  NO_TARGET: 'no_target',
  NOT_ENTERABLE: 'not_enterable',
  ALREADY_INSIDE: 'already_inside',
  CONTAINER_CLOSED: 'container_closed',
  TOO_FULL: 'too_full',
  ENTERED: 'entered',
  ENTERED_ON: 'entered_on',
  CANT_ENTER: 'cant_enter',
  ACTION_FAILED: 'action_failed'
} as const;
