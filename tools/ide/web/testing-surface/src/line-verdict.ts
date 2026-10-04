/**
 * line-verdict.ts — what the last run says about one line, in the five
 * states the outline tints with (ADR-357 D4).
 *
 * Purpose: one place maps the wire's per-line status to a tint, and one
 * place rolls a fork's lines up into its heading, so the outline and any
 * later aid (the failure list, the position indicator) agree on what a
 * line's state is.
 *
 * - `pass`      the line passed on the last run
 * - `fail`      a claim failed, or the line errored
 * - `unreached` the run tried and could not get there — a finding
 * - `stale`     the result describes a tree or build that has since changed
 *               (ADR-357 D11; nothing produces it until the staleness
 *               contract lands)
 * - `none`      no result: never run, skipped, or added since the run —
 *               unknown, not a finding
 *
 * A fork heading takes the worst of its lines, worst first: fail,
 * unreached, stale, none, pass. A heading reads pass only when every line
 * under it passed, so one line nobody has run keeps it from reading green.
 *
 * Public interface: LineVerdict, verdictOfResult, rollUpVerdicts.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { TranscriptRunResult } from './run';

/** One line's state as the outline shows it. */
export type LineVerdict = 'pass' | 'fail' | 'unreached' | 'stale' | 'none';

/** Worst first — the order a heading's roll-up resolves ties by. */
const SEVERITY: readonly LineVerdict[] = ['fail', 'unreached', 'stale', 'none', 'pass'];

/**
 * The verdict for one line's result.
 *
 * @param result the run column's result for the line, or undefined when the
 *   last run produced none for it
 * @returns the line's verdict
 */
export function verdictOfResult(result: TranscriptRunResult | undefined): LineVerdict {
  if (result === undefined) return 'none';
  switch (result.status) {
    case 'passed':
      return 'pass';
    case 'failed':
    case 'error':
      return 'fail';
    case 'unreached':
      return 'unreached';
    case 'skipped':
      return 'none';
  }
}

/**
 * Roll a fork's lines up into its heading's verdict: the worst among them.
 *
 * @param verdicts the verdicts of the lines hanging off the fork
 * @returns the worst verdict, or `none` for a fork with no lines
 */
export function rollUpVerdicts(verdicts: readonly LineVerdict[]): LineVerdict {
  if (verdicts.length === 0) return 'none';
  let worst = SEVERITY.length - 1;
  for (const verdict of verdicts) worst = Math.min(worst, SEVERITY.indexOf(verdict));
  return SEVERITY[worst];
}
