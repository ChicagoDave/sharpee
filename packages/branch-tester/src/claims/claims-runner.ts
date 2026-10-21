/**
 * claims-runner.ts — run a story's claims: one walk per distinct necessary
 * set, every verdict gathered, and the report an author reads (ADR-365 D6,
 * D10, D11).
 *
 * Purpose: the entry point `sharpee test` drives. The runner takes the
 * normalized claim set, groups its claims by effective set, boots one fresh
 * game per group through the caller's loader, walks it, and returns every
 * verdict beside the ratio of claims held over claims declared. Claims
 * never gate (D9): a violated or unproven claim is reported, not thrown.
 *
 * The cost of a negative claim is the cost of exhausting its set, and the
 * states to exhaust double with every independent thing the set carries
 * (D11, measured on Secret Letter's market). So an unproven negative claim
 * is reported with the number of things its set carried, how many of them
 * the claim can never depend on (D12, the compiler's cone of influence),
 * and the budget that stopped the walk, which is what the author tightens.
 *
 * Public interface: `runClaims`, `formatClaimsRun`, `ClaimsRunOptions`,
 *   `ClaimsRunResult`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { StoryIR } from '@sharpee/chord';
import { groupClaimsBySet, type ClaimSet } from './claim-set.js';
import type { ClaimsGameLoader } from './claims-game.js';
import type { ClaimFloorReading, ClaimPinResult } from './claim-floor.js';
import { claimHeadline, claimLockLine, claimResultRowOf, claimSentence, claimsRatioLine, claimsSummaryRowOf } from './claim-report.js';
import { walkClaims, type ClaimVerdict, type ClaimsWalkOptions, type ClaimsWalkReport } from './claims-walk.js';

/** The run's budgets (per walk) and the seed the report names. */
export interface ClaimsRunOptions extends ClaimsWalkOptions {
  /** The seed the loader boots at — recorded, not applied; the loader owns the boot. */
  readonly seed?: number;
  /**
   * What the tree run's floor saw (ADR-367 D5): a positive claim some line
   * reached is held by that line and not walked; a lock's check at its card
   * rides the report. Absent when no tree ran before the claims.
   */
  readonly floor?: ClaimFloorReading;
}

/** A whole run: every walk, every verdict, and the held-over-declared ratio (D6). */
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
  readonly pins: readonly ClaimPinResult[];
}

/**
 * Run every claim in the set, one walk per distinct necessary set.
 *
 * @param ir the compiled story the loader boots
 * @param claimSet the normalized claims
 * @param loadGame boots one fresh game at the pinned seed; called once per walk
 * @param options per-walk budgets, breadth, and the seed to record
 * @returns the verdicts and the walks behind them
 */
export async function runClaims(ir: StoryIR, claimSet: ClaimSet, loadGame: ClaimsGameLoader, options: ClaimsRunOptions = {}): Promise<ClaimsRunResult> {
  const { seed, floor, ...walkOptions } = options;
  // The floor (ADR-367 D5): a positive claim a line reached is held by that
  // line, and only the rest are walked. Verdict indices are the declaration's.
  const byLine: ClaimVerdict[] = [];
  const toWalk = claimSet.claims.filter((claim) => {
    const reach = floor?.reached.get(claim.index);
    if (claim.never || reach === undefined) return true;
    byLine.push({
      set: claim.ownSet ? `the set of "${claim.name}"` : 'the declared set',
      index: claim.index,
      name: claim.name,
      never: false,
      kind: claim.predicate.kind,
      verdict: 'held',
      settledBy: 'line',
      line: { id: reach.lineId, label: reach.label, turn: reach.turn },
      thingsInSet: claim.set.things.length,
      inertInSet: 0,
    });
    return false;
  });
  const walks: ClaimsWalkReport[] = [];
  if (toWalk.length > 0 || claimSet.claims.length === 0) {
    for (const group of groupClaimsBySet({ ...claimSet, claims: toWalk })) {
      const game = await loadGame();
      walks.push(await walkClaims(game, ir, group, walkOptions));
    }
  }
  const claims = [...byLine, ...walks.flatMap((walk) => walk.claims)].sort((a, b) => a.index - b.index);
  const count = (verdict: ClaimVerdict['verdict']) => claims.filter((claim) => claim.verdict === verdict).length;
  return {
    source: claimSet.source,
    ...(seed !== undefined ? { seed } : {}),
    walks,
    claims,
    declared: claims.length,
    held: count('held'),
    violated: count('violated'),
    unproven: count('unproven'),
    totalWalkMs: walks.reduce((total, walk) => total + walk.walkMs, 0),
    floored: floor !== undefined,
    pins: floor?.pins ?? [],
  };
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * The run as an author reads it: the ratio, each walk's cost, and each
 * claim's verdict with its witness or the reason it stayed open.
 *
 * @param result a run
 * @returns the report, one line per fact
 */
export function formatClaimsRun(result: ClaimsRunResult): string {
  const lines: string[] = [];
  lines.push(claimsRatioLine(claimsSummaryRowOf(result)));
  lines.push(`${result.walks.length} walk${result.walks.length === 1 ? '' : 's'}, ${seconds(result.totalWalkMs)} in all`);
  for (const walk of result.walks) {
    lines.push(`  under ${walk.set}: ${walk.necessary.rooms} rooms, ${walk.necessary.things} things, ${walk.necessary.verbs} verbs — ${walk.statesDiscovered} states, ${walk.commandsExecuted} commands, ${seconds(walk.walkMs)}, stopped: ${walk.stopReason}`);
  }
  // One vocabulary with the Testing tab (ADR-367 D6): every sentence below is
  // built from the wire's own row, so the tab's claims section reads the same.
  for (const claim of result.claims) {
    const row = claimResultRowOf(claim, result);
    lines.push(`${claimHeadline(row)} — ${claimSentence(row)}`);
  }
  for (const pin of result.pins) {
    lines.push(claimLockLine(pin.claim, { lineId: pin.lineId, label: pin.label, turn: pin.turn, outcome: pin.outcome, ...(pin.message !== undefined ? { message: pin.message } : {}) }));
  }
  return lines.join('\n');
}
