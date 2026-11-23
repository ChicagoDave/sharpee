/**
 * lens.ts — the run column's examinable-lens state (ADR-408 D8 on the wire).
 *
 * Purpose: shape the `lens-finding` and `lens-summary` events the run column
 *   folds into what the lens section renders from: one row per finding in
 *   arrival order, the run's soundness summary or its refusal, and — when a
 *   run ends with no `lens-summary` at all — why the section has nothing to
 *   show. A run whose stream closed normally (exit 0 or 1) yet carried no
 *   summary came from a `sharpee` that has no lens tier (ADR-408 AC-4, GH
 *   #653), and the section says so rather than showing an empty list. A run
 *   that stopped before its tiers (exit 2 or 3) never reached the lens, and
 *   the section says that instead. Findings never touch the tally: a lens
 *   never gates (D7).
 *
 * Public interface: LensFindingRow, LensSummary, LensAbsence, LensStatus,
 *   lensFindingRowOf, lensSummaryOf, lensAbsenceAt, lensStatusOf,
 *   lensAbsenceText.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { LensFindingEvent, LensSummaryEvent, RunEventEnvelope } from '@sharpee/ide-protocol/run-events';

/** One finding as the column keeps it: the event minus its envelope. */
export type LensFindingRow = Omit<LensFindingEvent, keyof RunEventEnvelope | 'type'>;

/** The lens's soundness line or refusal: the event minus its envelope. */
export type LensSummary = Omit<LensSummaryEvent, keyof RunEventEnvelope | 'type'>;

/** Why a finished run carried no `lens-summary`. */
export type LensAbsence = 'toolchain-without-lens' | 'run-stopped-early';

/** What the lens section shows, decided from the column's state. */
export type LensStatus =
  | { readonly kind: 'not-run' }
  | { readonly kind: 'running' }
  | { readonly kind: 'refused'; readonly message: string }
  | { readonly kind: 'reported'; readonly summary: LensSummary }
  | { readonly kind: 'absent'; readonly absence: LensAbsence };

/**
 * Keeps a `lens-finding` event's payload, envelope dropped.
 *
 * @param event the decoded event
 * @returns the row the column keeps
 */
export function lensFindingRowOf(event: LensFindingEvent): LensFindingRow {
  const { schemaVersion: _v, seq: _s, elapsedMs: _e, type: _t, ...row } = event;
  return row;
}

/**
 * Keeps a `lens-summary` event's payload, envelope dropped.
 *
 * @param event the decoded event
 * @returns the summary the column keeps
 */
export function lensSummaryOf(event: LensSummaryEvent): LensSummary {
  const { schemaVersion: _v, seq: _s, elapsedMs: _e, type: _t, ...summary } = event;
  return summary;
}

/**
 * Why a run that closed its stream carried no `lens-summary`, read off its
 * `run-end` exit code: 2 (the tree was refused or defective) and 3 (the story
 * would not load) stop the command before its tiers; 0 and 1 mean the tiers
 * ran, so a missing summary means this `sharpee` has no lens tier.
 *
 * @param exitCode the `run-end` event's exit code
 * @returns the absence to name
 */
export function lensAbsenceAt(exitCode: number): LensAbsence {
  return exitCode >= 2 ? 'run-stopped-early' : 'toolchain-without-lens';
}

/**
 * What the lens section shows.
 *
 * @param state the column's lens fields and whether a run is in flight
 * @returns the summary or refusal once it arrived; the absence once a run
 *   ended without one; running while the stream is open; not-run before
 *   any run
 */
export function lensStatusOf(state: {
  readonly inFlight: boolean;
  readonly lensSummary?: LensSummary;
  readonly lensAbsence?: LensAbsence;
}): LensStatus {
  if (state.lensSummary !== undefined) {
    return state.lensSummary.refusal !== undefined
      ? { kind: 'refused', message: state.lensSummary.refusal }
      : { kind: 'reported', summary: state.lensSummary };
  }
  if (state.lensAbsence !== undefined) return { kind: 'absent', absence: state.lensAbsence };
  return state.inFlight ? { kind: 'running' } : { kind: 'not-run' };
}

/**
 * The section's sentence for a run that carried no lens results.
 *
 * @param absence why there were none
 * @returns the sentence the section shows in place of findings
 */
export function lensAbsenceText(absence: LensAbsence): string {
  return absence === 'toolchain-without-lens'
    ? 'This project\'s sharpee does not run the examinable lens. Update the toolchain to see nouns the player reads but cannot use.'
    : 'The run stopped before the examinable lens; it runs once the tree runs.';
}
