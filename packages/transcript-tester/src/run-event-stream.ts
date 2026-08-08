/**
 * run-event-stream.ts — building the run-event stream as a run happens.
 *
 * Purpose: translate what the runner reports (domain facts: a transcript is
 *   starting, a command finished) into the versioned wire events a consumer
 *   decodes, and own the envelope bookkeeping — the monotonic `seq` and the
 *   `elapsedMs` clock — in one place so no producer can get them wrong.
 *   Emission is immediate: every method writes as it is called, which is what
 *   lets the IDE's Testing tab fill while the run is still going.
 * Public interface: `RunEventStream`.
 * Owner context: transcript-tester (testing tooling). The wire SHAPES are owned
 *   by `@sharpee/ide-protocol`; this module only builds and sequences them.
 *
 * @see ADR-277 D1, as amended 2026-08-06 — the record stream becomes an event
 *   stream, because records built from a completed result cannot announce a
 *   transcript before it runs.
 */

import type {
  RunEvent,
  RunMode,
  RunStartEvent,
  BudgetUse,
  ProgressEvent,
  CoverageEvent,
} from '@sharpee/ide-protocol';

/**
 * What the stream needs from ONE command's outcome — structurally, not by name.
 *
 * `branch-tester` carries its own copy of the result types (ADR-302 D15) and its
 * assertion grammar has since grown ADR-300's channel forms, which are
 * deliberately NOT back-ported here. Naming `./types.js`'s `CommandResult` made
 * those two copies nominally incompatible and broke the npm build for a devkit
 * that legitimately drives both harnesses. Nothing below reads an assertion, so
 * the honest parameter is the set of fields actually used.
 */
export interface StreamableCommandResult {
  command: { input: string; lineNumber: number };
  passed: boolean;
  expectedFailure: boolean;
  skipped: boolean;
  error?: string;
  actualOutput?: string;
  /**
   * The engine turn the command executed as. Optional because only harnesses
   * whose engine seam reports it (branch-tester's) can say; a result without
   * it emits an event without one, never a guess.
   */
  turn?: number;
  /**
   * The story ended during this command (R9). Same optionality reasoning as
   * `turn`: only a harness whose engine seam surfaces the `game.ended`
   * announcement can say, and a result without it emits an event without one.
   */
  ending?: 'victory' | 'defeat' | 'quit';
  /**
   * Golden divergence (replay failure) or re-record review (passing turn that
   * changed from the previous recording, R6). Carried verbatim — the runner
   * computed it, the wire only moves it.
   */
  diff?: { recorded: string[]; actual: string[]; channel?: string };
  /**
   * The world after this command (R3), captured under `--capture-world`.
   * Carried verbatim; structurally the wire's `WorldSnapshot`.
   */
  world?: { location?: { name: string; token: string }; inventory: Array<{ name: string; token: string }> };
}

/** What the stream needs from a whole run's aggregate. Same reasoning. */
export interface StreamableRunResult {
  totalPassed: number;
  totalFailed: number;
  totalExpectedFailures: number;
  totalSkipped: number;
  totalErrors: number;
  totalDuration: number;
}

/** What the stream needs from ONE transcript's outcome. Same reasoning. */
export interface StreamableTranscriptResult {
  transcript: { filePath: string };
  /** Both harnesses spell these the same; the wire narrows to them (D13). */
  status: 'passed' | 'failed' | 'error' | 'unreached';
  passed: number;
  failed: number;
  expectedFailures: number;
  skipped: number;
  duration: number;
  errorMessage?: string;
}
import type { CoverageReport } from './coverage.js';

/**
 * Mirrors ide-protocol's RUN_EVENT_SCHEMA_VERSION. A value import would create
 * the runtime edge the type-only rule forbids (ADR-277 D1); the compile-time
 * check below pins the two constants to each other instead.
 */
const SCHEMA_VERSION = 2 as const;
type VersionsMatch = typeof SCHEMA_VERSION extends RunStartEvent['schemaVersion'] ? true : never;
const _versionsMatch: VersionsMatch = true;
void _versionsMatch;

/** Where an event goes. Called once per event, in emission order. */
export type RunEventWriter = (event: RunEvent) => void;

/**
 * Sequences and emits one run's events.
 *
 * **Invariants.** `seq` is monotonic from 0 and never reused; `elapsedMs` is
 * measured from construction, which the caller performs immediately before
 * `runStart`. Both are enforced here rather than documented for callers,
 * because a consumer that sorts by `seq` is trusting them.
 */
export class RunEventStream {
  private seq = 0;
  private readonly startedAt: number;

  /**
   * @param write Receives each event as it is emitted.
   * @param now Injectable clock — tests pin `elapsedMs` rather than sleeping.
   */
  constructor(
    private readonly write: RunEventWriter,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.startedAt = now();
  }

  /** The envelope every event carries. Consumes one sequence number. */
  private envelope() {
    return {
      schemaVersion: SCHEMA_VERSION,
      seq: this.seq++,
      elapsedMs: this.now() - this.startedAt,
    };
  }

  /**
   * Open the stream.
   *
   * @param mode The run model — `tree` and `explore` are not transcript lists.
   * @param transcriptCount Omit when the count is not knowable in advance,
   *   which is the explorer's normal case.
   */
  runStart(mode: RunMode, transcriptCount?: number): void {
    this.write({
      ...this.envelope(),
      type: 'run-start',
      ...(transcriptCount !== undefined ? { transcriptCount } : {}),
      mode,
    });
  }

  /**
   * Work that is not a transcript but costs real time — compile, load, the
   * whole-tree assembly ADR-302 D11 performs before anything executes.
   */
  phase(name: 'compile' | 'load' | 'assemble' | 'execute', status: 'started' | 'finished', detail?: string): void {
    this.write({
      ...this.envelope(),
      type: 'phase',
      name,
      status,
      ...(detail !== undefined ? { detail } : {}),
    });
  }

  /**
   * A transcript is about to run. Emitted BEFORE its first command.
   *
   * @param index 0-based position in the run's EXECUTION order — a tree node
   *   re-executed for a sibling takes a new index, since the pairing of start
   *   to end is positional, not by file.
   * @param extra `commandCount` for a real progress bar; `parent`/`replayed`
   *   for tree runs (ADR-302 parentage and D17 replay).
   */
  transcriptStart(
    file: string,
    index: number,
    extra: {
      commandCount?: number;
      parent?: string;
      replayed?: boolean;
      /** The world at this transcript's entry (R5), under `--capture-world`. */
      world?: StreamableCommandResult['world'];
    } = {},
  ): void {
    this.write({
      ...this.envelope(),
      type: 'transcript-start',
      file,
      index,
      ...(extra.commandCount !== undefined ? { commandCount: extra.commandCount } : {}),
      ...(extra.parent !== undefined ? { parent: extra.parent } : {}),
      ...(extra.replayed !== undefined ? { replayed: extra.replayed } : {}),
      ...(extra.world !== undefined ? { world: extra.world } : {}),
    });
  }

  /**
   * One command finished.
   *
   * @param captureOutput Carry `actualOutput` on every command rather than only
   *   on failures. The default keeps a green run's stream small; replay
   *   verification needs every command's text.
   */
  commandResult(file: string, result: StreamableCommandResult, captureOutput = false): void {
    this.write({
      ...this.envelope(),
      type: 'command-result',
      file,
      line: result.command.lineNumber,
      input: result.command.input,
      passed: result.passed,
      expectedFailure: result.expectedFailure,
      skipped: result.skipped,
      ...(result.error !== undefined ? { error: result.error } : {}),
      ...(captureOutput || !result.passed ? { actualOutput: result.actualOutput } : {}),
      ...(result.turn !== undefined ? { turn: result.turn } : {}),
      ...(result.ending !== undefined ? { ending: result.ending } : {}),
      ...(result.diff !== undefined ? { diff: result.diff } : {}),
      ...(result.world !== undefined ? { world: result.world } : {}),
    });
  }

  /**
   * A node that never ran because an ancestor failed (ADR-302 D13).
   *
   * Its own method because there is no `TranscriptResult` behind it — nothing
   * executed. Synthesizing a fake result in the caller to reach
   * {@link transcriptEnd} would put a `status` the domain type cannot express
   * through a type that promises it can.
   */
  transcriptUnreached(file: string, blockedBy: string): void {
    this.write({
      ...this.envelope(),
      type: 'transcript-end',
      file,
      status: 'unreached',
      passed: 0,
      failed: 0,
      expectedFailures: 0,
      skipped: 0,
      duration: 0,
      blockedBy,
    });
  }

  /**
   * A transcript with no commands, run as a skip (phase-6 F1, David's ruling
   * 2026-08-08): the editor's designed starting state, not a defect and not
   * a block. Also has no result behind it — nothing executed.
   */
  transcriptSkipped(file: string): void {
    this.write({
      ...this.envelope(),
      type: 'transcript-end',
      file,
      status: 'skipped',
      passed: 0,
      failed: 0,
      expectedFailures: 0,
      skipped: 0,
      duration: 0,
    });
  }

  /**
   * A transcript that could not run at all — a parse failure, or a structural
   * tree defect (ADR-302 D11, where nothing in the tree runs). Also has no
   * result behind it, and for the same reason.
   */
  transcriptError(file: string, errorMessage: string): void {
    this.write({
      ...this.envelope(),
      type: 'transcript-end',
      file,
      status: 'error',
      passed: 0,
      failed: 0,
      expectedFailures: 0,
      skipped: 0,
      duration: 0,
      errorMessage,
    });
  }

  /** A transcript finished. */
  transcriptEnd(result: StreamableTranscriptResult): void {
    this.write({
      ...this.envelope(),
      type: 'transcript-end',
      file: result.transcript.filePath,
      status: result.status,
      passed: result.passed,
      failed: result.failed,
      expectedFailures: result.expectedFailures,
      skipped: result.skipped,
      duration: result.duration,
      ...(result.errorMessage !== undefined ? { errorMessage: result.errorMessage } : {}),
    });
  }

  /**
   * How far along the current work is — advisory, and safe to ignore.
   * `budgets` is a list because a bounded search is bounded in several
   * dimensions at once (ADR-294: states, depth, and wall-clock).
   */
  progress(scope: ProgressEvent['scope'], done: number, extra: { total?: number; budgets?: BudgetUse[] } = {}): void {
    this.write({
      ...this.envelope(),
      type: 'progress',
      scope,
      done,
      ...(extra.total !== undefined ? { total: extra.total } : {}),
      ...(extra.budgets !== undefined ? { budgets: extra.budgets } : {}),
    });
  }

  /** The run's coverage report (ADR-293 D15) — once per run, opt-in. */
  coverage(report: CoverageReport): void {
    const event: CoverageEvent = {
      ...this.envelope(),
      type: 'coverage',
      points: report.points,
      pointsFired: report.pointsFired,
      pointsNeverFired: report.pointsNeverFired,
      classesUnobserved: report.classesUnobserved,
    };
    this.write(event);
  }

  /**
   * Close the stream.
   *
   * @param totalUnreached Transcripts that never ran because an ancestor
   *   failed. Always 0 for a flat or chained run — only a tree blocks.
   */
  runEnd(run: StreamableRunResult, exitCode: number, totalUnreached = 0): void {
    this.write({
      ...this.envelope(),
      type: 'run-end',
      totalPassed: run.totalPassed,
      totalFailed: run.totalFailed,
      totalExpectedFailures: run.totalExpectedFailures,
      totalSkipped: run.totalSkipped,
      totalErrors: run.totalErrors,
      totalUnreached,
      totalDuration: run.totalDuration,
      exitCode,
    });
  }
}

/** Serialize one event as an NDJSON line, terminator included. */
export function ndjsonEventLine(event: RunEvent): string {
  return `${JSON.stringify(event)}\n`;
}
