/**
 * @file Grammar Vocabulary Provider
 * @description Context-aware vocabulary system for grammar pattern matching (ADR-082)
 *
 * This is distinct from vocabulary-contracts/VocabularyProvider which is for
 * providing vocabulary entries to VocabularyRegistry. This system is specifically
 * for context-aware vocabulary categories used in grammar slot matching.
 *
 * Vocabulary categories are registered with optional context predicates.
 * The parser only considers a pattern if its vocabulary is active in the current context.
 */

import { GrammarContext } from './grammar-builder';

/**
 * Configuration for a vocabulary category
 */
export interface GrammarVocabularyConfig {
  /** Words in this vocabulary category */
  words: string[];

  /**
   * Optional context predicate - if provided, vocabulary is only active
   * when this function returns true for the current GrammarContext.
   *
   * @example
   * ```typescript
   * vocab.define('panel-colors', {
   *   words: ['red', 'yellow', 'mahogany', 'pine'],
   *   when: (ctx) => ctx.currentLocation === insideMirrorId
   * });
   * ```
   */
  when?: (ctx: GrammarContext) => boolean;
}

/**
 * Result of a grammar vocabulary match
 */
export interface GrammarVocabularyMatch {
  /** The matched word (normalized to lowercase) */
  word: string;

  /** The category this word was matched from */
  category: string;
}

/**
 * Context-aware vocabulary provider for grammar pattern matching.
 *
 * Stories register vocabulary categories with optional context predicates.
 * The parser checks if a category is active before attempting to match words.
 *
 * @example
 * ```typescript
 * // Story initialization
 * const vocab = world.getGrammarVocabularyProvider();
 *
 * // Global vocabulary (always active)
 * vocab.define('manner', {
 *   words: ['carefully', 'quickly', 'forcefully']
 * });
 *
 * // Context-specific vocabulary
 * vocab.define('panel-colors', {
 *   words: ['red', 'yellow', 'mahogany', 'pine'],
 *   when: (ctx) => ctx.currentLocation === insideMirrorId
 * });
 *
 * // Grammar pattern references the category
 * grammar
 *   .define('push :color panel')
 *   .fromVocabulary('color', 'panel-colors')
 *   .mapsTo('push_panel')
 *   .build();
 * ```
 */
export interface IGrammarVocabularyProvider {
  /**
   * Define a named vocabulary category.
   *
   * @param category - Unique category name (e.g., 'panel-colors', 'dial-positions')
   * @param config - Words and optional context predicate
   * @throws Error if category already exists (use extend() to add words)
   */
  define(category: string, config: GrammarVocabularyConfig): void;

  /**
   * Extend an existing category with additional words.
   * The context predicate is inherited from the original definition.
   *
   * @param category - Existing category name
   * @param words - Additional words to add
   * @throws Error if category doesn't exist
   */
  extend(category: string, words: string[]): void;

  /**
   * Check if a word matches a category in the current context.
   *
   * Returns true only if:
   * 1. The category exists
   * 2. The category is active in the context (when predicate passes or is absent)
   * 3. The word is in the category's word list
   *
   * @param category - Category name to check
   * @param word - Word to match (case-insensitive)
   * @param ctx - Current grammar context
   * @returns true if word matches category in context
   */
  match(category: string, word: string, ctx: GrammarContext): boolean;

  /**
   * Get all words in a category (for tooling/debugging).
   * Returns empty set if category doesn't exist.
   *
   * @param category - Category name
   * @returns Set of words in the category
   */
  getWords(category: string): Set<string>;

  /**
   * Check if a category is active in the current context.
   *
   * @param category - Category name
   * @param ctx - Current grammar context
   * @returns true if category exists and its when predicate passes (or is absent)
   */
  isActive(category: string, ctx: GrammarContext): boolean;

  /**
   * Check if a category exists (regardless of context).
   *
   * @param category - Category name
   * @returns true if category has been defined
   */
  hasCategory(category: string): boolean;

  /**
   * Get all defined category names (for tooling/debugging).
   *
   * @returns Array of category names
   */
  getCategories(): string[];

  /**
   * Remove a category.
   *
   * @param category - Category name to remove
   * @returns true if category was removed, false if it didn't exist
   */
  removeCategory(category: string): boolean;

  /**
   * Clear all vocabulary categories.
   */
  clear(): void;
}

/**
 * Default implementation of IGrammarVocabularyProvider.
 *
 * Stores vocabulary categories with their words and context predicates.
 * All word matching is case-insensitive.
 */
export class GrammarVocabularyProvider implements IGrammarVocabularyProvider {
  private categories = new Map<string, {
    words: Set<string>;
    when?: (ctx: GrammarContext) => boolean;
  }>();

  define(category: string, config: GrammarVocabularyConfig): void {
    if (this.categories.has(category)) {
      throw new Error(`Vocabulary category '${category}' already exists. Use extend() to add words.`);
    }

    // Normalize words to lowercase
    const normalizedWords = new Set(
      config.words.map(w => w.toLowerCase())
    );

    this.categories.set(category, {
      words: normalizedWords,
      when: config.when
    });
  }

  extend(category: string, words: string[]): void {
    const existing = this.categories.get(category);
    if (!existing) {
      throw new Error(`Vocabulary category '${category}' does not exist. Use define() first.`);
    }

    // Add normalized words
    for (const word of words) {
      existing.words.add(word.toLowerCase());
    }
  }

  match(category: string, word: string, ctx: GrammarContext): boolean {
    const config = this.categories.get(category);
    if (!config) {
      return false;
    }

    // Check context predicate
    if (config.when && !config.when(ctx)) {
      return false;
    }

    // Check word (case-insensitive)
    return config.words.has(word.toLowerCase());
  }

  getWords(category: string): Set<string> {
    const config = this.categories.get(category);
    if (!config) {
      return new Set();
    }
    // Return a copy to prevent external modification
    return new Set(config.words);
  }

  isActive(category: string, ctx: GrammarContext): boolean {
    const config = this.categories.get(category);
    if (!config) {
      return false;
    }

    // No predicate means always active
    if (!config.when) {
      return true;
    }

    return config.when(ctx);
  }

  hasCategory(category: string): boolean {
    return this.categories.has(category);
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  removeCategory(category: string): boolean {
    return this.categories.delete(category);
  }

  clear(): void {
    this.categories.clear();
  }
}
