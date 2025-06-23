// packages/core/src/parser/languages/en-US/pos-tagger.ts

import {
    Token,
    TaggedWord,
    PartOfSpeech
  } from '../../core/types';
  import {
    PosTagger,
    PosTaggerOptions,
    PosDictionary
  } from '../../core/pos-tagger';
  
  // Import the dictionaries
  import {
    ARTICLES,
    PREPOSITIONS,
    PRONOUNS,
    CONJUNCTIONS,
    DETERMINERS,
    ADVERBS,
    COMMON_ADJECTIVES
  } from './dictionaries';
  import {
    IF_VERBS,
    COMMON_IF_NOUNS,
    getStrongCommandVerbs
  } from './if-vocabulary';
  import {
    ENGLISH_LEMMATIZATION_RULES,
    applyLemmatizationRules
  } from './lemmatization-rules';
  
  /**
   * English-specific POS tagger options
   */
  export interface EnglishPosTaggerOptions extends PosTaggerOptions {
    /**
     * Whether to use contextual rules for part-of-speech disambiguation
     */
    useContextualRules?: boolean;
    
    /**
     * Whether to use heuristics for unknown words
     */
    useHeuristics?: boolean;
    
    /**
     * Whether to use lemmatization for verbs and other words
     */
    useLemmatization?: boolean;
  }
  
  /**
   * English language part-of-speech tagger
   */
  export class EnglishPosTagger implements PosTagger {
    private options: EnglishPosTaggerOptions;
    private dictionaries: {
      verbs: PosDictionary;
      nouns: PosDictionary;
      adjectives: PosDictionary;
      adverbs: PosDictionary;
      prepositions: PosDictionary;
      articles: PosDictionary;
      pronouns: PosDictionary;
      conjunctions: PosDictionary;
      determiners: PosDictionary;
    };
    private strongCommandVerbs: Set<string>;
    
    /**
     * Create a new English POS tagger
     * @param options Configuration options
     */
    constructor(options: EnglishPosTaggerOptions = {}) {
      this.options = {
        customDictionaries: true,
        useMorphology: true,
        useContextualRules: true,
        useHeuristics: true,
        useLemmatization: true,
        ...options
      };
      
      this.strongCommandVerbs = new Set(getStrongCommandVerbs());
      this.dictionaries = this.initializeDictionaries();
    }
    
    /**
     * Initialize default English dictionaries
     */
    private initializeDictionaries() {
      return {
        verbs: { ...IF_VERBS },
        nouns: { ...COMMON_IF_NOUNS },
        adjectives: { ...COMMON_ADJECTIVES },
        adverbs: { ...ADVERBS },
        prepositions: { ...PREPOSITIONS },
        articles: { ...ARTICLES },
        pronouns: { ...PRONOUNS },
        conjunctions: { ...CONJUNCTIONS },
        determiners: { ...DETERMINERS }
      };
    }
  
    /**
     * Tag tokens with parts of speech
     * @param tokens The tokens to tag
     * @returns Tagged tokens with part of speech information
     */
    tagTokens(tokens: Token[]): TaggedWord[] {
      // Convert tokens to tagged tokens with initial unknown POS
      const taggedTokens: TaggedWord[] = tokens.map(token => ({
        ...token,
        partOfSpeech: PartOfSpeech.UNKNOWN,
        confidence: 0,
        lemma: token.normalized || token.text.toLowerCase()
      }));
      
      // Apply dictionary-based tagging
      this.applyDictionaryTags(taggedTokens);
      
      // Apply morphological rules if enabled
      if (this.options.useMorphology) {
        this.applyMorphologicalRules(taggedTokens);
      }
      
      // Apply contextual rules if enabled
      if (this.options.useContextualRules) {
        this.applyContextualRules(taggedTokens);
      }
      
      // Apply heuristics for unknown words if enabled
      if (this.options.useHeuristics) {
        this.applyHeuristics(taggedTokens);
      }
      
      // Apply lemmatization if enabled
      if (this.options.useLemmatization) {
        this.applyLemmatization(taggedTokens);
      }
      
      return taggedTokens;
    }
    
    /**
     * Apply dictionary-based part of speech tags
     */
    private applyDictionaryTags(tokens: TaggedWord[]): void {
      tokens.forEach(token => {
        const normalized = token.normalized || token.text.toLowerCase();
        
        // Check if it's a strong command verb for IF contexts
        if (this.strongCommandVerbs.has(normalized)) {
          token.partOfSpeech = PartOfSpeech.VERB;
          token.confidence = 0.9; // High confidence for common command verbs
          token.lemma = normalized;
          return;
        }
        
        // Try to find the word in dictionaries
        if (normalized in this.dictionaries.verbs) {
          token.partOfSpeech = PartOfSpeech.VERB;
          token.confidence = 0.9;
        } else if (normalized in this.dictionaries.nouns) {
          token.partOfSpeech = PartOfSpeech.NOUN;
          token.confidence = 0.9;
        } else if (normalized in this.dictionaries.adjectives) {
          token.partOfSpeech = PartOfSpeech.ADJECTIVE;
          token.confidence = 0.9;
        } else if (normalized in this.dictionaries.adverbs) {
          token.partOfSpeech = PartOfSpeech.ADVERB;
          token.confidence = 0.9;
        } else if (normalized in this.dictionaries.prepositions) {
          token.partOfSpeech = PartOfSpeech.PREPOSITION;
          token.confidence = 1.0;
        } else if (normalized in this.dictionaries.articles) {
          token.partOfSpeech = PartOfSpeech.ARTICLE;
          token.confidence = 1.0;
        } else if (normalized in this.dictionaries.pronouns) {
          token.partOfSpeech = PartOfSpeech.PRONOUN;
          token.confidence = 1.0;
        } else if (normalized in this.dictionaries.conjunctions) {
          token.partOfSpeech = PartOfSpeech.CONJUNCTION;
          token.confidence = 1.0;
        } else if (normalized in this.dictionaries.determiners) {
          token.partOfSpeech = PartOfSpeech.DETERMINER;
          token.confidence = 1.0;
        }
      });
    }
    
    /**
     * Apply morphological rules to determine part of speech
     */
    private applyMorphologicalRules(tokens: TaggedWord[]): void {
      tokens.forEach(token => {
        // Skip tokens that already have a part of speech with high confidence
        if (token.confidence && token.confidence >= 0.8) return;
        
        const normalized = token.normalized || token.text.toLowerCase();
        
        // Apply verb suffix rules
        if (normalized.endsWith('ing') || normalized.endsWith('ed')) {
          token.partOfSpeech = PartOfSpeech.VERB;
          token.confidence = 0.7;
        }
        
        // Apply adjective suffix rules
        else if (
          normalized.endsWith('able') || 
          normalized.endsWith('ible') || 
          normalized.endsWith('ful') || 
          normalized.endsWith('ous') || 
          normalized.endsWith('ish') ||
          normalized.endsWith('al')
        ) {
          token.partOfSpeech = PartOfSpeech.ADJECTIVE;
          token.confidence = 0.7;
        }
        
        // Apply adverb suffix rules
        else if (normalized.endsWith('ly')) {
          token.partOfSpeech = PartOfSpeech.ADVERB;
          token.confidence = 0.7;
        }
        
        // Apply noun suffix rules
        else if (
          normalized.endsWith('tion') || 
          normalized.endsWith('ment') || 
          normalized.endsWith('ness') || 
          normalized.endsWith('ity') ||
          normalized.endsWith('dom') ||
          normalized.endsWith('ship') ||
          normalized.endsWith('hood') ||
          (normalized.endsWith('s') && !normalized.endsWith('ss'))
        ) {
          token.partOfSpeech = PartOfSpeech.NOUN;
          token.confidence = 0.7;
        }
      });
    }
    
    /**
     * Apply contextual rules to improve tagging accuracy
     */
    private applyContextualRules(tokens: TaggedWord[]): void {
      // Skip if only one token
      if (tokens.length <= 1) return;
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const prevToken = i > 0 ? tokens[i - 1] : null;
        const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;
        
        // If already high confidence, skip
        if (token.confidence && token.confidence >= 0.8) return;
        
        // First word in sentence is likely a verb in IF context unless known otherwise
        if (i === 0 && token.partOfSpeech === PartOfSpeech.UNKNOWN) {
          token.partOfSpeech = PartOfSpeech.VERB;
          token.confidence = 0.6;
        }
        
        // After article or determiner, likely a noun or adjective
        if (
          prevToken && 
          (prevToken.partOfSpeech === PartOfSpeech.ARTICLE || 
           prevToken.partOfSpeech === PartOfSpeech.DETERMINER) && 
          token.partOfSpeech === PartOfSpeech.UNKNOWN
        ) {
          // If next token is likely a noun, this is probably an adjective
          if (
            nextToken && 
            (nextToken.partOfSpeech === PartOfSpeech.NOUN || 
             nextToken.confidence && nextToken.confidence < 0.5)
          ) {
            token.partOfSpeech = PartOfSpeech.ADJECTIVE;
            token.confidence = 0.6;
          } else {
            token.partOfSpeech = PartOfSpeech.NOUN;
            token.confidence = 0.6;
          }
        }
        
        // After adjective, likely a noun
        else if (
          prevToken && 
          prevToken.partOfSpeech === PartOfSpeech.ADJECTIVE && 
          token.partOfSpeech === PartOfSpeech.UNKNOWN
        ) {
          token.partOfSpeech = PartOfSpeech.NOUN;
          token.confidence = 0.6;
        }
        
        // After verb, likely a noun, pronoun, or article
        else if (
          prevToken && 
          prevToken.partOfSpeech === PartOfSpeech.VERB && 
          token.partOfSpeech === PartOfSpeech.UNKNOWN
        ) {
          token.partOfSpeech = PartOfSpeech.NOUN;
          token.confidence = 0.5;
        }
        
        // After preposition, likely a noun or determiner
        else if (
          prevToken && 
          prevToken.partOfSpeech === PartOfSpeech.PREPOSITION && 
          token.partOfSpeech === PartOfSpeech.UNKNOWN
        ) {
          token.partOfSpeech = PartOfSpeech.NOUN;
          token.confidence = 0.6;
        }
        
        // Resolve ambiguous 'to' (preposition vs. part of infinitive)
        else if (
          token.normalized === 'to' && 
          nextToken && 
          nextToken.partOfSpeech === PartOfSpeech.VERB
        ) {
          token.partOfSpeech = PartOfSpeech.PREPOSITION;
          token.confidence = 0.8;
        }
      }
    }
    
    /**
     * Apply heuristics for unknown words
     */
    private applyHeuristics(tokens: TaggedWord[]): void {
      tokens.forEach(token => {
        // Skip tokens that already have a part of speech
        if (token.partOfSpeech !== PartOfSpeech.UNKNOWN) return;
        
        const normalized = token.normalized || token.text.toLowerCase();
        
        // Capitalized words in the middle of a sentence are likely nouns (proper names)
        if (token.text[0] === token.text[0].toUpperCase() && 
            token.text[0] !== token.text[0].toLowerCase()) {
          token.partOfSpeech = PartOfSpeech.NOUN;
          token.confidence = 0.6;
          return;
        }
        
        // Words with numbers or special characters might be special commands/objects
        if (/[0-9_\-]/.test(normalized)) {
          token.partOfSpeech = PartOfSpeech.NOUN;
          token.confidence = 0.5;
          return;
        }
        
        // Default unknown words to nouns as they're most likely game-specific objects
        token.partOfSpeech = PartOfSpeech.NOUN;
        token.confidence = 0.3;
      });
    }
    
    /**
     * Apply lemmatization to tokens based on their part of speech
     */
    private applyLemmatization(tokens: TaggedWord[]): void {
      tokens.forEach(token => {
        const normalized = token.normalized || token.text.toLowerCase();
        
        // Skip tokens without a determined part of speech
        if (token.partOfSpeech === PartOfSpeech.UNKNOWN) return;
        
        // Apply lemmatization rules
        token.lemma = applyLemmatizationRules(normalized, token.partOfSpeech);
        
        // Special case handling for entries in our dictionaries
        if (token.partOfSpeech === PartOfSpeech.VERB) {
          // Check if the lemma exists in our verb dictionary
          if (!(token.lemma in this.dictionaries.verbs)) {
            // Try to find a base form in the dictionary
            for (const verb in this.dictionaries.verbs) {
              if (normalized.startsWith(verb)) {
                token.lemma = verb;
                break;
              }
            }
          }
        }
      });
    }
  
    /**
     * Add words to the tagger's dictionary
     * @param dictionary Dictionary of words and their parts of speech
     * @param override Whether to override existing entries
     */
    addToDictionary(dictionary: PosDictionary, override: boolean = false): void {
      Object.entries(dictionary).forEach(([word, pos]) => {
        const normalized = word.toLowerCase();
        
        // Determine which dictionary to add to based on the part of speech
        if (typeof pos === 'string') {
          this.addWordToDictionary(normalized, pos, override);
        } else {
          // Handle multiple possible parts of speech
          pos.forEach(p => this.addWordToDictionary(normalized, p, override));
        }
      });
    }
    
    /**
     * Helper method to add a word to the appropriate dictionary
     */
    private addWordToDictionary(word: string, pos: string, override: boolean): void {
      let targetDictionary: PosDictionary | undefined;
      
      // Select the appropriate dictionary based on POS
      switch (pos) {
        case PartOfSpeech.VERB:
          targetDictionary = this.dictionaries.verbs;
          break;
        case PartOfSpeech.NOUN:
          targetDictionary = this.dictionaries.nouns;
          break;
        case PartOfSpeech.ADJECTIVE:
          targetDictionary = this.dictionaries.adjectives;
          break;
        case PartOfSpeech.ADVERB:
          targetDictionary = this.dictionaries.adverbs;
          break;
        case PartOfSpeech.PREPOSITION:
          targetDictionary = this.dictionaries.prepositions;
          break;
        case PartOfSpeech.ARTICLE:
          targetDictionary = this.dictionaries.articles;
          break;
        case PartOfSpeech.PRONOUN:
          targetDictionary = this.dictionaries.pronouns;
          break;
        case PartOfSpeech.CONJUNCTION:
          targetDictionary = this.dictionaries.conjunctions;
          break;
        case PartOfSpeech.DETERMINER:
          targetDictionary = this.dictionaries.determiners;
          break;
        default:
          // Unsupported POS
          return;
      }
      
      // Add to dictionary if it doesn't exist or override is true
      if (targetDictionary && (!targetDictionary[word] || override)) {
        targetDictionary[word] = pos;
      }
    }
  
    /**
     * Reset the tagger's dictionaries to defaults
     */
    resetDictionaries(): void {
      this.dictionaries = this.initializeDictionaries();
    }
  }
  
  /**
   * Create a new English POS tagger with optional configuration
   * @param options Configuration options
   */
  export function createEnglishPosTagger(options?: EnglishPosTaggerOptions): EnglishPosTagger {
    return new EnglishPosTagger(options);
  }