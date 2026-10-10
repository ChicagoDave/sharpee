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
 * is reported with the number of things its set carried and the budget
 * that stopped the walk, which is what the author tightens.
 *
 * Public interface: `runClaims`, `formatClaimsRun`, `ClaimsRunOptions`,
 *   `ClaimsRunResult`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { StoryIR } from '@sharpee/chord';
import { groupClaimsBySet, type ClaimSet } from './claim-set.js';
import type { ClaimsGameLoader } from './claims-game.js';
import { walkClaims, type ClaimVerdict, type ClaimsWalkOptions, type ClaimsWalkReport } from './claims-walk.js';

/** The run's budgets (per walk) and the seed the report names. */
export interface ClaimsRunOptions extends ClaimsWalkOptions {
  /** The seed the loader boots at — recorded, not applied; the loader owns the boot. */
  readonly seed?: number;
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
  const { seed, ...walkOptions } = options;
  const walks: ClaimsWalkReport[] = [];
  for (const group of groupClaimsBySet(claimSet)) {
    const game = await loadGame();
    walks.push(await walkClaims(game, ir, group, walkOptions));
  }
  const claims = walks.flatMap((walk) => walk.claims).sort((a, b) => a.index - b.index);
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
  lines.push(`claims: ${result.held} of ${result.declared} held${result.violated ? `, ${result.violated} violated` : ''}${result.unproven ? `, ${result.unproven} unproven` : ''}${result.seed !== undefined ? ` (seed ${result.seed})` : ''}`);
  lines.push(`${result.walks.length} walk${result.walks.length === 1 ? '' : 's'}, ${seconds(result.totalWalkMs)} in all`);
  for (const walk of result.walks) {
    lines.push(`  under ${walk.set}: ${walk.necessary.rooms} rooms, ${walk.necessary.things} things, ${walk.necessary.verbs} verbs — ${walk.statesDiscovered} states, ${walk.commandsExecuted} commands, ${seconds(walk.walkMs)}, stopped: ${walk.stopReason}`);
  }
  const walkBySet = new Map(result.walks.map((walk) => [walk.set, walk]));
  for (const claim of result.claims) {
    const head = `${claim.verdict.toUpperCase()}  ${claim.name}${claim.never ? ' (never)' : ''}`;
    if (claim.settledBy === 'witness') {
      lines.push(`${head} — at depth ${claim.depth}: ${claim.witness?.join(' / ')}`);
    } else if (claim.settledBy === 'exhaustion') {
      lines.push(`${head} — ${claim.never ? 'every reachable state under its set was tried' : 'no reachable state under its set satisfies it'} (${claim.set})`);
    } else {
      const walk = walkBySet.get(claim.set);
      const stopped = walk ? `${walk.stopReason} after ${walk.statesDiscovered} states` : 'a budget';
      lines.push(`${head} — the walk stopped at ${stopped}; its set carries ${claim.thingsInSet} things, and each independent thing doubles the states to exhaust`);
    }
  }
  return lines.join('\n');
}
