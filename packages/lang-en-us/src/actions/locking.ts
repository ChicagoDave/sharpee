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
    'not_lockable': "{the:cap:item} can't be locked.",
    'no_key': "What do {you} want to lock it with?",
    'wrong_key': "{the:cap:key} doesn't fit {the:item}.",
    'already_locked': "{the:cap:item} is already locked.",
    'not_closed': "{You} {need} to close {the:item} first.",
    'locked': "{You} {lock} {the:item}.",
    'locked_with': "{You} {lock} {the:item} with {the:key}.",
    'cant_reach': "{You} {can't} reach {the:item}.",
    'key_not_held': "{You} {need} to be holding {the:key}."
  },
  
  help: {
    description: 'Lock containers or doors.',
    examples: 'lock door, lock chest with key',
    summary: 'LOCK - Lock doors and containers with the appropriate key. Example: LOCK DOOR WITH KEY'
  }
};