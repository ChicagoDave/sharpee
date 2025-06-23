/**
 * Standard Interactive Fiction verb IDs
 * 
 * These are the canonical verb identifiers used by commands.
 * Language packages map these to actual verb strings.
 */
export const IFVerbs = {
  // Movement
  GO: 'go',
  ENTER: 'enter',
  EXIT: 'exit',
  CLIMB: 'climb',
  
  // Observation
  LOOK: 'look',
  EXAMINE: 'examine',
  SEARCH: 'search',
  LISTEN: 'listen',
  SMELL: 'smell',
  TOUCH: 'touch',
  
  // Object Manipulation
  TAKE: 'take',
  DROP: 'drop',
  PUT: 'put',
  INSERT: 'insert',
  OPEN: 'open',
  CLOSE: 'close',
  LOCK: 'lock',
  UNLOCK: 'unlock',
  SWITCH_ON: 'switch_on',
  SWITCH_OFF: 'switch_off',
  PUSH: 'push',
  PULL: 'pull',
  TURN: 'turn',
  USE: 'use',
  GIVE: 'give',
  SHOW: 'show',
  THROW: 'throw',
  ATTACK: 'attack',
  
  // Wearables
  WEAR: 'wear',
  REMOVE: 'remove',
  
  // Consumables
  EAT: 'eat',
  DRINK: 'drink',
  
  // Communication
  TALK: 'talk',
  ASK: 'ask',
  TELL: 'tell',
  ANSWER: 'answer',
  
  // Meta Commands
  INVENTORY: 'inventory',
  WAIT: 'wait',
  SAVE: 'save',
  RESTORE: 'restore',
  QUIT: 'quit',
  HELP: 'help',
  ABOUT: 'about',
  SCORE: 'score'
} as const;

/**
 * Type representing any valid verb ID
 */
export type IFVerb = typeof IFVerbs[keyof typeof IFVerbs];
