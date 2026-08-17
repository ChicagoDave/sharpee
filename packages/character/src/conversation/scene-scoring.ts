/**
 * Floor and interruption scoring shapes (ADR-320 D7/D10; adr-320
 * contracts.md §5)
 *
 * The forces-feed-arbitration idiom (ADR-318), pointed at "do I speak?":
 * disposition-under-circumstance readings bid for the floor, an authored
 * row forces or suppresses the moment where written (D7 most-specific-
 * wins), and interruption resolves as strength-vs-motivation (D10) with
 * world acts breaking even `blocking` (D8's exemption). Phase 1 fixes the
 * input/output shapes only — the scoring functions themselves are Phase 5
 * runtime, and nothing here is consumed yet.
 *
 * Every shape is platform-internal (contracts.md §7) — NOT author-facing
 * compatibility surface; revisable at refactor cost.
 *
 * Public interface: SceneOccasion, FloorBid, FloorDecision,
 *   InterruptionChallenge, InterruptionOutcome.
 * Owner context: @sharpee/character / conversation
 */

import type { ForceReading } from '../arbiter/arbiter-types.js';

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
 * An outsider — PC included — challenging a scene's grip (ADR-320 D10).
 * `worldAct` marks world events and acts, which break even a `blocking`
 * scene (D8's exemption: a gunshot interrupts anything).
 */
export interface InterruptionChallenge {
  /** The scene being challenged. */
  sceneId: string;

  /** The would-be interrupter. */
  interrupterId: string;

  /** The interrupter's motivation, as a floor bid. */
  bid: FloorBid;

  /** True for world events and acts — breaks even `blocking` (D8). */
  worldAct: boolean;
}

/**
 * How the scene answers a challenge (ADR-320 D10): the conversation
 * lifecycle's `RedirectResult` words, reused — `passive` yields,
 * `assertive` protests then yields, `blocking` blocks (except world acts).
 * Phase 5 collapses `RedirectResult` to an alias of this union
 * (contracts.md §7).
 */
export type InterruptionOutcome = 'yields' | 'protests' | 'blocks';
