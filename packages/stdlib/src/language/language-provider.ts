/**
 * Language Provider Interface
 * 
 * Language packages implement this interface to provide
 * vocabulary and grammar rules to the parser.
 * 
 * Note: Language packages should be self-contained with no
 * dependencies on stdlib or other @sharpee packages.
 */

import { VerbVocabulary, DirectionVocabulary, SpecialVocabulary } from '../parser/vocabulary-types';

/**
 * Language provider interface that language packages must implement
 * 
 * This interface is designed to match what self-contained language
 * packages naturally provide, rather than forcing them to import
 * types from stdlib.
 */
export interface LanguageProvider {
  /**
   * Language code (e.g., 'en-US', 'es-ES', 'de-DE')
   */
  readonly languageCode: string;

  /**
   * Human-readable language name
   */
  readonly languageName: string;

  /**
   * Text direction
   */
  readonly textDirection: 'ltr' | 'rtl';

  /**
   * Get verb vocabulary
   * Returns objects with: actionId, verbs[], pattern?, prepositions?
   */
  getVerbs(): any[];

  /**
   * Get direction vocabulary
   * Returns objects with: direction, words[], abbreviations?
   */
  getDirections(): any[];

  /**
   * Get special vocabulary (articles, pronouns, etc.)
   * Returns object with: articles[], pronouns[], allWords[], exceptWords[]
   */
  getSpecialVocabulary(): any;

  /**
   * Get common adjectives
   */
  getCommonAdjectives(): string[];

  /**
   * Get common nouns
   */
  getCommonNouns(): string[];

  /**
   * Get prepositions
   */
  getPrepositions(): string[];

  /**
   * Get grammar patterns in priority order
   * Returns objects with: name, pattern, example, priority
   */
  getGrammarPatterns(): any[];

  /**
   * Lemmatize a word to its base form
   * (e.g., "taking" -> "take", "boxes" -> "box")
   */
  lemmatize(word: string): string;

  /**
   * Expand abbreviations
   * (e.g., "n" -> "north", "x" -> "examine")
   */
  expandAbbreviation(abbreviation: string): string | null;

  /**
   * Format a list of items with proper conjunctions
   * (e.g., ["apple", "banana", "orange"] -> "apple, banana, and orange")
   */
  formatList(items: string[], conjunction?: 'and' | 'or'): string;

  /**
   * Get the appropriate article for a noun
   * (e.g., "apple" -> "an", "ball" -> "a")
   */
  getIndefiniteArticle(noun: string): string;

  /**
   * Pluralize a noun
   * (e.g., "box" -> "boxes", "child" -> "children")
   */
  pluralize(noun: string): string;

  /**
   * Check if a word is an ignore word (articles, etc.)
   */
  isIgnoreWord(word: string): boolean;
}

/**
 * Adapter functions to convert language provider data to stdlib types
 */
export function adaptVerbVocabulary(verbs: any[]): VerbVocabulary[] {
  return verbs.map(v => ({
    actionId: v.actionId,
    verbs: v.verbs,
    pattern: v.pattern,
    prepositions: v.prepositions
  }));
}

export function adaptDirectionVocabulary(directions: any[]): DirectionVocabulary[] {
  return directions.map(d => ({
    direction: d.direction,
    words: d.words,
    abbreviations: d.abbreviations
  }));
}

export function adaptSpecialVocabulary(special: any): SpecialVocabulary {
  return {
    articles: special.articles || [],
    pronouns: special.pronouns || [],
    allWords: special.allWords || [],
    exceptWords: special.exceptWords || []
  };
}
