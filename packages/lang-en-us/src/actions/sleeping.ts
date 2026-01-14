/**
 * Language content for sleeping action
 */

export const sleepingLanguage = {
  actionId: 'if.action.sleeping',

  patterns: [
    'sleep',
    'nap',
    'doze',
    'rest',
    'slumber',
    'z'
  ],

  messages: {
    // Success messages
    'slept': "{You} {sleep} for a while.",
    'dozed_off': "{You} {doze} off for a bit.",
    'fell_asleep': "{You} {fall} into a deep sleep.",
    'brief_nap': "{You} {take} a brief nap.",
    'deep_sleep': "{You} {fall} into a deep, restful sleep.",
    'slept_fitfully': "{You} {sleep} fitfully.",

    // Failure messages
    'cant_sleep_here': "{You} {can't} sleep in {location}.",
    'too_dangerous_to_sleep': "It's too dangerous to sleep in {location}.",
    'already_well_rested': "{You're} already well-rested and don't feel tired.",

    // Quality of sleep
    'woke_refreshed': "{You} {wake} feeling refreshed.",
    'disturbed_sleep': "{Your} sleep is disturbed.",
    'nightmares': "{You} {have} unsettling dreams.",
    'peaceful_sleep': "{You} {enjoy} a peaceful sleep."
  },

  help: {
    description: 'Sleep or take a nap to pass time.',
    examples: 'sleep, nap, doze, rest',
    summary: 'SLEEP/NAP - Sleep or take a nap to pass time. May have different effects depending on location and circumstances. Example: SLEEP'
  }
};
