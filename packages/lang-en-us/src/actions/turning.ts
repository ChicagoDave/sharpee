/**
 * Language content for turning action
 */

export const turningLanguage = {
  actionId: 'if.action.turning',
  
  patterns: [
    'turn [something]',
    'turn [something] [direction]',
    'turn [something] to [setting]',
    'rotate [something]',
    'rotate [something] [direction]',
    'twist [something]',
    'twist [something] [direction]',
    'spin [something]',
    'dial [something]',
    'dial [something] to [setting]',
    'crank [something]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Turn what?",
    'not_visible': "{You} {can't} see {the:target}.",
    'not_reachable': "{You} {can't} reach {the:target}.",
    'wearing_it': "{You} {can't} turn {the:target} while wearing it.",
    'cant_turn_that': "{the:cap:target} isn't something {you} can turn.",

    // Success messages - dials
    'dial_turned': "{You} {turn} {the:target}.",
    'dial_set': "{You} {turn} {the:target} to {setting}.",
    'dial_adjusted': "{You} {adjust} {the:target} {direction}.",

    // Success messages - knobs
    'knob_turned': "{You} {turn} {the:target}.",
    'knob_clicks': "{You} {turn} {the:target} with a click.",
    'knob_toggled': "{You} {turn} {the:target}, switching it {newState}.",

    // Success messages - wheels/cranks
    'wheel_turned': "{You} {turn} {the:target}.",
    'crank_turned': "{You} {crank} {the:target}.",
    'mechanism_grinds': "{You} {turn} {the:target}. Gears grind and machinery moves.",
    'requires_more_turns': "{You} {turn} {the:target}. It seems to need more turning.",
    'mechanism_activated': "As {you} {turn} {the:target}, {you} {hear} machinery activate!",

    // Success messages - valves
    'valve_opened': "{You} {turn} {the:target}, opening the valve.",
    'valve_closed': "{You} {turn} {the:target}, closing the valve.",
    'flow_changes': "{You} {turn} {the:target}, adjusting the flow.",

    // Success messages - keys
    'key_needs_lock': "{You} {need} to put {the:target} in a lock first.",
    'key_turned': "{You} {turn} {the:target} in the lock.",

    // Success messages - general
    'turned': "{You} {turn} {the:target}.",
    'rotated': "{You} {rotate} {the:target}.",
    'spun': "{You} {spin} {the:target}.",
    'nothing_happens': "{You} {turn} {the:target}, but nothing happens."
  },
  
  help: {
    description: 'Turn dials, knobs, wheels, cranks, or keys to operate mechanisms.',
    examples: 'turn dial to 11, rotate wheel clockwise, twist knob left, crank handle',
    summary: 'TURN/ROTATE - Turn dials, knobs, wheels, cranks, or keys to operate mechanisms. Example: TURN DIAL TO 5'
  }
};
