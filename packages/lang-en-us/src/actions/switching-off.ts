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
    'not_visible': "{You} {can't} see {the:target}.",
    'not_reachable': "{You} {can't} reach {the:target}.",
    'not_switchable': "{the:cap:target} isn't something {you} can switch off.",
    'already_off': "{the:cap:target} is already off.",

    // Success messages
    'switched_off': "{You} {switch} off {the:target}.",
    'light_off': "{You} {switch} off {the:target}, plunging the area into darkness.",
    'light_off_still_lit': "{You} {switch} off {the:target}.",
    'device_stops': "{the:cap:target} powers down with a soft whir.",
    'silence_falls': "{You} {switch} off {the:target}. Silence falls.",
    'with_sound': "{You} {switch} off {the:target}. {sound}",
    'door_closes': "{the:cap:target} switches off and closes.",
    'was_temporary': "{the:cap:target} switches off (it had {remainingTime} seconds left)."
  },
  
  help: {
    description: 'Turn off devices, lights, and other switchable objects.',
    examples: 'turn off lamp, switch radio off, deactivate alarm, stop machine',
    summary: 'TURN OFF/SWITCH OFF - Turn off devices, lights, and other switchable objects. Example: TURN OFF RADIO'
  }
};
