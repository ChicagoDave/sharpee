/**
 * English Language Phrase Identifier for Sharpee IF Engine
 */

import { TaggedWord, POSType, Phrase, PhraseType, PhraseIdentifier } from '@sharpee/core';

/**
 * English phrase identifier options
 */
export interface EnglishPhraseIdentifierOptions {
  /**
   * Whether to attempt to identify complex noun phrases
   */
  identifyComplexNounPhrases?: boolean;
  
  /**
   * Whether to identify prepositional phrases
   */
  identifyPrepositionalPhrases?: boolean;
}

/**
 * Default English phrase identifier options
 */
const DEFAULT_OPTIONS: EnglishPhraseIdentifierOptions = {
  identifyComplexNounPhrases: true,
  identifyPrepositionalPhrases: true
};

/**
 * English language phrase identifier
 */
export class EnglishPhraseIdentifier implements PhraseIdentifier {
  private options: EnglishPhraseIdentifierOptions;
  
  /**
   * Create a new English phrase identifier
   * @param options Configuration options
   */
  constructor(options: EnglishPhraseIdentifierOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Identify phrases in tagged words
   * @param taggedWords The tagged words to analyze
   * @returns Array of identified phrases
   */
  identifyPhrases(taggedWords: TaggedWord[]): Phrase[] {
    const phrases: Phrase[] = [];
    
    // Don't process empty input
    if (taggedWords.length === 0) {
      return phrases;
    }
    
    // Identify verb phrases
    this.identifyVerbPhrases(taggedWords, phrases);
    
    // Identify noun phrases
    this.identifyNounPhrases(taggedWords, phrases);
    
    // Identify prepositional phrases if enabled
    if (this.options.identifyPrepositionalPhrases) {
      this.identifyPrepositionalPhrases(taggedWords, phrases);
    }
    
    return phrases;
  }
  
  /**
   * Identify verb phrases in tagged words
   * @param taggedWords The tagged words to analyze
   * @param phrases Array to add identified phrases to
   */
  private identifyVerbPhrases(taggedWords: TaggedWord[], phrases: Phrase[]): void {
    // Process each word that could be the start of a verb phrase
    for (let i = 0; i < taggedWords.length; i++) {
      const word = taggedWords[i];
      
      // If it's a verb, it can be the start of a verb phrase
      if (word.tag === POSType.VERB) {
        // Find the end of the verb phrase (verb + adverbs)
        let endIndex = i;
        const phraseWords: TaggedWord[] = [word];
        
        // Look for adverbs following the verb
        for (let j = i + 1; j < taggedWords.length; j++) {
          const nextWord = taggedWords[j];
          
          // If it's an adverb, it's part of the verb phrase
          if (nextWord.tag === POSType.ADVERB) {
            phraseWords.push(nextWord);
            endIndex = j;
          }
          // For compound verbs, include qualifying particles
          else if (
            nextWord.tag === POSType.PREPOSITION && 
            j === i + 1 &&
            this.isCommonVerbParticle(nextWord.value)
          ) {
            phraseWords.push(nextWord);
            endIndex = j;
          }
          // Stop if it's not an adverb or qualifying particle
          else {
            break;
          }
        }
        
        // Create the verb phrase
        phrases.push({
          type: PhraseType.VERB_PHRASE,
          words: phraseWords,
          start: i,
          end: endIndex
        });
        
        // Skip to the end of this phrase
        i = endIndex;
      }
    }
  }
  
  /**
   * Identify noun phrases in tagged words
   * @param taggedWords The tagged words to analyze
   * @param phrases Array to add identified phrases to
   */
  private identifyNounPhrases(taggedWords: TaggedWord[], phrases: Phrase[]): void {
    // Process each word that could be the start of a noun phrase
    for (let i = 0; i < taggedWords.length; i++) {
      const word = taggedWords[i];
      
      // A noun phrase can start with an article, adjective, or noun
      if (
        word.tag === POSType.ARTICLE || 
        word.tag === POSType.ADJECTIVE || 
        word.tag === POSType.NOUN || 
        word.tag === POSType.PRONOUN
      ) {
        // Find the end of the noun phrase
        let endIndex = i;
        const phraseWords: TaggedWord[] = [word];
        let hasNoun = word.tag === POSType.NOUN || word.tag === POSType.PRONOUN;
        
        // Look for the rest of the noun phrase
        for (let j = i + 1; j < taggedWords.length; j++) {
          const nextWord = taggedWords[j];
          
          // If it's an adjective and we haven't found a noun yet, it's part of the noun phrase
          if (nextWord.tag === POSType.ADJECTIVE && !hasNoun) {
            phraseWords.push(nextWord);
            endIndex = j;
          }
          // If it's a noun, it's part of the noun phrase
          else if (nextWord.tag === POSType.NOUN) {
            phraseWords.push(nextWord);
            endIndex = j;
            hasNoun = true;
            
            // If we're not identifying complex noun phrases, stop after the first noun
            if (!this.options.identifyComplexNounPhrases) {
              break;
            }
          }
          // If it's a pronoun at the end, it's part of the noun phrase
          else if (nextWord.tag === POSType.PRONOUN && j === i + 1) {
            phraseWords.push(nextWord);
            endIndex = j;
            hasNoun = true;
            break;
          }
          // Stop if it's not an adjective, noun, or pronoun
          else {
            break;
          }
        }
        
        // Only create the noun phrase if it has at least one noun-like element or is an article
        if (hasNoun || phraseWords.length > 1 || word.tag === POSType.ARTICLE) {
          phrases.push({
            type: PhraseType.NOUN_PHRASE,
            words: phraseWords,
            start: i,
            end: endIndex
          });
        }
        
        // Skip to the end of this phrase
        i = endIndex;
      }
    }
  }
  
  /**
   * Identify prepositional phrases in tagged words
   * @param taggedWords The tagged words to analyze
   * @param phrases Array to add identified phrases to
   */
  private identifyPrepositionalPhrases(taggedWords: TaggedWord[], phrases: Phrase[]): void {
    // Process each word that could be the start of a prepositional phrase
    for (let i = 0; i < taggedWords.length; i++) {
      const word = taggedWords[i];
      
      // A prepositional phrase must start with a preposition
      if (word.tag === POSType.PREPOSITION) {
        // Find the end of the prepositional phrase
        let endIndex = i;
        const phraseWords: TaggedWord[] = [word];
        
        // Look for a noun phrase after the preposition
        let hasNounPhrase = false;
        
        // Find all words until the next verb or end of sentence
        for (let j = i + 1; j < taggedWords.length; j++) {
          const nextWord = taggedWords[j];
          
          // If it's a verb, it's the start of a new phrase
          if (nextWord.tag === POSType.VERB) {
            break;
          }
          
          // If it's a noun or pronoun, mark that we found the noun phrase part
          if (nextWord.tag === POSType.NOUN || nextWord.tag === POSType.PRONOUN) {
            hasNounPhrase = true;
          }
          
          // Add the word to the phrase
          phraseWords.push(nextWord);
          endIndex = j;
          
          // If we've found a noun or pronoun, and the next word is not an adjective
          // or another noun/pronoun, stop
          if (
            hasNounPhrase &&
            j + 1 < taggedWords.length &&
            taggedWords[j + 1].tag !== POSType.ADJECTIVE &&
            taggedWords[j + 1].tag !== POSType.NOUN &&
            taggedWords[j + 1].tag !== POSType.PRONOUN
          ) {
            break;
          }
        }
        
        // Only create the prepositional phrase if it has a noun phrase after the preposition
        if (hasNounPhrase) {
          phrases.push({
            type: PhraseType.PREPOSITIONAL_PHRASE,
            words: phraseWords,
            start: i,
            end: endIndex
          });
        }
        
        // Skip to the end of this phrase
        i = endIndex;
      }
    }
  }
  
  /**
   * Check if a word is a common verb particle that can form a compound verb
   * @param word The word to check
   * @returns True if it's a common verb particle
   */
  private isCommonVerbParticle(word: string): boolean {
    const commonParticles = [
      'up', 'down', 'in', 'out', 'on', 'off', 'away', 'over', 'under',
      'through', 'around', 'about', 'along', 'across', 'back', 'forward'
    ];
    
    return commonParticles.includes(word.toLowerCase());
  }
}

/**
 * Create a new English phrase identifier with optional configuration
 * @param options Configuration options
 * @returns A new English phrase identifier instance
 */
export function createEnglishPhraseIdentifier(options?: EnglishPhraseIdentifierOptions): PhraseIdentifier {
  return new EnglishPhraseIdentifier(options);
}