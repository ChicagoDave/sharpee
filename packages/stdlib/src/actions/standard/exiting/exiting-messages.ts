/**
 * Message constants for the exiting action
 * Used by validate() and blocked() for consistent error messages
 */
export const ExitingMessages = {
  // Validation failures
  NOWHERE_TO_GO: 'nowhere_to_go',
  ALREADY_OUTSIDE: 'already_outside',
  CONTAINER_CLOSED: 'container_closed',
  CANT_EXIT: 'cant_exit',
  NOT_IN_THAT: 'not_in_that',
  NOT_ON_THAT: 'not_on_that',
  // ADR-366 D7, D7a: aboard a vehicle, only the boarding room's hatch leads out
  VEHICLE_NOT_AT_HATCH: 'vehicle_not_at_hatch',
  // Success messages
  EXITED: 'exited',
  EXITED_FROM: 'exited_from',
} as const;
