/**
 * English language content for the locking action
 */

export const lockingLanguage = {
  actionId: 'if.action.locking',
  
  patterns: [
    'lock [something]',
    'lock [something] with [something]',
    'secure [something]',
    'secure [something] with [something]'
  ],
  
  messages: {
    'no_target': "Lock what?",
    'not_lockable': "{item} can't be locked.",
    'no_key': "What do {you} want to lock it with?",
    'wrong_key': "{key} doesn't fit {item}.",
    'already_locked': "{item} is already locked.",
    'not_closed': "{You} {need} to close {item} first.",
    'locked': "{You} {lock} {item}.",
    'locked_with': "{You} {lock} {item} with {key}.",
    'cant_reach': "{You} {can't} reach {item}.",
    'key_not_held': "{You} {need} to be holding {key}."
  },
  
  help: {
    description: 'Lock containers or doors.',
    examples: 'lock door, lock chest with key',
    summary: 'LOCK - Lock doors and containers with the appropriate key. Example: LOCK DOOR WITH KEY'
  }
};