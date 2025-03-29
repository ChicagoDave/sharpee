// packages/core/src/parser/core/__tests__/tokenizer.test.ts

import { Tokenizer, createTokenizer } from '../tokenizer';
import { TokenType } from '../types';

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = createTokenizer();
  });

  describe('basic tokenization', () => {
    it('should tokenize a simple command', () => {
      const input = 'take the red key';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(4);
      expect(tokens[0].text).toBe('take');
      expect(tokens[0].type).toBe(TokenType.WORD);
      expect(tokens[0].normalized).toBe('take');
      
      expect(tokens[1].text).toBe('the');
      expect(tokens[1].type).toBe(TokenType.WORD);
      
      expect(tokens[3].text).toBe('key');
      expect(tokens[3].type).toBe(TokenType.WORD);
    });

    it('should handle punctuation', () => {
      const input = 'open the door, then go north.';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(7);
      expect(tokens[2].text).toBe('door');
      expect(tokens[3].text).toBe(',');
      expect(tokens[3].type).toBe(TokenType.PUNCTUATION);
      expect(tokens[6].text).toBe('.');
      expect(tokens[6].type).toBe(TokenType.PUNCTUATION);
    });

    it('should handle numbers', () => {
      const input = 'turn dial to 42';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(4);
      expect(tokens[3].text).toBe('42');
      expect(tokens[3].type).toBe(TokenType.NUMBER);
      expect(tokens[3].normalized).toBe('42');
    });

    it('should handle quoted text', () => {
      const input = 'say "hello there"';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(2);
      expect(tokens[1].text).toBe('"hello there"');
      expect(tokens[1].type).toBe(TokenType.QUOTED);
      expect(tokens[1].normalized).toBe('hello there');
    });
  });

  describe('advanced features', () => {
    it('should handle contractions', () => {
      const input = "don't take the lamp";
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(4);
      expect(tokens[0].text).toBe("don't");
      expect(tokens[0].type).toBe(TokenType.WORD);
    });

    it('should handle hyphenated words', () => {
      const input = 'examine well-crafted sword';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(3);
      expect(tokens[1].text).toBe('well-crafted');
      expect(tokens[1].type).toBe(TokenType.WORD);
    });

    it('should include whitespace when configured', () => {
      const tokenizerWithWhitespace = createTokenizer({ includeWhitespace: true });
      const input = 'look  around';
      const tokens = tokenizerWithWhitespace.tokenize(input);
      
      expect(tokens.length).toBe(3);
      expect(tokens[1].text).toBe('  ');
      expect(tokens[1].type).toBe(TokenType.WHITESPACE);
    });

    it('should handle custom patterns', () => {
      const customTokenizer = createTokenizer({
        customPatterns: [
          { pattern: /^#\w+/, type: TokenType.WORD } // Handle hashtags
        ]
      });
      
      const input = 'look at #treasure';
      const tokens = customTokenizer.tokenize(input);
      
      expect(tokens.length).toBe(3);
      expect(tokens[2].text).toBe('#treasure');
      expect(tokens[2].type).toBe(TokenType.WORD);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      const tokens = tokenizer.tokenize('');
      expect(tokens.length).toBe(0);
    });

    it('should handle unknown characters', () => {
      const input = 'look @';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(2);
      expect(tokens[1].text).toBe('@');
      expect(tokens[1].type).toBe(TokenType.UNKNOWN);
    });

    it('should handle multiple consecutive punctuations', () => {
      const input = 'wow!!!';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(4);
      expect(tokens[0].text).toBe('wow');
      expect(tokens[1].text).toBe('!');
      expect(tokens[2].text).toBe('!');
      expect(tokens[3].text).toBe('!');
    });
  });

  describe('runtime configuration', () => {
    it('should allow adding patterns after creation', () => {
      tokenizer.addPattern(/^@\w+/, TokenType.WORD); // Handle mentions
      
      const input = 'tell @guard about the key';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(5);
      expect(tokens[1].text).toBe('@guard');
      expect(tokens[1].type).toBe(TokenType.WORD);
    });

    it('should allow toggling whitespace inclusion', () => {
      tokenizer.setIncludeWhitespace(true);
      
      const input = 'look  north';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens.length).toBe(3);
      expect(tokens[1].type).toBe(TokenType.WHITESPACE);
      
      tokenizer.setIncludeWhitespace(false);
      const tokens2 = tokenizer.tokenize(input);
      expect(tokens2.length).toBe(2);
    });

    it('should allow toggling normalization', () => {
      tokenizer.setNormalizeTokens(false);
      
      const input = 'Look North';
      const tokens = tokenizer.tokenize(input);
      
      expect(tokens[0].text).toBe('Look');
      expect(tokens[0].normalized).toBeUndefined();
      
      tokenizer.setNormalizeTokens(true);
      const tokens2 = tokenizer.tokenize(input);
      expect(tokens2[0].normalized).toBe('look');
    });
  });
});