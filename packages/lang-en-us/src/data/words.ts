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
   * Numbers as words (legacy array - use cardinalNumbers instead)
   * @deprecated Use cardinalNumbers or ordinalNumbers maps
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

/**
 * Cardinal number words mapped to numeric values
 * Used by NUMBER slot type in grammar patterns
 */
export const cardinalNumbers: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100
};

/**
 * Ordinal number words mapped to numeric values
 * Used by ORDINAL slot type in grammar patterns
 */
export const ordinalNumbers: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15,
  sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20
};

/**
 * Direction vocabulary with canonical forms
 * Maps all variations (full names and abbreviations) to canonical direction names
 * Used by DIRECTION slot type in grammar patterns
 */
export const directionMap: Record<string, string> = {
  // Cardinals - full
  north: 'north', south: 'south', east: 'east', west: 'west',
  // Cardinals - abbreviated
  n: 'north', s: 'south', e: 'east', w: 'west',
  // Ordinals - full
  northeast: 'northeast', northwest: 'northwest',
  southeast: 'southeast', southwest: 'southwest',
  // Ordinals - abbreviated
  ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest',
  // Verticals - full
  up: 'up', down: 'down',
  // Verticals - abbreviated
  u: 'up', d: 'down',
  // Special
  in: 'in', out: 'out'
};
