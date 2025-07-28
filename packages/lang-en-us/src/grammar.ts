/**
 * English-specific grammar types and constants
 * 
 * This module defines the parts of speech and grammatical structures
 * specific to the English language. Other languages will have their
 * own grammar modules with different parts of speech.
 */

/**
 * English parts of speech
 * 
 * Note: This is specific to English and may not apply to other languages.
 * For example, Japanese has particles, Turkish has postpositions, etc.
 */
export const EnglishPartsOfSpeech = Object.freeze({
  VERB: 'verb',
  NOUN: 'noun',
  ADJECTIVE: 'adjective',
  ARTICLE: 'article',
  PREPOSITION: 'preposition',
  PRONOUN: 'pronoun',
  DETERMINER: 'determiner',
  CONJUNCTION: 'conjunction',
  INTERJECTION: 'interjection',
  DIRECTION: 'direction',
  ADVERB: 'adverb',
  AUXILIARY: 'auxiliary'
} as const);

/**
 * Type for English parts of speech values
 */
export type EnglishPartOfSpeech = typeof EnglishPartsOfSpeech[keyof typeof EnglishPartsOfSpeech];

/**
 * English grammar patterns
 * 
 * These patterns describe common command structures in English
 */
export const EnglishGrammarPatterns = {
  VERB_ONLY: {
    name: 'verb_only',
    elements: ['VERB'],
    example: 'look',
    description: 'Simple intransitive verb'
  },
  VERB_NOUN: {
    name: 'verb_noun',
    elements: ['VERB', 'NOUN_PHRASE'],
    example: 'take ball',
    description: 'Transitive verb with direct object'
  },
  VERB_NOUN_PREP_NOUN: {
    name: 'verb_noun_prep_noun',
    elements: ['VERB', 'NOUN_PHRASE', 'PREP', 'NOUN_PHRASE'],
    example: 'put ball in box',
    description: 'Ditransitive verb with direct and indirect objects'
  },
  VERB_PREP_NOUN: {
    name: 'verb_prep_noun',
    elements: ['VERB', 'PREP', 'NOUN_PHRASE'],
    example: 'look at painting',
    description: 'Verb with prepositional phrase'
  },
  VERB_PARTICLE_NOUN: {
    name: 'verb_particle_noun',
    elements: ['VERB', 'PARTICLE', 'NOUN_PHRASE'],
    example: 'pick up ball',
    description: 'Phrasal verb with direct object'
  },
  VERB_NOUN_PARTICLE: {
    name: 'verb_noun_particle',
    elements: ['VERB', 'NOUN_PHRASE', 'PARTICLE'],
    example: 'put ball down',
    description: 'Phrasal verb with object before particle'
  },
  VERB_DIRECTION: {
    name: 'verb_direction',
    elements: ['VERB', 'DIRECTION'],
    example: 'go north',
    description: 'Movement verb with direction'
  },
  DIRECTION_ONLY: {
    name: 'direction_only',
    elements: ['DIRECTION'],
    example: 'north',
    description: 'Implicit movement command'
  }
} as const;

/**
 * Type for English grammar pattern names
 */
export type EnglishGrammarPatternName = keyof typeof EnglishGrammarPatterns;

/**
 * English-specific token type for language processing
 */
export interface EnglishToken {
  /** Original word as typed */
  word: string;
  /** Normalized form (lowercase, etc.) */
  normalized: string;
  /** Character position in original input */
  position: number;
  /** Length of the token */
  length: number;
  /** Possible English parts of speech */
  partsOfSpeech: EnglishPartOfSpeech[];
  /** Additional English-specific data */
  englishData?: {
    /** Is this a contraction? */
    isContraction?: boolean;
    /** Expanded form if contraction */
    expandedForm?: string;
    /** Is this part of a phrasal verb? */
    isPhrasalVerbParticle?: boolean;
    /** Is this a modal verb? */
    isModal?: boolean;
  };
}

/**
 * English verb forms and conjugations
 */
export interface EnglishVerbForms {
  /** Base form (infinitive without 'to') */
  base: string;
  /** Third person singular present */
  thirdPersonSingular?: string;
  /** Past tense */
  past?: string;
  /** Past participle */
  pastParticiple?: string;
  /** Present participle (-ing form) */
  presentParticiple?: string;
  /** Imperative form (usually same as base) */
  imperative?: string;
}

/**
 * English noun properties
 */
export interface EnglishNounProperties {
  /** Singular form */
  singular: string;
  /** Plural form */
  plural?: string;
  /** Is this a mass noun (uncountable)? */
  isMassNoun?: boolean;
  /** Is this a proper noun? */
  isProperNoun?: boolean;
  /** Common adjectives that collocate with this noun */
  commonAdjectives?: string[];
}

/**
 * English preposition properties
 */
export interface EnglishPrepositionProperties {
  /** The preposition */
  preposition: string;
  /** Type of relationship it expresses */
  relationshipType: 'spatial' | 'temporal' | 'logical' | 'other';
  /** Can it be used as a particle in phrasal verbs? */
  canBeParticle?: boolean;
}

/**
 * Utility functions for English grammar
 */
export const EnglishGrammarUtils = {
  /**
   * Check if a word is likely an article
   */
  isArticle(word: string): boolean {
    const articles = ['a', 'an', 'the'];
    return articles.includes(word.toLowerCase());
  },

  /**
   * Check if a word is a common determiner
   */
  isDeterminer(word: string): boolean {
    const determiners = [
      'all', 'every', 'some', 'any', 'no', 'each',
      'this', 'that', 'these', 'those',
      'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'much', 'many', 'few', 'little', 'several'
    ];
    return determiners.includes(word.toLowerCase());
  },

  /**
   * Check if a word is a pronoun
   */
  isPronoun(word: string): boolean {
    const pronouns = [
      'i', 'me', 'you', 'he', 'him', 'she', 'her', 'it',
      'we', 'us', 'they', 'them',
      'myself', 'yourself', 'himself', 'herself', 'itself',
      'ourselves', 'yourselves', 'themselves',
      'this', 'that', 'these', 'those',
      'who', 'whom', 'whose', 'which', 'what'
    ];
    return pronouns.includes(word.toLowerCase());
  },

  /**
   * Check if a word is a conjunction
   */
  isConjunction(word: string): boolean {
    const conjunctions = [
      'and', 'or', 'but', 'nor', 'for', 'yet', 'so',
      'although', 'because', 'since', 'unless',
      'while', 'when', 'where', 'if'
    ];
    return conjunctions.includes(word.toLowerCase());
  },

  /**
   * Get the indefinite article for a word
   */
  getIndefiniteArticle(word: string): 'a' | 'an' {
    if (!word || word.length === 0) {
      throw new Error('Cannot determine article for empty string');
    }
    
    const lowerWord = word.toLowerCase();
    const firstChar = lowerWord[0];
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    // Special cases for numbers
    const numberSounds: Record<string, 'a' | 'an'> = {
      '8': 'an', // "eight"
      '11': 'an', // "eleven"
      '18': 'an', // "eighteen"
      '80': 'an', // "eighty"
      '800': 'an', // "eight hundred"
      '1': 'a', // "one"
      '2': 'a', // "two"
      '3': 'a', // "three"
      '4': 'a', // "four"
      '5': 'a', // "five"
      '6': 'a', // "six"
      '7': 'a', // "seven"
      '9': 'a', // "nine"
      '10': 'a', // "ten"
      '12': 'a', // "twelve"
      '13': 'a', // "thirteen"
      '14': 'a', // "fourteen"
      '15': 'a', // "fifteen"
      '16': 'a', // "sixteen"
      '17': 'a', // "seventeen"
      '19': 'a', // "nineteen"
    };
    
    // Check if it's a number
    if (word in numberSounds) {
      return numberSounds[word];
    }
    
    // Special cases for words starting with silent 'h'
    const silentH = ['hour', 'honest', 'honor', 'heir'];
    if (silentH.some(w => lowerWord.startsWith(w))) {
      return 'an';
    }
    
    // Special cases for words starting with 'u' that sound like 'you'
    const uSoundsLikeYou = ['unit', 'university', 'unique', 'uniform'];
    if (uSoundsLikeYou.some(w => lowerWord.startsWith(w))) {
      return 'a';
    }
    
    return vowels.includes(firstChar) ? 'an' : 'a';
  }
};

/**
 * Export all grammar types and constants
 */
export * from './index';
