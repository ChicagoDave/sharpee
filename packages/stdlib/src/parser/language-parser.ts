/**
 * Language Parser Provider Interface for Sharpee IF Engine
 */

import {
  Tokenizer,
  POSTagger,
  PhraseIdentifier,
  GrammarAnalyzer,
  ParsedCommand,
  POSType
} from './interfaces';

/**
 * Interface for language-specific parser components
 */
export interface LanguageParserProvider {
  /**
   * Get the tokenizer for this language
   */
  getTokenizer(): Tokenizer;
  
  /**
   * Get the POS tagger for this language
   */
  getPOSTagger(): POSTagger;
  
  /**
   * Get the phrase identifier for this language
   */
  getPhraseIdentifier(): PhraseIdentifier;
  
  /**
   * Get the grammar analyzer for this language
   */
  getGrammarAnalyzer(): GrammarAnalyzer;
  
  /**
   * Lemmatize a word (convert to base form)
   * @param word The word to lemmatize
   * @param posTag The part of speech of the word
   * @returns The lemmatized form of the word
   */
  lemmatize(word: string, posTag: POSType): string;
  
  /**
   * Preprocess input text before parsing
   * @param text The text to preprocess
   * @returns The preprocessed text
   */
  preprocessInput(text: string): string;
  
  /**
   * Post-process a parsed command for language-specific adjustments
   * @param command The command to post-process
   * @returns The post-processed command
   */
  postprocessCommand(command: ParsedCommand): ParsedCommand;
}