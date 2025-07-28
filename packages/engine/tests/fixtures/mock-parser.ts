/**
 * Mock Parser for Testing
 * 
 * Provides a simple parser implementation for tests that mimics
 * the behavior of the English parser without requiring the actual package
 */

import { Parser, ParseResult, ParsedCommand } from '@sharpee/stdlib';
import { LanguageProvider } from '@sharpee/stdlib';

export class MockParser implements Parser {
  constructor(private languageProvider: LanguageProvider) {}

  parse(input: string): ParseResult {
    // Simple mock parsing logic
    const trimmed = input.trim().toLowerCase();
    
    if (!trimmed) {
      return {
        success: false,
        error: {
          type: 'EMPTY_INPUT',
          message: 'No command entered'
        }
      };
    }

    // Split into words
    const words = trimmed.split(/\s+/);
    const verb = words[0];
    
    // Check if verb exists in language provider
    const verbs = this.languageProvider.getVocabulary()?.verbs || {};
    const verbEntry = Object.entries(verbs).find(([key, data]) => 
      data.words.includes(verb)
    );

    if (!verbEntry) {
      return {
        success: false,
        error: {
          type: 'UNKNOWN_VERB',
          message: `Unknown verb: ${verb}`
        }
      };
    }

    // Create parsed command
    const parsed: ParsedCommand = {
      action: verbEntry[0], // Use the verb key as action
      rawInput: input,
      verb: {
        word: verb,
        canonical: verbEntry[0]
      }
    };

    // Add direct object if present
    if (words.length > 1) {
      parsed.directObject = {
        text: words.slice(1).join(' '),
        words: words.slice(1)
      };
    }

    return {
      success: true,
      value: parsed
    };
  }
}

/**
 * Factory function to create a mock parser
 */
export function createMockParser(languageProvider: LanguageProvider): Parser {
  return new MockParser(languageProvider);
}
