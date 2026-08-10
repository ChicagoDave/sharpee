/**
 * run.ts — the run column's state (design §7, ADR-306 Phase 6).
 *
 * Purpose: fold the `sharpee test --tree --json` NDJSON stream (relayed by
 *   the Swift side line by line) into the one question the column answers —
 *   *do my transcripts still pass?* One result per transcript file, keyed by
 *   stem; a failed file carries its FIRST failure on one line
 *   (`turn 3 — Output does not contain "…"`); a closing tally. Decoding goes
 *   through the wire's own `isRunEvent` guard (DEVARCH 8b — the shapes are
 *   imported, never mirrored), exactly as the Testing tab decodes the same
 *   stream.
 *
 * Public interface: RunColumnState, TranscriptRunResult, createRunState,
 *   beginRun, foldRunLine, finishRun, resetRun.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { isRunEvent, type RunEvent } from '@sharpee/ide-protocol/run-events';

/** One transcript file's outcome, as the column shows it. */
export interface TranscriptRunResult {
  /** The wire's per-file status, verbatim. */
  status: 'passed' | 'failed' | 'error' | 'unreached' | 'skipped';
  /** Turn counts from `transcript-end`. */
  passed: number;
  failed: number;
  /**
   * The file's first failure, one line: `turn N — <message>`. Filled from
   * the first failed `command-result` (its `failure` message, else its
   * runtime `error`); an error-status file carries its `errorMessage`, an
   * unreached file names its blocker.
   */
  firstFailure?: string;
  /** Failed turns beyond the first (`+n more`). */
  moreFailures: number;
}

/** The whole column's state: per-stem results and the closing tally. */
export interface RunColumnState {
  /** A run is in flight — the button disables and rows fill live. */
  inFlight: boolean;
  /** Results keyed by transcript STEM (basename minus `.transcript`). */
  results: Map<string, TranscriptRunResult>;
  /** `run-end`'s aggregate, present once the stream closed cleanly. */
  tally?: { passed: number; failed: number; errors: number; unreached: number };
  /** A pipeline failure (launch/load death with no stream), in Swift's words. */
  note?: string;
  /** Files whose CURRENT execution is a replay (state rebuild) — never rows. */
  replaying: Set<string>;
}

/** A column that has never run. */
export function createRunState(): RunColumnState {
  return { inFlight: false, results: new Map(), replaying: new Set() };
}

/** A new run starts: prior results clear — the column reports THIS run. */
export function beginRun(state: RunColumnState): void {
  state.inFlight = true;
  state.results.clear();
  state.replaying.clear();
  delete state.tally;
  delete state.note;
}

/** `file` (absolute path) as the stem the column's rows are keyed by. */
function stemOf(file: string): string {
  const base = file.split('/').at(-1) ?? file;
  return base.replace(/\.transcript$/, '');
}

/**
 * Folds one raw NDJSON line. Undecodable lines are ignored — the stream also
 * carries nothing else, so an unknown line is a future event variant, and
 * the guard's contract is that consumers ignore what they do not recognise.
 */
export function foldRunLine(state: RunColumnState, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return;
  }
  if (!isRunEvent(parsed)) return;
  fold(state, parsed);
}

function fold(state: RunColumnState, event: RunEvent): void {
  switch (event.type) {
    case 'transcript-start': {
      // A tree re-executes ancestors to build sibling state; those replays
      // are not rows (start/end pair positionally — the flag rides start).
      if (event.replayed === true) state.replaying.add(event.file);
      else state.replaying.delete(event.file);
      return;
    }
    case 'command-result': {
      if (event.passed || event.skipped || state.replaying.has(event.file)) return;
      const stem = stemOf(event.file);
      const existing = state.results.get(stem);
      if (existing?.firstFailure !== undefined) {
        existing.moreFailures += 1;
        return;
      }
      const message = event.failure ?? event.error ?? 'failed';
      const where = event.turn !== undefined ? `turn ${event.turn}` : `line ${event.line}`;
      state.results.set(stem, {
        status: 'failed',
        passed: 0,
        failed: 1,
        firstFailure: `${where} — ${message}`,
        moreFailures: existing?.moreFailures ?? 0,
      });
      return;
    }
    case 'transcript-end': {
      if (state.replaying.has(event.file)) {
        state.replaying.delete(event.file);
        return;
      }
      const stem = stemOf(event.file);
      const partial = state.results.get(stem);
      const result: TranscriptRunResult = {
        status: event.status,
        passed: event.passed,
        failed: event.failed,
        moreFailures: Math.max(0, event.failed - 1),
      };
      if (partial?.firstFailure !== undefined) result.firstFailure = partial.firstFailure;
      else if (event.status === 'error' && event.errorMessage !== undefined) {
        result.firstFailure = event.errorMessage;
      } else if (event.status === 'unreached') {
        result.firstFailure = event.blockedBy !== undefined
          ? `blocked by ${stemOf(event.blockedBy)}`
          : 'blocked by an ancestor';
      }
      state.results.set(stem, result);
      return;
    }
    case 'run-end': {
      state.inFlight = false;
      state.tally = {
        passed: event.totalPassed,
        failed: event.totalFailed,
        errors: event.totalErrors,
        unreached: event.totalUnreached,
      };
      return;
    }
    default:
      return;
  }
}

/**
 * The suite on disk changed under the results (a range unticked, a branch
 * deleted, a segment renamed): the results describe a tree that no longer
 * exists, so the column resets to "not run yet" rather than keep reporting
 * it (David's ruling, 2026-08-09). Never called mid-run — the caller guards
 * on `inFlight`.
 */
export function resetRun(state: RunColumnState): void {
  state.inFlight = false;
  state.results.clear();
  state.replaying.clear();
  delete state.tally;
  delete state.note;
}

/**
 * The run process exited. A clean stream already closed via `run-end`; a
 * process that died without one (launch failure, missing CLI) leaves the
 * column saying so instead of spinning forever.
 */
export function finishRun(state: RunColumnState, ok: boolean, note?: string): void {
  state.inFlight = false;
  if (!ok && state.tally === undefined) {
    state.note = note ?? 'The run ended without completing its stream.';
  }
}
