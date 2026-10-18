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
  // Success
  COURSE_SET: 'course_set',
} as const;
