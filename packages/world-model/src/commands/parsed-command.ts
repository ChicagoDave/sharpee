/**
 * Command types for the parsing phase
 * These types represent the syntactic structure of commands
 * without any world knowledge or entity resolution
 */

// Keep old interface temporarily for migration
export interface IParsedObjectReference {
  /** Original text from input */
  text: string;
  
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
  /**
   * The content words, without the leading articles and determiners the
   * parser split off ("small red ball" for "the small red ball"; ADR-385 D2).
   * Empty for a bare all-phrase ("take all").
   */
  text: string;
  /** Head noun: the last content word ("ball") */
  head: string;
  /** The content words before the head ("small", "red") */
  modifiers: string[];
  /** The leading articles the parser split off ("the", "a", "an"), normalized */
  articles: string[];
  /**
   * The leading determiners the parser split off ("my", "some", "all"),
   * normalized; for an all-phrase the all word comes first ("everything").
   */
  determiners: string[];
  /**
   * A determiner marked the phrase as the actor's own ("my"): resolution
   * prefers what the actor carries or wears when something there matches
   * (ADR-385 D2).
   */
  ownedByActor?: boolean;
  /**
   * The entity ids a constrained grammar slot admitted at parse time
   * (ADR-385 D4). The validator resolves such a phrase only among its own
   * candidates that are also here; the set narrows and never adds. Absent
   * for a phrase from an unconstrained slot. A list item carries its own.
   */
  scope?: import('@sharpee/core').EntityId[];

  // ADR-080 additions for multi-object support
  /** True if this represents "all" (e.g., "take all") */
  isAll?: boolean;
  /** True if this is a list of objects (e.g., "take knife and lamp") */
  isList?: boolean;
  /** Individual items when isList is true */
  items?: INounPhrase[];

  // ADR-089 pronoun resolution
  /** Pre-resolved entity ID (e.g., when "it" was resolved during parsing) */
  entityId?: string;

  // ADR-104 implicit inference
  /** True if this noun phrase was a pronoun (e.g., "it", "them") */
  wasPronoun?: boolean;

  /**
   * The matched rule's slot this phrase filled (`item`, `peg`), so a reader
   * can bind it by name whichever seat it sits in. Absent when the phrase
   * came from no named slot.
   */
  slot?: string;
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

  /**
   * Conversation topic for ".topic()" slots (ADR-231 D4)
   * The parser fills `text` (verbatim, articles preserved, for rendering and
   * quoted-row matching) and `phrase` (the same words with their leading
   * articles and determiners split off, ADR-385 D2, for the validator's
   * entity-first attempt) — it never resolves entities. `entity` exists for
   * shape parity with IValidatedCommand.topic and is populated by the
   * validator, never here.
   */
  topic?: {
    /** Verbatim topic text as typed */
    text: string;
    /** The topic as a noun phrase: content words, articles and determiners split once */
    phrase: INounPhrase;
    /** Never set by the parser; see IValidatedCommand.topic */
    entity?: import('@sharpee/core').EntityId;
  };

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
 * The bindings a parse error's language template reads: the verb the parser
 * recognised, the content words of the phrase that named nothing, and the
 * slot the input stopped short of. Each is present only when the parser has it.
 */
export interface ParseErrorParams {
  verb?: string;
  noun?: string;
  slot?: string;
}

/**
 * Errors that can occur during parsing. The error carries no sentence: the
 * language renders `messageId` with `params` (ADR-387 D3).
 */
export interface IParseError {
  type: 'PARSE_ERROR';
  code: ParseErrorCode;

  /** The language template that words this failure (e.g., 'parser.error.unknownVerb') */
  messageId: string;

  /** The template's bindings */
  params: ParseErrorParams;

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

  /** For SCOPE_VIOLATION: the entity the matcher found in view but the slot's base did not admit (ADR-385 D8) */
  entityId?: string;

  /** For SCOPE_VIOLATION: the base the slot required, which words the message */
  requiredScope?: 'carried' | 'touchable' | 'visible';

  /** Suggestion for correction */
  suggestion?: string;

  /** For AMBIGUOUS_INPUT: the candidates */
  candidates?: Array<{
    entityId: string;
    label: string;
  }>;
}
