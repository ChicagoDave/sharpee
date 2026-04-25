/**
 * Language content for switching on action
 */

export const switchingOnLanguage = {
  actionId: 'if.action.switching_on',
  
  patterns: [
    'switch on [something]',
    'switch [something] on',
    'turn on [something]',
    'turn [something] on',
    'activate [something]',
    'start [something]',
    'power on [something]',
    'power [something] on'
  ],
  
  messages: {
    // Error messages
    'no_target': "Switch on what?",
    'not_visible': "{You} {can't} see {the:target}.",
    'not_reachable': "{You} {can't} reach {the:target}.",
    'not_switchable': "{the:cap:target} isn't something {you} can switch on.",
    'already_on': "{the:cap:target} is already on.",
    'no_power': "{the:cap:target} has no power source.",

    // Success messages
    'switched_on': "{You} {switch} on {the:target}.",
    'light_on': "{You} {switch} on {the:target}, illuminating the area.",
    'device_humming': "{the:cap:target} hums to life.",
    'temporary_activation': "{the:cap:target} switches on temporarily.",
    'with_sound': "{You} {switch} on {the:target}. {sound}",
    'door_opens': "{the:cap:target} switches on and opens.",
    'illuminates_darkness': "{the:cap:target} switches on, banishing the darkness."
  },
  
  help: {
    description: 'Turn on devices, lights, and other switchable objects.',
    examples: 'turn on lamp, switch radio on, activate machine, start engine',
    summary: 'TURN ON/SWITCH ON - Turn on devices, lights, and other switchable objects. Example: TURN ON LAMP'
  }
};
