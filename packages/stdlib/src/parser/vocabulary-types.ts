/**
 * Vocabulary types and interfaces for the parser
 * 
 * The vocabulary system is extensible at multiple levels:
 * - Base vocabulary from language packages
 * - Extension vocabulary from extensions
 * - Story-specific vocabulary overrides
 * - Entity-specific vocabulary from traits
 */

/**
 * Part of speech categories
 */
export const PartOfSpeech = {
  VERB: 'verb',
  NOUN: 'noun',
  ADJECTIVE: 'adjective',
  PREPOSITION: 'preposition',
  ARTICLE: 'article',
  PRONOUN: 'pronoun',
  DIRECTION: 'direction',
  SPECIAL: 'special'
} as const;

export type PartOfSpeech = typeof PartOfSpeech[keyof typeof PartOfSpeech];

/**
 * A vocabulary entry
 */
export interface VocabularyEntry {
  /**
   * The word itself
   */
  word: string;
  
  /**
   * Part of speech
   */
  partOfSpeech: PartOfSpeech;
  
  /**
   * What this word maps to (action ID, entity ID, etc.)
   */
  mapsTo: string;
  
  /**
   * Priority for disambiguation (higher = preferred)
   */
  priority?: number;
  
  /**
   * Source of this vocabulary entry
   */
  source?: 'base' | 'extension' | 'story' | 'entity' | 'dynamic';
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Collection of vocabulary entries
 */
export interface VocabularySet {
  /**
   * All vocabulary entries
   */
  entries: VocabularyEntry[];
  
  /**
   * Quick lookup by word
   */
  byWord: Map<string, VocabularyEntry[]>;
  
  /**
   * Quick lookup by part of speech
   */
  byPartOfSpeech: Map<PartOfSpeech, VocabularyEntry[]>;
}

/**
 * Vocabulary provider interface
 * 
 * Different sources can provide vocabulary:
 * - Language packages provide base vocabulary
 * - Extensions can add domain-specific vocabulary
 * - Stories can override or add vocabulary
 * - Entities register their own vocabulary dynamically
 */
export interface VocabularyProvider {
  /**
   * Unique identifier for this provider
   */
  id: string;
  
  /**
   * Get vocabulary entries from this provider
   */
  getVocabulary(): VocabularyEntry[];
  
  /**
   * Priority for this provider (higher = override lower)
   */
  priority?: number;
}

/**
 * Standard verb vocabulary
 */
export interface VerbVocabulary {
  /**
   * The canonical action ID this verb maps to
   */
  actionId: string;
  
  /**
   * All verb forms that map to this action
   */
  verbs: string[];
  
  /**
   * Grammar pattern for this verb
   */
  pattern?: string;
  
  /**
   * Required prepositions (if any)
   */
  prepositions?: string[];
}

/**
 * Direction vocabulary entry
 */
export interface DirectionVocabulary {
  /**
   * Canonical direction (NORTH, SOUTH, etc.)
   */
  direction: string;
  
  /**
   * All words that map to this direction
   */
  words: string[];
  
  /**
   * Short forms (n, s, e, w, etc.)
   */
  abbreviations?: string[];
}

/**
 * Special vocabulary for pronouns and references
 */
export interface SpecialVocabulary {
  /**
   * Pronouns that refer to last noun
   */
  pronouns: string[];
  
  /**
   * Words that mean "everything"
   */
  allWords: string[];
  
  /**
   * Words that mean "except"
   */
  exceptWords: string[];
  
  /**
   * Common articles to ignore
   */
  articles: string[];
}

/**
 * Dynamic vocabulary entry from an entity
 */
export interface EntityVocabulary {
  /**
   * Entity ID this vocabulary belongs to
   */
  entityId: string;
  
  /**
   * Nouns that refer to this entity
   */
  nouns: string[];
  
  /**
   * Adjectives that can describe this entity
   */
  adjectives: string[];
  
  /**
   * Whether this entity is in scope
   */
  inScope?: boolean;
  
  /**
   * Priority for disambiguation
   */
  priority?: number;
}

/**
 * Grammar pattern for verb syntax
 */
export interface GrammarPattern {
  /**
   * Pattern name
   */
  name: string;
  
  /**
   * Pattern elements (VERB, NOUN, PREP, etc.)
   */
  elements: string[];
  
  /**
   * Example usage
   */
  example?: string;
  
  /**
   * Actions that use this pattern
   */
  actions?: string[];
}

/**
 * Common grammar patterns
 */
export const GrammarPatterns = Object.freeze({
  VERB_ONLY: Object.freeze({ 
    name: 'verb_only',
    elements: Object.freeze(['VERB']),
    example: 'look'
  }),
  VERB_NOUN: Object.freeze({
    name: 'verb_noun', 
    elements: Object.freeze(['VERB', 'NOUN']),
    example: 'take sword'
  }),
  VERB_NOUN_PREP_NOUN: Object.freeze({
    name: 'verb_noun_prep_noun',
    elements: Object.freeze(['VERB', 'NOUN', 'PREP', 'NOUN']),
    example: 'put sword in chest'
  }),
  VERB_PREP_NOUN: Object.freeze({
    name: 'verb_prep_noun',
    elements: Object.freeze(['VERB', 'PREP', 'NOUN']),
    example: 'look at painting'
  }),
  VERB_DIRECTION: Object.freeze({
    name: 'verb_direction',
    elements: Object.freeze(['VERB', 'DIRECTION']),
    example: 'go north'
  }),
  DIRECTION_ONLY: Object.freeze({
    name: 'direction_only',
    elements: Object.freeze(['DIRECTION']),
    example: 'north'
  })
});

/**
 * Type for standard grammar pattern names
 */
export type GrammarPatternName = keyof typeof GrammarPatterns;
