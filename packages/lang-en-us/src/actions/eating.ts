/**
 * Language content for eating action
 */

export const eatingLanguage = {
  actionId: 'if.action.eating',
  
  patterns: [
    'eat [something]',
    'consume [something]',
    'devour [something]',
    'munch [something]',
    'munch on [something]',
    'nibble [something]',
    'nibble on [something]',
    'taste [something]'
  ],
  
  messages: {
    // Error messages
    'no_item': "Eat what?",
    'not_visible': "{You} {can't} see {item}.",
    'not_reachable': "{You} {can't} reach {item}.",
    'not_edible': "That's not something {you} can eat.",
    'is_drink': "{You} should drink {item}, not eat it.",
    'already_consumed': "There's nothing left of {item} to eat.",

    // Success messages - basic
    'eaten': "{You} {eat} {item}.",
    'eaten_all': "{You} {eat} all of {item}.",
    'eaten_some': "{You} {eat} some of {item}.",
    'eaten_portion': "{You} {eat} a portion of {item}.",

    // Success messages - quality
    'delicious': "{You} {eat} {item}. Delicious!",
    'tasty': "{You} {eat} {item}. It's quite tasty.",
    'bland': "{You} {eat} {item}. It's rather bland.",
    'awful': "{You} {eat} {item}. It tastes awful!",

    // Success messages - effects
    'filling': "{You} {eat} {item}. That was filling.",
    'still_hungry': "{You} {eat} {item}, but {you're} still hungry.",
    'satisfying': "{You} {eat} {item}. Very satisfying!",
    'poisonous': "{You} {eat} {item}. It tastes strange...",

    // Success messages - special
    'nibbled': "{You} {nibble} on {item}.",
    'tasted': "{You} {taste} {item}.",
    'devoured': "{You} {devour} {item} hungrily.",
    'munched': "{You} {munch} on {item}."
  },
  
  help: {
    description: 'Eat edible items to satisfy hunger or gain effects.',
    examples: 'eat apple, consume bread, nibble cheese, taste soup',
    summary: 'EAT - Eat edible items to satisfy hunger or gain effects. Example: EAT APPLE'
  }
};
