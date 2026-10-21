/**
 * claims.ts — the run column's claims-tier state (ADR-365 D6 and ADR-367 D6
 * on the wire; GH #555's claims row).
 *
 * Purpose: shape the `claim-result` and `claims-summary` events the run
 *   column folds into what the column shows — one row per declared claim in
 *   arrival order, each with its verdict, the sentence `sharpee test` prints
 *   for it, and the locks the tree run checked on it, plus the ratio header.
 *   The sentence and the header come from `@sharpee/branch-tester`'s
 *   `claim-report`, the same functions the CLI report calls, so the tab and
 *   the report read as one vocabulary and cannot drift (the derived tier's
 *   discipline). A lock that did not hold is already a failed card in the
 *   tree section; here it is the way to that card.
 *
 * Public interface: ClaimRow, ClaimsSummary, claimRowOf, claimsSummaryOf,
 *   claimsHeaderText, claimWhyText, claimLockText, claimLockVisit.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { ClaimResultEvent, ClaimsSummaryEvent, ClaimLockPin, RunEventEnvelope } from '@sharpee/ide-protocol/run-events';
import { claimLockLine, claimSentence, type ClaimResultRow, type ClaimsSummaryRow } from '@sharpee/branch-tester/claim-report';

/** One claim's verdict as the column keeps it: the event minus its envelope. */
export type ClaimRow = ClaimResultRow;

/** The claims tier's ratio: the event minus its envelope. */
export type ClaimsSummary = ClaimsSummaryRow;

/**
 * Keeps a `claim-result` event's payload, envelope dropped.
 *
 * @param event the decoded event
 * @returns the row the column keeps
 */
export function claimRowOf(event: ClaimResultEvent): ClaimRow {
  const { schemaVersion: _v, seq: _s, elapsedMs: _e, type: _t, ...row } = event as ClaimResultEvent & RunEventEnvelope;
  return row;
}

/**
 * Keeps a `claims-summary` event's payload, envelope dropped.
 *
 * @param event the decoded event
 * @returns the summary the column keeps
 */
export function claimsSummaryOf(event: ClaimsSummaryEvent): ClaimsSummary {
  const { schemaVersion: _v, seq: _s, elapsedMs: _e, type: _t, ...summary } = event as ClaimsSummaryEvent & RunEventEnvelope;
  return summary;
}

/**
 * The section's title: `claims · 9 of 10 held`.
 *
 * @param summary the ratio, or undefined before it arrives
 * @param rows the rows so far, for a count while the summary is pending
 * @returns the title
 */
export function claimsHeaderText(summary: ClaimsSummary | undefined, rows: readonly ClaimRow[]): string {
  if (summary) return `claims · ${summary.held} of ${summary.declared} held`;
  return `claims · ${rows.length}`;
}

/**
 * The sentence beside a claim's verdict — the CLI report's own words after
 * the ` — `.
 *
 * @param row the claim
 * @returns the sentence
 */
export function claimWhyText(row: ClaimRow): string {
  return claimSentence(row);
}

/**
 * One lock's line, as the CLI report prints it, without its indent.
 *
 * @param row the claim the lock is on
 * @param pin the lock
 * @returns the text
 */
export function claimLockText(row: ClaimRow, pin: ClaimLockPin): string {
  return claimLockLine(row.name, pin).trimStart();
}

/**
 * Where a lock's row visits: its line, and its card when the wire named one.
 *
 * @param pin the lock
 * @returns the visit target
 */
export function claimLockVisit(pin: ClaimLockPin): { lineId: string; cardId?: string } {
  return { lineId: pin.lineId, ...(pin.cardId !== undefined ? { cardId: pin.cardId } : {}) };
}
