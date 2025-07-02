/**
 * Parser types and interfaces
 * 
 * The parser is world-agnostic and produces parsed commands
 * that must be resolved against the world model.
 */

import { PartOfSpeech } from './vocabulary-types';
import type { Parser as CoreParser } from '@sharpee/world-model';
import type { SystemEvent } from '@sharpee/core';

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
 * Parser interface - extends the core IParser
 */
export interface Parser extends CoreParser {
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
