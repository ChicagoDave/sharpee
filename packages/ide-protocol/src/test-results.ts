/**
 * test-results.ts — the `sharpee test --json` NDJSON wire contract (ADR-277 D1).
 *
 * Purpose: the versioned record stream `sharpee test --json` writes to stdout,
 *   one JSON object per line — `run-start`, then per transcript
 *   `transcript-start` / `command-result`* / `transcript-end`, then `run-end`.
 *   Streaming, not buffered: a walkthrough chain runs for minutes and the
 *   IDE's Tests panel fills live; a cancelled run keeps every record already
 *   written. A validation- or load-failed transcript is a `transcript-end`
 *   record with `status: "error"` — never a silent skip.
 * Public interface: TEST_RESULTS_SCHEMA_VERSION, TestResultRecord and its five
 *   variants, isTestResultRecord plus one guard per variant.
 * Owner context: @sharpee/ide-protocol (ADR-277 D1) — the TS emitter
 *   (@sharpee/transcript-tester's record builders, type-only import) writes
 *   these shapes; the Swift decoder checks `schemaVersion` per line and
 *   rejects unknown versions loudly (its side of the contract lives on the
 *   Mac, version-gated, not compiled together).
 */

/**
 * Version of the `test --json` record shapes. Distinct from
 * `COMPOSE_JSON_SCHEMA_VERSION` and the ADR-184 `SCHEMA_VERSION` — separate
 * contracts version separately. Bump on any breaking shape change.
 */
export const TEST_RESULTS_SCHEMA_VERSION = 1 as const;

/** First record of every run: what is about to execute. */
export interface RunStartRecord {
  schemaVersion: typeof TEST_RESULTS_SCHEMA_VERSION;
  type: 'run-start';
  /** `chain` = one game instance, state persists across transcripts (D3). */
  mode: 'tests' | 'chain';
  transcriptCount: number;
}

/** A transcript is about to run. */
export interface TranscriptStartRecord {
  schemaVersion: typeof TEST_RESULTS_SCHEMA_VERSION;
  type: 'transcript-start';
  /** Absolute path of the `.transcript` file. */
  file: string;
  /** 0-based position in the run's transcript order. */
  index: number;
}

/** One command's outcome, carrying its click-through source location. */
export interface CommandResultRecord {
  schemaVersion: typeof TEST_RESULTS_SCHEMA_VERSION;
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
   * What the story actually printed, present exactly on FAILED command results
   * (ADR-282 D2) — the "new" side of the test panel's old-vs-new failure view,
   * which feeds re-bless. Absent on passing and skipped results: only a failure
   * has anything to compare against, and carrying it everywhere would inflate a
   * green chain run by every transcript's full text.
   *
   * Additive and optional, so `TEST_RESULTS_SCHEMA_VERSION` stays 1 — both
   * sides' guards accept a version-1 line with the key present or absent.
   */
  actualOutput?: string;
}

/**
 * A transcript finished. `status: 'error'` covers validation failures and
 * story-load/runtime errors — the record every such transcript now gets
 * instead of vanishing from the results (ADR-277 D1).
 */
export interface TranscriptEndRecord {
  schemaVersion: typeof TEST_RESULTS_SCHEMA_VERSION;
  type: 'transcript-end';
  file: string;
  status: 'passed' | 'failed' | 'error';
  passed: number;
  failed: number;
  expectedFailures: number;
  skipped: number;
  /** Milliseconds. */
  duration: number;
  /** Present exactly when `status` is `'error'`: why the transcript never ran. */
  errorMessage?: string;
}

/** One declared point's coverage row (ADR-293 D15) inside a {@link CoverageRecord}. */
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
 * The run's coverage report (ADR-293 D15 / ADR-294 D13): every declared
 * point, `catalog − fired`, and unobserved classes per point. One record per
 * run — coverage aggregates across a chain, never per transcript (D15).
 * Emitted only when the caller opts in (`--coverage`), so a pre-Phase-C
 * decoder never meets it unrequested; the schema version stays 1 by the same
 * additive reasoning as `actualOutput`.
 */
export interface CoverageRecord {
  schemaVersion: typeof TEST_RESULTS_SCHEMA_VERSION;
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

/** Last record of every run: the aggregate and the process exit code. */
export interface RunEndRecord {
  schemaVersion: typeof TEST_RESULTS_SCHEMA_VERSION;
  type: 'run-end';
  totalPassed: number;
  totalFailed: number;
  totalExpectedFailures: number;
  totalSkipped: number;
  /** Count of transcripts that ended `status: 'error'`. */
  totalErrors: number;
  totalDuration: number;
  /** The exit code the CLI returns: 0 pass, 1 fail/error, 3 load error. */
  exitCode: number;
}

/** One line of the `test --json` stream. Discriminate on `type`. */
export type TestResultRecord =
  | RunStartRecord
  | TranscriptStartRecord
  | CommandResultRecord
  | TranscriptEndRecord
  | CoverageRecord
  | RunEndRecord;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Shared preamble: version-gated (rejects unknown `schemaVersion`s loudly). */
function hasVersionAndType(v: Record<string, unknown>, type: string): boolean {
  return v.schemaVersion === TEST_RESULTS_SCHEMA_VERSION && v.type === type;
}

/** Narrow a value to a valid {@link RunStartRecord}. */
export function isRunStartRecord(value: unknown): value is RunStartRecord {
  if (!isObject(value)) return false;
  return (
    hasVersionAndType(value, 'run-start') &&
    (value.mode === 'tests' || value.mode === 'chain') &&
    typeof value.transcriptCount === 'number'
  );
}

/** Narrow a value to a valid {@link TranscriptStartRecord}. */
export function isTranscriptStartRecord(value: unknown): value is TranscriptStartRecord {
  if (!isObject(value)) return false;
  return (
    hasVersionAndType(value, 'transcript-start') &&
    typeof value.file === 'string' &&
    typeof value.index === 'number'
  );
}

/** Narrow a value to a valid {@link CommandResultRecord}. */
export function isCommandResultRecord(value: unknown): value is CommandResultRecord {
  if (!isObject(value)) return false;
  return (
    hasVersionAndType(value, 'command-result') &&
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

/** Narrow a value to a valid {@link TranscriptEndRecord}. */
export function isTranscriptEndRecord(value: unknown): value is TranscriptEndRecord {
  if (!isObject(value)) return false;
  return (
    hasVersionAndType(value, 'transcript-end') &&
    typeof value.file === 'string' &&
    (value.status === 'passed' || value.status === 'failed' || value.status === 'error') &&
    typeof value.passed === 'number' &&
    typeof value.failed === 'number' &&
    typeof value.expectedFailures === 'number' &&
    typeof value.skipped === 'number' &&
    typeof value.duration === 'number' &&
    (value.errorMessage === undefined || typeof value.errorMessage === 'string')
  );
}

/** Narrow a value to a valid {@link CoveragePoint}. */
function isCoveragePoint(value: unknown): value is CoveragePoint {
  if (!isObject(value)) return false;
  const stringArray = (v: unknown): boolean =>
    Array.isArray(v) && v.every((entry) => typeof entry === 'string');
  return (
    typeof value.name === 'string' &&
    typeof value.fired === 'number' &&
    (value.classes === undefined || stringArray(value.classes)) &&
    (value.observed === undefined || stringArray(value.observed)) &&
    (value.unobserved === undefined || stringArray(value.unobserved))
  );
}

/** Narrow a value to a valid {@link CoverageRecord}. */
export function isCoverageRecord(value: unknown): value is CoverageRecord {
  if (!isObject(value)) return false;
  return (
    hasVersionAndType(value, 'coverage') &&
    Array.isArray(value.points) &&
    value.points.every(isCoveragePoint) &&
    typeof value.pointsFired === 'number' &&
    typeof value.pointsNeverFired === 'number' &&
    typeof value.classesUnobserved === 'number'
  );
}

/** Narrow a value to a valid {@link RunEndRecord}. */
export function isRunEndRecord(value: unknown): value is RunEndRecord {
  if (!isObject(value)) return false;
  return (
    hasVersionAndType(value, 'run-end') &&
    typeof value.totalPassed === 'number' &&
    typeof value.totalFailed === 'number' &&
    typeof value.totalExpectedFailures === 'number' &&
    typeof value.totalSkipped === 'number' &&
    typeof value.totalErrors === 'number' &&
    typeof value.totalDuration === 'number' &&
    typeof value.exitCode === 'number'
  );
}

/**
 * Narrow one untrusted NDJSON line to a valid {@link TestResultRecord} at the
 * decode boundary. Rejects unknown `schemaVersion`s and record types — the
 * decoder-side half of the D1 contract on the TS side.
 */
export function isTestResultRecord(value: unknown): value is TestResultRecord {
  return (
    isRunStartRecord(value) ||
    isTranscriptStartRecord(value) ||
    isCommandResultRecord(value) ||
    isTranscriptEndRecord(value) ||
    isCoverageRecord(value) ||
    isRunEndRecord(value)
  );
}
