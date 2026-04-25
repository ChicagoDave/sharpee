/**
 * Language content for listening action
 */

export const listeningLanguage = {
  actionId: 'if.action.listening',
  
  patterns: [
    'listen',
    'listen to [something]',
    'hear [something]'
  ],
  
  messages: {
    // Error messages
    'not_visible': "{You} {can't} see {the:target} well enough to focus on its sounds.",

    // Success messages - environment
    'silence': "{You} {hear} nothing out of the ordinary.",
    'ambient_sounds': "{You} {hear} the usual ambient sounds.",
    'active_devices': "{You} can {hear} {devices} operating nearby.",

    // Success messages - specific targets
    'no_sound': "{the:cap:target} isn't making any sound.",
    'device_running': "{the:cap:target} is making a soft humming sound.",
    'device_off': "{the:cap:target} is silent.",
    'container_sounds': "{You} {hear} faint sounds from inside {the:target}.",
    'liquid_sounds': "{You} {hear} liquid sloshing in {the:target}.",

    // Generic listening
    'listened_to': "{You} {listen} carefully to {the:target}.",
    'listened_environment': "{You} {listen} carefully."
  },
  
  help: {
    description: 'Listen for sounds in the environment or from specific objects.',
    examples: 'listen, listen to radio, hear',
    summary: 'LISTEN - Listen for sounds in the environment or from specific objects. Example: LISTEN TO RADIO'
  }
};
