/**
 * Message constants for the removing action
 * Used by validate() and blocked() for consistent error messages
 */
export const RemovingMessages = {
  NO_TARGET: 'no_target',
  NO_SOURCE: 'no_source',
  NOT_IN_CONTAINER: 'not_in_container',
  NOT_ON_SURFACE: 'not_on_surface',
  CONTAINER_CLOSED: 'container_closed',
  REMOVED_FROM: 'removed_from',
  REMOVED_FROM_SURFACE: 'removed_from_surface',
  CANT_REACH: 'cant_reach',
  ALREADY_HAVE: 'already_have',
  CANNOT_TAKE: 'cannot_take',
  CANT_REMOVE: 'cant_remove',
  TOO_HEAVY: 'too_heavy',
  CONTAINER_FULL: 'container_full',
  CANT_TAKE: 'cant_take',
  NOTHING_TO_REMOVE: 'nothing_to_remove'
} as const;
