/**
 * run.ts — the run column's state (design §7, ADR-306 Phase 6).
 *
 * Purpose: fold the `sharpee test --tree --json` NDJSON stream (relayed by
 *   the Swift side line by line) into the column's answer: one result per
 *   LINE, keyed by its id — the id of the segment it begins with, the
 *   identity on the document run's wire (ADR-355 D5; a fallback transcript
 *   stream's file paths reduce to their stems through the same key), so two
 *   lines sharing a derived label never fold (GH #494) — carrying the label
 *   `transcript-start` announced for display, and, inside each line, EVERY
 *   executed command with every assertion's verdict (David 2026-08-10: the
 *   run shows every card and its assertions). A failed line also carries its
 *   FIRST failure as data for the header — the column composes the line;
 *   a closing tally counts lines.
 *   The derived tier (ADR-356, GH #524) rides the same stream after the
 *   tree's lines: one `derived-branch` row per clause branch in arrival
 *   order, its status kept as the wire's four values (a SKIPPED branch is
 *   never a failure — D5a), and the one `derived-summary` per run, kept as
 *   the latest seen. The claims tier (ADR-365 D6, ADR-367 D6; GH #555)
 *   follows it the same way: one `claim-result` row per declared claim in
 *   arrival order and the one `claims-summary` per run. The examinable
 *   lens's tier (ADR-408 D8) follows the claims: one `lens-finding` row per
 *   finding and the one `lens-summary`; a run that closes with none is
 *   recorded as a lens absence (`lens.ts`, AC-4). Decoding goes
 *   through the wire's own `isRunEvent` guard (DEVARCH 8b — the shapes are
 *   imported, never mirrored).
 *
 * Public interface: RunColumnState, TranscriptRunResult, FirstFailure,
 *   createRunState, beginRun, foldRunLine, finishRun, resetRun, runRowsOf,
 *   RunColumnLine, RunColumnRow, RunVisitTarget, runRowVisitTarget, restatesTextClaim,
 *   commandRowText, firstFailureText.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { isRunEvent, type CommandCause, type RunEvent } from '@sharpee/ide-protocol/run-events';
import { claimRowOf, claimsSummaryOf, type ClaimRow, type ClaimsSummary } from './claims';
import { derivedRowOf, derivedSummaryOf, type DerivedBranchRow, type DerivedSummary } from './derived';
import { lensAbsenceAt, lensFindingRowOf, lensSummaryOf, type LensAbsence, type LensFindingRow, type LensSummary } from './lens';
import type { RunBaseline } from './staleness';

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
  /**
   * What the story printed for this command, when the wire carried it. The
   * wire carries it on every FAILED result by default (and on every result
   * under `--capture-output`), so a failed claim can be read against the
   * text it was checked on (UPPS finding F-10). Absent when the producer
   * sent none, or sent an empty string — an empty block says nothing.
   */
  output?: string;
  /**
   * Why the engine refused the command, when the producer could name it
   * (UPPS finding F-15): two sentences, what is wrong and what to do,
   * composed on the wire so the CLI says the same. Failed results only.
   */
  cause?: CommandCause;
  /**
   * The tree card this result came from, when the wire named it (ADR-357
   * D9): the card whose command ran, or the opening card for the `(opening)`
   * row. What lets a failure visit land on the card itself. Absent for a
   * `.transcript` run or a producer that predates the field.
   */
  cardId?: string;
}

/**
 * Whether a failed assertion's message only restates the claim against the
 * output — `Output does not contain "…"`, `Output should not contain "…"`,
 * `Output did not match expected` (the assertion core's three text-claim
 * messages, which all begin `Output `). Under a claim row that already names
 * the expected text, such a line adds nothing (UPPS finding F-14); the
 * output itself is what the author needs. A state or channel claim's message
 * carries the actual value (`player.location = … (actual: …)`) and is kept.
 */
export function restatesTextClaim(message: string): boolean {
  return message.startsWith('Output ');
}

/**
 * A line's first failure, kept as wire data: where it happened, what the
 * runner said, and which executed command it belongs to. The column turns
 * this into its header line (`firstFailureText`).
 */
export interface FirstFailure {
  /**
   * The position: `turn N` from the wire's engine turn, else `line N` for a
   * transcript's source line. Absent for a document card with no source
   * line, a load error, or a blocker — the message then stands alone.
   */
  where?: string;
  /** The runner's words — a failed claim's message, a runtime error, a blocker's name. */
  message: string;
  /** Index into the line's `commands` of the failing command; absent when the failure is the line's, not a command's. */
  command?: number;
  /** The failing command's tree card, when the wire named it (ADR-357 D9) — where a visit lands. */
  cardId?: string;
}

/** Where a run-column click lands: the line, and the failing card when the wire named one (ADR-357 D9). */
export interface RunVisitTarget {
  lineId: string;
  cardId?: string;
}

/**
 * One executed row's title in the detail: the opening in parentheses,
 * because nothing was typed for it (the walker runs the story's opening and
 * types no `look`, so no row is a first look of its own); a typed command
 * behind the prompt it was typed at.
 */
export function commandRowText(command: CommandOutcome): string {
  if (command.input === '(opening)') return '(opening)';
  return `> ${command.input}`;
}

/**
 * A line's first failure as its header reads it: `turn N — <message>`. A
 * failure with no position is the message alone.
 */
export function firstFailureText(failure: FirstFailure): string {
  return failure.where !== undefined ? `${failure.where} — ${failure.message}` : failure.message;
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
   * The file's first failure, as data — the column composes its one line
   * with `firstFailureText`. Filled from the first failed `command-result`
   * (its `failure` message, else its runtime `error`); an error-status file
   * carries its `errorMessage`, an unreached file names its blocker.
   */
  firstFailure?: FirstFailure;
  /** Failed turns beyond the first (`+n more`). */
  moreFailures: number;
  /** The display name `transcript-start` announced (a tree line's derived
   *  label); absent when the key is its own name. Display only. */
  label?: string;
  /**
   * The result describes a tree or build that has since changed (ADR-357
   * D11): still shown, tinted as unverified, never dropped. Set by the
   * staleness evaluation, never by the fold — a fresh result is current.
   */
  stale?: boolean;
}

/** The whole column's state: per-line results and the closing tally. */
export interface RunColumnState {
  /** A run is in flight — the button disables and rows fill live. */
  inFlight: boolean;
  /** Results keyed by the wire's identity: a tree line's id (ADR-355 D5),
   *  or a fallback stream's path reduced to its stem. */
  results: Map<string, TranscriptRunResult>;
  /** Display names by key, from each `transcript-start`'s `label`. */
  labels: Map<string, string>;
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
    /** The derived tier's four counts, present only when it ran a branch. */
    rules?: { passed: number; failed: number; skipped: number; errors: number };
  };
  /** A pipeline failure (launch/load death with no stream), in Swift's words. */
  note?: string;
  /** Files whose CURRENT execution is a replay (state rebuild) — never rows. */
  replaying: Set<string>;
  /** Derived branches in arrival order (ADR-356; one per `derived-branch`). */
  derived: DerivedBranchRow[];
  /** The run's three ratios — the latest `derived-summary` (one per run). */
  derivedSummary?: DerivedSummary;
  /** Claims in arrival order (ADR-365 D6; one per `claim-result`). */
  claims: ClaimRow[];
  /** The claims tier's ratio — the latest `claims-summary` (one per run). */
  claimsSummary?: ClaimsSummary;
  /** Lens findings in arrival order (ADR-408 D8; one per `lens-finding`). */
  lensFindings: LensFindingRow[];
  /** The lens's soundness line or refusal — the latest `lens-summary` (one per run). */
  lensSummary?: LensSummary;
  /** Set at `run-end` when no `lens-summary` came: why (ADR-408 AC-4). */
  lensAbsence?: LensAbsence;
  /**
   * What the run ran against (ADR-357 D11): captured by the caller at run
   * start, restored with a stored run, cleared by `resetRun`. Absent means
   * no run has a baseline, so nothing can be judged stale.
   */
  baseline?: RunBaseline;
  /** The derived tier's results describe a build that has since changed (D11). */
  derivedStale?: boolean;
}

/** A column that has never run. */
export function createRunState(): RunColumnState {
  return {
    inFlight: false,
    results: new Map(),
    labels: new Map(),
    pendingCommands: new Map(),
    replaying: new Set(),
    derived: [],
    claims: [],
    lensFindings: [],
  };
}

/** Clears the lens tier's fields: a new run or a reset reports nothing of the last. */
function clearLens(state: RunColumnState): void {
  state.lensFindings = [];
  delete state.lensSummary;
  delete state.lensAbsence;
}

/** A new run starts: prior results clear — the column reports THIS run. */
export function beginRun(state: RunColumnState): void {
  state.inFlight = true;
  state.results.clear();
  state.labels.clear();
  state.pendingCommands.clear();
  state.replaying.clear();
  state.derived = [];
  delete state.derivedSummary;
  state.claims = [];
  delete state.claimsSummary;
  clearLens(state);
  delete state.tally;
  delete state.note;
  delete state.baseline;
  delete state.derivedStale;
}

/** The wire's `file` field as the column's row key: a tree line's id passes
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
      if (event.label !== undefined) state.labels.set(stemOf(event.file), event.label);
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
        ...(event.actualOutput !== undefined && event.actualOutput.length > 0
          ? { output: event.actualOutput }
          : {}),
        ...(event.cause !== undefined && !event.passed ? { cause: event.cause } : {}),
        ...(event.cardId !== undefined ? { cardId: event.cardId } : {}),
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
      // Position: turn number when the wire has one, source line for the
      // transcript world. A document run's cards have no source lines (the
      // wire carries `line: 0`) — the message stands alone.
      const where =
        event.turn !== undefined ? `turn ${event.turn}`
        : event.line > 0 ? `line ${event.line}`
        : undefined;
      const label = state.labels.get(stem);
      state.results.set(stem, {
        status: 'failed',
        passed: 0,
        failed: 1,
        commands: [],
        firstFailure: {
          ...(where !== undefined ? { where } : {}),
          message,
          command: pending.length - 1,
          ...(event.cardId !== undefined ? { cardId: event.cardId } : {}),
        },
        moreFailures: existing?.moreFailures ?? 0,
        ...(label !== undefined ? { label } : {}),
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
      const label = state.labels.get(stem);
      if (label !== undefined) result.label = label;
      if (partial?.firstFailure !== undefined) result.firstFailure = partial.firstFailure;
      else if (event.status === 'error' && event.errorMessage !== undefined) {
        result.firstFailure = { message: event.errorMessage };
      } else if (event.status === 'unreached') {
        // The blocker is named the way its own row is: its label, else its key.
        const blocker = event.blockedBy !== undefined ? stemOf(event.blockedBy) : undefined;
        result.firstFailure = {
          message: blocker !== undefined
            ? `blocked by ${state.labels.get(blocker) ?? blocker}`
            : 'blocked by an ancestor',
        };
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
      // The derived tier counts the same way — from its rows, never the
      // summary's totals — and only when it ran a branch: a story with no
      // rules keeps the tally it always had.
      if (state.derived.length > 0) {
        const rules = { passed: 0, failed: 0, skipped: 0, errors: 0 };
        for (const row of state.derived) {
          if (row.status === 'passed') rules.passed += 1;
          else if (row.status === 'failed') rules.failed += 1;
          else if (row.status === 'skipped') rules.skipped += 1;
          else rules.errors += 1;
        }
        state.tally.rules = rules;
      }
      // A closed stream with no lens summary names why (ADR-408 AC-4).
      if (state.lensSummary === undefined) state.lensAbsence = lensAbsenceAt(event.exitCode);
      return;
    }
    case 'derived-branch': {
      // One row per branch as it completes; the status is the wire's own
      // four values, so a consumer cannot read SKIPPED as failed (D5a).
      state.derived.push(derivedRowOf(event));
      return;
    }
    case 'derived-summary': {
      // Exactly one per run — keep the latest, no merging.
      state.derivedSummary = derivedSummaryOf(event);
      return;
    }
    case 'claim-result': {
      // One row per declared claim as the tier settles it (ADR-365 D6);
      // its verdict never touches the tally — claims never gate (D9).
      state.claims.push(claimRowOf(event));
      return;
    }
    case 'claims-summary': {
      state.claimsSummary = claimsSummaryOf(event);
      return;
    }
    case 'lens-finding': {
      // One row per finding; it never touches the tally — a lens never gates (D7).
      state.lensFindings.push(lensFindingRowOf(event));
      return;
    }
    case 'lens-summary': {
      state.lensSummary = lensSummaryOf(event);
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
  state.labels.clear();
  state.pendingCommands.clear();
  state.replaying.clear();
  state.derived = [];
  delete state.derivedSummary;
  state.claims = [];
  delete state.claimsSummary;
  clearLens(state);
  delete state.tally;
  delete state.note;
  delete state.baseline;
  delete state.derivedStale;
}

/**
 * The run process exited. A clean stream already closed via `run-end`; a
 * process that died without one (launch failure, missing CLI) leaves the
 * column saying so instead of spinning forever. So does a run that closed
 * its stream having run NOTHING — a document refused at validation still
 * sends `run-end` with an exit code and zero totals, and without the note
 * the column showed all zeros and no reason (2026-09-27).
 */
export function finishRun(state: RunColumnState, ok: boolean, note?: string): void {
  state.inFlight = false;
  const nothingRan = state.results.size === 0 && state.derived.length === 0;
  if (!ok && (state.tally === undefined || nothingRan)) {
    state.note = note ?? 'The run ended without completing its stream.';
  }
}

/** One line of the tree as the column needs it from the model. */
export interface RunColumnLine {
  /** The line's id — the id of the segment it begins with (ADR-355 D5). */
  id: string;
  /** Its derived label, for the row's title. */
  label: string;
  /** Just forked, no turn landed yet. */
  pending: boolean;
}

/** One header row of the run column's tree section. */
export type RunColumnRow =
  /** A line the run reported: its result, titled by label. */
  | { kind: 'result'; lineId: string; label: string; result: TranscriptRunResult }
  /** A line the run did not report: a dash and why — never a borrowed verdict. */
  | { kind: 'unrun'; lineId: string; label: string; why: 'pending branch' | 'running…' | 'not run yet' };

/**
 * The run column's tree rows (ADR-353 D2): every line the run reported, in
 * run order, then every model line it did not, in model order. A line's
 * verdict is looked up by its ID, so a line that shares its derived label
 * with a reported line still reads as unrun — the label is the title, never
 * the key (ADR-353 AC-3; GH #494).
 *
 * @param state the folded run.
 * @param lines the model's lines — the ones shown when the run has not
 *   reported them.
 * @returns the rows, results first.
 */
export function runRowsOf(state: RunColumnState, lines: readonly RunColumnLine[]): RunColumnRow[] {
  const byId = new Map(lines.map((line) => [line.id, line]));
  const rows: RunColumnRow[] = [];
  for (const [lineId, result] of state.results) {
    // The model's label for a line it holds (it tracks renames as the
    // author plays); else the one the wire announced; else the key itself.
    const label = byId.get(lineId)?.label ?? result.label ?? lineId;
    rows.push({ kind: 'result', lineId, label, result });
  }
  for (const line of lines) {
    if (state.results.has(line.id)) continue;
    const why = line.pending ? 'pending branch' : state.inFlight ? 'running…' : 'not run yet';
    rows.push({ kind: 'unrun', lineId: line.id, label: line.label, why });
  }
  return rows;
}

/**
 * Where a run-column row visits when clicked (ADR-357 D8 step 2, AC-4): a
 * FAILED row — a failed or errored result — visits its line, and lands on
 * the failing card when the wire named it (D9); every other row is inert.
 * An errored line, or a producer that sent no card id, lands at the top of
 * the line.
 */
export function runRowVisitTarget(row: RunColumnRow): RunVisitTarget | undefined {
  if (row.kind !== 'result') return undefined;
  if (row.result.status !== 'failed' && row.result.status !== 'error') return undefined;
  const cardId = row.result.firstFailure?.cardId;
  return { lineId: row.lineId, ...(cardId !== undefined ? { cardId } : {}) };
}

/**
 * Where one command's detail rows visit when clicked: a FAILED command
 * visits its own card on its line, so every failing card under a line can be
 * reached from its own rows and not only the first (which is all the line's
 * header row lands on). A command that passed or was skipped is inert. A
 * failed command whose card the wire did not name lands at the line's top,
 * as the header row does.
 *
 * @param lineId the line the command ran on
 * @param command the command's outcome from the run
 * @returns the visit target, or undefined when the rows are not clickable
 */
export function commandVisitTarget(lineId: string, command: CommandOutcome): RunVisitTarget | undefined {
  if (command.passed || command.skipped) return undefined;
  return { lineId, ...(command.cardId !== undefined ? { cardId: command.cardId } : {}) };
}
