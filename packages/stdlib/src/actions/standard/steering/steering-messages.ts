/**
 * Message ids for the steering action (ADR-366 D5c, D7a).
 */
export const SteeringMessages = {
  // Refusals
  NOT_IN_VEHICLE: 'not_in_vehicle',
  VEHICLE_NO_SUCH_COMMAND: 'vehicle_no_such_command',
  CANNOT_STEER: 'cannot_steer',
  NOT_UNDER_WAY: 'not_under_way',
  /** ADR-376 D8: a heading toward the edge the vehicle is at — the stock line, or the author's edge phrase. */
  EXPANSE_EDGE: 'expanse_edge',
  EDGE_BLOCKED: 'edge_blocked',
  /** ADR-375 D3, D7: the naval set's refusals. */
  NAVAL_HOW_FAR: 'naval_how_far',
  NAVAL_NO_WIND: 'naval_no_wind',
  NAVAL_CANNOT_COME_ABOUT: 'naval_cannot_come_about',
  SAILS_AT_FULL: 'sails_at_full',
  SAILS_ALREADY_FURLED: 'sails_already_furled',
  // Success
  STEERED: 'steered',
  HOVE_TO: 'hove_to',
  /** ADR-375 D3, D7: the naval set's reports. */
  TURNED: 'turned',
  AHEAD: 'ahead',
  CAME_ABOUT: 'came_about',
  SAIL_MADE: 'sail_made',
  SAIL_SHORTENED: 'sail_shortened',
  SAILS_FURLED: 'sails_furled',
} as const;
