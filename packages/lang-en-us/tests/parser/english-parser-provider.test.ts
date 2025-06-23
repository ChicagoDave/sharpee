// packages/lang-en-us/tests/parser/english-parser-provider.test.ts

import { POSType } from '@sharpee/core';
import { EnglishParserProvider } from '../../src/parser';

describe('EnglishParserProvider', () => {
  let provider: EnglishParserProvider;
  
  beforeEach(() => {
    provider = new EnglishParserProvider();
  });
  
  test('returns initialized components', () => {
    expect(provider.getTokenizer()).toBeDefined();
    expect(provider.getPOSTagger()).toBeDefined();
    expect(provider.getPhraseIdentifier()).toBeDefined();
    expect(provider.getGrammarAnalyzer()).toBeDefined();
  });
  
  test('preprocesses input text', () => {
    const result = provider.preprocessInput('TAKE THE RED APPLE');
    expect(result).toBe('take the red apple');
  });
  
  test('lemmatizes words correctly', () => {
    // Test verb lemmatization
    expect(provider.lemmatize('taking', POSType.VERB)).toBe('take');
    expect(provider.lemmatize('goes', POSType.VERB)).toBe('go');
    expect(provider.lemmatize('went', POSType.VERB)).toBe('go');
    
    // Test noun lemmatization
    expect(provider.lemmatize('apples', POSType.NOUN)).toBe('apple');
    expect(provider.lemmatize('boxes', POSType.NOUN)).toBe('box');
    
    // Test words that don't need lemmatization
    expect(provider.lemmatize('the', POSType.ARTICLE)).toBe('the');
    expect(provider.lemmatize('red', POSType.ADJECTIVE)).toBe('red');
  });
  
  test('end-to-end parsing works with simple command', () => {
    // Create tokens using the tokenizer
    const tokens = provider.getTokenizer().tokenize('take apple');
    
    // Tag words using the POS tagger
    const taggedWords = provider.getPOSTagger().tagWords(tokens);
    
    // Identify phrases using the phrase identifier
    const phrases = provider.getPhraseIdentifier().identifyPhrases(taggedWords);
    
    // Analyze command using the grammar analyzer
    const command = provider.getGrammarAnalyzer().analyzeCommand(phrases, taggedWords);
    
    // Post-process the command
    const finalCommand = provider.postprocessCommand(command!);
    
    // Verify the parsed command
    expect(finalCommand).toBeDefined();
    expect(finalCommand.verb).toBe('take');
    expect(finalCommand.directObject).toBe('apple');
  });
  
  test('end-to-end parsing works with complex command', () => {
    // Parse a more complex command with prepositions and adjectives
    const tokens = provider.getTokenizer().tokenize('put the red book on the old wooden shelf');
    const taggedWords = provider.getPOSTagger().tagWords(tokens);
    const phrases = provider.getPhraseIdentifier().identifyPhrases(taggedWords);
    const command = provider.getGrammarAnalyzer().analyzeCommand(phrases, taggedWords);
    const finalCommand = provider.postprocessCommand(command!);
    
    // Verify the parsed command
    expect(finalCommand).toBeDefined();
    expect(finalCommand.verb).toBe('put');
    expect(finalCommand.directObject).toBe('book');
    expect(finalCommand.adjectives).toContain('red');
    expect(finalCommand.preposition).toBe('on');
    expect(finalCommand.indirectObject).toBe('shelf');
  });
  
  test('handles compound verbs', () => {
    const tokens = provider.getTokenizer().tokenize('pick up the key');
    const taggedWords = provider.getPOSTagger().tagWords(tokens);
    const phrases = provider.getPhraseIdentifier().identifyPhrases(taggedWords);
    const command = provider.getGrammarAnalyzer().analyzeCommand(phrases, taggedWords);
    
    expect(command).toBeDefined();
    expect(command!.verb.toLowerCase()).toBe('pick up');
    expect(command!.directObject).toBe('key');
  });
  
  test('handles commands without objects', () => {
    const tokens = provider.getTokenizer().tokenize('wait');
    const taggedWords = provider.getPOSTagger().tagWords(tokens);
    const phrases = provider.getPhraseIdentifier().identifyPhrases(taggedWords);
    const command = provider.getGrammarAnalyzer().analyzeCommand(phrases, taggedWords);
    
    expect(command).toBeDefined();
    expect(command!.verb).toBe('wait');
    expect(command!.directObject).toBeUndefined();
  });
});