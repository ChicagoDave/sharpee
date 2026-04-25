/**
 * Language content for smelling action
 */

export const smellingLanguage = {
  actionId: 'if.action.smelling',
  
  patterns: [
    'smell',
    'smell [something]',
    'sniff [something]',
    'sniff',
    'inhale'
  ],
  
  messages: {
    // Error messages
    'not_visible': "{You} {can't} see {the:target} to smell it.",
    'too_far': "{the:cap:target} is too far away to smell.",

    // Success messages - environment
    'no_scent': "{You} {don't} smell anything unusual.",
    'room_scents': "The air carries various scents.",
    'food_nearby': "{You} {smell} food nearby.",
    'smoke_detected': "{You} {detect} a faint smell of smoke.",

    // Success messages - specific targets
    'no_particular_scent': "{the:cap:target} has no particular smell.",
    'food_scent': "{the:cap:target} smells delicious.",
    'drink_scent': "{the:cap:target} has a pleasant aroma.",
    'burning_scent': "{the:cap:target} gives off a smoky smell.",
    'container_food_scent': "{You} {smell} food inside {the:target}.",
    'musty_scent': "{the:cap:target} smells a bit musty.",
    'fresh_scent': "{the:cap:target} smells fresh and clean.",

    // Generic smelling
    'smelled': "{You} {smell} {the:target}.",
    'smelled_environment': "{You} {sniff} the air."
  },
  
  help: {
    description: 'Smell objects or detect scents in your current location.',
    examples: 'smell, smell flower, sniff wine, inhale',
    summary: 'SMELL/SNIFF - Smell objects or detect scents in your current location. Example: SMELL FLOWER'
  }
};
