// packages/core/src/parser/languages/en-US/if-vocabulary.ts

import { PartOfSpeech } from '../../core/types';

/**
 * Common IF-specific verbs in English
 */
export const IF_VERBS: Record<string, PartOfSpeech> = {
  // Navigation
  'go': PartOfSpeech.VERB,
  'move': PartOfSpeech.VERB,
  'walk': PartOfSpeech.VERB,
  'run': PartOfSpeech.VERB,
  'enter': PartOfSpeech.VERB,
  'exit': PartOfSpeech.VERB,
  'leave': PartOfSpeech.VERB,
  'climb': PartOfSpeech.VERB,
  'descend': PartOfSpeech.VERB,
  'jump': PartOfSpeech.VERB,
  'swim': PartOfSpeech.VERB,
  
  // Observation
  'look': PartOfSpeech.VERB,
  'examine': PartOfSpeech.VERB,
  'x': PartOfSpeech.VERB, // Common abbreviation for examine
  'read': PartOfSpeech.VERB,
  'search': PartOfSpeech.VERB,
  'inspect': PartOfSpeech.VERB,
  'check': PartOfSpeech.VERB,
  'observe': PartOfSpeech.VERB,
  'view': PartOfSpeech.VERB,
  'watch': PartOfSpeech.VERB,
  'listen': PartOfSpeech.VERB,
  'smell': PartOfSpeech.VERB,
  'taste': PartOfSpeech.VERB,
  'feel': PartOfSpeech.VERB,
  'touch': PartOfSpeech.VERB,
  
  // Manipulation
  'take': PartOfSpeech.VERB,
  'get': PartOfSpeech.VERB,
  'drop': PartOfSpeech.VERB,
  'put': PartOfSpeech.VERB,
  'place': PartOfSpeech.VERB,
  'give': PartOfSpeech.VERB,
  'throw': PartOfSpeech.VERB,
  'insert': PartOfSpeech.VERB,
  'remove': PartOfSpeech.VERB,
  'wear': PartOfSpeech.VERB,
  'open': PartOfSpeech.VERB,
  'close': PartOfSpeech.VERB,
  'lock': PartOfSpeech.VERB,
  'unlock': PartOfSpeech.VERB,
  'turn': PartOfSpeech.VERB,
  'push': PartOfSpeech.VERB,
  'pull': PartOfSpeech.VERB,
  'press': PartOfSpeech.VERB,
  'use': PartOfSpeech.VERB,
  'combine': PartOfSpeech.VERB,
  'break': PartOfSpeech.VERB,
  'cut': PartOfSpeech.VERB,
  'tie': PartOfSpeech.VERB,
  'untie': PartOfSpeech.VERB,
  'fill': PartOfSpeech.VERB,
  'empty': PartOfSpeech.VERB,
  'eat': PartOfSpeech.VERB,
  'drink': PartOfSpeech.VERB,
  
  // Interaction
  'talk': PartOfSpeech.VERB,
  'speak': PartOfSpeech.VERB,
  'say': PartOfSpeech.VERB,
  'tell': PartOfSpeech.VERB,
  'ask': PartOfSpeech.VERB,
  'answer': PartOfSpeech.VERB,
  
  // Meta commands
  'inventory': PartOfSpeech.VERB,
  'i': PartOfSpeech.VERB, // Short for inventory
  'save': PartOfSpeech.VERB,
  'restore': PartOfSpeech.VERB,
  'restart': PartOfSpeech.VERB,
  'quit': PartOfSpeech.VERB,
  'help': PartOfSpeech.VERB,
  'hint': PartOfSpeech.VERB,
  'wait': PartOfSpeech.VERB,
  'z': PartOfSpeech.VERB, // Short for wait
  'score': PartOfSpeech.VERB,
  'version': PartOfSpeech.VERB,
  'about': PartOfSpeech.VERB
};

/**
 * Common English nouns in IF contexts
 */
export const COMMON_IF_NOUNS: Record<string, PartOfSpeech> = {
  'inventory': PartOfSpeech.NOUN,
  'room': PartOfSpeech.NOUN,
  'door': PartOfSpeech.NOUN,
  'window': PartOfSpeech.NOUN,
  'key': PartOfSpeech.NOUN,
  'lock': PartOfSpeech.NOUN,
  'book': PartOfSpeech.NOUN,
  'page': PartOfSpeech.NOUN,
  'table': PartOfSpeech.NOUN,
  'chair': PartOfSpeech.NOUN,
  'desk': PartOfSpeech.NOUN,
  'wall': PartOfSpeech.NOUN,
  'floor': PartOfSpeech.NOUN,
  'ceiling': PartOfSpeech.NOUN,
  'light': PartOfSpeech.NOUN,
  'lamp': PartOfSpeech.NOUN,
  'box': PartOfSpeech.NOUN,
  'container': PartOfSpeech.NOUN,
  'bottle': PartOfSpeech.NOUN,
  'water': PartOfSpeech.NOUN,
  'food': PartOfSpeech.NOUN,
  'knife': PartOfSpeech.NOUN,
  'sword': PartOfSpeech.NOUN,
  'weapon': PartOfSpeech.NOUN,
  'paper': PartOfSpeech.NOUN,
  'letter': PartOfSpeech.NOUN,
  'note': PartOfSpeech.NOUN,
  'message': PartOfSpeech.NOUN,
  'map': PartOfSpeech.NOUN,
  'compass': PartOfSpeech.NOUN
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