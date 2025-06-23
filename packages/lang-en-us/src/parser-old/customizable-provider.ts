/**
 * Customizable English Parser Provider for Sharpee IF Engine
 */

import { LanguageParserProvider, ParsedCommand, POSType } from '@sharpee/core';
import { EnglishParserProvider, EnglishParserProviderOptions } from './index';
import { EnglishLemmatizer, LemmatizationRule } from './lemmatizer';

/**
 * Author-customizable extension of the English parser provider
 * This provider allows authors to customize parsing behavior
 * while maintaining the standard English parsing functionality.
 */
export class CustomizableEnglishParserProvider extends EnglishParserProvider {
  private customLemmatizer: EnglishLemmatizer;
  private customPreprocessor?: (text: string) => string;
  private customPostprocessor?: (command: ParsedCommand) => ParsedCommand;
  
  /**
   * Create a new customizable English parser provider
   * @param options Configuration options
   */
  constructor(options: EnglishParserProviderOptions = {}) {
    super(options);
    this.customLemmatizer = new EnglishLemmatizer();
  }
  
  /**
   * Lemmatize a word with custom rules
   * @param word The word to lemmatize
   * @param posTag The part of speech of the word
   * @returns The lemmatized form of the word
   */
  override lemmatize(word: string, posTag: POSType): string {
    return this.customLemmatizer.lemmatize(word, posTag);
  }
  
  /**
   * Set a custom input preprocessor
   * @param preprocessor Function to preprocess input text
   */
  setPreprocessor(preprocessor: (text: string) => string): void {
    this.customPreprocessor = preprocessor;
  }
  
  /**
   * Preprocess input text with custom function if available
   * @param text The text to preprocess
   * @returns The preprocessed text
   */
  override preprocessInput(text: string): string {
    if (this.customPreprocessor) {
      return this.customPreprocessor(text);
    }
    return super.preprocessInput(text);
  }
  
  /**
   * Set a custom command postprocessor
   * @param postprocessor Function to postprocess parsed commands
   */
  setPostprocessor(postprocessor: (command: ParsedCommand) => ParsedCommand): void {
    this.customPostprocessor = postprocessor;
  }
  
  /**
   * Postprocess a command with custom function if available
   * @param command The command to postprocess
   * @returns The postprocessed command
   */
  override postprocessCommand(command: ParsedCommand): ParsedCommand {
    const baseResult = super.postprocessCommand(command);
    if (this.customPostprocessor) {
      return this.customPostprocessor(baseResult);
    }
    return baseResult;
  }
  
  /**
   * Add a custom lemmatization rule
   * @param pattern The pattern to match
   * @param replacement The replacement string
   * @param appliesTo Parts of speech this rule applies to
   */
  addLemmatizationRule(pattern: RegExp, replacement: string, appliesTo: POSType[]): void {
    this.customLemmatizer.addRule(pattern, replacement, appliesTo);
  }
  
  /**
   * Get all current lemmatization rules
   * @returns Array of lemmatization rules
   */
  getLemmatizationRules(): LemmatizationRule[] {
    return this.customLemmatizer.getRules();
  }
  
  /**
   * Reset to default lemmatization rules
   */
  resetLemmatizationRules(): void {
    this.customLemmatizer.resetRules();
  }
}

/**
 * Create a new customizable English parser provider
 * @param options Configuration options
 * @returns A new customizable English parser provider instance
 */
export function createCustomizableEnglishParserProvider(
  options?: EnglishParserProviderOptions
): CustomizableEnglishParserProvider {
  return new CustomizableEnglishParserProvider(options);
}