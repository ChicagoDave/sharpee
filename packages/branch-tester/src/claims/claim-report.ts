/**
 * claim-report.ts — a claim's verdict as the wire carries it and as an author
 * reads it, from one set of words (ADR-365 D6; ADR-367 D5, D6).
 *
 * Purpose: `sharpee test` prints each claim's verdict with the line that
 * reached it, the walk that found it, or the budget that left it open; the
 * Testing tab shows the same verdict in its claims section. Both read the
 * sentence from here, off the `claim-result` payload, so the two surfaces
 * cannot drift (the derived tier's discipline). Browser-safe: types and
 * strings only.
 *
 * Public interface: `ClaimResultRow`, `ClaimsSummaryRow`, `ClaimVerdictLike`,
 *   `ClaimPinLike`, `ClaimsRunLike`, `claimResultRowOf`, `claimsSummaryRowOf`,
 *   `claimHeadline`, `claimSentence`, `claimLockLine`, `claimsRatioLine`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { ClaimLockPin, ClaimResultEvent, ClaimsSummaryEvent, RunEventEnvelope } from '@sharpee/ide-protocol';

/** One claim's verdict as the wire carries it: the `claim-result` payload minus its envelope. */
export type ClaimResultRow = Omit<ClaimResultEvent, keyof RunEventEnvelope | 'type'>;

/** The claims tier's ratio as the wire carries it: the `claims-summary` payload minus its envelope. */
export type ClaimsSummaryRow = Omit<ClaimsSummaryEvent, keyof RunEventEnvelope | 'type'>;

/*
 * The runner's shapes, taken structurally (the fields read, no more): this
 * module is bundled into the Testing tab, so it must not pull the runner
 * and its engine seams into a browser program.
 */

/** The fields of a `ClaimVerdict` this module reads. */
export interface ClaimVerdictLike {
  readonly set: string;
  readonly name: string;
  readonly never: boolean;
  readonly kind: string;
  readonly verdict: ClaimResultRow['verdict'];
  readonly settledBy: ClaimResultRow['settledBy'];
  readonly witness?: readonly string[];
  readonly depth?: number;
  readonly line?: { readonly id: string; readonly label: string; readonly turn: number };
  readonly thingsInSet: number;
  readonly inertInSet: number;
}

/** The fields of a `ClaimPinResult` this module reads. */
export interface ClaimPinLike {
  readonly claim: string;
  readonly lineId: string;
  readonly label: string;
  readonly turn: number;
  readonly cardId?: string;
  readonly outcome: ClaimLockPin['outcome'];
  readonly message?: string;
}

/** The fields of a `ClaimsRunResult` this module reads. */
export interface ClaimsRunLike {
  readonly source: string;
  readonly seed?: number;
  readonly walks: ReadonlyArray<{ readonly set: string; readonly stopReason: string; readonly statesDiscovered: number; readonly walkMs: number }>;
  readonly claims: readonly ClaimVerdictLike[];
  readonly declared: number;
  readonly held: number;
  readonly violated: number;
  readonly unproven: number;
  readonly totalWalkMs: number;
  readonly floored: boolean;
  readonly pins: readonly ClaimPinLike[];
}

/**
 * Map one verdict onto the wire's row, with every lock the tree run checked
 * on the claim and, for a budget stop, the walk that stopped.
 *
 * @param claim the verdict
 * @param result the run it belongs to (its pins, walks and floor)
 * @returns the row
 */
export function claimResultRowOf(claim: ClaimVerdictLike, result: Pick<ClaimsRunLike, 'pins' | 'walks' | 'floored'>): ClaimResultRow {
  const locks = result.pins.filter((pin) => pin.claim === claim.name).map(lockPinOf);
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
export function claimsSummaryRowOf(result: ClaimsRunLike): ClaimsSummaryRow {
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

function lockPinOf(pin: ClaimPinLike): ClaimLockPin {
  return {
    lineId: pin.lineId,
    label: pin.label,
    turn: pin.turn,
    ...(pin.cardId !== undefined ? { cardId: pin.cardId } : {}),
    outcome: pin.outcome,
    ...(pin.message !== undefined ? { message: pin.message } : {}),
  };
}

/**
 * The verdict's head: `HELD  the deed is in hand`, `VIOLATED  the deed box leaves the Folly (never)`.
 *
 * @param row the claim
 * @returns the head
 */
export function claimHeadline(row: Pick<ClaimResultRow, 'verdict' | 'name' | 'never'>): string {
  return `${row.verdict.toUpperCase()}  ${row.name}${row.never ? ' (never)' : ''}`;
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
        .filter((pin) => pin.outcome !== 'held')
        .map((pin) => `; its lock at line ${pin.lineId} "${pin.label}" turn ${pin.turn} is NOT held there`)
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
 * @param pin the lock
 * @returns the line, indented as the report prints it
 */
export function claimLockLine(name: string, pin: ClaimLockPin): string {
  const where = `line ${pin.lineId} "${pin.label}" at turn ${pin.turn}`;
  if (pin.outcome === 'held') return `  lock "${name}" at ${where} — held there`;
  if (pin.outcome === 'not-held') return `  lock "${name}" at ${where} — NOT held there: ${pin.message}`;
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
