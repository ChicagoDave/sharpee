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
 *   `FloorDecision`.
 * Owner: world-model (per-world wiring surface).
 */

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
 * The world's scene runtime (ADR-320 D4 — implemented by the character
 * subsystem over its scene store, consulted by stdlib's conversation
 * actions). The selector computes, this runtime mutates (the arbiter
 * discipline): every scene-state write the dispatch layer needs goes
 * through here.
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
}
