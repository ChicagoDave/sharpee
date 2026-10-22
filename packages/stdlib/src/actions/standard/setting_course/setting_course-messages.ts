/**
 * Message ids for the setting-course action (ADR-366 D5d, D7a).
 */
export const SettingCourseMessages = {
  // Refusals
  NOT_IN_VEHICLE: 'not_in_vehicle',
  VEHICLE_NO_SUCH_COMMAND: 'vehicle_no_such_command',
  NO_DESTINATION: 'no_destination',
  NOT_A_DESTINATION: 'not_a_destination',
  ALREADY_THERE: 'already_there',
  VEHICLE_UNDER_WAY: 'vehicle_under_way',
  /** ADR-376 D8: typed coordinates outside the expanse. */
  COORDINATES_OUTSIDE_EXPANSE: 'coordinates_outside_expanse',
  // Success
  COURSE_SET: 'course_set',
  /** ADR-376 D4: a course for a cell. */
  COURSE_SET_CELL: 'course_set_cell',
} as const;
