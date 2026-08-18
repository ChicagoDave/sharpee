/**
 * Conversation scene and memory state shapes (ADR-320 D4/D6/D9/D10;
 * adr-320 contracts.md §1–§2)
 *
 * A conversation is a scene: participants, a contested floor, at most one
 * open exchange, and lifecycle boundaries the platform recognizes. Per-pair
 * conversation memory (visits, discussed topics, repetition counts) rides
 * the modeled holder's trait (`ICharacterModelData.conversationMemory`,
 * Phase 7); live scenes ride the `character.scenes` world-state key
 * (contracts.md §1.3, APPROVED), written only by the scene runtime.
 *
 * Every shape is platform-internal (contracts.md §7) — NOT author-facing
 * compatibility surface; revisable at refactor cost. Turn fields are read
 * and aged only through the character subsystem's clock seam — numbers
 * never reach Chord (ADR-310 D6).
 *
 * Public interface: ConversationSceneState, SceneStrength, SceneOpenedBy,
 *   ExchangeState, SceneBoundaryKind, ConversationMemory,
 *   ConversationThreadStatus, ConversationThreadState.
 * Owner context: world-model / character-model trait
 */

// Type-only in both directions with scene-wire.ts (which imports
// SceneOpenedBy/SceneBoundaryKind from here) — erased at compile time,
// so no runtime require cycle.
import type { ResponseAffordance, ThreadContinuability } from '../../capabilities/scene-wire.js';

/**
 * Scene grip against interruption (ADR-320 D10): `passive` yields to any
 * motivated interjection, `assertive` protests then yields, `blocking`
 * holds against everything except world events and acts (D8's exemption).
 * Word-for-word the conversation lifecycle's `ConversationStrength`
 * (@sharpee/character); Phase 5 collapses that union to an alias of this
 * one (contracts.md §7).
 */
export type SceneStrength = 'passive' | 'assertive' | 'blocking';

/**
 * How a scene opened (ADR-320 D4): a participant addressing someone, an
 * NPC's own initiative (D7), or any witnessed world event — a PC act,
 * another character's act, or a story event. Selects boundary rows and
 * seeds what the conversation is about.
 */
export type SceneOpenedBy =
  | { kind: 'address'; openerId: string }
  | { kind: 'initiative'; openerId: string }
  | { kind: 'witnessed-event'; eventId: string };

/**
 * The boundary moments the platform recognizes (ADR-320 D4). The Chord
 * boundary words that compile onto these kinds are Phase 3 vocabulary,
 * frozen separately.
 */
export type SceneBoundaryKind = 'first-meeting' | 'return' | 'exit' | 'silence';

/**
 * An open exchange point (ADR-320 D4): a named moment where a speaker's
 * line defines what the next responses mean. While open, its responses
 * overlay the topic table under the innermost-active-context-wins rule
 * (ADR-310 D16); the topic table is the floor's default when none is open.
 */
export interface ExchangeState {
  /** The compiled exchange block this instantiates (Chord IR id, Phases 3–4). */
  exchangeId: string;

  /** Who opened it (whose line defined what the next responses mean). */
  speakerId: string;

  /** Strength marker authored on the exchange, if any (D10). */
  strength?: SceneStrength;

  /** Turn the exchange opened. */
  openedTurn: number;

  /**
   * The advertised response set (ADR-320 D12), snapshotted from the
   * compiled exchange block when the exchange opens — exchange rows are
   * declarative, so the loader enumerates them once and the state carries
   * them. Persisted with the scene store, so a mid-exchange restore
   * re-advertises correctly; the `exchange-affordances` channel is a pure
   * projection of this field. Always ends with the `silence` affordance
   * (D8, the inalienable move).
   */
  responses: ResponseAffordance[];
}

/**
 * A live conversation scene (ADR-320 D4): the engine-visible construct
 * NPC↔NPC scheduling, save/restore, and the author channel all see.
 * Mutated only by the scene runtime (@sharpee/character, Phase 5) — this
 * module is pure data.
 */
export interface ConversationSceneState {
  /** Stable id, unique within a save (runtime mints; format runtime-owned). */
  id: string;

  /** Everyone in the scene, PC included. Order is not meaningful. */
  participantIds: string[];

  /** How the scene opened — selects boundary rows, seeds what it is about. */
  openedBy: SceneOpenedBy;

  /** Current floor holder, or null while the floor is contested/open. */
  floorHolderId: string | null;

  /** The one open exchange, or null when the topic table is the default. */
  openExchange: ExchangeState | null;

  /** Scene grip against interruption (D10); absent = derived from intent at runtime. */
  strength?: SceneStrength;

  /** Turn the scene opened (read/aged through the clock seam only). */
  openedTurn: number;

  /** Turn of the last on-floor move (utterance, act, or event — one vocabulary). */
  lastMoveTurn: number;

  /**
   * The thread the scene is currently on — a normalized topic (ADR-320
   * D9; Phase 7 design §6). Written only by the scene runtime's
   * `noteTopicMove`; absent until a topic move lands.
   */
  currentTopic?: string;

  /**
   * Turn a live thread was abandoned (`the subject changes`, D9): stamped
   * when a topic move differs from `currentTopic`. The evaluator's
   * `subject-changes` and Phase 8's subject-change occasion read it;
   * absent until a subject has ever changed.
   */
  subjectChangedTurn?: number;

  /**
   * The topic the last subject change abandoned (Phase 8): written by
   * `noteTopicMove` alongside `subjectChangedTurn`, read by the
   * subject-change occasion's `abandonedTopicId`. Absent until a subject
   * has ever changed.
   */
  abandonedTopic?: string;

  /**
   * The pair's active-thread continuability snapshot (ADR-320 D14, the
   * D12 affordance surface): stamped at thread open/beat/resume time and
   * cleared when no thread is active (park/conclude) — the
   * `ExchangeState.responses` discipline, so a mid-thread restore
   * re-advertises correctly and the channel projection (Phase 10.6) is
   * pure state. Written only by the scene runtime's
   * `stampThreadContinuability`.
   */
  threadContinuability?: ThreadContinuability;
}

/**
 * Per-pair conversation memory (ADR-320 D4/D6/D9), held on the modeled
 * character's trait keyed by partner id — each side holds its own view
 * (the disposition precedent — a modeled PC holds its own view too,
 * contracts §2.1). Home: `ICharacterModelData.conversationMemory`
 * (Phase 7, schema v2).
 *
 * Numbers here never reach Chord: repetition, recency, and absence all
 * surface as words, with the runtime owning every curve (ADR-310 D6).
 */
export interface ConversationMemory {
  /** Completed scenes with this partner (drives asked-once/again/many words). */
  visits: number;

  /** Turn the last scene with this partner closed (absence words age off this). */
  lastSceneClosedTurn?: number;

  /** Topics covered with this partner, across scenes, any order (D9 `was discussed`). */
  discussedTopics: string[];

  /** Per-topic ask counts with this partner (repetition words; runtime owns the counting). */
  askedCounts: Record<string, number>;
}

/**
 * A conversation thread's per-pair status (ADR-320 D14): at most one
 * ACTIVE thread per pair (the runtime's invariant, Phase 10.3); PARKED
 * threads hold their cursor and resume; CONCLUDED is terminal — the
 * `is concluded` predicate reads it, and a concluded thread never
 * re-claims its topics.
 */
export type ConversationThreadStatus = 'active' | 'parked' | 'concluded';

/**
 * Per-pair state of one authored conversation thread (ADR-320 D14),
 * held on the modeled owner's trait beside `conversationMemory`
 * (`ICharacterModelData.conversationThreads`, schema v3) — keyed
 * partnerId → thread key, so the state record carries no key of its
 * own. The cursor is what makes "a conversation may or may not happen
 * in one flow" the default truth: it survives parking, scene closes,
 * day boundaries, and save/restore alike.
 *
 * Numbers here never reach Chord (ADR-310 D6): the author reads only
 * `is concluded`; beats and turns are runtime bookkeeping.
 */
export interface ConversationThreadState {
  /** Status — the at-most-one-ACTIVE-per-pair invariant is the runtime's. */
  status: ConversationThreadStatus;

  /**
   * Beats already served (0 = nothing spoken yet). The conclusion is not
   * counted here — it flips `status` to `concluded` when it fires.
   */
  beatCursor: number;

  /** Turn of the last served beat (read/aged through the clock seam only). */
  lastBeatTurn?: number;
}
