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
    'not_visible': "You can't see {target}.",
    'not_reachable': "You can't reach {target}.",
    'not_switchable': "{target} isn't something you can switch on.",
    'already_on': "{target} is already on.",
    'no_power': "{target} has no power source.",
    
    // Success messages
    'switched_on': "You switch on {target}.",
    'light_on': "You switch on {target}, illuminating the area.",
    'device_humming': "{target} hums to life.",
    'temporary_activation': "{target} switches on temporarily.",
    'with_sound': "You switch on {target}. {sound}",
    'door_opens': "{target} switches on and opens.",
    'illuminates_darkness': "{target} switches on, banishing the darkness."
  },
  
  help: {
    description: 'Turn on devices, lights, and other switchable objects.',
    examples: 'turn on lamp, switch radio on, activate machine, start engine',
    summary: 'TURN ON/SWITCH ON - Turn on devices, lights, and other switchable objects. Example: TURN ON LAMP'
  }
};
