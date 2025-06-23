/**
 * English Grammar Analyzer for Sharpee IF Engine
 */

import { 
  TaggedWord, 
  POSType, 
  Phrase, 
  PhraseType, 
  ParsedCommand,
  GrammarAnalyzer 
} from '@sharpee/core';

/**
 * English-specific grammar analyzer options
 */
export interface EnglishGrammarAnalyzerOptions {
  /**
   * Whether to extract adjectives for disambiguation
   */
  extractAdjectives?: boolean;
  
  /**
   * Whether to handle implicit objects (e.g., "take" -> "take it")
   */
  handleImplicitObjects?: boolean;
}

/**
 * Default English grammar analyzer options
 */
const DEFAULT_OPTIONS: EnglishGrammarAnalyzerOptions = {
  extractAdjectives: true,
  handleImplicitObjects: true
};

/**
 * English language grammar analyzer
 */
export class EnglishGrammarAnalyzer implements GrammarAnalyzer {
  private options: EnglishGrammarAnalyzerOptions;
  
  /**
   * Create a new English grammar analyzer
   * @param options Configuration options
   */
  constructor(options: EnglishGrammarAnalyzerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Analyze phrases to extract a command
   * @param phrases The phrases to analyze
   * @param taggedWords The tagged words (for context)
   * @returns A parsed command, or null if no valid command could be extracted
   */
  analyzeCommand(phrases: Phrase[], taggedWords: TaggedWord[]): ParsedCommand | null {
    // Must have at least one phrase
    if (phrases.length === 0) {
      return null;
    }
    
    // Look for a verb phrase (a valid command must have a verb)
    const verbPhrase = phrases.find(p => p.type === PhraseType.VERB_PHRASE);
    if (!verbPhrase) {
      return null;
    }
    
    // Get the verb from the verb phrase
    const verb = this.extractVerb(verbPhrase);
    if (!verb) {
      return null;
    }
    
    // Initialize the command structure
    const command: ParsedCommand = {
      verb,
      adjectives: [],
      originalText: taggedWords.map(w => w.value).join(' ')
    };
    
    // Look for a direct object (noun phrase)
    const directObjectPhrase = phrases.find(p => 
      p.type === PhraseType.NOUN_PHRASE &&
      p.start > verbPhrase.end
    );
    
    if (directObjectPhrase) {
      command.directObject = this.extractNoun(directObjectPhrase);
      
      // Extract adjectives if enabled
      if (this.options.extractAdjectives) {
        command.adjectives = this.extractAdjectives(directObjectPhrase);
      }
    } else if (this.options.handleImplicitObjects) {
      // Some commands may have implicit objects (e.g., "look" -> "look around")
      // or contextual objects (e.g., "take" might refer to the last mentioned object)
      if (this.verbRequiresObject(verb)) {
        // Set a placeholder for now, the command handler can resolve it
        command.directObject = 'it';
      }
    }
    
    // Look for an indirect object (prepositional phrase)
    const prepPhrase = phrases.find(p => p.type === PhraseType.PREPOSITIONAL_PHRASE);
    if (prepPhrase) {
      // Get the preposition
      const preposition = this.extractPreposition(prepPhrase);
      if (preposition) {
        command.preposition = preposition;
        
        // Get the indirect object (noun after the preposition)
        const indirectObject = this.extractIndirectObject(prepPhrase);
        if (indirectObject) {
          command.indirectObject = indirectObject;
        }
      }
    }
    
    return command;
  }
  
  /**
   * Extract the verb from a verb phrase
   * @param verbPhrase The verb phrase
   * @returns The extracted verb, or undefined if none found
   */
  private extractVerb(verbPhrase: Phrase): string | undefined {
    // Find the first verb in the phrase
    const verbWord = verbPhrase.words.find(w => w.tag === POSType.VERB);
    
    if (verbWord) {
      // Use the lemma if available, otherwise the original word
      return verbWord.lemma || verbWord.value.toLowerCase();
    }
    
    // If no verb found (shouldn't happen in a verb phrase), use the first word
    return verbPhrase.words[0]?.value.toLowerCase();
  }
  
  /**
   * Extract the main noun from a noun phrase
   * @param nounPhrase The noun phrase
   * @returns The extracted noun
   */
  private extractNoun(nounPhrase: Phrase): string {
    // Get all the words except articles
    const wordsWithoutArticles = nounPhrase.words.filter(
      w => w.tag !== POSType.ARTICLE
    );
    
    // If no words left, use the whole phrase
    if (wordsWithoutArticles.length === 0) {
      return nounPhrase.words.map(w => w.value.toLowerCase()).join(' ');
    }
    
    // Find the last noun in the phrase (head noun)
    const nouns = wordsWithoutArticles.filter(w => w.tag === POSType.NOUN);
    
    if (nouns.length > 0) {
      // If there are multiple nouns, join them (could be a compound noun)
      if (nouns.length > 1) {
        return nouns.map(w => w.value.toLowerCase()).join(' ');
      }
      
      // Otherwise, use the single noun
      return nouns[0].value.toLowerCase();
    }
    
    // If no noun found, use the whole phrase without articles
    return wordsWithoutArticles.map(w => w.value.toLowerCase()).join(' ');
  }
  
  /**
   * Extract adjectives from a noun phrase
   * @param nounPhrase The noun phrase
   * @returns Array of adjectives
   */
  private extractAdjectives(nounPhrase: Phrase): string[] {
    // Find all adjectives in the phrase
    const adjectives = nounPhrase.words
      .filter(w => w.tag === POSType.ADJECTIVE)
      .map(w => w.value.toLowerCase());
    
    return adjectives;
  }
  
  /**
   * Extract the preposition from a prepositional phrase
   * @param prepPhrase The prepositional phrase
   * @returns The extracted preposition, or undefined if none found
   */
  private extractPreposition(prepPhrase: Phrase): string | undefined {
    // Find the first preposition in the phrase
    const prepWord = prepPhrase.words.find(w => w.tag === POSType.PREPOSITION);
    
    if (prepWord) {
      return prepWord.value.toLowerCase();
    }
    
    return undefined;
  }
  
  /**
   * Extract the indirect object from a prepositional phrase
   * @param prepPhrase The prepositional phrase
   * @returns The extracted indirect object, or undefined if none found
   */
  private extractIndirectObject(prepPhrase: Phrase): string | undefined {
    // Skip the preposition (first word)
    const wordsAfterPrep = prepPhrase.words.slice(1);
    
    // Create a temporary noun phrase from the words after the preposition
    const tempNounPhrase: Phrase = {
      type: PhraseType.NOUN_PHRASE,
      words: wordsAfterPrep,
      start: 0,
      end: wordsAfterPrep.length - 1
    };
    
    // Extract the noun using our noun extraction method
    return this.extractNoun(tempNounPhrase);
  }
  
  /**
   * Check if a verb typically requires an object
   * @param verb The verb to check
   * @returns True if the verb typically requires an object
   */
  private verbRequiresObject(verb: string): boolean {
    // Common IF verbs that typically require an object
    const verbsRequiringObjects = [
      'take', 'get', 'drop', 'put', 'open', 'close', 'examine', 'x',
      'read', 'move', 'push', 'pull', 'turn', 'attack', 'break', 'cut',
      'eat', 'drink', 'wear', 'remove', 'use', 'give', 'show', 'throw'
    ];
    
    return verbsRequiringObjects.includes(verb.toLowerCase());
  }
}

/**
 * Create a new English grammar analyzer with optional configuration
 * @param options Configuration options
 * @returns A new English grammar analyzer instance
 */
export function createEnglishGrammarAnalyzer(options?: EnglishGrammarAnalyzerOptions): GrammarAnalyzer {
  return new EnglishGrammarAnalyzer(options);
}