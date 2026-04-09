/**
 * Conversation response types (ADR-142)
 *
 * Type definitions for constraint-based response selection:
 * ResponseAction, ResponseCandidate, ResponseIntent, and
 * conversation/evidence tracking records.
 *
 * Public interface: ResponseAction, ResponseCandidate, ResponseIntent,
 *   ConversationRecord, ConversationEntry, EvidenceRecord, EvidenceEntry.
 * Owner context: @sharpee/character / conversation
 */

import { Mood, Coherence } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Response actions
// ---------------------------------------------------------------------------

/**
 * The semantic action an NPC takes when responding to a topic.
 * Drives both conversation history tracking and language layer variant selection.
 */
export type ResponseAction =
  | 'tell'         // share the information truthfully
  | 'omit'         // knows but doesn't mention
  | 'lie'          // provides false information
  | 'deflect'      // changes the subject
  | 'refuse'       // explicitly won't answer
  | 'ask back'     // turns the question around
  | 'confess'      // reveals previously hidden truth
  | 'confabulate'; // fills gaps with invented details (NPC believes them)

// ---------------------------------------------------------------------------
// Response candidate (authored constraint → response mapping)
// ---------------------------------------------------------------------------

/**
 * A single authored response option for a topic.
 * The constraint evaluator selects among candidates using first-match-wins.
 */
export interface ResponseCandidate {
  /** The response action type. */
  action: ResponseAction;

  /** Language-layer message ID for this response. */
  messageId: string;

  /**
   * Predicate names that must all be satisfied for this candidate to match.
   * Empty array means "always matches" (used for .otherwise() fallback).
   */
  constraints: string[];

  /**
   * Author-defined parameters resolved at render time.
   * Keys are param names; values are resolver functions.
   */
  params?: Record<string, () => unknown>;

  /**
   * State mutations to apply when this response is selected.
   * Keys are state dimensions; values are target values.
   */
  stateMutations?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Response intent (output of constraint evaluation)
// ---------------------------------------------------------------------------

/**
 * The structured output of constraint evaluation, consumed by the ACL
 * and ultimately the language layer. Contains everything needed to
 * produce prose without coupling to the character model.
 */
export interface ResponseIntent {
  /** Which response action was taken. */
  action: ResponseAction;

  /** The topic being discussed. */
  topic: string;

  /** Author-assigned message ID. */
  messageId: string;

  /** Current NPC mood (for tone selection in language layer). */
  mood: Mood;

  /** Current NPC coherence (for sentence structure in language layer). */
  coherence: Coherence;

  /** Active conversation context label, if any. */
  context?: string;

  /** Resolved parameter values for the language layer. */
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Conversation history tracking
// ---------------------------------------------------------------------------

/** A single entry in the conversation record for one topic. */
export interface ConversationEntry {
  /** Which response action the NPC took. */
  action: ResponseAction;

  /** The turn number when this response was given. */
  turn: number;
}

/**
 * Per-NPC record of which topics have been discussed and what action
 * was taken. Keyed by topic name, stores the most recent response.
 * Previous responses are kept in a history array for contradiction detection.
 */
export interface ConversationRecord {
  /** Most recent response per topic. */
  responses: Map<string, ConversationEntry>;

  /** Full history per topic (for contradiction detection). */
  history: Map<string, ConversationEntry[]>;
}

// ---------------------------------------------------------------------------
// Evidence tracking
// ---------------------------------------------------------------------------

/** A single record of evidence the player presented to an NPC. */
export interface EvidenceEntry {
  /** The topic/evidence the player presented. */
  topic: string;

  /** The turn number when the evidence was presented. */
  turn: number;
}

/**
 * Per-NPC record of what evidence the player has presented.
 * Keyed by NPC entity ID.
 */
export type EvidenceRecord = Map<string, EvidenceEntry[]>;

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/** Create an empty ConversationRecord. */
export function createConversationRecord(): ConversationRecord {
  return {
    responses: new Map(),
    history: new Map(),
  };
}

/** Create an empty EvidenceRecord. */
export function createEvidenceRecord(): EvidenceRecord {
  return new Map();
}
