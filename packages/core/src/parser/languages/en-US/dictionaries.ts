// packages/core/src/parser/languages/en-US/dictionaries.ts

import { PartOfSpeech } from '../../core/types';

/**
 * Common English articles
 */
export const ARTICLES: Record<string, PartOfSpeech> = {
  'a': PartOfSpeech.ARTICLE,
  'an': PartOfSpeech.ARTICLE,
  'the': PartOfSpeech.ARTICLE
};

/**
 * Common English prepositions
 */
export const PREPOSITIONS: Record<string, PartOfSpeech> = {
  'about': PartOfSpeech.PREPOSITION,
  'above': PartOfSpeech.PREPOSITION,
  'across': PartOfSpeech.PREPOSITION,
  'after': PartOfSpeech.PREPOSITION,
  'against': PartOfSpeech.PREPOSITION,
  'along': PartOfSpeech.PREPOSITION,
  'among': PartOfSpeech.PREPOSITION,
  'around': PartOfSpeech.PREPOSITION,
  'at': PartOfSpeech.PREPOSITION,
  'before': PartOfSpeech.PREPOSITION,
  'behind': PartOfSpeech.PREPOSITION,
  'below': PartOfSpeech.PREPOSITION,
  'beneath': PartOfSpeech.PREPOSITION,
  'beside': PartOfSpeech.PREPOSITION,
  'between': PartOfSpeech.PREPOSITION,
  'beyond': PartOfSpeech.PREPOSITION,
  'by': PartOfSpeech.PREPOSITION,
  'down': PartOfSpeech.PREPOSITION,
  'during': PartOfSpeech.PREPOSITION,
  'except': PartOfSpeech.PREPOSITION,
  'for': PartOfSpeech.PREPOSITION,
  'from': PartOfSpeech.PREPOSITION,
  'in': PartOfSpeech.PREPOSITION,
  'inside': PartOfSpeech.PREPOSITION,
  'into': PartOfSpeech.PREPOSITION,
  'like': PartOfSpeech.PREPOSITION,
  'near': PartOfSpeech.PREPOSITION,
  'of': PartOfSpeech.PREPOSITION,
  'off': PartOfSpeech.PREPOSITION,
  'on': PartOfSpeech.PREPOSITION,
  'onto': PartOfSpeech.PREPOSITION,
  'out': PartOfSpeech.PREPOSITION,
  'outside': PartOfSpeech.PREPOSITION,
  'over': PartOfSpeech.PREPOSITION,
  'through': PartOfSpeech.PREPOSITION,
  'to': PartOfSpeech.PREPOSITION,
  'toward': PartOfSpeech.PREPOSITION,
  'towards': PartOfSpeech.PREPOSITION,
  'under': PartOfSpeech.PREPOSITION,
  'underneath': PartOfSpeech.PREPOSITION,
  'until': PartOfSpeech.PREPOSITION,
  'up': PartOfSpeech.PREPOSITION,
  'upon': PartOfSpeech.PREPOSITION,
  'with': PartOfSpeech.PREPOSITION,
  'within': PartOfSpeech.PREPOSITION,
  'without': PartOfSpeech.PREPOSITION
};

/**
 * Common English pronouns
 */
export const PRONOUNS: Record<string, PartOfSpeech> = {
  'i': PartOfSpeech.PRONOUN,
  'me': PartOfSpeech.PRONOUN,
  'my': PartOfSpeech.PRONOUN,
  'mine': PartOfSpeech.PRONOUN,
  'you': PartOfSpeech.PRONOUN,
  'your': PartOfSpeech.PRONOUN,
  'yours': PartOfSpeech.PRONOUN,
  'he': PartOfSpeech.PRONOUN,
  'him': PartOfSpeech.PRONOUN,
  'his': PartOfSpeech.PRONOUN,
  'she': PartOfSpeech.PRONOUN,
  'her': PartOfSpeech.PRONOUN,
  'hers': PartOfSpeech.PRONOUN,
  'it': PartOfSpeech.PRONOUN,
  'its': PartOfSpeech.PRONOUN,
  'we': PartOfSpeech.PRONOUN,
  'us': PartOfSpeech.PRONOUN,
  'our': PartOfSpeech.PRONOUN,
  'ours': PartOfSpeech.PRONOUN,
  'they': PartOfSpeech.PRONOUN,
  'them': PartOfSpeech.PRONOUN,
  'their': PartOfSpeech.PRONOUN,
  'theirs': PartOfSpeech.PRONOUN,
  'this': PartOfSpeech.PRONOUN,
  'that': PartOfSpeech.PRONOUN,
  'these': PartOfSpeech.PRONOUN,
  'those': PartOfSpeech.PRONOUN,
  'myself': PartOfSpeech.PRONOUN,
  'yourself': PartOfSpeech.PRONOUN,
  'himself': PartOfSpeech.PRONOUN,
  'herself': PartOfSpeech.PRONOUN,
  'itself': PartOfSpeech.PRONOUN,
  'ourselves': PartOfSpeech.PRONOUN,
  'yourselves': PartOfSpeech.PRONOUN,
  'themselves': PartOfSpeech.PRONOUN
};

/**
 * Common English conjunctions
 */
export const CONJUNCTIONS: Record<string, PartOfSpeech> = {
  'and': PartOfSpeech.CONJUNCTION,
  'or': PartOfSpeech.CONJUNCTION,
  'but': PartOfSpeech.CONJUNCTION,
  'nor': PartOfSpeech.CONJUNCTION,
  'so': PartOfSpeech.CONJUNCTION,
  'yet': PartOfSpeech.CONJUNCTION,
  'for': PartOfSpeech.CONJUNCTION,
  'because': PartOfSpeech.CONJUNCTION,
  'if': PartOfSpeech.CONJUNCTION,
  'unless': PartOfSpeech.CONJUNCTION,
  'since': PartOfSpeech.CONJUNCTION,
  'while': PartOfSpeech.CONJUNCTION,
  'when': PartOfSpeech.CONJUNCTION,
  'although': PartOfSpeech.CONJUNCTION,
  'though': PartOfSpeech.CONJUNCTION
};

/**
 * Common English determiners
 */
export const DETERMINERS: Record<string, PartOfSpeech> = {
  'some': PartOfSpeech.DETERMINER,
  'any': PartOfSpeech.DETERMINER,
  'many': PartOfSpeech.DETERMINER,
  'much': PartOfSpeech.DETERMINER,
  'few': PartOfSpeech.DETERMINER,
  'little': PartOfSpeech.DETERMINER,
  'all': PartOfSpeech.DETERMINER,
  'both': PartOfSpeech.DETERMINER,
  'each': PartOfSpeech.DETERMINER,
  'every': PartOfSpeech.DETERMINER,
  'other': PartOfSpeech.DETERMINER,
  'another': PartOfSpeech.DETERMINER,
  'either': PartOfSpeech.DETERMINER,
  'neither': PartOfSpeech.DETERMINER,
  'several': PartOfSpeech.DETERMINER,
  'no': PartOfSpeech.DETERMINER
};

/**
 * Common English adverbs
 */
export const ADVERBS: Record<string, PartOfSpeech> = {
  'very': PartOfSpeech.ADVERB,
  'really': PartOfSpeech.ADVERB,
  'almost': PartOfSpeech.ADVERB,
  'always': PartOfSpeech.ADVERB,
  'never': PartOfSpeech.ADVERB,
  'now': PartOfSpeech.ADVERB,
  'then': PartOfSpeech.ADVERB,
  'here': PartOfSpeech.ADVERB,
  'there': PartOfSpeech.ADVERB,
  'quickly': PartOfSpeech.ADVERB,
  'slowly': PartOfSpeech.ADVERB,
  'again': PartOfSpeech.ADVERB,
  'too': PartOfSpeech.ADVERB,
  'also': PartOfSpeech.ADVERB,
  'not': PartOfSpeech.ADVERB,
  'only': PartOfSpeech.ADVERB,
  'just': PartOfSpeech.ADVERB,
  'even': PartOfSpeech.ADVERB,
  'still': PartOfSpeech.ADVERB,
  'already': PartOfSpeech.ADVERB,
  'often': PartOfSpeech.ADVERB,
  'sometimes': PartOfSpeech.ADVERB,
  'usually': PartOfSpeech.ADVERB,
  'rarely': PartOfSpeech.ADVERB,
  'perhaps': PartOfSpeech.ADVERB,
  'maybe': PartOfSpeech.ADVERB,
  'probably': PartOfSpeech.ADVERB,
  'certainly': PartOfSpeech.ADVERB,
  'definitely': PartOfSpeech.ADVERB
};

/**
 * Common English adjectives
 */
export const COMMON_ADJECTIVES: Record<string, PartOfSpeech> = {
  'big': PartOfSpeech.ADJECTIVE,
  'small': PartOfSpeech.ADJECTIVE,
  'large': PartOfSpeech.ADJECTIVE,
  'tiny': PartOfSpeech.ADJECTIVE,
  'tall': PartOfSpeech.ADJECTIVE,
  'short': PartOfSpeech.ADJECTIVE,
  'long': PartOfSpeech.ADJECTIVE,
  'red': PartOfSpeech.ADJECTIVE,
  'blue': PartOfSpeech.ADJECTIVE,
  'green': PartOfSpeech.ADJECTIVE,
  'yellow': PartOfSpeech.ADJECTIVE,
  'black': PartOfSpeech.ADJECTIVE,
  'white': PartOfSpeech.ADJECTIVE,
  'dark': PartOfSpeech.ADJECTIVE,
  'light': PartOfSpeech.ADJECTIVE,
  'heavy': PartOfSpeech.ADJECTIVE,
  'old': PartOfSpeech.ADJECTIVE,
  'new': PartOfSpeech.ADJECTIVE,
  'young': PartOfSpeech.ADJECTIVE,
  'ancient': PartOfSpeech.ADJECTIVE,
  'modern': PartOfSpeech.ADJECTIVE,
  'good': PartOfSpeech.ADJECTIVE,
  'bad': PartOfSpeech.ADJECTIVE,
  'nice': PartOfSpeech.ADJECTIVE,
  'evil': PartOfSpeech.ADJECTIVE,
  'happy': PartOfSpeech.ADJECTIVE,
  'sad': PartOfSpeech.ADJECTIVE,
  'angry': PartOfSpeech.ADJECTIVE,
  'scared': PartOfSpeech.ADJECTIVE,
  'brave': PartOfSpeech.ADJECTIVE,
  'strong': PartOfSpeech.ADJECTIVE,
  'weak': PartOfSpeech.ADJECTIVE,
  'smart': PartOfSpeech.ADJECTIVE,
  'dumb': PartOfSpeech.ADJECTIVE,
  'open': PartOfSpeech.ADJECTIVE,
  'closed': PartOfSpeech.ADJECTIVE,
  'locked': PartOfSpeech.ADJECTIVE,
  'unlocked': PartOfSpeech.ADJECTIVE,
  'full': PartOfSpeech.ADJECTIVE,
  'empty': PartOfSpeech.ADJECTIVE,
  'broken': PartOfSpeech.ADJECTIVE,
  'fixed': PartOfSpeech.ADJECTIVE,
  'clean': PartOfSpeech.ADJECTIVE,
  'dirty': PartOfSpeech.ADJECTIVE,
  'wet': PartOfSpeech.ADJECTIVE,
  'dry': PartOfSpeech.ADJECTIVE,
  'sharp': PartOfSpeech.ADJECTIVE,
  'dull': PartOfSpeech.ADJECTIVE,
  'loud': PartOfSpeech.ADJECTIVE,
  'quiet': PartOfSpeech.ADJECTIVE,
  'bright': PartOfSpeech.ADJECTIVE,
  'dim': PartOfSpeech.ADJECTIVE,
  'hot': PartOfSpeech.ADJECTIVE,
  'cold': PartOfSpeech.ADJECTIVE,
  'warm': PartOfSpeech.ADJECTIVE,
  'cool': PartOfSpeech.ADJECTIVE
};