/**
 * Command types for the parsing phase
 * These types represent the syntactic structure of commands
 * without any world knowledge or entity resolution
 */

/**
 * Raw parsed object reference from grammar
 * No entity resolution, just text and candidate matches
 */
export interface ParsedObjectReference {
  /** Original text from input */
  text: string;
  
  /** Possible vocabulary matches */
  candidates: string[];
  
  /** Optional modifiers (adjectives, etc.) */
  modifiers?: string[];
}

/**
 * Result of parsing phase - pure syntax, no world knowledge
 */
export interface ParsedCommand {
  /** Raw input text */
  rawInput: string;
  
  /** Identified action verb */
  action: string;
  
  /** Direct object if present */
  directObject?: ParsedObjectReference;
  
  /** Indirect object if present */
  indirectObject?: ParsedObjectReference;
  
  /** Preposition if present */
  preposition?: string;
  
  /** Additional parsed elements */
  extras?: Record<string, any>;
}

/**
 * Errors that can occur during parsing
 */
export interface ParseError {
  type: 'PARSE_ERROR';
  code: 'UNKNOWN_COMMAND' | 'INVALID_SYNTAX' | 'AMBIGUOUS_INPUT';
  message: string;
  input: string;
  position?: number;
}
