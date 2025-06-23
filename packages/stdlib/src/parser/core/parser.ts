// packages/core/src/parser/core/parser.ts

import { ParsedCommand, ParsingResult } from './types';

/**
 * Context information for parsing
 */
/**
   * Parsing context containing information about the game state
   */
  export interface ParsingContext {
    /**
     * Last mentioned singular object for pronoun resolution
     */
    lastMentionedSingular?: string;
    
    /**
     * Last mentioned plural objects for pronoun resolution
     */
    lastMentionedPlural?: string;
    
    /**
     * Current location name
     */
    currentLocation?: string;
    
    /**
     * Objects currently accessible to the player
     */
    accessibleObjects?: string[];
    
    /**
     * Objects in the player's inventory
     */
    inventory?: string[];
    
    /**
     * Any other contextual information needed for parsing
     */
    [key: string]: any;
  }

/**
 * Custom vocabulary for the parser
 */
export interface Vocabulary {
  /**
   * Custom verbs to add to the parser
   */
  verbs?: string[];
  
  /**
   * Custom nouns to add to the parser
   */
  nouns?: string[];
  
  /**
   * Custom adjectives to add to the parser
   */
  adjectives?: string[];
  
  /**
   * Custom adverbs to add to the parser
   */
  adverbs?: string[];
  
  /**
   * Custom synonym mappings
   */
  synonyms?: Record<string, string[]>;
}

/**
 * Interface for a language parser
 */
export interface Parser {
  /**
   * Parse text input into a structured command
   * @param input The input text to parse
   * @param context Optional parsing context
   * @returns A parsing result with the command or error information
   */
  parse(input: string, context?: ParsingContext): ParsingResult;
  
  /**
   * Add custom vocabulary to the parser
   * @param vocabulary The vocabulary to add
   */
  addVocabulary(vocabulary: Vocabulary): void;
  
  /**
   * Reset any temporary parsing context
   */
  resetContext(): void;
}

/**
 * Factory function type for creating parsers
 */
export type ParserFactory = (options?: any) => Parser;

/**
 * Default implementation of the Parser interface
 * Can be used as a base class for language-specific implementations
 */
export abstract class BaseParser implements Parser {
  protected lastContext: ParsingContext = {};
  
  abstract parse(input: string, context?: ParsingContext): ParsingResult;
  
  addVocabulary(vocabulary: Vocabulary): void {
    // To be implemented by subclasses
  }
  
  resetContext(): void {
    this.lastContext = {};
  }
  
  /**
   * Update the last context with information from the latest command
   */
  protected updateContext(command: ParsedCommand): void {
    // Update object references for pronoun resolution
    if (command.directObject) {
      this.lastContext.lastMentionedObject = command.directObject;
    }
  }
  
  /**
   * Create a standard error result
   */
  protected createErrorResult(type: string, message: string): ParsingResult {
    return {
      success: false,
      error: {
        type: type as any,
        message
      }
    };
  }
}

/**
 * Registry of available parsers by language code
 */
export class ParserRegistry {
  private static parsers: Record<string, ParserFactory> = {};
  
  /**
   * Register a parser factory for a language
   * @param languageCode The language code (e.g., 'en-US')
   * @param factory The parser factory function
   */
  static register(languageCode: string, factory: ParserFactory): void {
    ParserRegistry.parsers[languageCode] = factory;
  }
  
  /**
   * Get a parser factory for a language
   * @param languageCode The language code
   * @returns The parser factory or undefined if not found
   */
  static getFactory(languageCode: string): ParserFactory | undefined {
    return ParserRegistry.parsers[languageCode];
  }
  
  /**
   * Create a parser for a language
   * @param languageCode The language code
   * @param options Options to pass to the factory
   * @returns A new parser instance or undefined if language not supported
   */
  static createParser(languageCode: string, options?: any): Parser | undefined {
    const factory = ParserRegistry.getFactory(languageCode);
    if (!factory) return undefined;
    
    return factory(options);
  }
  
  /**
   * Get all supported language codes
   */
  static getSupportedLanguages(): string[] {
    return Object.keys(ParserRegistry.parsers);
  }
}

/**
 * Get a parser for the default language
 */
export function getDefaultParser(options?: any): Parser | undefined {
  return ParserRegistry.createParser('en-US', options);
}

export { ParsingResult };
