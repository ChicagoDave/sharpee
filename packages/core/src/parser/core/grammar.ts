/**
 * core/grammar.ts
 * Defines the interfaces and types for grammar processing in the parser
 */

import {
    Phrase,
    PhraseType
} from '../core/types'

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
   * Interface for a grammar implementation in any language
   */
  export interface Grammar {
    /**
     * Tokenizes input text into tokens
     * @param input The input text to tokenize
     */
    tokenize(input: string): Token[];
    
    /**
     * Tags tokens with their parts of speech
     * @param tokens The tokens to tag
     */
    tagPartsOfSpeech(tokens: Token[]): TaggedWord[];
    
    /**
     * Identifies phrases in a sequence of tagged words
     * @param words The tagged words to group into phrases
     */
    identifyPhrases(words: TaggedWord[]): Phrase[];
    
    /**
     * Matches a sequence of phrases against known command patterns
     * @param phrases The phrases to match
     */
    matchCommandPattern(phrases: Phrase[]): CommandPattern | null;
    
    /**
     * Creates a parsed command from phrases and a matched pattern
     * @param phrases The phrases in the command
     * @param pattern The matched command pattern
     */
    createParsedCommand(phrases: Phrase[], pattern: CommandPattern): ParsedCommand;
    
    /**
     * Resolves pronouns based on context
     * @param command The command containing pronouns to resolve
     * @param context The context to use for resolution
     */
    resolvePronouns(command: ParsedCommand, context: unknown): ParsedCommand;
    
    /**
     * Validates a parsed command for completeness and correctness
     * @param command The command to validate
     */
    validateCommand(command: ParsedCommand): ParsingError | null;
  }
  
  /**
   * Base class for language-specific grammar implementations
   */
  export abstract class BaseGrammar implements Grammar {
    abstract tokenize(input: string): Token[];
    abstract tagPartsOfSpeech(tokens: Token[]): TaggedWord[];
    abstract identifyPhrases(words: TaggedWord[]): Phrase[];
    abstract matchCommandPattern(phrases: Phrase[]): CommandPattern | null;
    
    /**
     * Default implementation for creating a parsed command
     */
    createParsedCommand(phrases: Phrase[], pattern: CommandPattern): ParsedCommand {
      // Basic implementation to be enhanced by language-specific classes
      const verbPhrase = phrases.find(p => p.type === PhraseType.VERB_PHRASE);
      const nounPhrases = phrases.filter(p => p.type === PhraseType.NOUN_PHRASE);
      const prepPhrases = phrases.filter(p => p.type === PhraseType.PREPOSITIONAL_PHRASE);
      
      // Extract the main parts of the command
      const verb = verbPhrase?.headWord?.text || '';
      const directObject = nounPhrases[0]?.headWord?.text;
      const indirectObject = nounPhrases[1]?.headWord?.text;
      
      // Extract prepositions and their objects
      const prepositions: Record<string, string> = {};
      prepPhrases.forEach(phrase => {
        const prep = phrase.words.find(w => w.partOfSpeech === PartOfSpeech.PREPOSITION);
        const object = phrase.words.find(w => w.partOfSpeech === PartOfSpeech.NOUN);
        if (prep && object) {
          prepositions[prep.text] = object.text;
        }
      });
      
      // Extract qualifiers (adjectives)
      const qualifiers: Record<string, string[]> = {};
      nounPhrases.forEach(phrase => {
        const noun = phrase.headWord?.text;
        if (noun) {
          qualifiers[noun] = phrase.words
            .filter(w => w.partOfSpeech === PartOfSpeech.ADJECTIVE)
            .map(w => w.text);
        }
      });
      
      return {
        originalText: phrases.flatMap(p => p.words).map(w => w.text).join(' '),
        verb,
        directObject,
        indirectObject,
        qualifiers,
        prepositions
      };
    }
    
    /**
     * Default implementation for resolving pronouns
     */
    resolvePronouns(command: ParsedCommand, context: unknown): ParsedCommand {
      // This is a placeholder - language-specific implementations will be more robust
      return command;
    }
    
    /**
     * Default implementation for validating commands
     */
    validateCommand(command: ParsedCommand): ParsingError | null {
      // Basic validation - verb is required
      if (!command.verb) {
        return {
          type: ParsingErrorType.UNKNOWN_VERB,
          message: 'No verb found in command.'
        };
      }
      
      return null;
    }
  }