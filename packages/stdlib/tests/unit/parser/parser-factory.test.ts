/**
 * Tests for Parser Factory
 */

import { ParserFactory, Parser, LanguageProvider } from '../../../src';

// Mock parser implementation
class MockParser implements Parser {
  constructor(public languageProvider: LanguageProvider) {}
  
  parse(input: string) {
    return {
      success: true as const,
      value: {
        rawInput: input,
        tokens: [],
        structure: {
          verb: { tokens: [], text: 'mock', head: 'mock' }
        },
        pattern: 'MOCK',
        confidence: 1.0,
        action: 'mock.action'
      }
    };
  }
  
  tokenize(input: string) {
    return [];
  }
  
  setDebugCallback(callback: (event: any) => void) {
    // Mock implementation
  }
}

// Mock language provider
class MockLanguageProvider implements LanguageProvider {
  languageCode = 'mock';
  languageName = 'Mock Language';
  textDirection = 'ltr' as const;
  
  getVerbs() { return []; }
  getDirections() { return []; }
  getSpecialVocabulary() { 
    return { articles: [], pronouns: [], allWords: [], exceptWords: [] };
  }
  getCommonAdjectives() { return []; }
  getCommonNouns() { return []; }
  getPrepositions() { return []; }
  getGrammarPatterns() { return []; }
  lemmatize(word: string) { return word; }
  expandAbbreviation(abbr: string) { return null; }
  formatList(items: string[]) { return items.join(', '); }
  getIndefiniteArticle(noun: string) { return 'a'; }
  pluralize(noun: string) { return noun + 's'; }
  isIgnoreWord(word: string) { return false; }
}

describe('ParserFactory', () => {
  beforeEach(() => {
    ParserFactory.clearRegistry();
  });

  describe('registerParser', () => {
    test('should register a parser for a language', () => {
      ParserFactory.registerParser('mock-lang', MockParser);
      
      expect(ParserFactory.isLanguageRegistered('mock-lang')).toBe(true);
      expect(ParserFactory.getRegisteredLanguages()).toContain('mock-lang');
    });

    test('should register both full code and language-only code', () => {
      ParserFactory.registerParser('en-US', MockParser);
      
      expect(ParserFactory.isLanguageRegistered('en-US')).toBe(true);
      expect(ParserFactory.isLanguageRegistered('en')).toBe(true);
      expect(ParserFactory.getRegisteredLanguages()).toContain('en-us');
      expect(ParserFactory.getRegisteredLanguages()).toContain('en');
    });

    test('should handle case-insensitive language codes', () => {
      ParserFactory.registerParser('EN-US', MockParser);
      
      expect(ParserFactory.isLanguageRegistered('en-us')).toBe(true);
      expect(ParserFactory.isLanguageRegistered('EN-US')).toBe(true);
    });
  });

  describe('createParser', () => {
    test('should create a parser for registered language', () => {
      const langProvider = new MockLanguageProvider();
      ParserFactory.registerParser('mock', MockParser);
      
      const parser = ParserFactory.createParser('mock', langProvider);
      
      expect(parser).toBeInstanceOf(MockParser);
      expect((parser as any).languageProvider).toBe(langProvider);
    });

    test('should find parser by language code without region', () => {
      const langProvider = new MockLanguageProvider();
      ParserFactory.registerParser('en-US', MockParser);
      
      const parser = ParserFactory.createParser('en', langProvider);
      
      expect(parser).toBeInstanceOf(MockParser);
    });

    test('should throw error for unregistered language', () => {
      const langProvider = new MockLanguageProvider();
      
      expect(() => {
        ParserFactory.createParser('unknown', langProvider);
      }).toThrow('No parser registered for language: unknown');
    });

    test('should list available languages in error message', () => {
      ParserFactory.registerParser('en-US', MockParser);
      ParserFactory.registerParser('es', MockParser);
      
      const langProvider = new MockLanguageProvider();
      
      expect(() => {
        ParserFactory.createParser('ja', langProvider);
      }).toThrow(/Available languages: en, en-us, es/);
    });
  });

  describe('getRegisteredLanguages', () => {
    test('should return empty array when no parsers registered', () => {
      expect(ParserFactory.getRegisteredLanguages()).toEqual([]);
    });

    test('should return sorted list of registered languages', () => {
      ParserFactory.registerParser('es', MockParser);
      ParserFactory.registerParser('en-US', MockParser);
      ParserFactory.registerParser('ja', MockParser);
      
      const languages = ParserFactory.getRegisteredLanguages();
      
      expect(languages).toEqual(['en', 'en-us', 'es', 'ja']);
    });
  });

  describe('isLanguageRegistered', () => {
    test('should return false for unregistered language', () => {
      expect(ParserFactory.isLanguageRegistered('unknown')).toBe(false);
    });

    test('should return true for registered language', () => {
      ParserFactory.registerParser('test', MockParser);
      
      expect(ParserFactory.isLanguageRegistered('test')).toBe(true);
    });

    test('should check language-only code as fallback', () => {
      ParserFactory.registerParser('en-US', MockParser);
      
      expect(ParserFactory.isLanguageRegistered('en-GB')).toBe(true);
    });
  });

  describe('clearRegistry', () => {
    test('should remove all registered parsers', () => {
      ParserFactory.registerParser('en', MockParser);
      ParserFactory.registerParser('es', MockParser);
      
      expect(ParserFactory.getRegisteredLanguages().length).toBe(2);
      
      ParserFactory.clearRegistry();
      
      expect(ParserFactory.getRegisteredLanguages().length).toBe(0);
    });
  });
});
