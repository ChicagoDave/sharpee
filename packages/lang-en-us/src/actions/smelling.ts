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
    'not_visible': "You can't see {target} to smell it.",
    'too_far': "{target} is too far away to smell.",
    
    // Success messages - environment
    'no_scent': "You don't smell anything unusual.",
    'room_scents': "The air carries various scents.",
    'food_nearby': "You smell food nearby.",
    'smoke_detected': "You detect a faint smell of smoke.",
    
    // Success messages - specific targets
    'no_particular_scent': "{target} has no particular smell.",
    'food_scent': "{target} smells delicious.",
    'drink_scent': "{target} has a pleasant aroma.",
    'burning_scent': "{target} gives off a smoky smell.",
    'container_food_scent': "You smell food inside {target}.",
    'musty_scent': "{target} smells a bit musty.",
    'fresh_scent': "{target} smells fresh and clean.",
    
    // Generic smelling
    'smelled': "You smell {target}.",
    'smelled_environment': "You sniff the air."
  },
  
  help: {
    description: 'Smell objects or detect scents in your current location.',
    examples: 'smell, smell flower, sniff wine, inhale',
    summary: 'SMELL/SNIFF - Smell objects or detect scents in your current location. Example: SMELL FLOWER'
  }
};
