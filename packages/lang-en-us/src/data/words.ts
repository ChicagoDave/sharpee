/**
 * @file English Word Lists
 * @description Common word lists for English parsing
 */

/**
 * English word lists for parsing
 */
export const englishWords = {
  /**
   * Articles
   */
  articles: ['a', 'an', 'the'],
  
  /**
   * Common prepositions
   */
  prepositions: [
    'in', 'on', 'at', 'to', 'for', 'with', 'from', 'into', 'onto',
    'under', 'over', 'behind', 'beside', 'between', 'through', 'across',
    'against', 'around', 'beneath', 'inside', 'outside', 'within',
    'about', 'above', 'after', 'along', 'among', 'before', 'below',
    'beyond', 'by', 'down', 'during', 'near', 'of', 'off', 'out',
    'past', 'toward', 'towards', 'up', 'upon', 'using'
  ],
  
  /**
   * Common nouns for basic parsing
   */
  commonNouns: [
    'door', 'window', 'wall', 'floor', 'ceiling',
    'table', 'chair', 'bed', 'desk', 'shelf',
    'box', 'container', 'bag', 'chest', 'trunk',
    'key', 'lock', 'handle', 'button', 'switch',
    'book', 'paper', 'note', 'letter', 'sign',
    'lamp', 'light', 'candle', 'torch', 'lantern',
    'sword', 'knife', 'gun', 'weapon', 'tool',
    'food', 'water', 'bottle', 'cup', 'plate',
    'coin', 'money', 'treasure', 'gem', 'jewel',
    'rope', 'chain', 'string', 'wire', 'cable'
  ],
  
  /**
   * Pronouns
   */
  pronouns: [
    'it', 'them', 'him', 'her', 'me', 'us', 'you',
    'this', 'that', 'these', 'those',
    'all', 'everything', 'everyone', 'everybody',
    'nothing', 'nobody', 'none',
    'some', 'any', 'anyone', 'anybody', 'anything',
    'here', 'there', 'everywhere'
  ],
  
  /**
   * Conjunctions
   */
  conjunctions: [
    'and', 'or', 'but', 'then', 'so', 'because', 'if',
    'when', 'while', 'although', 'though', 'unless'
  ],
  
  /**
   * Common determiners
   */
  determiners: [
    'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'this', 'that', 'these', 'those',
    'each', 'every', 'either', 'neither',
    'some', 'any', 'no', 'all', 'both', 'half',
    'several', 'many', 'much', 'few', 'little',
    'other', 'another', 'such', 'what', 'which'
  ],
  
  /**
   * Directions
   */
  directions: [
    'north', 'south', 'east', 'west',
    'northeast', 'northwest', 'southeast', 'southwest',
    'up', 'down', 'in', 'out',
    'left', 'right', 'forward', 'back', 'backward'
  ],
  
  /**
   * Common adjectives for parsing
   */
  commonAdjectives: [
    // Size
    'big', 'large', 'small', 'tiny', 'huge', 'little',
    // Color
    'red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'gray', 'grey',
    // Material
    'wooden', 'metal', 'stone', 'glass', 'plastic', 'paper',
    // State
    'old', 'new', 'broken', 'open', 'closed', 'locked', 'empty', 'full',
    // Quality
    'good', 'bad', 'nice', 'beautiful', 'ugly', 'clean', 'dirty',
    // Position
    'first', 'second', 'third', 'last', 'next', 'previous',
    // Other common
    'same', 'different', 'other', 'main', 'important'
  ],
  
  /**
   * Numbers as words
   */
  numberWords: [
    'zero', 'one', 'two', 'three', 'four', 'five',
    'six', 'seven', 'eight', 'nine', 'ten',
    'first', 'second', 'third', 'fourth', 'fifth',
    'sixth', 'seventh', 'eighth', 'ninth', 'tenth'
  ],
  
  /**
   * Common verbs that don't map to actions (auxiliaries, etc.)
   */
  auxiliaryVerbs: [
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having',
    'do', 'does', 'did', 'doing',
    'will', 'would', 'shall', 'should',
    'may', 'might', 'must', 'can', 'could',
    'ought', 'need', 'dare'
  ],
  
  /**
   * Words to ignore in parsing
   */
  ignoreWords: [
    'please', 'kindly', 'just', 'simply',
    'really', 'very', 'quite', 'rather',
    'well', 'now', 'then', 'so'
  ]
};

/**
 * Irregular plural mappings
 */
export const irregularPlurals = new Map<string, string>([
  ['children', 'child'],
  ['people', 'person'],
  ['men', 'man'],
  ['women', 'woman'],
  ['teeth', 'tooth'],
  ['feet', 'foot'],
  ['mice', 'mouse'],
  ['geese', 'goose'],
  ['oxen', 'ox'],
  ['dice', 'die'],
  ['pennies', 'penny'],
  ['leaves', 'leaf'],
  ['knives', 'knife'],
  ['wives', 'wife'],
  ['lives', 'life'],
  ['shelves', 'shelf'],
  ['wolves', 'wolf'],
  ['halves', 'half'],
  ['calves', 'calf']
]);

/**
 * Common abbreviations
 */
export const abbreviations = new Map<string, string>([
  ['n', 'north'],
  ['s', 'south'],
  ['e', 'east'],
  ['w', 'west'],
  ['ne', 'northeast'],
  ['nw', 'northwest'],
  ['se', 'southeast'],
  ['sw', 'southwest'],
  ['u', 'up'],
  ['d', 'down'],
  ['l', 'look'],
  ['x', 'examine'],
  ['i', 'inventory'],
  ['z', 'wait'],
  ['g', 'again'],
  ['q', 'quit']
]);
