/**
 * English language content for the wearing action
 */

export const wearingLanguage = {
  actionId: 'if.action.wearing',
  
  patterns: [
    'wear [something]',
    'put on [something]',
    'put [something] on',
    'don [something]'
  ],
  
  messages: {
    'no_target': "Wear what?",
    'not_wearable': "You can't wear {item}.",
    'not_held': "You need to be holding {item} first.",
    'already_wearing': "You're already wearing {item}.",
    'worn': "You put on {item}.",
    'cant_wear_that': "You can't wear {item}.",
    'hands_full': "You need to have your hands free to put that on."
  },
  
  help: {
    description: 'Wear clothing or accessories that you are carrying.',
    examples: 'wear hat, put on coat, don gloves, put ring on',
    summary: 'WEAR/PUT ON - Wear clothing or accessories that you are carrying. Example: WEAR HAT'
  }
};