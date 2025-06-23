/**
 * English Language Tokenizer for Sharpee IF Engine
 */

import { Token, TokenType, Tokenizer } from '@sharpee/core';

/**
 * English-specific tokenizer options
 */
export interface EnglishTokenizerOptions {
  /**
   * Whether to handle English contractions specially
   */
  handleContractions?: boolean;

  /**
   * Whether to treat multi-word phrases as single tokens (e.g., "pick up" as a single verb)
   */
  recognizeCompoundVerbs?: boolean;
  
  /**
   * Whether to normalize tokens (lowercase, etc.)
   */
  normalizeTokens?: boolean;
  
  /**
   * Whether to include whitespace tokens
   */
  includeWhitespace?: boolean;
}

/**
 * Default English tokenizer options
 */
const DEFAULT_ENGLISH_OPTIONS: EnglishTokenizerOptions = {
  handleContractions: true,
  recognizeCompoundVerbs: true,
  normalizeTokens: true,
  includeWhitespace: false
};

/**
 * Common English contractions with their expanded forms
 */
const ENGLISH_CONTRACTIONS: Record<string, string> = {
  "don't": "do not",
  "won't": "will not",
  "can't": "cannot",
  "isn't": "is not",
  "aren't": "are not",
  "wasn't": "was not",
  "weren't": "were not",
  "haven't": "have not",
  "hasn't": "has not",
  "hadn't": "had not",
  "wouldn't": "would not",
  "couldn't": "could not",
  "shouldn't": "should not",
  "didn't": "did not",
  "doesn't": "does not",
  "i'll": "i will",
  "you'll": "you will",
  "he'll": "he will",
  "she'll": "she will",
  "we'll": "we will",
  "they'll": "they will",
  "i'm": "i am",
  "you're": "you are",
  "he's": "he is",
  "she's": "she is",
  "we're": "we are",
  "they're": "they are",
  "i've": "i have",
  "you've": "you have",
  "we've": "we have",
  "they've": "they have",
  "let's": "let us"
};

/**
 * Common English compound verbs (multi-word verbs) in interactive fiction
 */
const ENGLISH_COMPOUND_VERBS: string[] = [
  "pick up",
  "put down",
  "turn on",
  "turn off",
  "look at",
  "look under",
  "look behind",
  "look inside",
  "go to",
  "talk to",
  "speak to",
  "walk to",
  "run to",
  "give to",
  "hand to",
  "listen to",
  "climb up",
  "climb down",
  "get out",
  "get in",
  "sit on",
  "stand on",
  "lie on"
];

/**
 * English language tokenizer implementation
 */
export class EnglishTokenizer implements Tokenizer {
  private options: EnglishTokenizerOptions;
  private compoundVerbs: Set<string>;

  /**
   * Creates a new English tokenizer
   * @param options Tokenizer options
   */
  constructor(options: EnglishTokenizerOptions = {}) {
    this.options = { ...DEFAULT_ENGLISH_OPTIONS, ...options };
    this.compoundVerbs = new Set(ENGLISH_COMPOUND_VERBS);
  }

  /**
   * Tokenize input text
   * @param text The input text to tokenize
   * @returns Array of tokens
   */
  tokenize(text: string): Token[] {
    // Initial tokenization
    const tokens = this.basicTokenize(text);
    
    // Apply English-specific post-processing
    let processedTokens = tokens;
    
    // Expand contractions if requested
    if (this.options.handleContractions) {
      processedTokens = this.expandContractions(processedTokens);
    }
    
    // Handle compound verbs if requested
    if (this.options.recognizeCompoundVerbs) {
      processedTokens = this.processCompoundVerbs(processedTokens);
    }
    
    return processedTokens;
  }

  /**
   * Basic tokenization of input text
   * @param text The text to tokenize
   * @returns Array of basic tokens
   */
  private basicTokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let remaining = text.trim();
    let position = 0;
    
    // Define token patterns
    const patterns = [
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
      { pattern: /^[a-zA-Z]+\'[a-zA-Z]+/, type: TokenType.WORD } // contractions and possessives
    ];
    
    // Process the text
    while (remaining.length > 0) {
      let matched = false;
      
      // Try each pattern until one matches
      for (const { pattern, type } of patterns) {
        const match = remaining.match(pattern);
        
        if (match && match.index === 0) {
          const value = match[0];
          
          // Skip whitespace tokens if not explicitly included
          if (type === TokenType.WHITESPACE && !this.options.includeWhitespace) {
            remaining = remaining.substring(value.length);
            position += value.length;
            matched = true;
            break;
          }
          
          // Create the token
          const token: Token = {
            type,
            value,
            position,
            length: value.length
          };
          
          tokens.push(token);
          
          // Update the remaining text and position
          remaining = remaining.substring(value.length);
          position += value.length;
          matched = true;
          break;
        }
      }
      
      // If no pattern matched, treat the next character as unknown
      if (!matched) {
        tokens.push({
          type: TokenType.UNKNOWN,
          value: remaining[0],
          position,
          length: 1
        });
        
        remaining = remaining.substring(1);
        position += 1;
      }
    }
    
    // Apply normalization if requested
    if (this.options.normalizeTokens) {
      return this.normalizeTokens(tokens);
    }
    
    return tokens;
  }

  /**
   * Normalize tokens (lowercase words, etc.)
   * @param tokens The tokens to normalize
   * @returns Normalized tokens
   */
  private normalizeTokens(tokens: Token[]): Token[] {
    return tokens.map(token => {
      // Only normalize certain token types
      if (token.type === TokenType.WORD) {
        return {
          ...token,
          value: token.value.toLowerCase()
        };
      }
      return token;
    });
  }

  /**
   * Process tokens to expand contractions to their full forms
   * @param tokens The tokens to process
   * @returns Processed tokens
   */
  private expandContractions(tokens: Token[]): Token[] {
    return tokens.map(token => {
      if (token.type === TokenType.WORD) {
        const contraction = token.value.toLowerCase();
        const expansion = ENGLISH_CONTRACTIONS[contraction];
        
        if (expansion) {
          return {
            ...token,
            // Add the expansion as metadata
            expansion
          };
        }
      }
      return token;
    });
  }

  /**
   * Process tokens to identify compound verbs
   * @param tokens The tokens to process
   * @returns Processed tokens
   */
  private processCompoundVerbs(tokens: Token[]): Token[] {
    const result: Token[] = [];
    
    // Look for potential compound verbs
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Check if this could be the start of a compound verb
      if (token.type === TokenType.WORD && i < tokens.length - 2) {
        // Get the next token, checking if it's a space or preposition
        const nextToken = tokens[i + 1];
        if (nextToken.type === TokenType.WHITESPACE && i + 2 < tokens.length) {
          const thirdToken = tokens[i + 2];
          
          if (thirdToken.type === TokenType.WORD) {
            const potentialCompound = `${token.value} ${thirdToken.value}`;
            
            if (this.compoundVerbs.has(potentialCompound.toLowerCase())) {
              // Create a compound token
              result.push({
                type: TokenType.WORD,
                value: potentialCompound,
                position: token.position,
                length: potentialCompound.length,
                isCompound: true,
                // Keep track of original parts
                parts: [token, nextToken, thirdToken]
              });
              
              // Skip the next two tokens since we've incorporated them
              i += 2;
              continue;
            }
          }
        } else if (nextToken.type === TokenType.WORD) {
          // Check directly adjacent words for compound verbs
          const potentialCompound = `${token.value} ${nextToken.value}`;
          
          if (this.compoundVerbs.has(potentialCompound.toLowerCase())) {
            // Create a compound token
            result.push({
              type: TokenType.WORD,
              value: potentialCompound,
              position: token.position,
              length: potentialCompound.length,
              isCompound: true,
              // Keep track of original parts
              parts: [token, nextToken]
            });
            
            // Skip the next token since we've incorporated it
            i += 1;
            continue;
          }
        }
      }
      
      // Not a compound verb, add as is
      result.push(token);
    }
    
    return result;
  }

  /**
   * Add a compound verb to the recognized list
   * @param compoundVerb The compound verb to add
   */
  addCompoundVerb(compoundVerb: string): void {
    this.compoundVerbs.add(compoundVerb.toLowerCase());
  }

  /**
   * Get all recognized compound verbs
   * @returns Array of compound verbs
   */
  getCompoundVerbs(): string[] {
    return Array.from(this.compoundVerbs);
  }
}

/**
 * Create an English tokenizer with the specified options
 * @param options Configuration options
 * @returns A new English tokenizer instance
 */
export function createEnglishTokenizer(options?: EnglishTokenizerOptions): Tokenizer {
  return new EnglishTokenizer(options);
}