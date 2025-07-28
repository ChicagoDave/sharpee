/**
 * Parser types and interfaces
 * 
 * The parser is world-agnostic and produces parsed commands
 * that must be resolved against the world model.
 */

import { PartOfSpeech } from '../vocabulary-contracts/vocabulary-types';
import type { SystemEvent } from '@sharpee/core';

/**
 * Base parser interface that can be extended
 */
export interface BaseParser {
  /**
   * Parse input text into structured command
   * @param input Raw text input
   * @returns Parsed command or parse error
   */
  parse(input: string): any;
}

/**
 * A token from the lexer
 */
export interface Token {
  /**
   * The original word
   */
  word: string;

  /**
   * Normalized form (lowercase, etc.)
   */
  normalized: string;

  /**
   * Position in the input
   */
  position: number;

  /**
   * Possible parts of speech for this token
   */
  candidates: TokenCandidate[];
}

/**
 * A candidate interpretation of a token
 */
export interface TokenCandidate {
  /**
   * Part of speech
   */
  partOfSpeech: PartOfSpeech;

  /**
   * What this token maps to
   */
  mapsTo: string;

  /**
   * Priority for disambiguation
   */
  priority: number;

  /**
   * Source of this interpretation
   */
  source?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Parser options
 */
export interface ParserOptions {
  /**
   * Whether to allow partial matches
   */
  allowPartial?: boolean;

  /**
   * Whether to expand abbreviations
   */
  expandAbbreviations?: boolean;

  /**
   * Whether to ignore articles
   */
  ignoreArticles?: boolean;

  /**
   * Minimum confidence threshold
   */
  minConfidence?: number;
}

/**
 * Parser interface - extends the BaseParser
 */
export interface Parser extends BaseParser {
  /**
   * Tokenize input without parsing
   * Useful for debugging and testing
   */
  tokenize(input: string): Token[];

  /**
   * Set debug event callback for emitting parser debug events
   */
  setDebugCallback?(callback: (event: SystemEvent) => void): void;
}
