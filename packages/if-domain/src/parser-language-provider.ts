/**
 * Parser Language Provider Interface
 * 
 * Extends the base LanguageProvider with parser-specific functionality.
 * Language implementations must provide both text/messaging capabilities
 * and parser vocabulary/grammar rules.
 */

import { LanguageProvider } from './language-provider.js';
import {
  VerbVocabulary,
  DirectionVocabulary,
  SpecialVocabulary,
  DeterminerVocabulary
} from './vocabulary-contracts/vocabulary-types.js';

/**
 * Language-specific grammar pattern definition
 * Different from the vocabulary-types GrammarPattern
 */
export interface LanguageGrammarPattern {
  name: string;
  pattern: string;
  example: string;
  priority: number;
}

/**
 * Parser-specific language provider interface
 * 
 * Extends the base LanguageProvider with methods needed for parsing
 * natural language commands. Each language implementation must provide
 * vocabulary data and grammar rules specific to that language.
 */
export interface ParserLanguageProvider extends LanguageProvider {
  /**
   * Get verb vocabulary for the language
   * @returns Array of verb vocabulary entries
   */
  getVerbs(): VerbVocabulary[];

  /**
   * Get directional vocabulary for the language
   * @returns Array of direction vocabulary entries
   */
  getDirections(): DirectionVocabulary[];

  /**
   * Get special vocabulary (articles, pronouns, etc.)
   * @returns Special vocabulary object
   */
  getSpecialVocabulary(): SpecialVocabulary;

  /**
   * Get prepositions for the language
   * @returns Array of preposition strings
   */
  getPrepositions(): string[];

  /**
   * Get determiners for the language, each with whose it is when it is a
   * possessive (ADR-387 D6)
   * @returns Array of determiner entries
   */
  getDeterminers(): DeterminerVocabulary[];

  /**
   * The words that separate list items in typed input (ADR-386 D6, ADR-387 D6):
   * English "and" and the comma.
   * @returns Array of separator words
   */
  getListSeparators(): string[];

  /**
   * The manner adverbs a MANNER slot accepts (ADR-387 D6).
   * @returns Array of adverbs
   */
  getMannerAdverbs(): string[];

  /**
   * Read a cardinal number from typed words (ADR-386 D8): digits, one number
   * word, or a compound the language writes as two words or hyphenated.
   * @param words The typed words, in order
   * @returns The number, or null when the words are not one number
   */
  parseCardinal(words: readonly string[]): number | null;

  /**
   * The ordinal words of the language, each with its value.
   * @returns word → ordinal value
   */
  getOrdinalNumbers(): Readonly<Record<string, number>>;

  /**
   * Get conjunctions for the language
   * @returns Array of conjunction strings
   */
  getConjunctions(): string[];

  /**
   * Get number words for the language
   * @returns Array of number strings (both words and digits)
   */
  getNumbers(): string[];

  /**
   * Get grammar patterns for the language
   * @returns Array of grammar pattern definitions
   */
  getGrammarPatterns(): LanguageGrammarPattern[];

  /**
   * Lemmatize a word (reduce to base form)
   * @param word The word to lemmatize
   * @returns The base form of the word
   */
  lemmatize(word: string): string;

  /**
   * Format a list of items with proper conjunction
   * @param items Array of strings to format
   * @param conjunction 'and' or 'or'
   * @returns Formatted string (e.g., "a, b, and c")
   */
  formatList(items: string[], conjunction: 'and' | 'or'): string;

  /**
   * Get the appropriate indefinite article for a noun
   * @param noun The noun to get article for
   * @returns 'a' or 'an'
   */
  getIndefiniteArticle(noun: string): string;

  /**
   * Pluralize a noun
   * @param noun The noun to pluralize
   * @returns The plural form
   */
  pluralize(noun: string): string;

  /**
   * Check if a word should be ignored in parsing
   * @param word The word to check
   * @returns True if the word should be ignored
   */
  isIgnoreWord(word: string): boolean;

  /**
   * Get common adjectives for the language
   * @returns Array of common adjective strings
   */
  getCommonAdjectives(): string[];

  /**
   * Get common nouns for the language
   * @returns Array of common noun strings
   */
  getCommonNouns(): string[];

  /**
   * Get entity name/description
   * @param entity Entity object or ID
   * @returns Entity name or fallback
   */
  getEntityName(entity: any): string;

  // Optional fallback methods for vocabulary adapters
  /**
   * Get verb mappings (alternative to getVerbs)
   * @returns Record mapping action IDs to verb arrays
   */
  getVerbMappings?(): Record<string, string[]>;

  /**
   * Get verb pattern for a specific action
   * @param actionId The action ID
   * @returns The pattern string or undefined
   */
  getVerbPattern?(actionId: string): string | undefined;
}
