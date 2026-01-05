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

  // ADR-080 additions for multi-object support
  /** True if this represents "all" (e.g., "take all") */
  isAll?: boolean;
  /** True if this is a list of objects (e.g., "take knife and lamp") */
  isList?: boolean;
  /** Individual items when isList is true */
  items?: INounPhrase[];
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

  // ADR-080 additions

  /** Raw text slot values (for patterns with .text() slots or :slot... syntax) */
  textSlots?: Map<string, string>;

  /** Excluded noun phrases for "all but X" patterns */
  excluded?: INounPhrase[];

  /** Instrument noun phrase for "with/through/using" clauses */
  instrument?: INounPhrase;

  // ADR-082 additions

  /** Typed slot values for non-entity slots (number, ordinal, direction, etc.) */
  typedSlots?: Map<string, import('@sharpee/if-domain').TypedSlotValue>;

  /** Vocabulary slot matches (from .fromVocabulary() patterns) */
  vocabularySlots?: Map<string, import('@sharpee/if-domain').GrammarVocabularyMatch>;

  /** Matched manner adverb (from .manner() patterns) - feeds intention.manner */
  manner?: string;
}

/**
 * Parse error codes
 *
 * Error hierarchy (most specific to least):
 * - NO_VERB: Empty or no verb detected
 * - UNKNOWN_VERB: First word isn't a known verb
 * - MISSING_OBJECT: Verb needs a direct object
 * - MISSING_INDIRECT: Verb needs an indirect object (where/what)
 * - ENTITY_NOT_FOUND: Object name not recognized
 * - SCOPE_VIOLATION: Object exists but can't be accessed
 * - AMBIGUOUS_INPUT: Multiple valid interpretations
 * - UNKNOWN_COMMAND: Generic fallback (legacy)
 * - INVALID_SYNTAX: Generic fallback (legacy)
 */
export type ParseErrorCode =
  | 'NO_VERB'           // Empty input or no verb detected
  | 'UNKNOWN_VERB'      // First word isn't a recognized verb
  | 'MISSING_OBJECT'    // Verb requires direct object: "What do you want to take?"
  | 'MISSING_INDIRECT'  // Need more info: "Put the lamp where?"
  | 'ENTITY_NOT_FOUND'  // "I don't see any 'xyzzy' here"
  | 'SCOPE_VIOLATION'   // "You can't reach the lamp"
  | 'AMBIGUOUS_INPUT'   // Multiple interpretations
  | 'UNKNOWN_COMMAND'   // Legacy: generic unknown
  | 'INVALID_SYNTAX';   // Legacy: generic syntax error

/**
 * Errors that can occur during parsing
 */
export interface IParseError {
  type: 'PARSE_ERROR';
  code: ParseErrorCode;

  /** Message ID for lang layer lookup (e.g., 'parser.error.unknownVerb') */
  messageId: string;

  /** Fallback message if lang layer lookup fails */
  message: string;

  /** Original input */
  input: string;

  /** Character position of error (if applicable) */
  position?: number;

  // Contextual information for better error messages

  /** Recognized verb (if any) */
  verb?: string;

  /** The word that failed (for ENTITY_NOT_FOUND, UNKNOWN_VERB) */
  failedWord?: string;

  /** Which slot failed (directObject, indirectObject) */
  slot?: string;

  /** Suggestion for correction */
  suggestion?: string;

  /** For AMBIGUOUS_INPUT: the candidates */
  candidates?: Array<{
    entityId: string;
    label: string;
  }>;
}
