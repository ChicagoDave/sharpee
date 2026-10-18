/**
 * Message constants for the going action
 * Used by validate() and blocked() for consistent error messages
 */
export const GoingMessages = {
  // Validation failures
  NO_DIRECTION: 'no_direction',
  NOT_IN_ROOM: 'not_in_room',
  NO_EXITS: 'no_exits',
  NO_EXIT_THAT_WAY: 'no_exit_that_way',
  MOVEMENT_BLOCKED: 'movement_blocked',
  DOOR_CLOSED: 'door_closed',
  DOOR_LOCKED: 'door_locked',
  DESTINATION_NOT_FOUND: 'destination_not_found',
  TOO_DARK: 'too_dark',
  NEED_LIGHT: 'need_light',
  // Vehicle refusals (ADR-366 D5, D7a)
  VEHICLE_RIDE: 'vehicle_ride',
  VEHICLE_CANNOT_WALK: 'vehicle_cannot_walk',
  VEHICLE_CANNOT_GO: 'vehicle_cannot_go',
  VEHICLE_UNDER_WAY: 'vehicle_under_way',
  // The vehicle's machine reports (ADR-366 D5e, D7a)
  VEHICLE_ARRIVED: 'vehicle_arrived',
  VEHICLE_STOPPED: 'vehicle_stopped',
  // Success messages
  WENT: 'went',
  ARRIVED: 'arrived',
  CANT_GO: 'cant_go',
} as const;
