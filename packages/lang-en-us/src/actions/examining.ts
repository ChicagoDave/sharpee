/**
 * English language content for the examining action
 */

export const examiningLanguage = {
  actionId: 'if.action.examining',
  
  patterns: [
    'examine [something]',
    'x [something]',
    'look at [something]',
    'inspect [something]',
    'study [something]',
    'read [something]'
  ],
  
  messages: {
    'no_target': "Examine what?",
    'cant_see': "You can't see {item} here.",
    'description': "{description}",
    'no_description': "You see nothing special about {item}.",
    'container_open': "{item} is open.",
    'container_closed': "{item} is closed.",
    'container_empty': "{item} is empty.",
    'container_contents': "In {container} you see {items}.",
    'surface_contents': "On {surface} you see {items}.",
    'worn_by_you': "You are wearing {item}.",
    'worn_by_other': "{actor} is wearing {item}."
  },
  
  help: {
    description: 'Examine objects more closely.',
    examples: 'examine book, x lamp, look at key, inspect door',
    summary: 'EXAMINE/X/LOOK AT - Look closely at objects to see detailed descriptions. Example: X BOOK'
  }
};