/**
 * Internal parser types
 * 
 * These types are used internally by the parser implementation
 * and should not be exported as part of the public API.
 * 
 * @internal
 */

import { Token } from './parser-types';

/**
 * A candidate command from the parser
 * This is world-agnostic - just the grammatical structure
 * 
 * @internal
 */
export interface CandidateCommand {
  /**
   * The action to perform (verb)
   */
  action: string;
  
  /**
   * Raw text for the primary noun
   */
  nounText?: string;
  
  /**
   * Possible interpretations of the noun
   */
  nounCandidates?: string[];
  
  /**
   * Preposition between nouns
   */
  preposition?: string;
  
  /**
   * Raw text for the secondary noun
   */
  secondNounText?: string;
  
  /**
   * Possible interpretations of the second noun
   */
  secondNounCandidates?: string[];
  
  /**
   * Original input text
   */
  originalInput: string;
  
  /**
   * Tokens that were parsed
   */
  tokens: Token[];
  
  /**
   * Grammar pattern that was matched
   */
  pattern?: string;
  
  /**
   * Parser confidence (0-1)
   */
  confidence?: number;
  
  /**
   * Any special flags (ALL, EXCEPT, etc.)
   */
  flags?: {
    all?: boolean;
    except?: boolean;
    pronoun?: boolean;
  };
}

/**
 * Result of parsing with error handling (internal)
 * 
 * @internal
 */
export interface InternalParseResult {
  /**
   * Successful candidate commands
   */
  candidates: CandidateCommand[];
  
  /**
   * Errors encountered
   */
  errors: ParseError[];
  
  /**
   * Whether parsing was partially successful
   */
  partial: boolean;
}

/**
 * Internal parse error type
 * 
 * @internal
 */
export interface ParseError {
  /**
   * Type of error
   */
  type: ParseErrorType;
  
  /**
   * Human-readable message
   */
  message: string;
  
  /**
   * The problematic word(s)
   */
  words?: string[];
  
  /**
   * Position in input where error occurred
   */
  position?: number;
  
  /**
   * Suggestions for fixing
   */
  suggestions?: string[];
}

/**
 * Error types for parsing
 * 
 * @internal
 */
export enum ParseErrorType {
  NO_VERB = 'no_verb',
  UNKNOWN_VERB = 'unknown_verb',
  UNKNOWN_WORD = 'unknown_word',
  AMBIGUOUS = 'ambiguous',
  INCOMPLETE = 'incomplete',
  PATTERN_MISMATCH = 'pattern_mismatch'
}
