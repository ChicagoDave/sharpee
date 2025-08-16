/**
 * Command types for the parsing phase
 * These types represent the syntactic structure of commands
 * without any world knowledge or entity resolution
 */

// Keep old interface temporarily for migration
export interface IParsedObjectReference {
  /** Original text from input */
  text: string;
  
  /** Possible vocabulary matches */
  candidates: string[];
  
  /** Optional modifiers (adjectives, etc.) */
  modifiers?: string[];
}

export interface IParsedCommandV1 {
  /** Raw input text */
  rawInput: string;
  
  /** Identified action verb */
  action: string;
  
  /** Direct object if present */
  directObject?: IParsedObjectReference;
  
  /** Indirect object if present */
  indirectObject?: IParsedObjectReference;
  
  /** Preposition if present */
  preposition?: string;
  
  /** Additional parsed elements */
  extras?: Record<string, any>;
}

// New rich information-preserving types

/**
 * Parts of speech classification
 */
export enum PartOfSpeech {
  VERB = 'VERB',
  NOUN = 'NOUN',
  ADJECTIVE = 'ADJECTIVE',
  ARTICLE = 'ARTICLE',
  PREPOSITION = 'PREPOSITION',
  PRONOUN = 'PRONOUN',
  DETERMINER = 'DETERMINER',
  CONJUNCTION = 'CONJUNCTION',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Token candidate from vocabulary
 */
export interface ITokenCandidate {
  /** Vocabulary ID */
  id: string;
  /** Type in vocabulary (verb, noun, etc.) */
  type: string;
  /** Confidence score */
  confidence: number;
}

/**
 * Individual token with full information
 */
export interface IToken {
  /** Original word as typed */
  word: string;
  /** Normalized form (lowercase, etc.) */
  normalized: string;
  /** Character position in original input */
  position: number;
  /** Length of the token */
  length: number;
  /** Possible parts of speech */
  partOfSpeech: PartOfSpeech[];
  /** Vocabulary candidates for this token */
  candidates: ITokenCandidate[];
}

/**
 * Verb phrase structure
 */
export interface IVerbPhrase {
  /** Indices into token array */
  tokens: number[];
  /** Original text (e.g., "look at") */
  text: string;
  /** Main verb */
  head: string;
  /** Verb particles ("at" in "look at") */
  particles?: string[];
}

/**
 * Noun phrase structure with all information preserved
 */
export interface INounPhrase {
  /** Indices into token array */
  tokens: number[];
  /** Original complete text (e.g., "the small red ball") */
  text: string;
  /** Head noun ("ball") */
  head: string;
  /** Modifiers/adjectives ("small", "red") */
  modifiers: string[];
  /** Articles ("the", "a", "an") */
  articles: string[];
  /** Determiners ("all", "every", "some") */
  determiners: string[];
  /** Vocabulary candidates for the head noun */
  candidates: string[];
}

/**
 * Preposition phrase structure
 */
export interface IPrepPhrase {
  /** Indices into token array */
  tokens: number[];
  /** Preposition text */
  text: string;
}

/**
 * Result of parsing phase - rich structure with all information preserved
 */
export interface IParsedCommand {
  /** Raw input text exactly as typed */
  rawInput: string;
  
  /** All tokens with position and classification */
  tokens: IToken[];
  
  /** Structured command components */
  structure: {
    /** Verb phrase */
    verb: IVerbPhrase;
    /** Direct object noun phrase */
    directObject?: INounPhrase;
    /** Preposition phrase */
    preposition?: IPrepPhrase;
    /** Indirect object noun phrase */
    indirectObject?: INounPhrase;
  };
  
  /** Which grammar pattern matched (e.g., "VERB_NOUN_PREP_NOUN") */
  pattern: string;
  
  /** Parser confidence in this interpretation */
  confidence: number;
  
  /** Identified action (for compatibility) */
  action: string;
  
  /** Additional parsed elements */
  extras?: Record<string, any>;
}

/**
 * Errors that can occur during parsing
 */
export interface IParseError {
  type: 'PARSE_ERROR';
  code: 'UNKNOWN_COMMAND' | 'INVALID_SYNTAX' | 'AMBIGUOUS_INPUT';
  message: string;
  input: string;
  position?: number;
}
