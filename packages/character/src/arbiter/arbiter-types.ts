/**
 * Arbiter types (ADR-318 D1–D3; contracts.md §3)
 *
 * The shapes the force arbiter computes over: candidates, force readings,
 * verdicts, and the platform-internal context callers assemble. Every
 * signature here is platform-internal — NOT author-facing compatibility
 * surface (contracts.md §7); revisable at refactor cost.
 *
 * Public interface: ActCandidate, ForceReading, ArbiterVerdict,
 *   ArbiterContext, ArbiterAct.
 * Owner context: @sharpee/character / arbiter
 */

import type {
  Force,
  ActCategory,
  ObligationWord,
  FaceAct,
  TemperamentDef,
} from '@sharpee/world-model';

/** The act an arbitration decides: a dialogue act or a goal's execution. */
export type ArbiterAct = 'comply' | 'refuse' | 'evade' | { goalId: string };

/**
 * The act under consideration (contracts.md §3). `audiencePresent` is who
 * is in the room — honor sees the room, not the future (ADR-318 D7).
 */
export interface ActCandidate {
  kind: 'dialogue' | 'goal';
  act: ArbiterAct;
  topicId?: string;
  audiencePresent: string[];
}

/** One force's live pressure on the candidate (contracts.md §3). */
export interface ForceReading {
  force: Force;
  /** Runtime-owned 0..1 scale; feed formulas per ADR-318 D1's table. */
  intensity: number;
  /** True when the feed is off-baseline. */
  live: boolean;
  /** Author-channel attribution, e.g. 'principle:never-lie'. */
  feed: string;
}

/** The arbitration result (contracts.md §3). The arbiter is pure — it computes; bookkeeping mutates. */
export interface ArbiterVerdict {
  winner: Force;
  /** Possibly rewritten: paralysis → 'evade' (ADR-318 D6). */
  act: ArbiterAct;
  readings: ForceReading[];
  /** Absent = D2's intensity default decided (no declared ordering applied). */
  temperamentApplied?: { name: string; pair: [Force, Force] };
  /** Live principle/obligation feeds on the losing side → pressure deposits (ADR-318 D8). */
  defeats: Array<{ force: Force; feed: string }>;
  /** Two unexcepted duty feeds in live collision (ADR-318 D6). */
  paralysis?: { principles: [string, string] };
}

/**
 * What the caller (dialogue selector, goal sub-step, act detection)
 * assembles for an arbitration. The arbiter never classifies acts itself —
 * act detection owns which categories an act commits; the arbiter owns
 * which force wins.
 */
export interface ArbiterContext {
  /** Active entity states, for temperament `while` bindings (ADR-318 D3). */
  activeStates?: readonly string[];
  /** Authored `define temperament` definitions by name (story-level data). */
  temperamentDefs?: Readonly<Record<string, TemperamentDef>>;
  /**
   * Act categories COMPLYING would commit (already scope-filtered by act
   * detection). A matching unexcepted principle sets duty against the act.
   */
  commits?: readonly ActCategory[];
  /**
   * Act categories REFUSING would commit (e.g. `break a promise` when the
   * refusal violates a promised act). A matching unexcepted principle sets
   * duty FOR the act — and both sides live is D6 paralysis.
   */
  refusalCommits?: readonly ActCategory[];
  /** Obligations complying satisfies and refusing would violate (e.g. 'answers honestly'). */
  satisfies?: readonly ObligationWord[];
  /** Face-acts complying would perform before the declared audience (D7). */
  complyFaceActs?: readonly FaceAct[];
  /** Face-acts refusing would perform before the declared audience (D7). */
  refuseFaceActs?: readonly FaceAct[];
  /** The entity the act addresses — the love feed's disposition target. */
  audienceId?: string;
  /** The desire feed, when an active goal bears on this act (ADR-310 D8). */
  desire?: { intensity: number; stance: 'for' | 'against'; feed: string };
  /**
   * The act's OBJECT for principle scope/except matching (ADR-318 D4 —
   * the asker at the dialogue site, the act target at detection sites).
   * Absent = unknown: scoped principles stay in force, excepts never lift.
   */
  actObjectId?: string;
  /** Kind membership for classifier scopes (`a <kind>`) — the story oracle's slot. */
  isKindMember?: (entityId: string, kind: string) => boolean;
}

/** A reading plus which side of the candidate act it pushes (internal). */
export interface StancedReading extends ForceReading {
  stance: 'for' | 'against';
}
