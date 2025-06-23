/**
 * Language system types for Sharpee
 */

import { IFLanguageProvider } from '../language/if-language-provider';
import { IFParser } from '../parser/if-parser';
import { GrammarPattern } from '../parser/grammar-builder';

/**
 * Supported language codes
 */
export enum SupportedLanguage {
  EN_US = 'en-US',
  EN_GB = 'en-GB',
  // Add more languages as they are implemented
}

// Export convenient constants
export const US_EN = SupportedLanguage.EN_US;
export const UK_EN = SupportedLanguage.EN_GB;

/**
 * Language plugin definition
 */
export interface LanguagePlugin {
  /**
   * The language code this plugin provides
   */
  code: SupportedLanguage;
  
  /**
   * Human-readable name
   */
  name: string;
  
  /**
   * Create a language provider instance
   */
  createProvider(options?: LanguageOptions): IFLanguageProvider;
  
  /**
   * Get parser configuration for this language
   */
  getParserConfig(): any;
  
  /**
   * Get language-specific data
   */
  getLanguageData(): any;
  
  /**
   * Get grammar patterns for this language
   */
  getGrammarPatterns(): GrammarPattern[];
}

/**
 * Options for configuring a language instance
 */
export interface LanguageOptions {
  /**
   * Custom message overrides
   */
  messages?: Record<string, string>;
  
  /**
   * Custom verb mappings
   */
  verbs?: Record<string, string[]>;
  
  /**
   * Parser options
   */
  parserOptions?: any;
}

/**
 * A configured language instance
 */
export interface LanguageInstance {
  /**
   * The language definition
   */
  definition: {
    code: SupportedLanguage;
    name: string;
  };
  
  /**
   * Format a message with parameters
   */
  formatMessage(key: string, ...params: any[]): string;
  
  /**
   * Get parser configuration
   */
  getParserConfig(): any;
  
  /**
   * Get language data
   */
  getLanguageData(): any;
  
  /**
   * Get grammar patterns
   */
  getGrammarPatterns(): GrammarPattern[];
  
  /**
   * Get the underlying language provider
   */
  getProvider(): IFLanguageProvider;
}

/**
 * Implementation of a language instance
 */
export class LanguageInstanceImpl implements LanguageInstance {
  definition: {
    code: SupportedLanguage;
    name: string;
  };
  
  private provider: IFLanguageProvider;
  private plugin: LanguagePlugin;
  
  constructor(plugin: LanguagePlugin, options: LanguageOptions = {}) {
    this.plugin = plugin;
    this.definition = {
      code: plugin.code,
      name: plugin.name
    };
    this.provider = plugin.createProvider(options);
  }
  
  formatMessage(key: string, ...params: any[]): string {
    return this.provider.formatMessage(key, params);
  }
  
  getParserConfig(): any {
    return this.plugin.getParserConfig();
  }
  
  getLanguageData(): any {
    return this.plugin.getLanguageData();
  }
  
  getGrammarPatterns(): GrammarPattern[] {
    return this.plugin.getGrammarPatterns();
  }
  
  getProvider(): IFLanguageProvider {
    return this.provider;
  }
}
