// packages/lang-en-us/tests/parser/tokenizer.test.ts

import { TokenType } from '@sharpee/core';
import { EnglishTokenizer } from '../../src/parser/tokenizer';

describe('EnglishTokenizer', () => {
  test('tokenizes basic words', () => {
    const tokenizer = new EnglishTokenizer();
    const tokens = tokenizer.tokenize('take the apple');
    
    expect(tokens.length).toBe(3);
    expect(tokens[0].value).toBe('take');
    expect(tokens[0].type).toBe(TokenType.WORD);
    expect(tokens[1].value).toBe('the');
    expect(tokens[2].value).toBe('apple');
  });
  
  test('handles punctuation', () => {
    const tokenizer = new EnglishTokenizer();
    const tokens = tokenizer.tokenize('look at the box, then open it.');
    
    // 'look at' should be a compound verb if compound verbs are enabled
    expect(tokens.some(t => t.value === 'look at')).toBe(true);
    
    // Check for comma and period
    const comma = tokens.find(t => t.value === ',');
    const period = tokens.find(t => t.value === '.');
    
    expect(comma).toBeDefined();
    expect(comma?.type).toBe(TokenType.PUNCTUATION);
    expect(period).toBeDefined();
    expect(period?.type).toBe(TokenType.PUNCTUATION);
  });
  
  test('handles contractions', () => {
    const tokenizer = new EnglishTokenizer();
    const tokens = tokenizer.tokenize("I don't want to");
    
    // Find the contraction token
    const contraction = tokens.find(t => t.value === "don't");
    
    expect(contraction).toBeDefined();
    expect(contraction?.type).toBe(TokenType.WORD);
    expect(contraction?.expansion).toBe('do not');
  });
  
  test('recognizes compound verbs', () => {
    const tokenizer = new EnglishTokenizer();
    const tokens = tokenizer.tokenize('pick up the red apple');
    
    // The first token should be the compound verb "pick up"
    expect(tokens[0].value).toBe('pick up');
    expect(tokens[0].type).toBe(TokenType.WORD);
    expect(tokens[0].isCompound).toBe(true);
    
    // The rest should be individual tokens
    expect(tokens[1].value).toBe('the');
    expect(tokens[2].value).toBe('red');
    expect(tokens[3].value).toBe('apple');
  });
  
  test('handles custom compound verbs', () => {
    const tokenizer = new EnglishTokenizer();
    
    // Add a custom compound verb
    tokenizer.addCompoundVerb('jump over');
    
    const tokens = tokenizer.tokenize('jump over the fence');
    
    // The first token should be the compound verb "jump over"
    expect(tokens[0].value).toBe('jump over');
    expect(tokens[0].type).toBe(TokenType.WORD);
    expect(tokens[0].isCompound).toBe(true);
  });
  
  test('disables compound verb recognition when requested', () => {
    const tokenizer = new EnglishTokenizer({ recognizeCompoundVerbs: false });
    const tokens = tokenizer.tokenize('pick up the red apple');
    
    // Should be individual tokens
    expect(tokens[0].value).toBe('pick');
    expect(tokens[1].value).toBe('up');
    expect(tokens[0].isCompound).toBeUndefined();
  });
  
  test('disables contraction handling when requested', () => {
    const tokenizer = new EnglishTokenizer({ handleContractions: false });
    const tokens = tokenizer.tokenize("don't take it");
    
    // Find the contraction token
    const contraction = tokens.find(t => t.value === "don't");
    
    expect(contraction).toBeDefined();
    expect(contraction?.expansion).toBeUndefined(); // No expansion should be added
  });
  
  test('handles quotations', () => {
    const tokenizer = new EnglishTokenizer();
    const tokens = tokenizer.tokenize('say "hello world" to the guard');
    
    // Find the quoted text
    const quotedText = tokens.find(t => t.type === TokenType.QUOTED);
    
    expect(quotedText).toBeDefined();
    expect(quotedText?.value).toBe('"hello world"');
  });
  
  test('handles numbers', () => {
    const tokenizer = new EnglishTokenizer();
    const tokens = tokenizer.tokenize('take 5 apples');
    
    // Find the number
    const number = tokens.find(t => t.type === TokenType.NUMBER);
    
    expect(number).toBeDefined();
    expect(number?.value).toBe('5');
  });
  
  test('returns compound verbs list', () => {
    const tokenizer = new EnglishTokenizer();
    const compoundVerbs = tokenizer.getCompoundVerbs();
    
    expect(compoundVerbs.length).toBeGreaterThan(0);
    expect(compoundVerbs).toContain('pick up');
    expect(compoundVerbs).toContain('look at');
  });
});
