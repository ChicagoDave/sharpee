/**
 * Message ids for the steering action (ADR-366 D5c, D7a).
 */
export const SteeringMessages = {
  // Refusals
  NOT_IN_VEHICLE: 'not_in_vehicle',
  VEHICLE_NO_SUCH_COMMAND: 'vehicle_no_such_command',
  CANNOT_STEER: 'cannot_steer',
  NOT_UNDER_WAY: 'not_under_way',
  // Success
  STEERED: 'steered',
  HOVE_TO: 'hove_to',
} as const;
