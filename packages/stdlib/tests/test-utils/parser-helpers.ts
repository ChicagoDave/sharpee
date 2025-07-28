/**
 * Parser integration helpers for testing
 * 
 * These helpers use the LanguageProvider interface from if-domain,
 * allowing tests to swap languages and parser implementations.
 */

import { EnglishParser } from '@sharpee/parser-en-us';
import { WorldModel } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import EnglishLanguageProvider from '@sharpee/lang-en-us';
import type { ParsedCommand } from '@sharpee/world-model';

/**
 * Creates a parser with the specified language provider
 * @param world The world model
 * @param languageProvider The language provider (defaults to English)
 * @returns A configured parser instance
 */
export function createParserWithLanguage(
  world: WorldModel, 
  languageProvider: LanguageProvider = EnglishLanguageProvider
): EnglishParser {
  // Create the parser with the language provider
  const parser = new EnglishParser(languageProvider);
  
  return parser;
}

/**
 * Creates a parser with the world model (defaults to English)
 */
export function createParserWithWorld(world: WorldModel): EnglishParser {
  return createParserWithLanguage(world, EnglishLanguageProvider);
}

/**
 * Parses a command string using the specified language
 * @param input The command string to parse
 * @param world The world model
 * @param languageProvider The language provider (defaults to English)
 * @returns The parsed command or null if parsing failed
 */
export function parseCommandWithLanguage(
  input: string, 
  world: WorldModel,
  languageProvider: LanguageProvider = EnglishLanguageProvider
): ParsedCommand | null {
  const parser = createParserWithLanguage(world, languageProvider);
  const result = parser.parse(input);
  
  if (result.success) {
    return result.value;
  }
  
  return null;
}

/**
 * Parses a command string using the parser (defaults to English)
 */
export function parseCommand(input: string, world: WorldModel): ParsedCommand | null {
  return parseCommandWithLanguage(input, world, EnglishLanguageProvider);
}

/**
 * Creates a properly formatted parsed command for testing
 * This mimics what the parser would produce
 */
export function createParsedCommand(
  action: string,
  directObject?: { text: string; modifiers?: string[]; candidates?: string[] },
  preposition?: string,
  indirectObject?: { text: string; modifiers?: string[]; candidates?: string[] }
): ParsedCommand {
  const structure: any = {
    verb: { 
      tokens: [0], 
      text: action.toLowerCase(), 
      head: action.toLowerCase() 
    }
  };
  
  let tokenIndex = 1;
  
  if (directObject) {
    structure.directObject = {
      tokens: [tokenIndex],
      text: directObject.text,
      head: directObject.text.split(' ').pop() || directObject.text,
      modifiers: directObject.modifiers || [],
      articles: [],
      determiners: [],
      candidates: directObject.candidates || [directObject.text]
    };
    tokenIndex++;
  }
  
  if (preposition && indirectObject) {
    structure.preposition = {
      tokens: [tokenIndex],
      text: preposition
    };
    tokenIndex++;
    
    structure.indirectObject = {
      tokens: [tokenIndex],
      text: indirectObject.text,
      head: indirectObject.text.split(' ').pop() || indirectObject.text,
      modifiers: indirectObject.modifiers || [],
      articles: [],
      determiners: [],
      candidates: indirectObject.candidates || [indirectObject.text]
    };
  }
  
  let pattern = 'VERB_ONLY';
  if (directObject && indirectObject) {
    pattern = 'VERB_NOUN_PREP_NOUN';
  } else if (directObject) {
    pattern = 'VERB_NOUN';
  }
  
  return {
    rawInput: [
      action,
      directObject?.text,
      preposition,
      indirectObject?.text
    ].filter(Boolean).join(' '),
    tokens: [],
    structure,
    pattern,
    confidence: 1.0,
    action
  };
}

/**
 * Mock language provider for testing
 * Useful for testing parser behavior with custom vocabulary
 */
export class MockLanguageProvider implements LanguageProvider {
  readonly languageCode = 'mock';
  private messages = new Map<string, string>();
  private patterns = new Map<string, string[]>();

  constructor(
    messages: Record<string, string> = {},
    patterns: Record<string, string[]> = {}
  ) {
    Object.entries(messages).forEach(([key, value]) => {
      this.messages.set(key, value);
    });
    
    Object.entries(patterns).forEach(([key, value]) => {
      this.patterns.set(key, value);
    });
  }

  getMessage(messageId: string, params?: Record<string, any>): string {
    let message = this.messages.get(messageId);
    
    if (!message) {
      return messageId;
    }
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        message = message!.replace(new RegExp(placeholder, 'g'), String(value));
      });
    }
    
    return message;
  }

  hasMessage(messageId: string): boolean {
    return this.messages.has(messageId);
  }

  getActionPatterns(actionId: string): string[] | undefined {
    return this.patterns.get(actionId);
  }

  getActionHelp(actionId: string): undefined {
    // Not implemented for mock
    return undefined;
  }

  getSupportedActions(): string[] {
    return Array.from(this.patterns.keys());
  }
}
