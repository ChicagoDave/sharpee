/**
 * run-events.ts — the run-event stream the testing tools emit while they run.
 *
 * Purpose: the versioned NDJSON event stream a Sharpee run writes to stdout, one
 *   JSON object per line, **as each thing happens** — not as a burst assembled
 *   after the fact. A run opens with `run-start`, may announce `phase` events for
 *   the work before and between transcripts (compile, load, assemble), emits
 *   `transcript-start` BEFORE a transcript executes, one `command-result` as each
 *   command completes, `transcript-end` when it finishes, optional `progress`
 *   throughout, and closes with `run-end`. Streaming is the point: a tree run or
 *   an explorer run lasts minutes, and the IDE's Testing tab fills live rather
 *   than jumping when each file completes.
 *
 *   Supersedes `test-results.ts` (ADR-277 D1), whose records were constructed
 *   from a COMPLETED `TranscriptResult` and written together — which made
 *   `transcript-start` ("a transcript is about to run") false by construction.
 *   That module stays until its consumers move; new emitters use this one.
 *
 * Public interface: RUN_EVENT_SCHEMA_VERSION, RunEvent and its seven variants,
 *   isRunEvent plus one guard per variant.
 * Owner context: @sharpee/ide-protocol — the shared wire contract. TypeScript
 *   producers (the transcript runner, the tree runner, eventually the explorer)
 *   write these shapes; the IDE's Testing tab imports this module DIRECTLY
 *   rather than mirroring it, so the two sides cannot silently disagree
 *   (DEVARCH 8b).
 */

/**
 * Version of the run-event shapes. Distinct from `COMPOSE_JSON_SCHEMA_VERSION`
 * and the ADR-184 `SCHEMA_VERSION` — separate contracts version separately.
 *
 * **2** is a deliberate break from `TEST_RESULTS_SCHEMA_VERSION = 1`, not an
 * additive widening: `transcript-start` now precedes execution, `command-result`
 * now arrives per command, and every event carries an envelope. Backwards
 * compatibility bought nothing here — every consumer of this stream lives in
 * this repository and ships from this build.
 */
export const RUN_EVENT_SCHEMA_VERSION = 2 as const;

/**
 * Carried by every event, so a consumer can order and time the stream without
 * inferring either from arrival.
 *
 * `seq` is monotonic within a run and starts at 0. `elapsedMs` is measured from
 * the emission of `run-start`, which makes "this command has been running for
 * four seconds" answerable from the stream alone — the difference between a slow
 * command and a hung one.
 */
export interface RunEventEnvelope {
  schemaVersion: typeof RUN_EVENT_SCHEMA_VERSION;
  /** Monotonic within the run, starting at 0. */
  seq: number;
  /** Milliseconds since `run-start` was emitted. */
  elapsedMs: number;
}

/**
 * The run model. `chain` = one game instance with state persisting across
 * transcripts (ADR-277 D3); `tree` = parentage via `continues:`, where a shared
 * prefix is re-executed for siblings (ADR-302 D17); `explore` = a search that
 * proposes paths rather than replaying authored ones (ADR-131 / ADR-294's
 * explorer), which is why `transcriptCount` is optional below.
 */
export type RunMode = 'tests' | 'chain' | 'tree' | 'explore';

/** First event of every run: what is about to happen. */
export interface RunStartEvent extends RunEventEnvelope {
  type: 'run-start';
  mode: RunMode;
  /**
   * Transcripts about to run. Absent when the count is not knowable in advance,
   * which is the explorer's normal case — it discovers candidates as it goes.
   */
  transcriptCount?: number;
}

/**
 * Work that is not a transcript but costs real time. Emitted in pairs
 * (`started` then `finished`), and the reason the stream is not silent for the
 * seconds before the first command: a Chord project compiles, then loads, then
 * — for a tree — assembles and validates the whole tree before executing
 * anything (ADR-302 D11).
 */
export interface PhaseEvent extends RunEventEnvelope {
  type: 'phase';
  name: 'compile' | 'load' | 'assemble' | 'execute';
  status: 'started' | 'finished';
  /** What specifically, when one phase covers several units of work. */
  detail?: string;
}

/**
 * A transcript is about to run — emitted BEFORE its first command, which is the
 * whole reason this module exists.
 *
 * In a tree run this fires once per *execution*, so a node that is re-executed
 * to build a sibling's state appears more than once: once authored, once per
 * replay. Consumers pair start and end **positionally** (the last unclosed
 * start), never by `file`, because a file legitimately recurs within one run.
 */
export interface TranscriptStartEvent extends RunEventEnvelope {
  type: 'transcript-start';
  /** Absolute path of the `.transcript` file. */
  file: string;
  /** 0-based position in the run's execution order. */
  index: number;
  /**
   * Commands this transcript will run, known from the parse that precedes
   * execution. Turns a spinner into a progress bar at no cost.
   */
  commandCount?: number;
  /**
   * Absolute path of the transcript this one `continues:` (ADR-302). Absent =
   * root. Same identity domain as `file`, so a consumer joins on one key.
   */
  parent?: string;
  /**
   * True when this execution exists to build a descendant's state (ADR-302
   * D17), not because the transcript is its own test here. A consumer dims or
   * collapses these rather than reading them as duplicate turns.
   */
  replayed?: boolean;
}

/** One command's outcome, emitted as the command completes. */
export interface CommandResultEvent extends RunEventEnvelope {
  type: 'command-result';
  file: string;
  /** 1-based `.transcript` source line of the `> command` (parser-tracked). */
  line: number;
  input: string;
  passed: boolean;
  /** The command was marked `[FAIL: …]` — failure is the expectation. */
  expectedFailure: boolean;
  skipped: boolean;
  /** Runtime error text when the command threw rather than merely failing. */
  error?: string;
  /**
   * What the story actually printed. Present on FAILED results by default — the
   * "new" side of the old-vs-new failure view. Under `--capture-output` it
   * rides every executed command instead, which is what replay verification
   * consumes. The default stays failures-only so a green chain run is not
   * inflated by every transcript's full text.
   */
  actualOutput?: string;
}

/**
 * A transcript finished, or never ran.
 *
 * `error` covers validation failures and story-load failures; `unreached` covers
 * a tree node whose ancestor failed (ADR-302 D13). Both exist for the same
 * reason: a transcript that does not run must still be *reported*, never
 * silently absent from the stream. `unreached` is not a failure — one broken
 * node produces one failure and a count of what it blocked, not a wall of red
 * proportional to how much of the story depends on it.
 */
export interface TranscriptEndEvent extends RunEventEnvelope {
  type: 'transcript-end';
  file: string;
  status: 'passed' | 'failed' | 'error' | 'unreached';
  passed: number;
  failed: number;
  expectedFailures: number;
  skipped: number;
  /** Milliseconds. */
  duration: number;
  /** Present exactly when `status` is `'error'`: why the transcript never ran. */
  errorMessage?: string;
  /**
   * Present exactly when `status` is `'unreached'`: absolute path of the node
   * whose failure blocked this one.
   */
  blockedBy?: string;
}

/**
 * One dimension of a bounded search's budget.
 *
 * The explorer's soundness contract (ADR-294) is that absence of findings is not
 * proof of absence — it claims "none found within N states / depth D / T
 * minutes", and **the budget is part of the report**. That is three dimensions
 * at once, which is why this is a list rather than a single limit.
 */
export interface BudgetUse {
  unit: 'states' | 'seconds' | 'depth' | 'commands';
  spent: number;
  limit: number;
}

/**
 * How far along the current work is. Optional and advisory — a consumer that
 * ignores every `progress` event still receives a complete, correct run.
 *
 * Cheap for a transcript run ("command 40 of 120"); mandatory in spirit for the
 * explorer, which runs for minutes and whose budget consumption IS its primary
 * live output.
 */
export interface ProgressEvent extends RunEventEnvelope {
  type: 'progress';
  scope: 'commands' | 'transcripts' | 'nodes' | 'states';
  done: number;
  /** Absent when the total is not knowable in advance (the explorer's case). */
  total?: number;
  /** Budget consumption, when the producer runs under one. */
  budgets?: BudgetUse[];
}

/** One declared point's coverage row (ADR-293 D15) inside a {@link CoverageEvent}. */
export interface CoveragePoint {
  /** The point's dotted name (ADR-293 D2). */
  name: string;
  /** Declared outcome classes. Absent = plain draw (no coverage classes, D4). */
  classes?: string[];
  /** Firing count over the run/chain — 0 = never fired. */
  fired: number;
  /** Classes observed at least once (drawn or forced — D8 reports class coverage). */
  observed?: string[];
  /** Declared classes never observed — the report's actionable column. */
  unobserved?: string[];
}

/**
 * The run's coverage report (ADR-293 D15 / ADR-294 D13): every declared point,
 * `catalog − fired`, and unobserved classes per point. One event per run —
 * coverage aggregates across a chain, never per transcript (D15). Emitted only
 * when the caller opts in (`--coverage`).
 */
export interface CoverageEvent extends RunEventEnvelope {
  type: 'coverage';
  /** Every declared point in scope, sorted by name. */
  points: CoveragePoint[];
  /** Count of points with `fired > 0`. */
  pointsFired: number;
  /** Count of points never fired (`catalog − fired`, D2). */
  pointsNeverFired: number;
  /** Total declared classes never observed, across all points. */
  classesUnobserved: number;
}

/** Last event of every run: the aggregate and the process exit code. */
export interface RunEndEvent extends RunEventEnvelope {
  type: 'run-end';
  totalPassed: number;
  totalFailed: number;
  totalExpectedFailures: number;
  totalSkipped: number;
  /** Count of transcripts that ended `status: 'error'`. */
  totalErrors: number;
  /** Count of transcripts that never ran because an ancestor failed. */
  totalUnreached: number;
  totalDuration: number;
  /** The exit code the CLI returns: 0 pass, 1 fail/error, 2 defect, 3 load error. */
  exitCode: number;
}

/**
 * One line of the run-event stream. Discriminate on `type`.
 *
 * A future `finding` event — the explorer's real output — is deliberately NOT
 * declared here. Its shape is not knowable until the explorer exists, and
 * inventing one now would pin a guess. Adding a variant is additive for every
 * producer and requires only that consumers ignore what they do not recognise,
 * which is the contract `isRunEvent` already implies.
 */
export type RunEvent =
  | RunStartEvent
  | PhaseEvent
  | TranscriptStartEvent
  | CommandResultEvent
  | TranscriptEndEvent
  | ProgressEvent
  | CoverageEvent
  | RunEndEvent;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isStringArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((entry) => typeof entry === 'string');
}

/**
 * Shared preamble: the version gate plus the envelope every event carries.
 * Rejects unknown `schemaVersion`s loudly rather than best-guessing a shape.
 */
function hasEnvelopeAndType(v: Record<string, unknown>, type: string): boolean {
  return (
    v.schemaVersion === RUN_EVENT_SCHEMA_VERSION &&
    v.type === type &&
    typeof v.seq === 'number' &&
    typeof v.elapsedMs === 'number'
  );
}

/** Narrow a value to a valid {@link RunStartEvent}. */
export function isRunStartEvent(value: unknown): value is RunStartEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'run-start') &&
    (value.mode === 'tests' || value.mode === 'chain' || value.mode === 'tree' || value.mode === 'explore') &&
    (value.transcriptCount === undefined || typeof value.transcriptCount === 'number')
  );
}

/** Narrow a value to a valid {@link PhaseEvent}. */
export function isPhaseEvent(value: unknown): value is PhaseEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'phase') &&
    (value.name === 'compile' || value.name === 'load' || value.name === 'assemble' || value.name === 'execute') &&
    (value.status === 'started' || value.status === 'finished') &&
    (value.detail === undefined || typeof value.detail === 'string')
  );
}

/** Narrow a value to a valid {@link TranscriptStartEvent}. */
export function isTranscriptStartEvent(value: unknown): value is TranscriptStartEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'transcript-start') &&
    typeof value.file === 'string' &&
    typeof value.index === 'number' &&
    (value.commandCount === undefined || typeof value.commandCount === 'number') &&
    (value.parent === undefined || typeof value.parent === 'string') &&
    (value.replayed === undefined || typeof value.replayed === 'boolean')
  );
}

/** Narrow a value to a valid {@link CommandResultEvent}. */
export function isCommandResultEvent(value: unknown): value is CommandResultEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'command-result') &&
    typeof value.file === 'string' &&
    typeof value.line === 'number' &&
    typeof value.input === 'string' &&
    typeof value.passed === 'boolean' &&
    typeof value.expectedFailure === 'boolean' &&
    typeof value.skipped === 'boolean' &&
    (value.error === undefined || typeof value.error === 'string') &&
    (value.actualOutput === undefined || typeof value.actualOutput === 'string')
  );
}

/** Narrow a value to a valid {@link TranscriptEndEvent}. */
export function isTranscriptEndEvent(value: unknown): value is TranscriptEndEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'transcript-end') &&
    typeof value.file === 'string' &&
    (value.status === 'passed' ||
      value.status === 'failed' ||
      value.status === 'error' ||
      value.status === 'unreached') &&
    typeof value.passed === 'number' &&
    typeof value.failed === 'number' &&
    typeof value.expectedFailures === 'number' &&
    typeof value.skipped === 'number' &&
    typeof value.duration === 'number' &&
    (value.errorMessage === undefined || typeof value.errorMessage === 'string') &&
    (value.blockedBy === undefined || typeof value.blockedBy === 'string')
  );
}

/** Narrow a value to a valid {@link BudgetUse}. */
function isBudgetUse(value: unknown): value is BudgetUse {
  if (!isObject(value)) return false;
  return (
    (value.unit === 'states' || value.unit === 'seconds' || value.unit === 'depth' || value.unit === 'commands') &&
    typeof value.spent === 'number' &&
    typeof value.limit === 'number'
  );
}

/** Narrow a value to a valid {@link ProgressEvent}. */
export function isProgressEvent(value: unknown): value is ProgressEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'progress') &&
    (value.scope === 'commands' ||
      value.scope === 'transcripts' ||
      value.scope === 'nodes' ||
      value.scope === 'states') &&
    typeof value.done === 'number' &&
    (value.total === undefined || typeof value.total === 'number') &&
    (value.budgets === undefined || (Array.isArray(value.budgets) && value.budgets.every(isBudgetUse)))
  );
}

/** Narrow a value to a valid {@link CoveragePoint}. */
function isCoveragePoint(value: unknown): value is CoveragePoint {
  if (!isObject(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.fired === 'number' &&
    (value.classes === undefined || isStringArray(value.classes)) &&
    (value.observed === undefined || isStringArray(value.observed)) &&
    (value.unobserved === undefined || isStringArray(value.unobserved))
  );
}

/** Narrow a value to a valid {@link CoverageEvent}. */
export function isCoverageEvent(value: unknown): value is CoverageEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'coverage') &&
    Array.isArray(value.points) &&
    value.points.every(isCoveragePoint) &&
    typeof value.pointsFired === 'number' &&
    typeof value.pointsNeverFired === 'number' &&
    typeof value.classesUnobserved === 'number'
  );
}

/** Narrow a value to a valid {@link RunEndEvent}. */
export function isRunEndEvent(value: unknown): value is RunEndEvent {
  if (!isObject(value)) return false;
  return (
    hasEnvelopeAndType(value, 'run-end') &&
    typeof value.totalPassed === 'number' &&
    typeof value.totalFailed === 'number' &&
    typeof value.totalExpectedFailures === 'number' &&
    typeof value.totalSkipped === 'number' &&
    typeof value.totalErrors === 'number' &&
    typeof value.totalUnreached === 'number' &&
    typeof value.totalDuration === 'number' &&
    typeof value.exitCode === 'number'
  );
}

/**
 * Narrow one untrusted NDJSON line to a valid {@link RunEvent} at the decode
 * boundary. Rejects unknown `schemaVersion`s and unknown event types.
 */
export function isRunEvent(value: unknown): value is RunEvent {
  return (
    isRunStartEvent(value) ||
    isPhaseEvent(value) ||
    isTranscriptStartEvent(value) ||
    isCommandResultEvent(value) ||
    isTranscriptEndEvent(value) ||
    isProgressEvent(value) ||
    isCoverageEvent(value) ||
    isRunEndEvent(value)
  );
}
