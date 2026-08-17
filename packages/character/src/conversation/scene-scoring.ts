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
 *   InterruptionChallenge, InterruptionOutcome, scoreFloor,
 *   resolveInterruption, sceneGrip, strengthFromIntent.
 * Owner context: @sharpee/character / conversation
 */

import type { ConversationSceneState, SceneStrength } from '@sharpee/world-model';
import type { ForceReading } from '../arbiter/arbiter-types.js';
import type { ContinuationIntent } from './lifecycle.js';

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

// ---------------------------------------------------------------------------
// Scoring (Phase 5 runtime over the Phase 1 shapes)
// ---------------------------------------------------------------------------

/** A bid's motivation: the sum of its live readings' intensities. */
function motivationOf(bid: FloorBid): number {
  return bid.readings.reduce((sum, r) => (r.live ? sum + r.intensity : sum), 0);
}

/**
 * Deterministic winner among candidate bids: highest live motivation,
 * ties broken by lexicographically smallest participant id — no random
 * draw, so floor contests replay byte-identically at any seed.
 */
function bestBid(candidates: FloorBid[]): FloorBid | undefined {
  let best: FloorBid | undefined;
  let bestScore = -Infinity;
  for (const bid of candidates) {
    const score = motivationOf(bid);
    if (
      score > bestScore ||
      (score === bestScore && best !== undefined && bid.participantId < best.participantId)
    ) {
      best = bid;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Resolve a floor contest (ADR-320 D7/D10): an authored `forces` row wins
 * outright and an authored `suppresses` row withdraws its bid (D7
 * most-specific-wins — authored rows beat disposition both ways);
 * otherwise the most motivated live bid seizes the moment, and nobody
 * does when no bid carries live motivation. Every bid — losers and
 * suppressed included — is retained on the decision so non-speakers'
 * manner can still react (one speaker, many tells).
 *
 * @param bids - Every participant's bid for the occasion
 * @returns The decision: winner (or null) plus all bids considered
 */
export function scoreFloor(bids: FloorBid[]): FloorDecision {
  const unsuppressed = bids.filter((b) => b.authored !== 'suppresses');
  const forced = unsuppressed.filter((b) => b.authored === 'forces');

  const winner =
    forced.length > 0
      ? bestBid(forced)
      : bestBid(unsuppressed.filter((b) => motivationOf(b) > 0));

  return { winnerId: winner?.participantId ?? null, bids };
}

/**
 * The scene's effective grip against interruption (ADR-320 D10): the open
 * exchange's authored strength is the innermost word and wins, then the
 * scene's own, then the caller-derived fallback (absent markers derive
 * from intent at runtime — `strengthFromIntent`).
 *
 * @param scene - The challenged scene
 * @param fallback - The intent-derived strength when nothing is authored
 * @returns The effective strength
 */
export function sceneGrip(
  scene: ConversationSceneState,
  fallback: SceneStrength = 'passive',
): SceneStrength {
  return scene.openExchange?.strength ?? scene.strength ?? fallback;
}

/**
 * Resolve an interruption challenge (ADR-320 D10): a world event or act
 * breaks any grip — even `blocking` (D8's exemption); otherwise the
 * grip answers — `passive` yields, `assertive` protests then yields,
 * `blocking` blocks. The caller closes or re-floors the scene on
 * `yields`/`protests`; on `blocks` the scene holds.
 *
 * @param challenge - The challenge (interrupter, bid, world-act flag)
 * @param strength - The scene's effective grip (see `sceneGrip`)
 * @returns The outcome word
 */
export function resolveInterruption(
  challenge: InterruptionChallenge,
  strength: SceneStrength,
): InterruptionOutcome {
  if (challenge.worldAct) return 'yields';
  switch (strength) {
    case 'passive':
      return 'yields';
    case 'assertive':
      return 'protests';
    case 'blocking':
      return 'blocks';
  }
}

/**
 * Derive a scene's grip from its holder's continuation intent when no
 * strength is authored (contracts.md §1.1 — "absent = derived from intent
 * at runtime"). Runtime-owned mapping: the intents that want the
 * conversation to continue (`eager`, `confessing`) protest interruption;
 * the rest let it go. `blocking` is never derived — only authored.
 *
 * @param intent - The holder's continuation intent
 * @returns The derived strength
 */
export function strengthFromIntent(intent: ContinuationIntent): SceneStrength {
  return intent === 'eager' || intent === 'confessing' ? 'assertive' : 'passive';
}
