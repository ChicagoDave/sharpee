/**
 * Simplified language data for IF parsing
 * No linguistic analysis - just data needed for pattern matching
 */

import { GrammarPattern } from '../../if-parser-types';

/**
 * Language-specific data for IF parsing
 */
export interface LanguageData {
  /**
   * Language code (e.g., 'en-US')
   */
  code: string;

  /**
   * Common grammar patterns for this language
   */
  patterns: GrammarPattern[];

  /**
   * Articles to filter out during matching
   */
  articles: string[];

  /**
   * Pronouns that need special handling
   */
  pronouns: string[];

  /**
   * Common prepositions
   */
  prepositions: string[];

  /**
   * Conjunctions for compound commands
   */
  conjunctions: string[];

  /**
   * Direction words
   */
  directions: string[];

  /**
   * Word normalization rules
   */
  normalization: {
    /**
     * Irregular plurals (plural -> singular)
     */
    irregularPlurals: Map<string, string>;

    /**
     * Common abbreviations (abbrev -> full)
     */
    abbreviations: Map<string, string>;

    /**
     * Common synonyms for actions (synonym -> canonical)
     */
    actionSynonyms: Map<string, string>;
  };
}

/**
 * Create default English (US) language data
 */
export function createEnglishData(): LanguageData {
  return {
    code: 'en-US',

    patterns: [
      // Basic object manipulation
      { id: 'taking', pattern: 'take|get|pick up|grab <noun>', action: 'taking' },
      { id: 'dropping', pattern: 'drop|put down|discard <noun>', action: 'dropping' },
      { id: 'examining', pattern: 'examine|x|look at|l at|inspect <noun>', action: 'examining' },
      { id: 'inventory', pattern: 'inventory|inv|i', action: 'inventory' },
      
      // Two-object commands
      { id: 'inserting', pattern: 'put|place|insert <noun> in|into|inside <second>', 
        action: 'inserting', requiresSecond: true, prepositions: ['in', 'into', 'inside'] },
      { id: 'giving', pattern: 'give|offer|hand <noun> to <second>', 
        action: 'giving', requiresSecond: true, prepositions: ['to'] },
      { id: 'showing', pattern: 'show <noun> to <second>', 
        action: 'showing', requiresSecond: true, prepositions: ['to'] },
      
      // Movement
      { id: 'going', pattern: 'go|walk|run|move <direction>', action: 'going' },
      { id: 'entering', pattern: 'enter|go into|walk into <noun>', action: 'entering' },
      { id: 'exiting', pattern: 'exit|leave|go out', action: 'exiting' },
      
      // Container/surface operations  
      { id: 'opening', pattern: 'open <noun>', action: 'opening' },
      { id: 'closing', pattern: 'close|shut <noun>', action: 'closing' },
      { id: 'searching', pattern: 'search|look in|look inside <noun>', action: 'searching' },
      
      // Device operations
      { id: 'switching on', pattern: 'turn on|switch on|activate <noun>', action: 'switching on' },
      { id: 'switching off', pattern: 'turn off|switch off|deactivate <noun>', action: 'switching off' },
      
      // Special patterns
      { id: 'looking', pattern: 'look|l', action: 'looking' },
      { id: 'waiting', pattern: 'wait|z', action: 'waiting' },
      { id: 'taking-all', pattern: 'take|get all|everything', action: 'taking', matchAll: true },
    ],

    articles: ['a', 'an', 'the', 'some'],

    pronouns: ['it', 'them', 'him', 'her', 'this', 'that', 'these', 'those'],

    prepositions: [
      'in', 'into', 'inside',
      'on', 'onto', 'upon',
      'with', 'using',
      'at', 'to', 'from',
      'under', 'below', 'beneath',
      'over', 'above',
      'behind', 'beside', 'near'
    ],

    conjunctions: ['and', 'then', 'but'],

    directions: ['north', 'south', 'east', 'west', 'northeast', 'northwest', 
                 'southeast', 'southwest', 'up', 'down', 'in', 'out',
                 'n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd'],

    normalization: {
      irregularPlurals: new Map([
        ['children', 'child'],
        ['men', 'man'],
        ['women', 'woman'],
        ['people', 'person'],
        ['mice', 'mouse'],
        ['teeth', 'tooth'],
        ['feet', 'foot'],
        ['geese', 'goose'],
        ['knives', 'knife'],
        ['lives', 'life'],
        ['leaves', 'leaf'],
        ['loaves', 'loaf'],
        ['shelves', 'shelf'],
        ['thieves', 'thief'],
        ['wolves', 'wolf']
      ]),

      abbreviations: new Map([
        ['n', 'north'],
        ['s', 'south'],
        ['e', 'east'],
        ['w', 'west'],
        ['u', 'up'],
        ['d', 'down'],
        ['ne', 'northeast'],
        ['nw', 'northwest'],
        ['se', 'southeast'],
        ['sw', 'southwest'],
        ['x', 'examine'],
        ['l', 'look'],
        ['i', 'inventory'],
        ['z', 'wait'],
        ['g', 'again']
      ]),

      actionSynonyms: new Map([
        ['grab', 'take'],
        ['get', 'take'],
        ['pickup', 'take'],
        ['inspect', 'examine'],
        ['check', 'examine'],
        ['put', 'insert'],
        ['place', 'insert'],
        ['give', 'give'],
        ['offer', 'give'],
        ['hand', 'give']
      ])
    }
  };
}
