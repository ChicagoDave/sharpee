/**
 * English Language POS Tagger for Sharpee IF Engine
 */

import { Token, TaggedWord, POSType, POSTagger } from '@sharpee/core';
import { getDictionaries, getStrongCommandVerbs } from './dictionaries';
import { EnglishLemmatizer } from './lemmatizer';

/**
 * English-specific POS tagger options
 */
export interface EnglishPOSTaggerOptions {
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
 * Default English POS tagger options
 */
const DEFAULT_OPTIONS: EnglishPOSTaggerOptions = {
  useContextualRules: true,
  useHeuristics: true,
  useLemmatization: true
};

/**
 * English language part-of-speech tagger
 */
export class EnglishPOSTagger implements POSTagger {
  private options: EnglishPOSTaggerOptions;
  private dictionaries = getDictionaries();
  private strongCommandVerbs: Set<string>;
  private lemmatizer: EnglishLemmatizer;
  
  /**
   * Create a new English POS tagger
   * @param options Configuration options
   */
  constructor(options: EnglishPOSTaggerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.strongCommandVerbs = new Set(getStrongCommandVerbs());
    this.lemmatizer = new EnglishLemmatizer();
  }
  
  /**
   * Tag tokens with parts of speech
   * @param tokens The tokens to tag
   * @returns Tagged words with part of speech information
   */
  tagWords(tokens: Token[]): TaggedWord[] {
    // Convert tokens to tagged words with initial unknown POS
    const taggedWords: TaggedWord[] = tokens.map(token => ({
      ...token,
      tag: POSType.UNKNOWN
    }));
    
    // Apply dictionary-based tagging
    this.applyDictionaryTags(taggedWords);
    
    // Apply morphological rules
    this.applyMorphologicalRules(taggedWords);
    
    // Apply contextual rules if enabled
    if (this.options.useContextualRules) {
      this.applyContextualRules(taggedWords);
    }
    
    // Apply heuristics for unknown words if enabled
    if (this.options.useHeuristics) {
      this.applyHeuristics(taggedWords);
    }
    
    // Apply lemmatization if enabled
    if (this.options.useLemmatization) {
      this.applyLemmatization(taggedWords);
    }
    
    return taggedWords;
  }
  
  /**
   * Apply dictionary-based part of speech tags
   * @param words The words to tag
   */
  private applyDictionaryTags(words: TaggedWord[]): void {
    words.forEach(word => {
      const value = word.value.toLowerCase();
      
      // Check if it's a strong command verb for IF contexts
      if (this.strongCommandVerbs.has(value)) {
        word.tag = POSType.VERB;
        return;
      }
      
      // Try to find the word in dictionaries
      if (this.dictionaries.verbs.has(value)) {
        word.tag = POSType.VERB;
      } else if (this.dictionaries.nouns.has(value)) {
        word.tag = POSType.NOUN;
      } else if (this.dictionaries.adjectives.has(value)) {
        word.tag = POSType.ADJECTIVE;
      } else if (this.dictionaries.adverbs.has(value)) {
        word.tag = POSType.ADVERB;
      } else if (this.dictionaries.prepositions.has(value)) {
        word.tag = POSType.PREPOSITION;
      } else if (this.dictionaries.articles.has(value)) {
        word.tag = POSType.ARTICLE;
      } else if (this.dictionaries.pronouns.has(value)) {
        word.tag = POSType.PRONOUN;
      } else if (this.dictionaries.conjunctions.has(value)) {
        word.tag = POSType.CONJUNCTION;
      }
    });
  }
  
  /**
   * Apply morphological rules to determine part of speech
   * @param words The words to tag
   */
  private applyMorphologicalRules(words: TaggedWord[]): void {
    words.forEach(word => {
      // Skip words that already have a part of speech
      if (word.tag !== POSType.UNKNOWN) return;
      
      const value = word.value.toLowerCase();
      
      // Apply verb suffix rules
      if (value.endsWith('ing') || value.endsWith('ed')) {
        word.tag = POSType.VERB;
      }
      
      // Apply adjective suffix rules
      else if (
        value.endsWith('able') || 
        value.endsWith('ible') || 
        value.endsWith('ful') || 
        value.endsWith('ous') || 
        value.endsWith('ish') ||
        value.endsWith('al')
      ) {
        word.tag = POSType.ADJECTIVE;
      }
      
      // Apply adverb suffix rules
      else if (value.endsWith('ly')) {
        word.tag = POSType.ADVERB;
      }
      
      // Apply noun suffix rules
      else if (
        value.endsWith('tion') || 
        value.endsWith('ment') || 
        value.endsWith('ness') || 
        value.endsWith('ity') ||
        value.endsWith('dom') ||
        value.endsWith('ship') ||
        value.endsWith('hood') ||
        (value.endsWith('s') && !value.endsWith('ss'))
      ) {
        word.tag = POSType.NOUN;
      }
    });
  }
  
  /**
   * Apply contextual rules to improve tagging accuracy
   * @param words The words to tag
   */
  private applyContextualRules(words: TaggedWord[]): void {
    // Skip if only one word
    if (words.length <= 1) return;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const prevWord = i > 0 ? words[i - 1] : null;
      const nextWord = i < words.length - 1 ? words[i + 1] : null;
      
      // Skip words that already have a part of speech
      if (word.tag !== POSType.UNKNOWN) continue;
      
      // First word in sentence is likely a verb in IF context unless known otherwise
      if (i === 0) {
        word.tag = POSType.VERB;
      }
      
      // After article or determiner, likely a noun or adjective
      else if (
        prevWord && 
        (prevWord.tag === POSType.ARTICLE || 
         prevWord.tag === POSType.UNKNOWN) // Use UNKNOWN for determiners since we don't have a specific type
      ) {
        // If next word is likely a noun, this is probably an adjective
        if (
          nextWord && 
          (nextWord.tag === POSType.NOUN || 
           nextWord.tag === POSType.UNKNOWN)
        ) {
          word.tag = POSType.ADJECTIVE;
        } else {
          word.tag = POSType.NOUN;
        }
      }
      
      // After adjective, likely a noun
      else if (
        prevWord && 
        prevWord.tag === POSType.ADJECTIVE
      ) {
        word.tag = POSType.NOUN;
      }
      
      // After verb, likely a noun, pronoun, or article
      else if (
        prevWord && 
        prevWord.tag === POSType.VERB
      ) {
        word.tag = POSType.NOUN;
      }
      
      // After preposition, likely a noun or determiner
      else if (
        prevWord && 
        prevWord.tag === POSType.PREPOSITION
      ) {
        word.tag = POSType.NOUN;
      }
      
      // Resolve ambiguous 'to' (preposition vs. part of infinitive)
      else if (
        word.value.toLowerCase() === 'to' && 
        nextWord && 
        nextWord.tag === POSType.VERB
      ) {
        word.tag = POSType.PREPOSITION;
      }
    }
  }
  
  /**
   * Apply heuristics for unknown words
   * @param words The words to tag
   */
  private applyHeuristics(words: TaggedWord[]): void {
    words.forEach(word => {
      // Skip words that already have a part of speech
      if (word.tag !== POSType.UNKNOWN) return;
      
      const value = word.value;
      
      // Capitalized words in the middle of a sentence are likely proper nouns
      if (value[0] === value[0].toUpperCase() && 
          value[0] !== value[0].toLowerCase()) {
        word.tag = POSType.NOUN;
        return;
      }
      
      // Words with numbers or special characters might be special commands/objects
      if (/[0-9_\-]/.test(value)) {
        word.tag = POSType.NOUN;
        return;
      }
      
      // Default unknown words to nouns as they're most likely game-specific objects
      word.tag = POSType.NOUN;
    });
  }
  
  /**
   * Apply lemmatization to words based on their part of speech
   * @param words The words to lemmatize
   */
  private applyLemmatization(words: TaggedWord[]): void {
    words.forEach(word => {
      // Skip words without a determined part of speech
      if (word.tag === POSType.UNKNOWN) return;
      
      // Apply lemmatization based on POS
      word.lemma = this.lemmatizer.lemmatize(word.value.toLowerCase(), word.tag);
    });
  }
}

/**
 * Create a new English POS tagger with optional configuration
 * @param options Configuration options
 * @returns A new English POS tagger instance
 */
export function createEnglishPOSTagger(options?: EnglishPOSTaggerOptions): POSTagger {
  return new EnglishPOSTagger(options);
}