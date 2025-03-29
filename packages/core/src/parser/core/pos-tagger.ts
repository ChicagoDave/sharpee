// packages/core/src/parser/core/pos-tagger.ts

/**
 * Options for configuring a part-of-speech tagger
 */
export interface PosTaggerOptions {
    /**
     * Whether to use custom dictionaries
     */
    customDictionaries?: boolean;
    
    /**
     * Whether to use morphological analysis
     */
    useMorphology?: boolean;
    
    /**
     * Additional options specific to tagger implementations
     */
    [key: string]: any;
  }
  
  /**
   * Dictionary for part-of-speech tagging
   */
  export interface PosDictionary {
    /**
     * Map of words to their parts of speech
     */
    [word: string]: string | string[];
  }
  
  /**
   * Interface for part-of-speech taggers
   */
  export interface PosTagger {
    /**
     * Tag tokens with parts of speech
     * @param tokens The tokens to tag
     * @returns Tagged tokens with part of speech information
     */
    tagTokens(tokens: any[]): any[]; // Replace 'any' with your token types
    
    /**
     * Add words to the tagger's dictionary
     * @param dictionary Dictionary of words and their parts of speech
     * @param override Whether to override existing entries
     */
    addToDictionary(dictionary: PosDictionary, override?: boolean): void;
    
    /**
     * Reset the tagger's dictionaries to defaults
     */
    resetDictionaries(): void;
  }
  
  /**
   * Abstract base class for part-of-speech taggers
   */
  export abstract class BasePosTagger implements PosTagger {
    protected options: PosTaggerOptions;
    
    constructor(options: PosTaggerOptions = {}) {
      this.options = options;
    }
    
    abstract tagTokens(tokens: any[]): any[];
    
    abstract addToDictionary(dictionary: PosDictionary, override?: boolean): void;
    
    abstract resetDictionaries(): void;
  }