/**
 * @file Base Parser Plugin
 * @description Abstract base class for language-specific parsers
 * 
 * This class provides common parsing functionality that can be
 * extended by language-specific implementations.
 */

import {
  IFParserPlugin,
  Token,
  TokenType,
  TaggedWord,
  POSType,
  ParsedCommand,
  Phrase,
  PhraseType
} from './types';

/**
 * Abstract base class for IF parser plugins
 * 
 * Provides default implementations for common parsing tasks
 * that can be overridden by language-specific parsers.
 */
export abstract class BaseIFParserPlugin implements IFParserPlugin {
  /**
   * Default tokenization implementation
   * Can be overridden for language-specific tokenization rules
   */
  tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let position = 0;
    
    // Regex to match different token types
    // Groups: whitespace | punctuation | numbers | words | symbols
    const regex = /(\s+)|([.,!?;:'"]+)|(\d+(?:\.\d+)?)|([a-zA-Z]+(?:[-'][a-zA-Z]+)*)|(.)/g;
    let match;
    
    while ((match = regex.exec(input)) !== null) {
      const value = match[0];
      let type: TokenType;
      
      if (match[1]) {
        // Skip whitespace
        position += value.length;
        continue;
      } else if (match[2]) {
        type = TokenType.PUNCTUATION;
      } else if (match[3]) {
        type = TokenType.NUMBER;
      } else if (match[4]) {
        type = TokenType.WORD;
      } else {
        type = TokenType.SYMBOL;
      }
      
      tokens.push({
        value,
        type,
        position
      });
      
      position += value.length;
    }
    
    return tokens;
  }
  
  /**
   * Normalize a phrase by removing articles and lemmatizing
   * Default implementation - should be overridden
   */
  normalizePhrase(phrase: string): string[] {
    // Split on whitespace and filter empty
    const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    
    // Remove common articles (should use language-specific list)
    const articles = ['a', 'an', 'the'];
    const filtered = words.filter(w => !articles.includes(w));
    
    // Lemmatize each word
    return filtered.map(w => this.lemmatize(w));
  }
  
  /**
   * Default phrase identification
   * Identifies basic phrase types based on POS tags
   */
  identifyPhrases(tagged: TaggedWord[]): Phrase[] {
    const phrases: Phrase[] = [];
    let i = 0;
    
    while (i < tagged.length) {
      const word = tagged[i];
      
      // Identify verb phrases
      if (word.tag === POSType.VERB) {
        const verbPhrase = this.extractVerbPhrase(tagged, i);
        phrases.push(verbPhrase);
        i = verbPhrase.end + 1;
        continue;
      }
      
      // Identify noun phrases
      if (this.isNounPhraseStart(word)) {
        const nounPhrase = this.extractNounPhrase(tagged, i);
        phrases.push(nounPhrase);
        i = nounPhrase.end + 1;
        continue;
      }
      
      // Identify prepositional phrases
      if (word.tag === POSType.PREPOSITION) {
        const prepPhrase = this.extractPrepositionalPhrase(tagged, i);
        phrases.push(prepPhrase);
        i = prepPhrase.end + 1;
        continue;
      }
      
      i++;
    }
    
    return phrases;
  }
  
  /**
   * Check if a word can start a noun phrase
   */
  protected isNounPhraseStart(word: TaggedWord): boolean {
    return word.tag === POSType.ARTICLE ||
           word.tag === POSType.DETERMINER ||
           word.tag === POSType.ADJECTIVE ||
           word.tag === POSType.NUMBER ||
           word.tag === POSType.NOUN ||
           word.tag === POSType.PRONOUN;
  }
  
  /**
   * Extract a verb phrase starting at the given index
   */
  protected extractVerbPhrase(tagged: TaggedWord[], start: number): Phrase {
    const words: TaggedWord[] = [tagged[start]];
    let end = start;
    
    // Include following adverbs
    for (let i = start + 1; i < tagged.length; i++) {
      if (tagged[i].tag === POSType.ADVERB) {
        words.push(tagged[i]);
        end = i;
      } else {
        break;
      }
    }
    
    return {
      type: PhraseType.VERB_PHRASE,
      words,
      start,
      end
    };
  }
  
  /**
   * Extract a noun phrase starting at the given index
   */
  protected extractNounPhrase(tagged: TaggedWord[], start: number): Phrase {
    const words: TaggedWord[] = [];
    let end = start;
    let hasNoun = false;
    
    for (let i = start; i < tagged.length; i++) {
      const word = tagged[i];
      
      // Articles, determiners, numbers, and adjectives can precede the noun
      if (word.tag === POSType.ARTICLE ||
          word.tag === POSType.DETERMINER ||
          word.tag === POSType.NUMBER ||
          word.tag === POSType.ADJECTIVE) {
        words.push(word);
        end = i;
      }
      // The noun itself
      else if (word.tag === POSType.NOUN || word.tag === POSType.PRONOUN) {
        words.push(word);
        end = i;
        hasNoun = true;
        
        // Check for compound nouns (noun followed by noun)
        if (i + 1 < tagged.length && tagged[i + 1].tag === POSType.NOUN) {
          continue;
        } else {
          break;
        }
      }
      // Stop if we hit something else after finding a noun
      else if (hasNoun) {
        break;
      }
      // If we haven't found a noun yet and hit something else, this isn't a noun phrase
      else {
        break;
      }
    }
    
    return {
      type: PhraseType.NOUN_PHRASE,
      words,
      start,
      end
    };
  }
  
  /**
   * Extract a prepositional phrase starting at the given index
   */
  protected extractPrepositionalPhrase(tagged: TaggedWord[], start: number): Phrase {
    const words: TaggedWord[] = [tagged[start]]; // The preposition
    let end = start;
    
    // A prepositional phrase should be followed by a noun phrase
    if (start + 1 < tagged.length) {
      const nounPhraseStart = start + 1;
      if (this.isNounPhraseStart(tagged[nounPhraseStart])) {
        const nounPhrase = this.extractNounPhrase(tagged, nounPhraseStart);
        words.push(...nounPhrase.words);
        end = nounPhrase.end;
      }
    }
    
    return {
      type: PhraseType.PREPOSITIONAL_PHRASE,
      words,
      start,
      end
    };
  }
  
  /**
   * Default grammar analysis implementation
   * Extracts basic command structure from phrases
   */
  analyzeGrammar(tagged: TaggedWord[]): ParsedCommand | null {
    // First identify phrases
    const phrases = this.identifyPhrases(tagged);
    
    // Look for a verb phrase (required for a valid command)
    const verbPhrase = phrases.find(p => p.type === PhraseType.VERB_PHRASE);
    if (!verbPhrase) {
      return null;
    }
    
    // Extract the verb
    const verbWord = verbPhrase.words.find(w => w.tag === POSType.VERB);
    if (!verbWord) {
      return null;
    }
    
    const command: ParsedCommand = {
      verb: verbWord.lemma || verbWord.value.toLowerCase(),
      adjectives: [],
      raw: tagged.map(w => w.original || w.value).join(' ')
    };
    
    // Look for direct object (noun phrase after verb)
    const directObjectPhrase = phrases.find(p => 
      p.type === PhraseType.NOUN_PHRASE &&
      p.start > verbPhrase.end
    );
    
    if (directObjectPhrase) {
      const { noun, adjectives } = this.extractNounAndAdjectives(directObjectPhrase);
      command.directObject = noun;
      command.adjectives = adjectives;
      
      // Store the full noun phrase for reference
      if (!command.details) command.details = {};
      command.details.directObjectWords = directObjectPhrase.words.map(w => w.value);
    }
    
    // Look for prepositional phrase
    const prepPhrase = phrases.find(p => p.type === PhraseType.PREPOSITIONAL_PHRASE);
    if (prepPhrase) {
      const prepWord = prepPhrase.words.find(w => w.tag === POSType.PREPOSITION);
      if (prepWord) {
        command.preposition = prepWord.value.toLowerCase();
        
        // Extract indirect object from the prepositional phrase
        const indirectNoun = this.extractNounFromPhrase(prepPhrase);
        if (indirectNoun) {
          command.indirectObject = indirectNoun;
          
          // Store the words for reference
          if (!command.details) command.details = {};
          command.details.indirectObjectWords = prepPhrase.words
            .slice(1) // Skip the preposition
            .map(w => w.value);
        }
      }
    }
    
    return command;
  }
  
  /**
   * Extract noun and adjectives from a noun phrase
   */
  protected extractNounAndAdjectives(phrase: Phrase): { noun: string; adjectives: string[] } {
    const adjectives: string[] = [];
    let noun = '';
    
    // Collect adjectives and find the main noun
    const nouns: string[] = [];
    
    for (const word of phrase.words) {
      if (word.tag === POSType.ADJECTIVE) {
        adjectives.push(word.value.toLowerCase());
      } else if (word.tag === POSType.NOUN) {
        nouns.push(word.value.toLowerCase());
      } else if (word.tag === POSType.PRONOUN) {
        noun = word.value.toLowerCase();
        break; // Pronoun is the object
      }
    }
    
    // If we found nouns, join them (could be compound noun)
    if (nouns.length > 0) {
      noun = nouns.join(' ');
    }
    
    return { noun, adjectives };
  }
  
  /**
   * Extract just the noun from a phrase (ignoring articles, adjectives, etc.)
   */
  protected extractNounFromPhrase(phrase: Phrase): string | null {
    const nouns = phrase.words.filter(w => 
      w.tag === POSType.NOUN || w.tag === POSType.PRONOUN
    );
    
    if (nouns.length === 0) {
      return null;
    }
    
    // Join compound nouns
    return nouns.map(w => w.value.toLowerCase()).join(' ');
  }
  
  // Abstract methods that must be implemented by language-specific parsers
  
  /**
   * Tag tokens with parts of speech
   * Must be implemented by language-specific parsers
   */
  abstract tagPOS(tokens: Token[]): TaggedWord[];
  
  /**
   * Lemmatize a word to its base form
   * Must be implemented by language-specific parsers
   */
  abstract lemmatize(word: string): string;
}
