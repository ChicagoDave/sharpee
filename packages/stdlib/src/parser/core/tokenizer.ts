// packages/core/src/parser/core/tokenizer.ts

import { Token, TokenType } from './types';

/**
 * Options for configuring the tokenizer behavior
 */
export interface TokenizerOptions {
  /**
   * Whether to include whitespace as tokens
   */
  includeWhitespace?: boolean;
  
  /**
   * Whether to normalize tokens (lowercase, etc.)
   */
  normalizeTokens?: boolean;
  
  /**
   * Custom token patterns to recognize
   */
  customPatterns?: Array<{
    pattern: RegExp;
    type: TokenType;
  }>;
}

/**
 * Default tokenizer options
 */
const DEFAULT_OPTIONS: TokenizerOptions = {
  includeWhitespace: false,
  normalizeTokens: true,
  customPatterns: []
};

/**
 * Core tokenizer implementation for parsing interactive fiction commands
 */
export class Tokenizer {
  private options: TokenizerOptions;
  
  // Core token patterns
  private patterns: Array<{
    pattern: RegExp;
    type: TokenType;
  }>;
  
  /**
   * Creates a new tokenizer with the specified options
   * @param options Configuration options
   */
  constructor(options: TokenizerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Initialize basic patterns
    this.patterns = [
      // Numbers (integers and decimals)
      { pattern: /^\d+(\.\d+)?/, type: TokenType.NUMBER },
      
      // Quoted text
      { pattern: /^"([^"]*)"/, type: TokenType.QUOTED },
      { pattern: /^'([^']*)'/, type: TokenType.QUOTED },
      
      // Punctuation
      { pattern: /^[.,;:!?()[\]{}]/, type: TokenType.PUNCTUATION },
      
      // Whitespace
      { pattern: /^\s+/, type: TokenType.WHITESPACE },
      
      // Words (including hyphenated words and apostrophes)
      { pattern: /^[a-zA-Z]+-?[a-zA-Z]*/, type: TokenType.WORD },
      { pattern: /^[a-zA-Z]+\'[a-zA-Z]+/, type: TokenType.WORD }, // contractions and possessives
    ];
    
    // Add custom patterns if provided
    if (this.options.customPatterns) {
      this.patterns = [...this.options.customPatterns, ...this.patterns];
    }
  }
  
  /**
   * Tokenizes an input string into an array of tokens
   * @param input The input text to tokenize
   * @returns Array of tokens
   */
  public tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let remaining = input.trim();
    let position = 0;
    
    while (remaining.length > 0) {
      let matched = false;
      
      // Try each pattern until one matches
      for (const { pattern, type } of this.patterns) {
        const match = remaining.match(pattern);
        
        if (match && match.index === 0) {
          const text = match[0];
          
          // Skip whitespace tokens if not explicitly included
          if (type === TokenType.WHITESPACE && !this.options.includeWhitespace) {
            remaining = remaining.substring(text.length);
            position += text.length;
            matched = true;
            break;
          }
          
          // Create the token
          const token: Token = {
            text,
            type,
            position
          };
          
          // Add normalized form if requested
          if (this.options.normalizeTokens) {
            token.normalized = this.normalizeToken(text, type);
          }
          
          tokens.push(token);
          
          // Update the remaining text and position
          remaining = remaining.substring(text.length);
          position += text.length;
          matched = true;
          break;
        }
      }
      
      // If no pattern matched, treat the next character as unknown
      if (!matched) {
        tokens.push({
          text: remaining[0],
          type: TokenType.UNKNOWN,
          position
        });
        
        remaining = remaining.substring(1);
        position += 1;
      }
    }
    
    return this.postProcessTokens(tokens);
  }
  
  /**
   * Perform any post-processing on the tokenized results
   * @param tokens The initial tokens
   * @returns The processed tokens
   */
  private postProcessTokens(tokens: Token[]): Token[] {
    // Handle special case: contractions with apostrophes
    // For example, "don't" -> ["don", "'", "t"] should be combined into ["don't"]
    const processedTokens: Token[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // If it's a word token and there's an apostrophe and another word after it
      if (token.type === TokenType.WORD && 
          i + 2 < tokens.length && 
          tokens[i+1].text === "'" && 
          tokens[i+2].type === TokenType.WORD) {
        
        // Combine them into one token
        const combinedToken: Token = {
          text: token.text + "'" + tokens[i+2].text,
          type: TokenType.WORD,
          position: token.position
        };
        
        if (this.options.normalizeTokens) {
          combinedToken.normalized = this.normalizeToken(
            combinedToken.text, 
            TokenType.WORD
          );
        }
        
        processedTokens.push(combinedToken);
        i += 2; // Skip the next two tokens
      } else {
        processedTokens.push(token);
      }
    }
    
    return processedTokens;
  }
  
  /**
   * Normalize a token based on its type
   * @param text The token text
   * @param type The token type
   * @returns The normalized form of the token
   */
  private normalizeToken(text: string, type: TokenType): string {
    switch (type) {
      case TokenType.WORD:
        // Lowercase words
        return text.toLowerCase();
        
      case TokenType.QUOTED:
        // Remove the quotes and trim whitespace
        return text.substring(1, text.length - 1).trim();
        
      case TokenType.NUMBER:
        // Ensure consistent format for numbers
        return parseFloat(text).toString();
        
      default:
        // No normalization for other types
        return text;
    }
  }
  
  /**
   * Add a custom pattern to the tokenizer
   * @param pattern The regular expression to match
   * @param type The token type to assign
   */
  public addPattern(pattern: RegExp, type: TokenType): void {
    // Add to the beginning of the patterns array to give it priority
    this.patterns.unshift({ pattern, type });
  }
  
  /**
   * Set whether to include whitespace tokens
   * @param include Whether to include whitespace
   */
  public setIncludeWhitespace(include: boolean): void {
    this.options.includeWhitespace = include;
  }
  
  /**
   * Set whether to normalize tokens
   * @param normalize Whether to normalize tokens
   */
  public setNormalizeTokens(normalize: boolean): void {
    this.options.normalizeTokens = normalize;
  }
}

/**
 * Create a tokenizer with the specified options
 * @param options Configuration options
 * @returns A new tokenizer instance
 */
export function createTokenizer(options?: TokenizerOptions): Tokenizer {
  return new Tokenizer(options);
}