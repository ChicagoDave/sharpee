/**
 * Core parser types for Sharpee IF Engine
 */

/**
 * Represents a token in the input text
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
  length: number;
}

/**
 * Supported token types
 */
export enum TokenType {
  WORD,
  NUMBER,
  PUNCTUATION,
  SPECIAL_CHAR,
  WHITESPACE,
  UNKNOWN
}

/**
 * Part of Speech tag types
 */
export enum POSType {
  NOUN,
  VERB,
  ADJECTIVE,
  ADVERB,
  PREPOSITION,
  CONJUNCTION,
  ARTICLE,
  PRONOUN,
  NUMBER,
  UNKNOWN
}

/**
 * A word with its assigned POS tag
 */
export interface TaggedWord {
  word: string;
  tag: POSType;
  lemma?: string; // Optional lemmatized form
}

/**
 * Phrase structure in a sentence
 */
export interface Phrase {
  type: PhraseType;
  words: TaggedWord[];
  start: number;
  end: number;
}

/**
 * Types of phrases
 */
export enum PhraseType {
  VERB_PHRASE,
  NOUN_PHRASE,
  PREPOSITIONAL_PHRASE,
  UNKNOWN
}

/**
 * A parsed command with structured components
 */
export interface ParsedCommand {
  verb: string;           // The canonical verb
  directObject?: string;  // The direct object (if any)
  indirectObject?: string; // The indirect object (if any)
  preposition?: string;   // The preposition (if any)
  adjectives: string[];   // List of adjectives modifying objects
  originalText: string;   // The original input text
}

/**
 * Parser error information
 */
export interface ParserError {
  message: string;
  position?: number;
  expected?: string[];
}

/**
 * Result of parsing an input
 */
export interface ParserResult {
  success: boolean;
  commands: ParsedCommand[];
  errors: ParserError[];
}