/**
 * Parser Language Provider Interface
 * 
 * Extends the base LanguageProvider with parser-specific functionality.
 * Language implementations must provide both text/messaging capabilities
 * and parser vocabulary/grammar rules.
 */

import { LanguageProvider } from './language-provider';
import { 
  VerbVocabulary, 
  DirectionVocabulary, 
  SpecialVocabulary 
} from './vocabulary-contracts/vocabulary-types';

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
   * Get determiners for the language
   * @returns Array of determiner strings
   */
  getDeterminers(): string[];

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
   * Expand an abbreviation
   * @param abbreviation The abbreviation to expand
   * @returns The expanded form or null if not recognized
   */
  expandAbbreviation(abbreviation: string): string | null;

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

  /**
   * Get direction mappings (alternative to getDirections)
   * @returns Record mapping directions to word arrays
   */
  getDirectionMappings?(): Record<string, string[]>;

  /**
   * Get pronouns (alternative to getSpecialVocabulary)
   * @returns Array of pronoun strings
   */
  getPronouns?(): string[];

  /**
   * Get all words (alternative to getSpecialVocabulary)
   * @returns Array of words meaning "all"
   */
  getAllWords?(): string[];

  /**
   * Get except words (alternative to getSpecialVocabulary)
   * @returns Array of words meaning "except"
   */
  getExceptWords?(): string[];

  /**
   * Get articles (alternative to getSpecialVocabulary)
   * @returns Array of article strings
   */
  getArticles?(): string[];
}
