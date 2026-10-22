/**
 * claim-results.ts — the claims tier's result data, declared once (ADR-365
 * D6, ADR-367 D5).
 *
 * Purpose: the shapes a claims run produces — each claim's verdict, each
 * walk's report, each lock's check at its card, and the whole run — as data
 * only. The walk, the floor and the runner build them; `claim-report` reads
 * them into the wire's rows and the author's sentences. The Testing tab
 * bundles `claim-report` into a browser program, so this file holds types
 * and nothing that runs: it imports only other type-only, browser-safe
 * modules, never the runner and its engine seams. The verdict, the way it
 * was settled and a lock's outcome are the wire's own unions, so the run
 * and the wire cannot disagree on their words.
 *
 * Public interface: `ClaimVerdict`, `WalkStopReason`, `CandidateBreadth`,
 *   `ClaimsWalkReport`, `ClaimLockResult`, `ClaimsRunResult`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { ClaimLock, ClaimSettledBy, ClaimVerdictStatus } from '@sharpee/ide-protocol';
import type { ClaimKind } from './claim-set.js';

/** One claim's verdict after its walk, or after the line that reached it. */
export interface ClaimVerdict {
  readonly set: string;
  readonly index: number;
  readonly name: string;
  readonly never: boolean;
  readonly kind: ClaimKind;
  readonly verdict: ClaimVerdictStatus;
  /**
   * How the verdict was reached: a played line that reached the state
   * (ADR-367 D5's floor — no walk ran), a witness path, the frontier's
   * exhaustion, or a budget stop that left it open.
   */
  readonly settledBy: ClaimSettledBy;
  /** The first path to a state satisfying the claim — present with `settledBy: 'witness'`. */
  readonly witness?: readonly string[];
  readonly depth?: number;
  /** The line and turn that reached the claim — present with `settledBy: 'line'`. */
  readonly line?: { readonly id: string; readonly label: string; readonly turn: number };
  /** How many things the claim's set carries — each independent one doubles the states to exhaust. */
  readonly thingsInSet: number;
  /** How many of those things the claim can never depend on under this set (ADR-365 D12) — the ones to trim. */
  readonly inertInSet: number;
}

/** Why a walk stopped. Only the first two exhaust the frontier. */
export type WalkStopReason = 'frontier-exhausted' | 'all-claims-settled' | 'max-states' | 'max-seconds' | 'max-depth-reached';

/** `basic` — one verb per affordance; `full` — adds put-in / put-on over the carried set. */
export type CandidateBreadth = 'basic' | 'full';

/** What one walk reports. */
export interface ClaimsWalkReport {
  readonly set: string;
  readonly necessary: { readonly rooms: number; readonly things: number; readonly verbs: number };
  readonly budgets: { readonly maxStates: number; readonly maxSeconds: number; readonly maxDepth: number };
  readonly breadth: CandidateBreadth;
  readonly stopReason: WalkStopReason;
  readonly walkMs: number;
  readonly statesDiscovered: number;
  readonly commandsExecuted: number;
  readonly restores: number;
  readonly saves: number;
  readonly deadEnds: number;
  readonly queueRemaining: number;
  readonly roomsReached: readonly string[];
  readonly frontierByDepth: Readonly<Record<number, number>>;
  readonly claims: readonly ClaimVerdict[];
}

/** One lock's check at its card. */
export interface ClaimLockResult {
  readonly claim: string;
  readonly lineId: string;
  readonly label: string;
  readonly turn: number;
  readonly cardId?: string;
  /** `held`, `not-held`, or `unknown-claim` when the fragment no longer declares the name. */
  readonly outcome: ClaimLock['outcome'];
  /** What was so instead, in the claim's words, when not held (ADR-367 D6); absent when held. */
  readonly message?: string;
}

/** A whole run: every walk, every verdict, and the held-over-declared ratio (ADR-365 D6). */
export interface ClaimsRunResult {
  readonly source: string;
  readonly seed?: number;
  readonly walks: readonly ClaimsWalkReport[];
  readonly claims: readonly ClaimVerdict[];
  readonly declared: number;
  readonly held: number;
  readonly violated: number;
  readonly unproven: number;
  readonly totalWalkMs: number;
  /** Whether a tree run's floor stood under this run — the report's vocabulary depends on it. */
  readonly floored: boolean;
  /** Every lock the tree run checked at its card (ADR-367 D5). */
  readonly locks: readonly ClaimLockResult[];
}
