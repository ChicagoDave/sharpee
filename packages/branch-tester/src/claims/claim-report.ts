/**
 * claim-report.ts — a claim's verdict as the wire carries it and as an author
 * reads it, from one set of words (ADR-365 D6; ADR-367 D5, D6).
 *
 * Purpose: `sharpee test` prints each claim's verdict with the line that
 * reached it, the walk that found it, or the budget that left it open; the
 * Testing tab shows the same verdict in its claims section. Both read every
 * claims word from here — the sentence off the `claim-result` payload, the
 * ratio and the verdict counts off the `claims-summary` payload — so the two
 * surfaces cannot drift (the derived tier's discipline). Browser-safe: it
 * reads the run's shapes from `claim-results`, which holds types only, and
 * never pulls the runner and its engine seams into a browser program.
 *
 * Public interface: `ClaimResultRow`, `ClaimsSummaryRow`, `ClaimCount`,
 *   `claimResultRowOf`, `claimsSummaryRowOf`, `lockRowOf`, `claimTitle`,
 *   `claimVerdictWord`, `claimHeadline`, `claimSentence`, `claimLockLine`,
 *   `claimsRatioLine`,
 *   `claimsPendingLine`, `claimCounts`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { ClaimLock, ClaimResultEvent, ClaimVerdictStatus, ClaimsSummaryEvent, RunEventEnvelope } from '@sharpee/ide-protocol';
import type { ClaimLockResult, ClaimVerdict, ClaimsRunResult } from './claim-results.js';

/** One claim's verdict as the wire carries it: the `claim-result` payload minus its envelope. */
export type ClaimResultRow = Omit<ClaimResultEvent, keyof RunEventEnvelope | 'type'>;

/** The claims tier's ratio as the wire carries it: the `claims-summary` payload minus its envelope. */
export type ClaimsSummaryRow = Omit<ClaimsSummaryEvent, keyof RunEventEnvelope | 'type'>;

/** How many claims reached one verdict, with the words a count of them is shown in. */
export interface ClaimCount {
  readonly verdict: ClaimVerdictStatus;
  readonly count: number;
  readonly text: string;
}

/**
 * Map one verdict onto the wire's row, with every lock the tree run checked
 * on the claim and, for a budget stop, the walk that stopped.
 *
 * @param claim the verdict
 * @param result the run it belongs to (its locks, walks and floor)
 * @returns the row
 */
export function claimResultRowOf(claim: ClaimVerdict, result: Pick<ClaimsRunResult, 'locks' | 'walks' | 'floored'>): ClaimResultRow {
  const locks = result.locks.filter((lock) => lock.claim === claim.name).map(lockRowOf);
  const walk = result.walks.find((candidate) => candidate.set === claim.set);
  return {
    name: claim.name,
    never: claim.never,
    kind: claim.kind,
    verdict: claim.verdict,
    settledBy: claim.settledBy,
    set: claim.set,
    thingsInSet: claim.thingsInSet,
    inertInSet: claim.inertInSet,
    ...(claim.line !== undefined ? { line: { id: claim.line.id, label: claim.line.label, turn: claim.line.turn } } : {}),
    ...(claim.witness !== undefined ? { witness: [...claim.witness] } : {}),
    ...(claim.depth !== undefined ? { depth: claim.depth } : {}),
    ...(claim.settledBy === 'budget' && walk !== undefined ? { stopped: { reason: walk.stopReason, states: walk.statesDiscovered } } : {}),
    floored: result.floored,
    ...(locks.length > 0 ? { locks } : {}),
  };
}

/**
 * Map the run's ratio onto the wire's summary row.
 *
 * @param result the run
 * @returns the row
 */
export function claimsSummaryRowOf(result: ClaimsRunResult): ClaimsSummaryRow {
  return {
    source: result.source,
    declared: result.declared,
    held: result.held,
    violated: result.violated,
    unproven: result.unproven,
    walks: result.walks.length,
    totalWalkMs: result.totalWalkMs,
    ...(result.seed !== undefined ? { seed: result.seed } : {}),
    floored: result.floored,
  };
}

/**
 * Map one lock's check onto the wire's lock: the check minus the claim it
 * is on, which the row carrying it already names.
 *
 * @param lock the check
 * @returns the wire's lock
 */
export function lockRowOf(lock: ClaimLockResult): ClaimLock {
  return {
    lineId: lock.lineId,
    label: lock.label,
    turn: lock.turn,
    ...(lock.cardId !== undefined ? { cardId: lock.cardId } : {}),
    outcome: lock.outcome,
    ...(lock.message !== undefined ? { message: lock.message } : {}),
  };
}

/**
 * The claim as the report names it: `the deed box leaves the Folly (never)`.
 *
 * @param row the claim
 * @returns the name, marked when the claim is negative
 */
export function claimTitle(row: Pick<ClaimResultRow, 'name' | 'never'>): string {
  return `${row.name}${row.never ? ' (never)' : ''}`;
}

/**
 * The verdict as the report shows it: `HELD`, `VIOLATED`, `UNPROVEN`.
 *
 * @param row the claim
 * @returns the word
 */
export function claimVerdictWord(row: Pick<ClaimResultRow, 'verdict'>): string {
  return row.verdict.toUpperCase();
}

/**
 * The verdict's head: `HELD  the deed is in hand`, `VIOLATED  the deed box leaves the Folly (never)`.
 *
 * @param row the claim
 * @returns the head
 */
export function claimHeadline(row: Pick<ClaimResultRow, 'verdict' | 'name' | 'never'>): string {
  return `${claimVerdictWord(row)}  ${claimTitle(row)}`;
}

/**
 * The verdict's sentence — what follows the head after ` — `: the line and
 * turn that reached it, the walk's witness, the exhaustion, or the budget
 * and the set's cost (ADR-365 D11). Under a floor a walked positive claim is
 * one no line reached, and a claim held by a line names any of its locks
 * that did not hold (ADR-367 D6).
 *
 * @param row the claim
 * @returns one sentence, never empty
 */
export function claimSentence(row: ClaimResultRow): string {
  const unreached = row.floored && !row.never ? 'not reached by any line; ' : '';
  switch (row.settledBy) {
    case 'line': {
      const broken = (row.locks ?? [])
        .filter((lock) => lock.outcome !== 'held')
        .map((lock) => `; its lock at line ${lock.lineId} "${lock.label}" turn ${lock.turn} is NOT held there`)
        .join('');
      return `by line ${row.line?.id} "${row.line?.label}" at turn ${row.line?.turn}${broken}`;
    }
    case 'witness':
      return `${unreached}${row.floored && !row.never ? 'by walk ' : ''}at depth ${row.depth}: ${row.witness?.join(' / ')}`;
    case 'exhaustion':
      return `${unreached}${row.never ? 'every reachable state under its set was tried' : 'no reachable state under its set satisfies it'} (${row.set})`;
    case 'budget': {
      const stopped = row.stopped ? `${row.stopped.reason} after ${row.stopped.states} states` : 'a budget';
      const cost =
        row.inertInSet > 0
          ? `its set carries ${row.thingsInSet} things, ${row.inertInSet} of which the claim's rules never reach; each independent thing doubles the states to exhaust`
          : `its set carries ${row.thingsInSet} things, and each independent thing doubles the states to exhaust`;
      return `${unreached}the walk stopped at ${stopped}; ${cost}`;
    }
  }
}

/**
 * One lock's line in the report: where it was taken and whether it held
 * there, with the miss in the claim's words when it did not.
 *
 * @param name the claim's name
 * @param lock the lock
 * @returns the line, indented as the report prints it
 */
export function claimLockLine(name: string, lock: ClaimLock): string {
  const where = `line ${lock.lineId} "${lock.label}" at turn ${lock.turn}`;
  if (lock.outcome === 'held') return `  lock "${name}" at ${where} — held there`;
  if (lock.outcome === 'not-held') return `  lock "${name}" at ${where} — NOT held there: ${lock.message}`;
  return `  lock "${name}" at ${where} — lock-unknown-claim: the fragment declares no claim of that name`;
}

/**
 * The ratio line: `claims: 9 of 10 held, 1 violated (seed 42)`.
 *
 * @param summary the run's summary
 * @returns the line
 */
export function claimsRatioLine(summary: ClaimsSummaryRow): string {
  return `claims: ${summary.held} of ${summary.declared} held${summary.violated ? `, ${summary.violated} violated` : ''}${summary.unproven ? `, ${summary.unproven} unproven` : ''}${summary.seed !== undefined ? ` (seed ${summary.seed})` : ''}`;
}

/**
 * The line shown while verdicts arrive and the summary has not: `claims: 3 so far`.
 *
 * @param arrived how many verdicts have arrived
 * @returns the line
 */
export function claimsPendingLine(arrived: number): string {
  return `claims: ${arrived} so far`;
}

/**
 * The count of each verdict reached, in the order held, violated, unproven,
 * omitting a verdict no claim reached. The run's summary is the count once it
 * has arrived; before it, the verdicts that have arrived are counted.
 *
 * @param summary the run's summary, or undefined before it arrives
 * @param rows the verdicts so far
 * @returns one count per verdict reached
 */
export function claimCounts(summary: ClaimsSummaryRow | undefined, rows: ReadonlyArray<Pick<ClaimResultRow, 'verdict'>>): ClaimCount[] {
  const countOf = (verdict: ClaimVerdictStatus): number =>
    summary !== undefined ? summary[verdict] : rows.filter((row) => row.verdict === verdict).length;
  return (['held', 'violated', 'unproven'] as const)
    .map((verdict) => ({ verdict, count: countOf(verdict), text: `${countOf(verdict)} ${verdict}` }))
    .filter((entry) => entry.count > 0);
}
