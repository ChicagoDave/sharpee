/**
 * Standard English vocabulary for Sharpee
 * 
 * This provides the base vocabulary for standard IF commands
 */

import { 
  VerbVocabulary, 
  DirectionVocabulary, 
  SpecialVocabulary,
  vocabularyRegistry 
} from '../parser';

/**
 * Standard verb vocabulary
 */
export const standardVerbs: VerbVocabulary[] = [
  // Movement
  {
    actionId: 'GO',
    verbs: ['go', 'walk', 'move', 'travel', 'head'],
    pattern: 'verb_direction'
  },
  
  // Taking
  {
    actionId: 'TAKE',
    verbs: ['take', 'get', 'pick', 'grab', 'acquire', 'obtain'],
    pattern: 'verb_noun'
  },
  
  // Dropping
  {
    actionId: 'DROP',
    verbs: ['drop', 'put', 'place', 'leave', 'discard'],
    pattern: 'verb_noun'
  },
  
  // Examining
  {
    actionId: 'EXAMINE',
    verbs: ['examine', 'look', 'x', 'ex', 'inspect', 'study', 'observe'],
    pattern: 'verb_noun',
    prepositions: ['at']
  },
  
  // Opening
  {
    actionId: 'OPEN',
    verbs: ['open', 'unlock'],
    pattern: 'verb_noun'
  },
  
  // Closing
  {
    actionId: 'CLOSE',
    verbs: ['close', 'shut', 'lock'],
    pattern: 'verb_noun'
  },
  
  // Inventory
  {
    actionId: 'INVENTORY',
    verbs: ['inventory', 'inv', 'i'],
    pattern: 'verb_only'
  },
  
  // Looking
  {
    actionId: 'LOOK',
    verbs: ['look', 'l'],
    pattern: 'verb_only'
  },
  
  // Putting
  {
    actionId: 'PUT',
    verbs: ['put', 'place', 'insert', 'deposit'],
    pattern: 'verb_noun_prep_noun',
    prepositions: ['in', 'into', 'on', 'onto', 'under', 'behind']
  },
  
  // Using
  {
    actionId: 'USE',
    verbs: ['use', 'apply', 'activate'],
    pattern: 'verb_noun'
  },
  
  // Talking
  {
    actionId: 'TALK',
    verbs: ['talk', 'speak', 'say', 'tell', 'ask'],
    pattern: 'verb_prep_noun',
    prepositions: ['to', 'with']
  },
  
  // Giving
  {
    actionId: 'GIVE',
    verbs: ['give', 'offer', 'hand'],
    pattern: 'verb_noun_prep_noun',
    prepositions: ['to']
  },
  
  // Attacking
  {
    actionId: 'ATTACK',
    verbs: ['attack', 'hit', 'strike', 'fight', 'kill'],
    pattern: 'verb_noun'
  },
  
  // Waiting
  {
    actionId: 'WAIT',
    verbs: ['wait', 'z'],
    pattern: 'verb_only'
  },
  
  // Saving
  {
    actionId: 'SAVE',
    verbs: ['save'],
    pattern: 'verb_only'
  },
  
  // Loading
  {
    actionId: 'LOAD',
    verbs: ['load', 'restore'],
    pattern: 'verb_only'
  },
  
  // Quitting
  {
    actionId: 'QUIT',
    verbs: ['quit', 'exit', 'q'],
    pattern: 'verb_only'
  },
  
  // Author/Debug Commands
  {
    actionId: 'author.trace',
    verbs: ['trace'],
    pattern: 'verb_noun'  // trace [target] on/off
  }
];

/**
 * Standard direction vocabulary
 */
export const standardDirections: DirectionVocabulary[] = [
  {
    direction: 'NORTH',
    words: ['north'],
    abbreviations: ['n']
  },
  {
    direction: 'SOUTH',
    words: ['south'],
    abbreviations: ['s']
  },
  {
    direction: 'EAST',
    words: ['east'],
    abbreviations: ['e']
  },
  {
    direction: 'WEST',
    words: ['west'],
    abbreviations: ['w']
  },
  {
    direction: 'NORTHEAST',
    words: ['northeast'],
    abbreviations: ['ne']
  },
  {
    direction: 'NORTHWEST',
    words: ['northwest'],
    abbreviations: ['nw']
  },
  {
    direction: 'SOUTHEAST',
    words: ['southeast'],
    abbreviations: ['se']
  },
  {
    direction: 'SOUTHWEST',
    words: ['southwest'],
    abbreviations: ['sw']
  },
  {
    direction: 'UP',
    words: ['up', 'upward', 'upwards'],
    abbreviations: ['u']
  },
  {
    direction: 'DOWN',
    words: ['down', 'downward', 'downwards'],
    abbreviations: ['d']
  },
  {
    direction: 'IN',
    words: ['in', 'inside', 'enter'],
    abbreviations: []
  },
  {
    direction: 'OUT',
    words: ['out', 'outside', 'exit', 'leave'],
    abbreviations: []
  }
];

/**
 * Special vocabulary
 */
export const specialVocabulary: SpecialVocabulary = {
  pronouns: ['it', 'them', 'that', 'those', 'this', 'these'],
  allWords: ['all', 'everything', 'every'],
  exceptWords: ['except', 'but'],
  articles: ['a', 'an', 'the', 'some']
};

/**
 * Common prepositions
 */
export const commonPrepositions = [
  'in', 'into', 'on', 'onto', 'at', 'to', 'from',
  'with', 'under', 'over', 'behind', 'beside',
  'through', 'across', 'between', 'among'
];

/**
 * Register all standard vocabulary
 */
export function registerStandardVocabulary(): void {
  // Register verbs
  vocabularyRegistry.registerVerbs(standardVerbs);
  
  // Register directions
  vocabularyRegistry.registerDirections(standardDirections);
  
  // Register special vocabulary
  vocabularyRegistry.registerSpecial(specialVocabulary);
  
  // Register prepositions
  vocabularyRegistry.registerProvider({
    id: 'standard-prepositions',
    priority: 100,
    getVocabulary: () => commonPrepositions.map(prep => ({
      word: prep,
      partOfSpeech: 'preposition' as const,
      mapsTo: prep.toUpperCase(),
      source: 'base' as const
    }))
  });
}

// Auto-register on import
registerStandardVocabulary();
