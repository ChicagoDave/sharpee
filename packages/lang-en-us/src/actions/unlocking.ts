/**
 * English language content for the unlocking action
 */

export const unlockingLanguage = {
  actionId: 'if.action.unlocking',
  
  patterns: [
    'unlock [something]',
    'unlock [something] with [something]',
    'open [something] with [something]'
  ],
  
  messages: {
    'no_target': "Unlock what?",
    'not_lockable': "{item} can't be unlocked.",
    'no_key': "What do {you} want to unlock it with?",
    'wrong_key': "{key} doesn't fit {item}.",
    'already_unlocked': "{item} is already unlocked.",
    'unlocked': "{You} {unlock} {item}.",
    'unlocked_with': "{You} {unlock} {item} with {key}.",
    'cant_reach': "{You} {can't} reach {item}.",
    'key_not_held': "{You} {need} to be holding {key}.",
    'still_locked': "{item} is locked."
  },
  
  help: {
    description: 'Unlock containers or doors.',
    examples: 'unlock door, unlock chest with key',
    summary: 'UNLOCK - Unlock doors and containers with the appropriate key. Example: UNLOCK CHEST WITH KEY'
  }
};