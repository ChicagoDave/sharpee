/**
 * Language content for the steering action (ADR-366 D5c, D5i, D7a): the
 * `compass` command set aboard a vehicle. The refusals name nothing the
 * author did not and never explain the world's reason.
 */

export const steeringLanguage = {
  actionId: 'if.action.steering',

  patterns: [
    'steer [direction]',
    'heave to'
  ],

  messages: {
    // Refusals
    'not_in_vehicle': "{You're} not aboard anything {you} can steer.",
    'vehicle_no_such_command': "{You} {can't} steer {the vehicle}.",
    'cannot_steer': "{You} {can't} steer {the vehicle} that way.",
    'not_under_way': "{capitalize the vehicle} {verb:is vehicle} not under way.",
    // ADR-375 D3, D7: the naval set's refusals — none names a setting, since
    // the settings are the author's.
    'naval_how_far': "How many degrees?",
    'naval_no_wind': "There is no wind to come about through.",
    'naval_cannot_come_about': "{capitalize the vehicle} {verb:lies vehicle} dead to the wind, with no other side to come about to.",
    'sails_at_full': "All sail is set.",
    'sails_already_furled': "The sails are already furled.",

    // Success
    'steered': "{You} {steer} {the vehicle} {verbatim:direction}.",
    'hove_to': "{You} {heave} to, and {the vehicle} loses way.",
    // ADR-375 D3, D7: the naval set's reports.
    'turned': "{You} {bring} {the vehicle} to {verbatim:side}, to {verbatim:bearing} degrees.",
    'ahead': "{capitalize the vehicle} gathers way on {verbatim:bearing} degrees.",
    'came_about': "{You} {come} about, and {the vehicle} settles on {verbatim:bearing} degrees.",
    'sail_made': "{You} {make} sail.",
    'sail_shortened': "{You} {shorten} sail.",
    'sails_furled': "{You} {furl} the sails."
  },

  help: {
    description: 'Set or clear the heading of a vehicle you are aboard.',
    examples: 'steer north, heave to',
    summary: 'STEER - Set the heading of a vehicle you are aboard; HEAVE TO clears it. Example: STEER NORTH'
  }
};
