/**
 * Useful word lists for English IF parsing
 * Simplified from the original linguistic dictionaries
 */

// These remain useful for filtering and word recognition
export const ARTICLES = ['a', 'an', 'the', 'some'];

export const PREPOSITIONS = [
  'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around',
  'at', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond',
  'by', 'down', 'during', 'except', 'for', 'from', 'in', 'inside', 'into',
  'like', 'near', 'of', 'off', 'on', 'onto', 'out', 'outside', 'over',
  'through', 'to', 'toward', 'towards', 'under', 'underneath', 'until', 'up',
  'upon', 'with', 'within', 'without'
];

export const PRONOUNS = [
  'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 
  'he', 'him', 'his', 'she', 'her', 'hers',
  'it', 'its', 'we', 'us', 'our', 'ours',
  'they', 'them', 'their', 'theirs',
  'this', 'that', 'these', 'those',
  'myself', 'yourself', 'himself', 'herself', 'itself',
  'ourselves', 'yourselves', 'themselves'
];

export const CONJUNCTIONS = [
  'and', 'or', 'but', 'nor', 'so', 'yet', 'for',
  'because', 'if', 'unless', 'since', 'while', 'when',
  'although', 'though', 'then'
];

// Common adjectives that might be used in object descriptions
export const COMMON_ADJECTIVES = [
  // Size
  'big', 'small', 'large', 'tiny', 'tall', 'short', 'long', 'wide', 'narrow', 'thick', 'thin',
  
  // Colors
  'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'brown', 'orange', 
  'purple', 'pink', 'gold', 'silver', 'bronze', 'brass', 'copper',
  
  // Light/Dark
  'dark', 'light', 'bright', 'dim', 'shiny', 'dull', 'glowing',
  
  // Weight/Material
  'heavy', 'light', 'wooden', 'metal', 'stone', 'glass', 'plastic', 'leather', 'cloth',
  
  // Age/Condition
  'old', 'new', 'young', 'ancient', 'modern', 'broken', 'fixed', 'damaged', 'pristine',
  
  // State
  'open', 'closed', 'locked', 'unlocked', 'full', 'empty', 'clean', 'dirty', 
  'wet', 'dry', 'hot', 'cold', 'warm', 'cool', 'frozen', 'burning',
  
  // Texture
  'rough', 'smooth', 'soft', 'hard', 'sharp', 'dull', 'sticky', 'slippery',
  
  // Other common IF adjectives
  'hidden', 'visible', 'secret', 'obvious', 'strange', 'normal', 'mysterious', 'ordinary'
];

// Determiners that might appear in commands
export const DETERMINERS = [
  'all', 'both', 'each', 'every', 'other', 'another', 
  'either', 'neither', 'several', 'many', 'few', 'some', 'any', 'no'
];
