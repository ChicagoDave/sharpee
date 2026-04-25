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
    'not_visible': "{You} {can't} see {the:item}.",
    'not_reachable': "{You} {can't} reach {the:item}.",
    'not_edible': "That's not something {you} can eat.",
    'is_drink': "{You} should drink {the:item}, not eat it.",
    'already_consumed': "There's nothing left of {the:item} to eat.",

    // Success messages - basic
    'eaten': "{You} {eat} {the:item}.",
    'eaten_all': "{You} {eat} all of {the:item}.",
    'eaten_some': "{You} {eat} some of {the:item}.",
    'eaten_portion': "{You} {eat} a portion of {the:item}.",

    // Success messages - quality
    'delicious': "{You} {eat} {the:item}. Delicious!",
    'tasty': "{You} {eat} {the:item}. It's quite tasty.",
    'bland': "{You} {eat} {the:item}. It's rather bland.",
    'awful': "{You} {eat} {the:item}. It tastes awful!",

    // Success messages - effects
    'filling': "{You} {eat} {the:item}. That was filling.",
    'still_hungry': "{You} {eat} {the:item}, but {you're} still hungry.",
    'satisfying': "{You} {eat} {the:item}. Very satisfying!",
    'poisonous': "{You} {eat} {the:item}. It tastes strange...",

    // Success messages - special
    'nibbled': "{You} {nibble} on {the:item}.",
    'tasted': "{You} {taste} {the:item}.",
    'devoured': "{You} {devour} {the:item} hungrily.",
    'munched': "{You} {munch} on {the:item}."
  },
  
  help: {
    description: 'Eat edible items to satisfy hunger or gain effects.',
    examples: 'eat apple, consume bread, nibble cheese, taste soup',
    summary: 'EAT - Eat edible items to satisfy hunger or gain effects. Example: EAT APPLE'
  }
};
