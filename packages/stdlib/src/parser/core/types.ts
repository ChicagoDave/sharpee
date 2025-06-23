// packages/core/src/parser/core/types.ts

/**
 * Represents a token from the input text
 */
export interface Token {
    /** The original text of the token */
    text: string;
    
    /** Optional normalized form (lowercase, trimmed, etc.) */
    normalized?: string;
    
    /** The type of token */
    type: TokenType;
    
    /** Position in the original input */
    position: number;
    
    /** Flag for compound verbs */
    isCompoundVerb?: boolean;
    
    /** Original tokens if this is a compound */
    parts?: Token[];
    
    /** Extra metadata */
    [key: string]: any;
  }
  
  /**
   * Types of tokens that can be identified in text
   */
  export enum TokenType {
    WORD = 'word',           // Regular word
    NUMBER = 'number',       // Numeric value
    PUNCTUATION = 'punct',   // Punctuation mark
    QUOTED = 'quoted',       // Text in quotes
    WHITESPACE = 'space',    // Whitespace
    UNKNOWN = 'unknown'      // Unrecognized token
  }
  
  /**
   * Parts of speech for words in a command
   */
  export enum PartOfSpeech {
    VERB = 'verb',           // Action word
    NOUN = 'noun',           // Object or entity
    ADJECTIVE = 'adj',       // Descriptor
    ARTICLE = 'article',     // a, an, the
    PREPOSITION = 'prep',    // Positional word (in, on, under)
    CONJUNCTION = 'conj',    // Connecting word (and, or)
    PRONOUN = 'pronoun',     // it, them, her, etc.
    DETERMINER = 'det',      // this, that, these, those
    ADVERB = 'adv',          // Modifier of verb (quickly, carefully)
    INTERJECTION = 'interj', // Exclamation (hey, wow)
    UNKNOWN = 'unknown'      // Unrecognized part of speech
  }
  
  /**
   * A word with its assigned part of speech
   */
  export interface TaggedWord extends Token {
    /** The part of speech assigned to this word */
    partOfSpeech: PartOfSpeech;
    
    /** Confidence level of the part of speech assignment (0-1) */
    confidence?: number;
    
    /** Base/lemma form of the word (e.g., "running" -> "run") */
    lemma?: string;
    
    /** Whether this word is part of a compound */
    isCompound?: boolean;
    
    /** For compound words, the token that starts the compound */
    compoundStart?: TaggedWord;
  }
  
  /**
   * A phrase is a meaningful group of tagged words
   */
  export interface Phrase {
    /** The type of phrase */
    type: PhraseType;
    
    /** The words that make up this phrase */
    words: TaggedWord[];
    
    /** The most important word in this phrase (e.g., head noun in noun phrase) */
    headWord?: TaggedWord;
    
    /** For nested phrases, the parent phrase */
    parent?: Phrase;
    
    /** For phrases with nested structure, child phrases */
    children?: Phrase[];
  }
  
  /**
   * Types of phrases that can be identified in a command
   */
  export enum PhraseType {
    VERB_PHRASE = 'verb_phrase',       // A verb and its modifiers
    NOUN_PHRASE = 'noun_phrase',       // A noun and its modifiers
    PREPOSITIONAL_PHRASE = 'prep_phrase', // A preposition and its object
    CONJUNCTION_PHRASE = 'conj_phrase', // A conjunction joining phrases
    UNKNOWN = 'unknown'                // Unrecognized phrase type
  }
  
  /**
   * A command pattern defines a recognized command structure
   */
  export interface CommandPattern {
    /** Unique identifier for this pattern */
    id: string;
    
    /** Human-readable description of this pattern */
    description: string;
    
    /** Sequence of phrase types that make up this pattern */
    structure: PhraseType[];
    
    /** How to extract arguments from matching commands */
    argumentMapping: Record<string, number>;
  }
  
  /**
  * A parsed command ready for execution
  */
export interface ParsedCommand {
  /** The original input text */
  originalText: string;
  
  /** The verb representing the action */
  verb: string;
  
  /** The primary object of the action (direct object) */
  directObject?: string;
  
  /** The secondary object of the action (indirect object) */
  indirectObject?: string;
  
  /** Additional qualifiers (e.g., adjectives for disambiguation) */
  qualifiers: Record<string, string[]>;
  
  /** Prepositions and their objects */
  prepositions: Record<string, string>;
  
  /** Raw input text (used for handler routing) */
  raw?: string;
  
  /** For complex commands, any additional data needed for execution */
  metadata?: Record<string, any>;
}
  
  /**
   * Result of a parsing operation
   */
  export interface ParsingResult {
    /** Whether parsing was successful */
    success: boolean;
    
    /** The parsed command if successful */
    command?: ParsedCommand;
    
    /** Ambiguities found during parsing */
    ambiguities?: Ambiguity[];
    
    /** Error information if parsing failed */
    error?: ParsingError;
  }
  
  /**
   * Represents an ambiguity in the parsed input
   */
  export interface Ambiguity {
    /** Type of ambiguity */
    type: AmbiguityType;
    
    /** The original word or phrase that's ambiguous */
    original: string;
    
    /** Possible interpretations */
    candidates: string[];
    
    /** Which argument this ambiguity affects */
    affectedArgument: string;
  }
  
  /**
   * Types of ambiguities that can occur during parsing
   */
  export enum AmbiguityType {
    OBJECT_REFERENCE = 'object',     // Multiple matching objects
    VERB_REFERENCE = 'verb',         // Multiple matching verbs
    PRONOUN_REFERENCE = 'pronoun',   // Unclear pronoun reference
    INCOMPLETE_COMMAND = 'incomplete' // Missing required elements
  }
  
  /**
   * Error information for failed parsing
   */
  export interface ParsingError {
    /** Type of error */
    type: ParsingErrorType;
    
    /** Human-readable error message */
    message: string;
    
    /** Position in the input where the error occurred */
    position?: number;
  }
  
  /**
   * Types of errors that can occur during parsing
   */
  export enum ParsingErrorType {
    UNKNOWN_VERB = 'unknown_verb',           // Verb not recognized
    UNKNOWN_OBJECT = 'unknown_object',       // Object not recognized
    INVALID_SYNTAX = 'invalid_syntax',       // Command structure not valid
    INCOMPLETE_COMMAND = 'incomplete_command' // Missing required elements
  }
  
  /**
   * Phrase construction helper - creates a phrase from words
   */
  export function createPhrase(
    type: PhraseType, 
    words: TaggedWord[], 
    headWord?: TaggedWord
  ): Phrase {
    return {
      type,
      words,
      headWord: headWord || findDefaultHeadWord(words, type)
    };
  }
  
  /**
   * Find the default head word based on phrase type
   */
  function findDefaultHeadWord(words: TaggedWord[], type: PhraseType): TaggedWord | undefined {
    if (words.length === 0) return undefined;
    
    switch (type) {
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
        
      case PhraseType.CONJUNCTION_PHRASE:
        // Head of conjunction phrase is the conjunction
        return words.find(w => w.partOfSpeech === PartOfSpeech.CONJUNCTION) || words[0];
        
      default:
        // Default to the last word
        return words[words.length - 1];
    }
  }
  
  /**
   * Merge two phrases into one
   */
  export function mergePhrases(
    phrase1: Phrase,
    phrase2: Phrase,
    type: PhraseType = phrase1.type
  ): Phrase {
    const mergedWords = [...phrase1.words, ...phrase2.words];
    return {
      type,
      words: mergedWords,
      headWord: findDefaultHeadWord(mergedWords, type),
      children: [phrase1, phrase2]
    };
  }
  
  /**
   * Add a child phrase to a parent phrase
   */
  export function addChildPhrase(parent: Phrase, child: Phrase): Phrase {
    if (!parent.children) {
      parent.children = [];
    }
    
    parent.children.push({...child, parent});
    
    return parent;
  }
  
  /**
   * Create a verb phrase from words
   */
  export function createVerbPhrase(words: TaggedWord[]): Phrase {
    return createPhrase(PhraseType.VERB_PHRASE, words);
  }
  
  /**
   * Create a noun phrase from words
   */
  export function createNounPhrase(words: TaggedWord[]): Phrase {
    return createPhrase(PhraseType.NOUN_PHRASE, words);
  }
  
  /**
   * Create a prepositional phrase from words
   */
  export function createPrepositionalPhrase(words: TaggedWord[]): Phrase {
    return createPhrase(PhraseType.PREPOSITIONAL_PHRASE, words);
  }
  
  /**
   * Extract the text of a phrase
   */
  export function getPhraseText(phrase: Phrase): string {
    return phrase.words.map(w => w.text).join(' ');
  }
  
  /**
   * Get the lemma form of the head word of a phrase
   */
  export function getHeadLemma(phrase: Phrase): string | undefined {
    return phrase.headWord?.lemma;
  }
  
  /**
   * Get all qualifying adjectives for a noun phrase
   */
  export function getNounPhraseAdjectives(phrase: Phrase): TaggedWord[] {
    if (phrase.type !== PhraseType.NOUN_PHRASE) {
      return [];
    }
    
    return phrase.words.filter(word => 
      word.partOfSpeech === PartOfSpeech.ADJECTIVE
    );
  }
  
  /**
   * Extract all nouns from a phrase (for compound nouns)
   */
  export function getAllNouns(phrase: Phrase): TaggedWord[] {
    return phrase.words.filter(word => 
      word.partOfSpeech === PartOfSpeech.NOUN
    );
  }
  
  /**
   * Check if a phrase includes a specific word
   */
  export function phraseContainsWord(phrase: Phrase, wordText: string): boolean {
    const normalized = wordText.toLowerCase();
    return phrase.words.some(word => 
      (word.normalized || word.text.toLowerCase()) === normalized
    );
  }
  
  /**
   * Find a specific part of speech in a phrase
   */
  export function findPartOfSpeech(phrase: Phrase, pos: PartOfSpeech): TaggedWord | undefined {
    return phrase.words.find(word => word.partOfSpeech === pos);
  }
  
  /**
   * Find all instances of a part of speech in a phrase
   */
  export function findAllPartsOfSpeech(phrase: Phrase, pos: PartOfSpeech): TaggedWord[] {
    return phrase.words.filter(word => word.partOfSpeech === pos);
  }
  