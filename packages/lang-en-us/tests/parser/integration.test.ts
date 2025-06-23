// packages/lang-en-us/tests/parser/integration.test.ts

import { 
  LanguageProvider, 
  LanguageParserProvider, 
  Parser,
  createParser,
  POSType
} from '@sharpee/core';
import { 
  EnglishLanguageProvider, 
  createEnglishLanguageProvider 
} from '../../src/english-provider';
import {
  CustomizableEnglishProvider,
  createCustomizableEnglishProvider
} from '../../src/customizable-provider';
import { CustomizableEnglishParserProvider } from '../../src/parser/customizable-provider';

describe('Language and Parser Integration', () => {
  let languageProvider: LanguageProvider;
  let parserProvider: LanguageParserProvider;
  let parser: Parser;
  
  beforeEach(() => {
    languageProvider = createEnglishLanguageProvider();
    parserProvider = languageProvider.getParserProvider();
    parser = createParser(parserProvider);
  });
  
  test('parses a simple command', () => {
    const result = parser.parse('take apple');
    
    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].verb).toBe('take');
    expect(result.commands[0].directObject).toBe('apple');
  });
  
  test('can parse using verb synonyms', () => {
    // 'get' is a synonym for 'take'
    const result = parser.parse('get banana');
    
    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].verb).toBe('get');
    expect(result.commands[0].directObject).toBe('banana');
  });
  
  test('customizable language provider works with parser', () => {
    // Create a customizable provider
    const customProvider = createCustomizableEnglishProvider();
    
    // Add a custom verb
    customProvider.addVerbs({
      'zap': {
        canonical: 'zap',
        synonyms: ['blast', 'vaporize']
      }
    });
    
    // Get its parser provider
    const customParserProvider = customProvider.getParserProvider();
    
    // Create a parser with it
    const customParser = createParser(customParserProvider);
    
    // Test with the custom verb
    const result = customParser.parse('zap monster');
    
    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].verb).toBe('zap');
    expect(result.commands[0].directObject).toBe('monster');
  });
  
  test('customizable parser provider can be customized', () => {
    // Create a customizable provider
    const customProvider = createCustomizableEnglishProvider();
    
    // Get its parser provider and cast to customizable type
    const customParserProvider = customProvider.getParserProvider() as CustomizableEnglishParserProvider;
    
    // Add a custom lemmatization rule
    customParserProvider.addLemmatizationRule(/zapping$/, 'zap', [POSType.VERB]);
    
    // Set a custom preprocessor 
    customParserProvider.setPreprocessor((text) => {
      return text.replace(/please /i, '').toLowerCase();
    });
    
    // Create a parser with it
    const customParser = createParser(customParserProvider);
    
    // Test with polite request and custom lemmatization
    const result = customParser.parse('Please try zapping the alien');
    
    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].verb).toBe('try');
    expect(result.commands[0].directObject).toBe('alien');
  });
  
  test('parser handles multiple commands', () => {
    const baseParser = parser as any; // Cast to access parseMultiple
    const result = baseParser.parseMultiple('take apple then drop banana');
    
    expect(result.success).toBe(true);
    expect(result.commands).toHaveLength(2);
    
    expect(result.commands[0].verb).toBe('take');
    expect(result.commands[0].directObject).toBe('apple');
    
    expect(result.commands[1].verb).toBe('drop');
    expect(result.commands[1].directObject).toBe('banana');
  });
});
