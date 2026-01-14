/**
 * Language content for switching off action
 */

export const switchingOffLanguage = {
  actionId: 'if.action.switching_off',
  
  patterns: [
    'switch off [something]',
    'switch [something] off',
    'turn off [something]',
    'turn [something] off',
    'deactivate [something]',
    'stop [something]',
    'power off [something]',
    'power [something] off'
  ],
  
  messages: {
    // Error messages
    'no_target': "Switch off what?",
    'not_visible': "{You} {can't} see {target}.",
    'not_reachable': "{You} {can't} reach {target}.",
    'not_switchable': "{target} isn't something {you} can switch off.",
    'already_off': "{target} is already off.",

    // Success messages
    'switched_off': "{You} {switch} off {target}.",
    'light_off': "{You} {switch} off {target}, plunging the area into darkness.",
    'light_off_still_lit': "{You} {switch} off {target}.",
    'device_stops': "{target} powers down with a soft whir.",
    'silence_falls': "{You} {switch} off {target}. Silence falls.",
    'with_sound': "{You} {switch} off {target}. {sound}",
    'door_closes': "{target} switches off and closes.",
    'was_temporary': "{target} switches off (it had {remainingTime} seconds left)."
  },
  
  help: {
    description: 'Turn off devices, lights, and other switchable objects.',
    examples: 'turn off lamp, switch radio off, deactivate alarm, stop machine',
    summary: 'TURN OFF/SWITCH OFF - Turn off devices, lights, and other switchable objects. Example: TURN OFF RADIO'
  }
};
