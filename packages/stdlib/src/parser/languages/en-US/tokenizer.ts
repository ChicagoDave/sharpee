// packages/core/src/parser/languages/en-US/tokenizer.ts

import { 
    Tokenizer, 
    TokenizerOptions,
    createTokenizer as createCoreTokenizer 
  } from '../../core/tokenizer';
  import { TokenType } from '../../core/types';
  
  /**
   * English-specific tokenizer options
   */
  export interface EnglishTokenizerOptions extends TokenizerOptions {
    /**
     * Whether to handle English contractions specially
     */
    handleContractions?: boolean;
  
    /**
     * Whether to treat multi-word phrases as single tokens (e.g., "pick up" as a single verb)
     */
    recognizeCompoundVerbs?: boolean;
  }
  
  /**
   * Default English tokenizer options
   */
  const DEFAULT_ENGLISH_OPTIONS: EnglishTokenizerOptions = {
    handleContractions: true,
    recognizeCompoundVerbs: true,
    normalizeTokens: true
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
   * English language specific tokenizer implementation
   */
  export class EnglishTokenizer extends Tokenizer {
    private englishOptions: EnglishTokenizerOptions;
    private compoundVerbs: Set<string>;
  
    /**
     * Creates a new English tokenizer
     * @param options Tokenizer options
     */
    constructor(options: EnglishTokenizerOptions = {}) {
      // Create base tokenizer with merged options
      const mergedOptions: EnglishTokenizerOptions = {
        ...DEFAULT_ENGLISH_OPTIONS,
        ...options
      };
      
      super(mergedOptions);
      this.englishOptions = mergedOptions;
      
      // Initialize compound verbs set
      this.compoundVerbs = new Set(ENGLISH_COMPOUND_VERBS);
      
      // Add custom patterns for English
      if (this.englishOptions.handleContractions) {
        // Add pattern to match common contractions
        this.addPattern(/^(?:don't|won't|can't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|wouldn't|couldn't|shouldn't|didn't|doesn't|i'll|you'll|he'll|she'll|we'll|they'll|i'm|you're|he's|she's|we're|they're|i've|you've|we've|they've|let's)\b/i, TokenType.WORD);
      }
    }
  
    /**
     * Tokenize input text with English-specific processing
     * @param input The input text to tokenize
     * @returns Array of tokens
     */
    public tokenize(input: string): ReturnType<Tokenizer['tokenize']> {
      // First, get the base tokenization
      let tokens = super.tokenize(input);
      
      // Apply English-specific post-processing
      
      // Expand contractions if requested
      if (this.englishOptions.handleContractions) {
        tokens = this.expandContractions(tokens);
      }
      
      // Handle compound verbs if requested
      if (this.englishOptions.recognizeCompoundVerbs) {
        tokens = this.processCompoundVerbs(tokens);
      }
      
      return tokens;
    }
  
    /**
     * Process tokens to expand contractions to their full forms
     * @param tokens The tokens to process
     * @returns Processed tokens
     */
    private expandContractions(tokens: ReturnType<Tokenizer['tokenize']>): ReturnType<Tokenizer['tokenize']> {
      return tokens.map(token => {
        if (token.type === TokenType.WORD && token.normalized) {
          const contraction = token.normalized;
          const expansion = ENGLISH_CONTRACTIONS[contraction];
          
          if (expansion) {
            return {
              ...token,
              // Add the expansion as metadata but keep the original text
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
    private processCompoundVerbs(tokens: ReturnType<Tokenizer['tokenize']>): ReturnType<Tokenizer['tokenize']> {
      const result: ReturnType<Tokenizer['tokenize']> = [];
      
      // Look for potential compound verbs
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Check if this could be the start of a compound verb
        if (token.type === TokenType.WORD && i < tokens.length - 2) {
          const nextToken = tokens[i + 1];
          const potentialCompound = `${token.normalized} ${nextToken.normalized}`;
          
          if (this.compoundVerbs.has(potentialCompound)) {
            // Create a compound token
            result.push({
              text: `${token.text} ${nextToken.text}`,
              normalized: potentialCompound,
              type: TokenType.WORD,
              position: token.position,
              isCompoundVerb: true,
              // Keep track of original parts
              parts: [token, nextToken]
            });
            
            // Skip the next token since we've incorporated it
            i++;
          } else {
            // Not a compound verb, add as is
            result.push(token);
          }
        } else {
          // Not a potential compound verb, add as is
          result.push(token);
        }
      }
      
      return result;
    }
  
    /**
     * Add a compound verb to the recognized list
     * @param compoundVerb The compound verb to add
     */
    public addCompoundVerb(compoundVerb: string): void {
      this.compoundVerbs.add(compoundVerb.toLowerCase());
    }
  
    /**
     * Get all recognized compound verbs
     * @returns Array of compound verbs
     */
    public getCompoundVerbs(): string[] {
      return Array.from(this.compoundVerbs);
    }
  }
  
  /**
   * Create an English tokenizer with the specified options
   * @param options Configuration options
   * @returns A new English tokenizer instance
   */
  export function createEnglishTokenizer(options?: EnglishTokenizerOptions): EnglishTokenizer {
    return new EnglishTokenizer(options);
  }