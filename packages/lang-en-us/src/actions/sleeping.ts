/**
 * Language content for sleeping action
 */

export const sleepingLanguage = {
  actionId: 'if.action.sleeping',

  patterns: [
    'sleep',
    'go to sleep',
    'go to bed',
    'lie down',
    'nap',
    'doze',
    'rest',
    'slumber'
  ],

  messages: {
    // The stock line (P-15, GH #362): sleeping is a signal action, and this
    // is what it says when no story reaction speaks in its place.
    'not_tired': "{You} aren't tired.",

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
    description: 'Try to sleep. Stories decide where and when it works.',
    examples: 'sleep, go to sleep, go to bed, lie down',
    summary: 'SLEEP/GO TO BED/LIE DOWN - Try to sleep. Stories decide where and when it works. Example: SLEEP'
  }
};
