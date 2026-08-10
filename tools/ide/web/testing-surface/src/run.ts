/**
 * run.ts — the run column's state (design §7, ADR-306 Phase 6).
 *
 * Purpose: fold the `sharpee test --tree --json` NDJSON stream (relayed by
 *   the Swift side line by line) into the column's answer: one result per
 *   LINE, keyed by its derived label — the identity on the document run's
 *   wire (ADR-307 D2/Q-8; a fallback transcript stream's file paths reduce
 *   to their stems through the same key) — and, inside each line, EVERY
 *   executed command with every assertion's verdict (David 2026-08-10: the
 *   run shows every card and its assertions). A failed line also carries its
 *   FIRST failure one-line for the header; a closing tally counts lines.
 *   Decoding goes through the wire's own `isRunEvent` guard (DEVARCH 8b —
 *   the shapes are imported, never mirrored).
 *
 * Public interface: RunColumnState, TranscriptRunResult, createRunState,
 *   beginRun, foldRunLine, finishRun, resetRun.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { isRunEvent, type RunEvent } from '@sharpee/ide-protocol/run-events';

/** One assertion's verdict, as the wire carried it (the detail view's row). */
export interface AssertionVerdict {
  description: string;
  passed: boolean;
  message?: string;
}

/** One executed command's detail — the card's run outcome (David
 *  2026-08-10: the run shows every card and its assertions). */
export interface CommandOutcome {
  input: string;
  passed: boolean;
  skipped: boolean;
  /** Every evaluated assertion's verdict, in authored order. */
  assertions: AssertionVerdict[];
  /** The command's failure (first failed assertion or runtime error). */
  failure?: string;
}

/** One line's outcome, as the column shows it. */
export interface TranscriptRunResult {
  /** The wire's per-line status, verbatim. */
  status: 'passed' | 'failed' | 'error' | 'unreached' | 'skipped';
  /** Command counts from `transcript-end` (wire data, not display). */
  passed: number;
  failed: number;
  /** Per-command detail, in execution order — the detail view's spine. */
  commands: CommandOutcome[];
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

/** The whole column's state: per-label results and the closing tally. */
export interface RunColumnState {
  /** A run is in flight — the button disables and rows fill live. */
  inFlight: boolean;
  /** Results keyed by derived label (a fallback stream's paths reduce to
   *  stems through the same key). */
  results: Map<string, TranscriptRunResult>;
  /** Commands accumulating for a line still mid-stream (before its
   *  `transcript-end` seals them into `results`). */
  pendingCommands: Map<string, CommandOutcome[]>;
  /** CARD and ASSERTION counts derived from the detail when `run-end`
   *  closes the stream cleanly (David 2026-08-10: every assertion counts) —
   *  skipped cards join neither side; `errors`/`unreached` stay line-level. */
  tally?: {
    cardsPassed: number;
    cardsFailed: number;
    assertionsPassed: number;
    assertionsFailed: number;
    errors: number;
    unreached: number;
  };
  /** A pipeline failure (launch/load death with no stream), in Swift's words. */
  note?: string;
  /** Files whose CURRENT execution is a replay (state rebuild) — never rows. */
  replaying: Set<string>;
}

/** A column that has never run. */
export function createRunState(): RunColumnState {
  return {
    inFlight: false,
    results: new Map(),
    pendingCommands: new Map(),
    replaying: new Set(),
  };
}

/** A new run starts: prior results clear — the column reports THIS run. */
export function beginRun(state: RunColumnState): void {
  state.inFlight = true;
  state.results.clear();
  state.pendingCommands.clear();
  state.replaying.clear();
  delete state.tally;
  delete state.note;
}

/** The wire's `file` field as the column's row key: a derived label passes
 *  through verbatim; a fallback stream's path reduces to its stem. */
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
      if (state.replaying.has(event.file)) return;
      const stem = stemOf(event.file);
      // Every executed command is a detail row (David 2026-08-10: the run
      // shows every card and its assertions), sealed at `transcript-end`.
      const failureMessage = event.failure ?? event.error;
      const outcome: CommandOutcome = {
        input: event.input,
        passed: event.passed,
        skipped: event.skipped,
        assertions: (event.assertionResults ?? []).map((entry) => ({
          description: entry.description,
          passed: entry.passed,
          ...(entry.message !== undefined ? { message: entry.message } : {}),
        })),
        ...(failureMessage !== undefined && !event.passed ? { failure: failureMessage } : {}),
      };
      const pending = state.pendingCommands.get(stem) ?? [];
      pending.push(outcome);
      state.pendingCommands.set(stem, pending);

      if (event.passed || event.skipped) return;
      const existing = state.results.get(stem);
      if (existing?.firstFailure !== undefined) {
        existing.moreFailures += 1;
        return;
      }
      const message = failureMessage ?? 'failed';
      // Position prefix: turn number when the wire has one, source line for
      // the transcript world. A document run's cards have no source lines
      // (the wire carries `line: 0`) — the message stands alone.
      const where =
        event.turn !== undefined ? `turn ${event.turn}`
        : event.line > 0 ? `line ${event.line}`
        : undefined;
      state.results.set(stem, {
        status: 'failed',
        passed: 0,
        failed: 1,
        commands: [],
        firstFailure: where !== undefined ? `${where} — ${message}` : message,
        moreFailures: existing?.moreFailures ?? 0,
      });
      return;
    }
    case 'transcript-end': {
      if (state.replaying.has(event.file)) {
        state.replaying.delete(event.file);
        state.pendingCommands.delete(stemOf(event.file));
        return;
      }
      const stem = stemOf(event.file);
      const partial = state.results.get(stem);
      const result: TranscriptRunResult = {
        status: event.status,
        passed: event.passed,
        failed: event.failed,
        commands: state.pendingCommands.get(stem) ?? [],
        moreFailures: Math.max(0, event.failed - 1),
      };
      state.pendingCommands.delete(stem);
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
      // Every assertion counts (David 2026-08-10): the tally aggregates the
      // detail itself — cards (executed commands, opening row included) and
      // assertions, each passing or failing; skipped cards join neither
      // side. Line-level errors/unreached keep their own counts. Never the
      // wire's totals — the detail above IS the tally's source.
      let cardsPassed = 0;
      let cardsFailed = 0;
      let assertionsPassed = 0;
      let assertionsFailed = 0;
      let errors = 0;
      let unreached = 0;
      for (const result of state.results.values()) {
        if (result.status === 'error') errors += 1;
        else if (result.status === 'unreached') unreached += 1;
        for (const command of result.commands) {
          if (command.skipped) continue;
          if (command.passed) cardsPassed += 1;
          else cardsFailed += 1;
          for (const assertion of command.assertions) {
            if (assertion.passed) assertionsPassed += 1;
            else assertionsFailed += 1;
          }
        }
      }
      state.tally = {
        cardsPassed,
        cardsFailed,
        assertionsPassed,
        assertionsFailed,
        errors,
        unreached,
      };
      return;
    }
    default:
      return;
  }
}

/**
 * The document changed under the results (a turn played, a tail cut, a
 * branch deleted): the results describe a tree that no longer exists, so
 * the column resets to "not run yet" rather than keep reporting it
 * (David's ruling, 2026-08-09). Never called mid-run — the caller guards
 * on `inFlight`.
 */
export function resetRun(state: RunColumnState): void {
  state.inFlight = false;
  state.results.clear();
  state.pendingCommands.clear();
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
