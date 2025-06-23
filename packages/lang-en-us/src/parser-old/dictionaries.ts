/**
 * English Language Dictionaries for Sharpee IF Engine
 */

import { POSType } from '@sharpee/core';

/**
 * Type for a dictionary of words and their parts of speech
 */
export type Dictionary = Record<string, POSType>;

/**
 * Common English articles
 */
export const ARTICLES: Dictionary = {
  'a': POSType.ARTICLE,
  'an': POSType.ARTICLE,
  'the': POSType.ARTICLE
};

/**
 * Common English prepositions
 */
export const PREPOSITIONS: Dictionary = {
  'about': POSType.PREPOSITION,
  'above': POSType.PREPOSITION,
  'across': POSType.PREPOSITION,
  'after': POSType.PREPOSITION,
  'against': POSType.PREPOSITION,
  'along': POSType.PREPOSITION,
  'among': POSType.PREPOSITION,
  'around': POSType.PREPOSITION,
  'at': POSType.PREPOSITION,
  'before': POSType.PREPOSITION,
  'behind': POSType.PREPOSITION,
  'below': POSType.PREPOSITION,
  'beneath': POSType.PREPOSITION,
  'beside': POSType.PREPOSITION,
  'between': POSType.PREPOSITION,
  'beyond': POSType.PREPOSITION,
  'by': POSType.PREPOSITION,
  'down': POSType.PREPOSITION,
  'during': POSType.PREPOSITION,
  'except': POSType.PREPOSITION,
  'for': POSType.PREPOSITION,
  'from': POSType.PREPOSITION,
  'in': POSType.PREPOSITION,
  'inside': POSType.PREPOSITION,
  'into': POSType.PREPOSITION,
  'like': POSType.PREPOSITION,
  'near': POSType.PREPOSITION,
  'of': POSType.PREPOSITION,
  'off': POSType.PREPOSITION,
  'on': POSType.PREPOSITION,
  'onto': POSType.PREPOSITION,
  'out': POSType.PREPOSITION,
  'outside': POSType.PREPOSITION,
  'over': POSType.PREPOSITION,
  'through': POSType.PREPOSITION,
  'to': POSType.PREPOSITION,
  'toward': POSType.PREPOSITION,
  'towards': POSType.PREPOSITION,
  'under': POSType.PREPOSITION,
  'underneath': POSType.PREPOSITION,
  'until': POSType.PREPOSITION,
  'up': POSType.PREPOSITION,
  'upon': POSType.PREPOSITION,
  'with': POSType.PREPOSITION,
  'within': POSType.PREPOSITION,
  'without': POSType.PREPOSITION
};

/**
 * Common English pronouns
 */
export const PRONOUNS: Dictionary = {
  'i': POSType.PRONOUN,
  'me': POSType.PRONOUN,
  'my': POSType.PRONOUN,
  'mine': POSType.PRONOUN,
  'you': POSType.PRONOUN,
  'your': POSType.PRONOUN,
  'yours': POSType.PRONOUN,
  'he': POSType.PRONOUN,
  'him': POSType.PRONOUN,
  'his': POSType.PRONOUN,
  'she': POSType.PRONOUN,
  'her': POSType.PRONOUN,
  'hers': POSType.PRONOUN,
  'it': POSType.PRONOUN,
  'its': POSType.PRONOUN,
  'we': POSType.PRONOUN,
  'us': POSType.PRONOUN,
  'our': POSType.PRONOUN,
  'ours': POSType.PRONOUN,
  'they': POSType.PRONOUN,
  'them': POSType.PRONOUN,
  'their': POSType.PRONOUN,
  'theirs': POSType.PRONOUN,
  'this': POSType.PRONOUN,
  'that': POSType.PRONOUN,
  'these': POSType.PRONOUN,
  'those': POSType.PRONOUN,
  'myself': POSType.PRONOUN,
  'yourself': POSType.PRONOUN,
  'himself': POSType.PRONOUN,
  'herself': POSType.PRONOUN,
  'itself': POSType.PRONOUN,
  'ourselves': POSType.PRONOUN,
  'yourselves': POSType.PRONOUN,
  'themselves': POSType.PRONOUN
};

/**
 * Common English conjunctions
 */
export const CONJUNCTIONS: Dictionary = {
  'and': POSType.CONJUNCTION,
  'or': POSType.CONJUNCTION,
  'but': POSType.CONJUNCTION,
  'nor': POSType.CONJUNCTION,
  'so': POSType.CONJUNCTION,
  'yet': POSType.CONJUNCTION,
  'for': POSType.CONJUNCTION,
  'because': POSType.CONJUNCTION,
  'if': POSType.CONJUNCTION,
  'unless': POSType.CONJUNCTION,
  'since': POSType.CONJUNCTION,
  'while': POSType.CONJUNCTION,
  'when': POSType.CONJUNCTION,
  'although': POSType.CONJUNCTION,
  'though': POSType.CONJUNCTION
};

/**
 * Common English determiners
 */
export const DETERMINERS: Dictionary = {
  'some': POSType.UNKNOWN, // We use POSType.UNKNOWN for determiners since there's no specific type
  'any': POSType.UNKNOWN,
  'many': POSType.UNKNOWN,
  'much': POSType.UNKNOWN,
  'few': POSType.UNKNOWN,
  'little': POSType.UNKNOWN,
  'all': POSType.UNKNOWN,
  'both': POSType.UNKNOWN,
  'each': POSType.UNKNOWN,
  'every': POSType.UNKNOWN,
  'other': POSType.UNKNOWN,
  'another': POSType.UNKNOWN,
  'either': POSType.UNKNOWN,
  'neither': POSType.UNKNOWN,
  'several': POSType.UNKNOWN,
  'no': POSType.UNKNOWN
};

/**
 * Common English adverbs
 */
export const ADVERBS: Dictionary = {
  'very': POSType.ADVERB,
  'really': POSType.ADVERB,
  'almost': POSType.ADVERB,
  'always': POSType.ADVERB,
  'never': POSType.ADVERB,
  'now': POSType.ADVERB,
  'then': POSType.ADVERB,
  'here': POSType.ADVERB,
  'there': POSType.ADVERB,
  'quickly': POSType.ADVERB,
  'slowly': POSType.ADVERB,
  'again': POSType.ADVERB,
  'too': POSType.ADVERB,
  'also': POSType.ADVERB,
  'not': POSType.ADVERB,
  'only': POSType.ADVERB,
  'just': POSType.ADVERB,
  'even': POSType.ADVERB,
  'still': POSType.ADVERB,
  'already': POSType.ADVERB,
  'often': POSType.ADVERB,
  'sometimes': POSType.ADVERB,
  'usually': POSType.ADVERB,
  'rarely': POSType.ADVERB,
  'perhaps': POSType.ADVERB,
  'maybe': POSType.ADVERB,
  'probably': POSType.ADVERB,
  'certainly': POSType.ADVERB,
  'definitely': POSType.ADVERB
};

/**
 * Common English adjectives
 */
export const ADJECTIVES: Dictionary = {
  'big': POSType.ADJECTIVE,
  'small': POSType.ADJECTIVE,
  'large': POSType.ADJECTIVE,
  'tiny': POSType.ADJECTIVE,
  'tall': POSType.ADJECTIVE,
  'short': POSType.ADJECTIVE,
  'long': POSType.ADJECTIVE,
  'red': POSType.ADJECTIVE,
  'blue': POSType.ADJECTIVE,
  'green': POSType.ADJECTIVE,
  'yellow': POSType.ADJECTIVE,
  'black': POSType.ADJECTIVE,
  'white': POSType.ADJECTIVE,
  'dark': POSType.ADJECTIVE,
  'light': POSType.ADJECTIVE,
  'heavy': POSType.ADJECTIVE,
  'old': POSType.ADJECTIVE,
  'new': POSType.ADJECTIVE,
  'young': POSType.ADJECTIVE,
  'ancient': POSType.ADJECTIVE,
  'modern': POSType.ADJECTIVE,
  'good': POSType.ADJECTIVE,
  'bad': POSType.ADJECTIVE,
  'nice': POSType.ADJECTIVE,
  'evil': POSType.ADJECTIVE,
  'happy': POSType.ADJECTIVE,
  'sad': POSType.ADJECTIVE,
  'angry': POSType.ADJECTIVE,
  'scared': POSType.ADJECTIVE,
  'brave': POSType.ADJECTIVE,
  'strong': POSType.ADJECTIVE,
  'weak': POSType.ADJECTIVE,
  'smart': POSType.ADJECTIVE,
  'dumb': POSType.ADJECTIVE,
  'open': POSType.ADJECTIVE,
  'closed': POSType.ADJECTIVE,
  'locked': POSType.ADJECTIVE,
  'unlocked': POSType.ADJECTIVE,
  'full': POSType.ADJECTIVE,
  'empty': POSType.ADJECTIVE,
  'broken': POSType.ADJECTIVE,
  'fixed': POSType.ADJECTIVE,
  'clean': POSType.ADJECTIVE,
  'dirty': POSType.ADJECTIVE,
  'wet': POSType.ADJECTIVE,
  'dry': POSType.ADJECTIVE,
  'sharp': POSType.ADJECTIVE,
  'dull': POSType.ADJECTIVE,
  'loud': POSType.ADJECTIVE,
  'quiet': POSType.ADJECTIVE,
  'bright': POSType.ADJECTIVE,
  'dim': POSType.ADJECTIVE,
  'hot': POSType.ADJECTIVE,
  'cold': POSType.ADJECTIVE,
  'warm': POSType.ADJECTIVE,
  'cool': POSType.ADJECTIVE
};

/**
 * Common IF-specific verbs in English
 */
export const IF_VERBS: Dictionary = {
  // Navigation
  'go': POSType.VERB,
  'move': POSType.VERB,
  'walk': POSType.VERB,
  'run': POSType.VERB,
  'enter': POSType.VERB,
  'exit': POSType.VERB,
  'leave': POSType.VERB,
  'climb': POSType.VERB,
  'descend': POSType.VERB,
  'jump': POSType.VERB,
  'swim': POSType.VERB,
  
  // Observation
  'look': POSType.VERB,
  'examine': POSType.VERB,
  'x': POSType.VERB, // Common abbreviation for examine
  'read': POSType.VERB,
  'search': POSType.VERB,
  'inspect': POSType.VERB,
  'check': POSType.VERB,
  'observe': POSType.VERB,
  'view': POSType.VERB,
  'watch': POSType.VERB,
  'listen': POSType.VERB,
  'smell': POSType.VERB,
  'taste': POSType.VERB,
  'feel': POSType.VERB,
  'touch': POSType.VERB,
  
  // Manipulation
  'take': POSType.VERB,
  'get': POSType.VERB,
  'drop': POSType.VERB,
  'put': POSType.VERB,
  'place': POSType.VERB,
  'give': POSType.VERB,
  'throw': POSType.VERB,
  'insert': POSType.VERB,
  'remove': POSType.VERB,
  'wear': POSType.VERB,
  'open': POSType.VERB,
  'close': POSType.VERB,
  'lock': POSType.VERB,
  'unlock': POSType.VERB,
  'turn': POSType.VERB,
  'push': POSType.VERB,
  'pull': POSType.VERB,
  'press': POSType.VERB,
  'use': POSType.VERB,
  'combine': POSType.VERB,
  'break': POSType.VERB,
  'cut': POSType.VERB,
  'tie': POSType.VERB,
  'untie': POSType.VERB,
  'fill': POSType.VERB,
  'empty': POSType.VERB,
  'eat': POSType.VERB,
  'drink': POSType.VERB,
  
  // Interaction
  'talk': POSType.VERB,
  'speak': POSType.VERB,
  'say': POSType.VERB,
  'tell': POSType.VERB,
  'ask': POSType.VERB,
  'answer': POSType.VERB,
  
  // Meta commands
  'inventory': POSType.VERB,
  'i': POSType.VERB, // Short for inventory
  'save': POSType.VERB,
  'restore': POSType.VERB,
  'restart': POSType.VERB,
  'quit': POSType.VERB,
  'help': POSType.VERB,
  'hint': POSType.VERB,
  'wait': POSType.VERB,
  'z': POSType.VERB, // Short for wait
  'score': POSType.VERB,
  'version': POSType.VERB,
  'about': POSType.VERB
};

/**
 * Common English nouns in IF contexts
 */
export const IF_NOUNS: Dictionary = {
  'inventory': POSType.NOUN,
  'room': POSType.NOUN,
  'door': POSType.NOUN,
  'window': POSType.NOUN,
  'key': POSType.NOUN,
  'lock': POSType.NOUN,
  'book': POSType.NOUN,
  'page': POSType.NOUN,
  'table': POSType.NOUN,
  'chair': POSType.NOUN,
  'desk': POSType.NOUN,
  'wall': POSType.NOUN,
  'floor': POSType.NOUN,
  'ceiling': POSType.NOUN,
  'light': POSType.NOUN,
  'lamp': POSType.NOUN,
  'box': POSType.NOUN,
  'container': POSType.NOUN,
  'bottle': POSType.NOUN,
  'water': POSType.NOUN,
  'food': POSType.NOUN,
  'knife': POSType.NOUN,
  'sword': POSType.NOUN,
  'weapon': POSType.NOUN,
  'paper': POSType.NOUN,
  'letter': POSType.NOUN,
  'note': POSType.NOUN,
  'message': POSType.NOUN,
  'map': POSType.NOUN,
  'compass': POSType.NOUN
};

/**
 * Return an array of common verbs that rarely appear as nouns
 * Used for heuristics in the POS tagger
 */
export function getStrongCommandVerbs(): string[] {
  return [
    'go', 'take', 'drop', 'examine', 'open', 'close', 'push', 'pull',
    'turn', 'move', 'put', 'get', 'use', 'talk', 'look', 'search',
    'climb', 'jump', 'read', 'speak', 'tell', 'give', 'show', 'enter',
    'exit', 'leave', 'insert', 'remove', 'wear', 'press', 'unlock',
    'break', 'eat', 'drink', 'throw', 'attack', 'kill', 'hit'
  ];
}

/**
 * Get all dictionaries in a single object
 */
export function getDictionaries() {
  return {
    verbs: new Set(Object.keys(IF_VERBS)),
    nouns: new Set(Object.keys(IF_NOUNS)),
    adjectives: new Set(Object.keys(ADJECTIVES)),
    adverbs: new Set(Object.keys(ADVERBS)),
    prepositions: new Set(Object.keys(PREPOSITIONS)),
    conjunctions: new Set(Object.keys(CONJUNCTIONS)),
    articles: new Set(Object.keys(ARTICLES)),
    pronouns: new Set(Object.keys(PRONOUNS))
  };
}