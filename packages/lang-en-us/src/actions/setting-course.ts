/**
 * Language content for the setting-course action (ADR-366 D5d, D5i, D7a):
 * the `destinations` command set aboard a flight vehicle. The refusals
 * name nothing the author did not and never explain the world's reason.
 */

export const settingCourseLanguage = {
  actionId: 'if.action.setting_course',

  patterns: [
    'set course for [destination]',
    'set a course for [destination]'
  ],

  messages: {
    // Refusals
    'not_in_vehicle': "{You're} not aboard anything that takes a course.",
    'vehicle_no_such_command': "{capitalize the vehicle} takes no course.",
    'no_destination': "Set course for where?",
    'not_a_destination': "{capitalize the vehicle} {verb:does vehicle} not go to {verbatim:destination}.",
    'already_there': "{capitalize the vehicle} {verb:is vehicle} already at {the destination}.",
    'vehicle_under_way': "{capitalize the vehicle} {verb:is vehicle} already under way.",
    // ADR-376 D4, D8: a course by coordinates.
    'coordinates_outside_expanse': "{verbatim:destination} lies beyond the edge.",

    // Success
    'course_set': "{You} {set} course for {the destination}.",
    'course_set_cell': "{You} {set} course for {verbatim:x}, {verbatim:y}."
  },

  help: {
    description: 'Set the course of a vehicle you are aboard for one of its destinations.',
    examples: 'set course for the reef',
    summary: 'SET COURSE FOR - Send a vehicle you are aboard to one of its destinations. Example: SET COURSE FOR THE REEF'
  }
};
