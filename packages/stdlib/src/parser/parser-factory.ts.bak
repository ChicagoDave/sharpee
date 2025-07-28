/**
 * Parser Factory
 * 
 * Creates language-specific parser instances.
 * The actual parser implementations are in separate packages
 * and must be registered before use.
 */

import { Parser } from './parser-types';

/**
 * Registry of parser constructors
 * Language providers are passed as 'any' to avoid coupling
 */
type ParserConstructor = new (languageProvider: any) => Parser;

const parserRegistry = new Map<string, ParserConstructor>();

/**
 * Parser factory for creating language-specific parsers
 */
export class ParserFactory {
  /**
   * Register a parser implementation for a language
   * 
   * @example
   * import { EnglishParser } from '@sharpee/parser-en-us';
   * ParserFactory.registerParser('en-US', EnglishParser);
   */
  static registerParser(languageCode: string, parserClass: ParserConstructor): void {
    const normalized = languageCode.toLowerCase();
    parserRegistry.set(normalized, parserClass);
    
    // Also register without region code
    const langOnly = normalized.split('-')[0];
    if (langOnly !== normalized && !parserRegistry.has(langOnly)) {
      parserRegistry.set(langOnly, parserClass);
    }
  }
  
  /**
   * Create a parser for the specified language
   * 
   * @throws Error if no parser is registered for the language
   */
  static createParser(languageCode: string, languageProvider: any): Parser {
    const normalized = languageCode.toLowerCase();
    
    // Try exact match first
    let ParserClass = parserRegistry.get(normalized);
    
    // Try language without region
    if (!ParserClass) {
      const langOnly = normalized.split('-')[0];
      ParserClass = parserRegistry.get(langOnly);
    }
    
    if (!ParserClass) {
      const available = Array.from(parserRegistry.keys()).sort();
      throw new Error(
        `No parser registered for language: ${languageCode}. ` +
        `Available languages: ${available.join(', ')}. ` +
        `Register a parser using ParserFactory.registerParser().`
      );
    }
    
    return new ParserClass(languageProvider);
  }
  
  /**
   * Get list of registered language codes
   */
  static getRegisteredLanguages(): string[] {
    return Array.from(parserRegistry.keys()).sort();
  }
  
  /**
   * Check if a parser is registered for a language
   */
  static isLanguageRegistered(languageCode: string): boolean {
    const normalized = languageCode.toLowerCase();
    if (parserRegistry.has(normalized)) return true;
    
    const langOnly = normalized.split('-')[0];
    return parserRegistry.has(langOnly);
  }
  
  /**
   * Clear all registered parsers (mainly for testing)
   */
  static clearRegistry(): void {
    parserRegistry.clear();
  }
}
