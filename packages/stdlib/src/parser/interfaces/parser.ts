/**
 * Core parser interfaces for Sharpee IF Engine
 */

import { Token, TaggedWord, Phrase, ParsedCommand, ParserResult } from './types';

/**
 * Language-specific tokenizer interface
 */
export interface Tokenizer {
  /**
   * Break input text into tokens
   * @param text The text to tokenize
   * @returns Array of tokens
   */
  tokenize(text: string): Token[];
}

/**
 * Language-specific part-of-speech tagger
 */
export interface POSTagger {
  /**
   * Tag tokens with parts of speech
   * @param tokens The tokens to tag
   * @returns Array of tagged words
   */
  tagWords(tokens: Token[]): TaggedWord[];
}

/**
 * Language-specific phrase identifier
 */
export interface PhraseIdentifier {
  /**
   * Identify phrases in tagged words
   * @param taggedWords The tagged words to analyze
   * @returns Array of identified phrases
   */
  identifyPhrases(taggedWords: TaggedWord[]): Phrase[];
}

/**
 * Language-specific grammar analyzer 
 */
export interface GrammarAnalyzer {
  /**
   * Analyze phrases to extract commands
   * @param phrases The phrases to analyze
   * @param taggedWords The tagged words (for context)
   * @returns A parsed command, or null if no valid command could be extracted
   */
  analyzeCommand(phrases: Phrase[], taggedWords: TaggedWord[]): ParsedCommand | null;
}

/**
 * Main parser interface - language agnostic
 */
export interface Parser {
  /**
   * Parse input text into commands
   * @param text The text to parse
   * @returns Parser result with commands and/or errors
   */
  parse(text: string): ParserResult;
}