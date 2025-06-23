// packages/core/src/parser/languages/en-US/phrase-identifier.ts

import {
    TaggedWord,
    PartOfSpeech,
    Phrase,
    PhraseType
  } from '../../core/types';
  
  /**
   * Configuration options for the phrase identifier
   */
  export interface PhraseIdentifierOptions {
    /**
     * Whether to treat compound nouns as single units
     */
    recognizeCompoundNouns?: boolean;
  
    /**
     * Whether to include prepositional phrases in noun phrases
     */
    nestPrepositionalPhrases?: boolean;
  
    /**
     * Whether to handle conjunctions by joining phrases
     */
    handleConjunctions?: boolean;
  }
  
  /**
   * Default options for English phrase identification
   */
  const DEFAULT_OPTIONS: PhraseIdentifierOptions = {
    recognizeCompoundNouns: true,
    nestPrepositionalPhrases: true,
    handleConjunctions: true
  };
  
  /**
   * Identifies meaningful phrases in sequences of words for English text
   */
  export class EnglishPhraseIdentifier {
    private options: PhraseIdentifierOptions;
  
    /**
     * Create a new English phrase identifier
     * @param options Configuration options
     */
    constructor(options: PhraseIdentifierOptions = {}) {
      this.options = { ...DEFAULT_OPTIONS, ...options };
    }
  
    /**
     * Group tagged words into meaningful phrases
     * @param words The tagged words to group into phrases
     * @returns An array of identified phrases
     */
    identifyPhrases(words: TaggedWord[]): Phrase[] {
      // Start with basic phrase identification
      let phrases = this.identifyBasicPhrases(words);
      
      // Apply additional processing based on options
      if (this.options.handleConjunctions) {
        phrases = this.handleConjunctions(phrases, words);
      }
      
      // Process prepositional phrases
      if (this.options.nestPrepositionalPhrases) {
        phrases = this.nestPrepositionalPhrases(phrases);
      }
      
      return phrases;
    }
  
    /**
     * Identify basic phrase types from word sequences
     */
    private identifyBasicPhrases(words: TaggedWord[]): Phrase[] {
      const phrases: Phrase[] = [];
      let currentPhrase: TaggedWord[] = [];
      let currentType: PhraseType | null = null;
  
      // Helper to finalize the current phrase and start a new one
      const finalizePhrase = () => {
        if (currentPhrase.length > 0 && currentType) {
          // Find the head word of the phrase
          const headWord = this.findHeadWord(currentPhrase, currentType);
          
          phrases.push({
            type: currentType,
            words: [...currentPhrase],
            headWord
          });
          
          currentPhrase = [];
          currentType = null;
        }
      };
  
      // Process each word
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const nextWord = i < words.length - 1 ? words[i + 1] : null;
  
        // Skip punctuation and unknown token types
        if (word.type !== 'word') {
          continue;
        }
  
        // Handle verb phrases - starts with a verb
        if (word.partOfSpeech === PartOfSpeech.VERB && !currentType) {
          finalizePhrase();
          currentType = PhraseType.VERB_PHRASE;
          currentPhrase.push(word);
  
          // Include adverbs immediately following the verb
          let j = i + 1;
          while (j < words.length && words[j].partOfSpeech === PartOfSpeech.ADVERB) {
            currentPhrase.push(words[j]);
            j++;
          }
          i = j - 1; // Adjust loop counter
        }
        
        // Handle preposition phrases - starts with a preposition
        else if (word.partOfSpeech === PartOfSpeech.PREPOSITION && (!currentType || currentType === PhraseType.PREPOSITIONAL_PHRASE)) {
          finalizePhrase();
          currentType = PhraseType.PREPOSITIONAL_PHRASE;
          currentPhrase.push(word);
          
          // Continue collecting words until the next phrase starter or conjunction
          let j = i + 1;
          while (
            j < words.length &&
            words[j].partOfSpeech !== PartOfSpeech.VERB &&
            words[j].partOfSpeech !== PartOfSpeech.PREPOSITION &&
            words[j].partOfSpeech !== PartOfSpeech.CONJUNCTION
          ) {
            currentPhrase.push(words[j]);
            j++;
          }
          i = j - 1; // Adjust loop counter
        }
        
        // Handle noun phrases - starts with articles, adjectives, or nouns
        else if (
          (word.partOfSpeech === PartOfSpeech.ARTICLE ||
           word.partOfSpeech === PartOfSpeech.ADJECTIVE ||
           word.partOfSpeech === PartOfSpeech.NOUN ||
           word.partOfSpeech === PartOfSpeech.PRONOUN ||
           word.partOfSpeech === PartOfSpeech.DETERMINER) &&
          (!currentType || currentType === PhraseType.NOUN_PHRASE)
        ) {
          if (!currentType) {
            currentType = PhraseType.NOUN_PHRASE;
          }
          currentPhrase.push(word);
          
          // If this is a determiner or article, look ahead for adjectives and nouns
          if (word.partOfSpeech === PartOfSpeech.DETERMINER || 
              word.partOfSpeech === PartOfSpeech.ARTICLE) {
            let j = i + 1;
            while (
              j < words.length &&
              (words[j].partOfSpeech === PartOfSpeech.ADJECTIVE ||
               words[j].partOfSpeech === PartOfSpeech.NOUN)
            ) {
              currentPhrase.push(words[j]);
              j++;
            }
            i = j - 1; // Adjust loop counter
          }
        }
        
        // Handle conjunctions by finalizing the current phrase
        else if (word.partOfSpeech === PartOfSpeech.CONJUNCTION) {
          finalizePhrase();
          // We'll handle the conjunction separately in a second pass
          currentPhrase.push(word);
          finalizePhrase();
        }
        
        // Unknown part of speech, add to current phrase if exists
        else if (currentType) {
          currentPhrase.push(word);
        }
        // Start a new noun phrase if no current phrase and word is unknown
        // Often unknown words are game-specific nouns
        else {
          currentType = PhraseType.NOUN_PHRASE;
          currentPhrase.push(word);
        }
      }
      
      // Finalize any remaining phrase
      finalizePhrase();
      
      return phrases;
    }
  
    /**
     * Find the head word of a phrase
     */
    private findHeadWord(words: TaggedWord[], phraseType: PhraseType): TaggedWord | undefined {
      if (words.length === 0) return undefined;
      
      switch (phraseType) {
        case PhraseType.VERB_PHRASE:
          // Head of verb phrase is the main verb
          return words.find(w => w.partOfSpeech === PartOfSpeech.VERB) || words[0];
          
        case PhraseType.NOUN_PHRASE:
          // Head of noun phrase is the last noun
          for (let i = words.length - 1; i >= 0; i--) {
            if (words[i].partOfSpeech === PartOfSpeech.NOUN) {
              return words[i];
            }
          }
          // If no noun found, a pronoun can be the head
          return words.find(w => w.partOfSpeech === PartOfSpeech.PRONOUN) || words[words.length - 1];
          
        case PhraseType.PREPOSITIONAL_PHRASE:
          // Head of prepositional phrase is the preposition
          return words.find(w => w.partOfSpeech === PartOfSpeech.PREPOSITION) || words[0];
          
        default:
          // Default to the last word
          return words[words.length - 1];
      }
    }
  
    /**
     * Handle conjunctions to join related phrases
     */
    private handleConjunctions(phrases: Phrase[], words: TaggedWord[]): Phrase[] {
      const result: Phrase[] = [];
      let i = 0;
      
      while (i < phrases.length) {
        const currentPhrase = phrases[i];
        
        // Look for a conjunction followed by a matching phrase type
        if (i < phrases.length - 2 &&
            this.isConjunctionPhrase(phrases[i + 1]) &&
            phrases[i + 2].type === currentPhrase.type) {
          
          // Create a joined phrase
          const conjunctionPhrase = phrases[i + 1];
          const nextPhrase = phrases[i + 2];
          
          const joinedWords = [
            ...currentPhrase.words,
            ...conjunctionPhrase.words,
            ...nextPhrase.words
          ];
          
          result.push({
            type: currentPhrase.type,
            words: joinedWords,
            headWord: this.findHeadWord(joinedWords, currentPhrase.type)
          });
          
          // Skip the processed phrases
          i += 3;
        } else {
          // No conjunction, add the phrase as is
          result.push(currentPhrase);
          i++;
        }
      }
      
      return result;
    }
  
    /**
     * Check if a phrase is a conjunction
     */
    private isConjunctionPhrase(phrase: Phrase): boolean {
      return phrase.words.length === 1 && 
             phrase.words[0].partOfSpeech === PartOfSpeech.CONJUNCTION;
    }
  
    /**
     * Process prepositional phrases to nest them within noun phrases
     */
    private nestPrepositionalPhrases(phrases: Phrase[]): Phrase[] {
      const result: Phrase[] = [];
      let currentNounPhrase: Phrase | null = null;
      
      for (const phrase of phrases) {
        if (phrase.type === PhraseType.NOUN_PHRASE) {
          // If we have a pending noun phrase, add it first
          if (currentNounPhrase) {
            result.push(currentNounPhrase);
          }
          currentNounPhrase = phrase;
        }
        else if (phrase.type === PhraseType.PREPOSITIONAL_PHRASE && currentNounPhrase) {
          // Check if this prepositional phrase modifies the current noun phrase
          // This heuristic assumes a prep phrase immediately following a noun phrase modifies it
          
          // Merge the prepositional phrase into the noun phrase
          currentNounPhrase = {
            type: PhraseType.NOUN_PHRASE,
            words: [...currentNounPhrase.words, ...phrase.words],
            headWord: currentNounPhrase.headWord // Keep the original head word
          };
        }
        else {
          // For other phrase types, add the current noun phrase if any
          if (currentNounPhrase) {
            result.push(currentNounPhrase);
            currentNounPhrase = null;
          }
          result.push(phrase);
        }
      }
      
      // Add any final noun phrase
      if (currentNounPhrase) {
        result.push(currentNounPhrase);
      }
      
      return result;
    }
  
    /**
     * Identify compound nouns in phrases
     * (e.g., "coffee table" as a single noun)
     */
    private identifyCompoundNouns(phrases: Phrase[]): Phrase[] {
      if (!this.options.recognizeCompoundNouns) {
        return phrases;
      }
      
      return phrases.map(phrase => {
        if (phrase.type !== PhraseType.NOUN_PHRASE) {
          return phrase;
        }
        
        const words = [...phrase.words];
        let i = 0;
        
        while (i < words.length - 1) {
          // Check for noun-noun sequences
          if (words[i].partOfSpeech === PartOfSpeech.NOUN && 
              words[i + 1].partOfSpeech === PartOfSpeech.NOUN) {
            
            // Mark the second noun as part of a compound
            words[i + 1].isCompound = true;
            words[i + 1].compoundStart = words[i];
          }
          i++;
        }
        
        return {
          ...phrase,
          words,
          headWord: this.findHeadWord(words, phrase.type)
        };
      });
    }
  }
  
  /**
   * Create a new English phrase identifier
   * @param options Configuration options
   */
  export function createEnglishPhraseIdentifier(options?: PhraseIdentifierOptions): EnglishPhraseIdentifier {
    return new EnglishPhraseIdentifier(options);
  }