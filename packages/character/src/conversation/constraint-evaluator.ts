/**
 * Constraint evaluator (ADR-142)
 *
 * Evaluates authored response constraints against NPC character state
 * to select the appropriate response. Uses first-match-wins ordering
 * with .otherwise() fallback.
 *
 * Also handles response recording, contradiction detection, and
 * evidence tracking.
 *
 * Public interface: evaluateConstraints, ConstraintEvaluator.
 * Owner context: @sharpee/character / conversation
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import {
  ResponseCandidate,
  ResponseAction,
  ConversationRecord,
  ConversationEntry,
  EvidenceRecord,
  EvidenceEntry,
  createConversationRecord,
  createEvidenceRecord,
} from './response-types';

// ---------------------------------------------------------------------------
// Contradiction
// ---------------------------------------------------------------------------

/** A detected contradiction in conversation history. */
export interface Contradiction {
  /** The topic where the contradiction was detected. */
  topic: string;

  /** The previous response action for this topic. */
  previousAction: ResponseAction;

  /** The new response action that contradicts the previous one. */
  currentAction: ResponseAction;

  /** Turn of the previous response. */
  previousTurn: number;

  /** Turn of the current response. */
  currentTurn: number;
}

// ---------------------------------------------------------------------------
// Pure evaluation function
// ---------------------------------------------------------------------------

/**
 * Evaluate a list of response candidates against NPC character state.
 * Uses first-match-wins: the first candidate whose constraints are all
 * satisfied is selected. Empty constraints means "always matches"
 * (the .otherwise() fallback).
 *
 * @param candidates - Ordered list of response candidates for this topic
 * @param npcTrait - The NPC's CharacterModelTrait for predicate evaluation
 * @returns The selected candidate, or undefined if no candidate matches
 */
export function evaluateConstraints(
  candidates: ResponseCandidate[],
  npcTrait: CharacterModelTrait,
): ResponseCandidate | undefined {
  for (const candidate of candidates) {
    if (candidate.constraints.length === 0) {
      // .otherwise() — always matches
      return candidate;
    }

    const allSatisfied = candidate.constraints.every(pred =>
      npcTrait.evaluate(pred),
    );

    if (allSatisfied) {
      return candidate;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Stateful evaluator (owns conversation records and evidence)
// ---------------------------------------------------------------------------

/**
 * Stateful constraint evaluator that tracks conversation history,
 * detects contradictions, and records evidence presentations.
 *
 * One instance per NPC. State survives save/restore.
 */
export class ConstraintEvaluator {
  /** Per-NPC conversation records. Keyed by NPC entity ID. */
  private readonly records: Map<string, ConversationRecord> = new Map();

  /** Evidence the player has presented. Keyed by NPC entity ID. */
  private readonly evidence: EvidenceRecord = createEvidenceRecord();

  // =========================================================================
  // Response evaluation and recording
  // =========================================================================

  /**
   * Evaluate constraints and select the best response for a topic.
   *
   * @param candidates - Ordered response candidates
   * @param npcTrait - NPC's character model trait
   * @returns The selected candidate, or undefined
   */
  evaluate(
    candidates: ResponseCandidate[],
    npcTrait: CharacterModelTrait,
  ): ResponseCandidate | undefined {
    return evaluateConstraints(candidates, npcTrait);
  }

  /**
   * Record that an NPC gave a specific response to a topic.
   * Updates both the current response and the history.
   *
   * @param npcId - The NPC entity ID
   * @param topic - The topic name
   * @param action - The response action taken
   * @param turn - The current turn number
   * @returns A Contradiction if this response contradicts a previous one, or undefined
   */
  recordResponse(
    npcId: string,
    topic: string,
    action: ResponseAction,
    turn: number,
  ): Contradiction | undefined {
    const record = this.getOrCreateRecord(npcId);
    const entry: ConversationEntry = { action, turn };

    // Check for contradiction before updating
    const previous = record.responses.get(topic);
    let contradiction: Contradiction | undefined;

    if (previous && this.isContradiction(previous.action, action)) {
      contradiction = {
        topic,
        previousAction: previous.action,
        currentAction: action,
        previousTurn: previous.turn,
        currentTurn: turn,
      };
    }

    // Update current response
    record.responses.set(topic, entry);

    // Append to history
    const history = record.history.get(topic) ?? [];
    history.push(entry);
    record.history.set(topic, history);

    return contradiction;
  }

  /**
   * Get the conversation record for an NPC.
   *
   * @param npcId - The NPC entity ID
   * @returns The conversation record, or undefined if no conversation has occurred
   */
  getRecord(npcId: string): ConversationRecord | undefined {
    return this.records.get(npcId);
  }

  /**
   * Check whether a topic has been discussed with an NPC.
   *
   * @param npcId - The NPC entity ID
   * @param topic - The topic name
   * @returns True if the topic has been discussed
   */
  hasDiscussed(npcId: string, topic: string): boolean {
    const record = this.records.get(npcId);
    return record?.responses.has(topic) ?? false;
  }

  /**
   * Get the most recent response action for a topic.
   *
   * @param npcId - The NPC entity ID
   * @param topic - The topic name
   * @returns The most recent conversation entry, or undefined
   */
  getLastResponse(npcId: string, topic: string): ConversationEntry | undefined {
    return this.records.get(npcId)?.responses.get(topic);
  }

  // =========================================================================
  // Evidence tracking
  // =========================================================================

  /**
   * Record that the player presented evidence/information to an NPC.
   *
   * @param npcId - The NPC entity ID
   * @param topic - The evidence topic
   * @param turn - The current turn number
   */
  recordEvidence(npcId: string, topic: string, turn: number): void {
    const entries = this.evidence.get(npcId) ?? [];
    entries.push({ topic, turn });
    this.evidence.set(npcId, entries);
  }

  /**
   * Check whether the player has presented specific evidence to an NPC.
   *
   * @param npcId - The NPC entity ID
   * @param topic - The evidence topic
   * @returns True if this evidence has been presented
   */
  hasPresented(npcId: string, topic: string): boolean {
    const entries = this.evidence.get(npcId);
    return entries?.some(e => e.topic === topic) ?? false;
  }

  /**
   * Get all evidence presented to an NPC.
   *
   * @param npcId - The NPC entity ID
   * @returns Array of evidence entries, or empty array
   */
  getEvidence(npcId: string): EvidenceEntry[] {
    return this.evidence.get(npcId) ?? [];
  }

  // =========================================================================
  // Serialization support
  // =========================================================================

  /**
   * Export state for save/restore.
   * Converts Maps to plain objects for JSON serialization.
   */
  toJSON(): ConstraintEvaluatorState {
    const records: Record<string, SerializedConversationRecord> = {};
    for (const [npcId, record] of this.records) {
      records[npcId] = {
        responses: Object.fromEntries(record.responses),
        history: Object.fromEntries(
          Array.from(record.history.entries()).map(([topic, entries]) => [topic, entries]),
        ),
      };
    }

    const evidence: Record<string, EvidenceEntry[]> = {};
    for (const [npcId, entries] of this.evidence) {
      evidence[npcId] = entries;
    }

    return { records, evidence };
  }

  /**
   * Restore state from serialized data.
   *
   * @param state - Previously serialized state
   */
  static fromJSON(state: ConstraintEvaluatorState): ConstraintEvaluator {
    const evaluator = new ConstraintEvaluator();

    for (const [npcId, serialized] of Object.entries(state.records)) {
      const record: ConversationRecord = {
        responses: new Map(Object.entries(serialized.responses)),
        history: new Map(Object.entries(serialized.history)),
      };
      evaluator.records.set(npcId, record);
    }

    for (const [npcId, entries] of Object.entries(state.evidence)) {
      evaluator.evidence.set(npcId, entries);
    }

    return evaluator;
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /** Get or create a conversation record for an NPC. */
  private getOrCreateRecord(npcId: string): ConversationRecord {
    let record = this.records.get(npcId);
    if (!record) {
      record = createConversationRecord();
      this.records.set(npcId, record);
    }
    return record;
  }

  /**
   * Determine if two response actions constitute a contradiction.
   * A contradiction occurs when the NPC's story changes — telling the truth
   * after lying, confessing after deflecting, etc.
   */
  private isContradiction(previous: ResponseAction, current: ResponseAction): boolean {
    // Same action is never a contradiction
    if (previous === current) return false;

    // These pairs are contradictory — the NPC's story changed
    const contradictoryPairs: [ResponseAction, ResponseAction][] = [
      ['tell', 'lie'],
      ['lie', 'tell'],
      ['lie', 'confess'],
      ['deflect', 'confess'],
      ['refuse', 'confess'],
      ['omit', 'tell'],
      ['omit', 'confess'],
      ['confabulate', 'tell'],
      ['confabulate', 'confess'],
    ];

    return contradictoryPairs.some(
      ([a, b]) => previous === a && current === b,
    );
  }
}

// ---------------------------------------------------------------------------
// Serialization types
// ---------------------------------------------------------------------------

/** Serialized conversation record (Maps converted to plain objects). */
interface SerializedConversationRecord {
  responses: Record<string, ConversationEntry>;
  history: Record<string, ConversationEntry[]>;
}

/** Full serialized state of a ConstraintEvaluator. */
export interface ConstraintEvaluatorState {
  records: Record<string, SerializedConversationRecord>;
  evidence: Record<string, EvidenceEntry[]>;
}
