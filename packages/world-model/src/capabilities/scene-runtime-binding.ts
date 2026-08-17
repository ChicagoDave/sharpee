/**
 * Scene-runtime binding types (ADR-320 D4/D7/D10; adr-320 contracts.md
 * §4–§5 as amended for Phase 6)
 *
 * The scene half of the conversation dispatch integration: stdlib's
 * conversation actions drive scene lifecycle — open on first address,
 * stamp moves, apply a selection's directives, resolve an open floor —
 * through a binding the character subsystem registers per world, because
 * the runtime that owns the mutations lives above stdlib in the package
 * graph. Same ownership model as capability behaviors (ADR-207), action
 * interceptors (ADR-208), exit resolvers (ADR-295), and the dialogue
 * selector (ADR-310 D15): scoped to one running `WorldModel`, idempotent
 * last-wins, never serialized — registrars re-register on every story
 * load.
 *
 * Every signature here is platform-internal (contracts.md §7) — NOT
 * author-facing compatibility surface; revisable at refactor cost.
 *
 * Public interface: `SceneRuntimeBinding`, `SceneOccasion`, `FloorBid`,
 *   `FloorDecision`, `InterruptionOutcome`, `InitiativeSeizure`.
 * Owner: world-model (per-world wiring surface).
 */

import type { EntityId, ISemanticEvent } from '@sharpee/core';
import type {
  ConversationSceneState,
  SceneOpenedBy,
} from '../traits/character-model/conversation-scene.js';
import type { ForceReading } from '../traits/character-model/character-vocabulary.js';
import type { SceneDirective } from './dialogue-selector-binding.js';
import type { SceneWireEvent } from './scene-wire.js';

/**
 * An occasion a disposition can seize (ADR-320 D7): a witnessed event, a
 * goal step arriving, an open floor, a silence, or a noticed subject
 * change (D9's third exposure). Occasions are plumbing — never
 * author-facing; disposition-under-circumstance decides whether this
 * character seizes this one.
 */
export type SceneOccasion =
  | { kind: 'open-floor'; sceneId: string }
  | { kind: 'witnessed-event'; eventId: string }
  | { kind: 'goal-step'; goalId: string }
  | { kind: 'silence'; sceneId: string }
  | { kind: 'subject-change'; sceneId: string; abandonedTopicId: string };

/**
 * One participant's bid for the floor (ADR-320 D7/D10): disposition-
 * under-circumstance expressed as arbiter force readings, whose feeds
 * carry author-channel attribution as everywhere in the character layer.
 */
export interface FloorBid {
  /** The bidding participant. */
  participantId: string;

  /** The occasion this bid answers. */
  occasion: SceneOccasion;

  /** Disposition-under-circumstance, as force readings (the ADR-318 idiom). */
  readings: ForceReading[];

  /**
   * An authored row forcing or suppressing the moment always wins over
   * disposition (D7 most-specific-wins). Absent = disposition decides.
   */
  authored?: 'forces' | 'suppresses';
}

/**
 * A resolved floor contest (ADR-320 D10): one winner — or none, when
 * nobody seizes the moment — with every bid retained so non-speakers'
 * manner can still react (one speaker, many tells).
 */
export interface FloorDecision {
  /** The floor winner, or null when nobody seizes the moment. */
  winnerId: string | null;

  /** Every bid considered, losers included (their manner beats still emit). */
  bids: FloorBid[];
}

/**
 * How a scene answers an interruption challenge (ADR-320 D10): `passive`
 * yields, `assertive` protests then yields, `blocking` blocks — except
 * world events and acts, which break any grip (D8's exemption). Declared
 * here (Phase 8 amendment) because stdlib consults intrusion across the
 * package boundary; `@sharpee/character` aliases it (the §7 idiom).
 */
export type InterruptionOutcome = 'yields' | 'protests' | 'blocks';

/**
 * What an authored initiative seizure produced (ADR-320 D7; Phase 8):
 * the forcing row's body ran — its events ride the turn stream, and
 * `spokenMessageId` carries the seizure's line when the body spoke one
 * (the caller renders it through the observability surface).
 */
export interface InitiativeSeizure {
  /** Events the row body produced (author channel and report events). */
  events: ISemanticEvent[];

  /** The spoken line's message id, when the body delivered a phrase. */
  spokenMessageId?: string;

  /** Params for the spoken line's template, when any. */
  spokenParams?: Record<string, unknown>;
}

/**
 * The world's scene runtime (ADR-320 D4 — implemented by the character
 * subsystem over its scene store, consulted by stdlib's conversation
 * actions and the character-model tick phase). The selector computes,
 * this runtime mutates (the arbiter discipline): every scene-state write
 * the dispatch layer needs goes through here.
 */
export interface SceneRuntimeBinding {
  /**
   * Open a scene for a conversational address (openedBy `address`), the
   * opener holding the floor.
   *
   * @param participantIds - Everyone in the scene, PC included (at least two)
   * @param openedBy - How the scene opened
   * @returns The opened scene and its wire events
   */
  openScene(
    participantIds: string[],
    openedBy: SceneOpenedBy,
  ): { scene: ConversationSceneState; wireEvents: SceneWireEvent[] };

  /**
   * Stamp an on-floor move (utterance, act, or event — one vocabulary):
   * resets the scene's silence-decay clock.
   *
   * @param sceneId - The scene the move landed in
   */
  recordMove(sceneId: string): void;

  /**
   * Apply a selection's scene directives, in order (the selector stays
   * pure; this runtime performs the lifecycle it asked for).
   *
   * @param sceneId - The scene the directives target
   * @param directives - The selection's directives
   * @returns Wire events the directives produced
   */
  applyDirectives(sceneId: string, directives: SceneDirective[]): SceneWireEvent[];

  /**
   * Resolve an open floor (ADR-320 D10): bids built from each scene
   * participant's disposition-under-circumstance and scored by the Phase 5
   * floor scoring. Pure — routing the winner is the caller's.
   *
   * @param sceneId - The scene whose floor is open
   * @param occasion - The occasion seeking a speaker
   * @returns The decision, losers' bids included
   */
  floorWinnerFor(sceneId: string, occasion: SceneOccasion): FloorDecision;

  /**
   * Resolve — and apply — an outsider's challenge to a live scene
   * (ADR-320 D10; Phase 8): the scene's grip answers per the strength
   * words, a world act breaks any grip (D8's exemption). On `yields` or
   * `protests` the scene closes on the `exit` boundary (memory folded);
   * on `blocks` nothing mutates. The caller routes what follows (opening
   * the interrupter's own scene, rendering the refusal).
   *
   * @param sceneId - The challenged scene
   * @param interrupterId - The would-be interrupter (the PC included)
   * @param worldAct - True for world events and acts (breaks `blocking`)
   * @returns The outcome word and the wire events the challenge produced
   */
  resolveIntrusion(
    sceneId: string,
    interrupterId: EntityId,
    worldAct: boolean,
  ): { outcome: InterruptionOutcome; wireEvents: SceneWireEvent[] };

  /**
   * Run an authored initiative seizure (ADR-320 D7; Phase 8): the
   * registrar's row runner — the loader binds compiled `define initiative`
   * row bodies here. Returns undefined when no forcing row answers the
   * occasion (disposition alone never seizes a content-bearing occasion).
   * Absent when the registrar bound no runner (builder-authored stories).
   *
   * @param participantId - The character whose rows answer
   * @param occasion - The live occasion
   * @param witnessedAction - For witnessed-event occasions, the committed action id
   * @param audienceId - The occasion's principal (claims bookkeeping), when known
   * @returns The seizure, or undefined when nothing forces
   */
  seizeInitiative?(
    participantId: EntityId,
    occasion: SceneOccasion,
    witnessedAction?: string,
    audienceId?: EntityId,
  ): InitiativeSeizure | undefined;
}
