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

    // Success
    'steered': "{You} {steer} {the vehicle} {verbatim:direction}.",
    'hove_to': "{You} {heave} to, and {the vehicle} loses way."
  },

  help: {
    description: 'Set or clear the heading of a vehicle you are aboard.',
    examples: 'steer north, heave to',
    summary: 'STEER - Set the heading of a vehicle you are aboard; HEAVE TO clears it. Example: STEER NORTH'
  }
};
