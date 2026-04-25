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
    'not_lockable': "{the:cap:item} can't be unlocked.",
    'no_key': "What do {you} want to unlock it with?",
    'wrong_key': "{the:cap:key} doesn't fit {the:item}.",
    'already_unlocked': "{the:cap:item} is already unlocked.",
    'unlocked': "{You} {unlock} {the:item}.",
    'unlocked_with': "{You} {unlock} {the:item} with {the:key}.",
    'cant_reach': "{You} {can't} reach {the:item}.",
    'key_not_held': "{You} {need} to be holding {the:key}.",
    'still_locked': "{the:cap:item} is locked."
  },
  
  help: {
    description: 'Unlock containers or doors.',
    examples: 'unlock door, unlock chest with key',
    summary: 'UNLOCK - Unlock doors and containers with the appropriate key. Example: UNLOCK CHEST WITH KEY'
  }
};