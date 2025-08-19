/**
 * Parser types and interfaces
 * 
 * The parser is world-agnostic and produces parsed commands
 * that must be resolved against the world model.
 */

import { PartOfSpeech, VerbVocabulary, VocabularyEntry } from '../vocabulary-contracts/vocabulary-types';
import type { ISystemEvent } from '@sharpee/core';

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
   * @deprecated Use setPlatformEventEmitter instead
   */
  setDebugCallback?(callback: (event: ISystemEvent) => void): void;

  /**
   * Set platform event emitter for parser debugging
   * The emitter should accept SemanticEvent objects
   */
  setPlatformEventEmitter?(emitter: (event: any) => void): void;

  /**
   * Set the world context for scope constraint evaluation
   * @param world The world model
   * @param actorId The current actor performing the command
   * @param currentLocation The actor's current location
   */
  setWorldContext?(world: any, actorId: string, currentLocation: string): void;

  /**
   * Register additional verbs after parser creation
   * Used for story-specific vocabulary
   */
  registerVerbs?(verbs: VerbVocabulary[]): void;

  /**
   * Register additional vocabulary entries after parser creation
   * More generic than registerVerbs - can handle any part of speech
   */
  registerVocabulary?(entries: VocabularyEntry[]): void;

  /**
   * Enable or disable a specific verb by action ID
   */
  setVerbEnabled?(actionId: string, enabled: boolean): void;
}
