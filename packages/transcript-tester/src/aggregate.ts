/**
 * aggregate.ts — run-level aggregation and the `test --json` NDJSON record
 * builders (ADR-277 D1).
 *
 * Purpose: the ONE shared aggregation over TranscriptResults (replacing the
 *   per-caller inline reduces) and the pure builders that turn results into
 *   `@sharpee/ide-protocol` test-result records. Builders, not a buffered
 *   serializer: the emitting CLI writes `run-start` before the loop, each
 *   transcript's records as it completes, and `run-end` last — so the stream
 *   is live (D1's streaming ruling) while the record shapes live once in the
 *   contract.
 * Public interface: aggregateTestRun, runStartRecord, transcriptRecords,
 *   runEndRecord, ndjsonLine.
 * Owner context: @sharpee/transcript-tester. The ide-protocol import is
 *   TYPE-ONLY (ADR-277 D1, review finding 2) — ide-protocol re-exports the
 *   Chord Story IR wholesale, and this package must not gain a runtime edge
 *   to it; builders construct plain literals shaped by the imported types.
 */
import type {
  CommandResultRecord,
  RunEndRecord,
  RunStartRecord,
  TestResultRecord,
  TranscriptEndRecord,
  TranscriptStartRecord,
} from '@sharpee/ide-protocol';
import type { TestRunResult, TranscriptResult } from './types.js';

/**
 * Mirrors ide-protocol's TEST_RESULTS_SCHEMA_VERSION. A value import would
 * create the runtime edge the type-only rule forbids; the compile-time check
 * below pins the two constants to each other instead.
 */
const SCHEMA_VERSION = 1 as const;
type VersionsMatch = typeof SCHEMA_VERSION extends RunStartRecord['schemaVersion'] ? true : never;
const _versionsMatch: VersionsMatch = true;
void _versionsMatch;

/**
 * Aggregate per-transcript results into a run result — the one shared
 * reduce (ADR-277 D1 Consequences).
 *
 * @param transcripts Results in run order, including error-status entries.
 * @returns Totals over every entry; `totalErrors` counts `status: 'error'`.
 */
export function aggregateTestRun(transcripts: TranscriptResult[]): TestRunResult {
  return {
    transcripts,
    totalPassed: transcripts.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: transcripts.reduce((sum, r) => sum + r.failed, 0),
    totalExpectedFailures: transcripts.reduce((sum, r) => sum + r.expectedFailures, 0),
    totalSkipped: transcripts.reduce((sum, r) => sum + r.skipped, 0),
    totalErrors: transcripts.filter((r) => r.status === 'error').length,
    totalDuration: transcripts.reduce((sum, r) => sum + r.duration, 0),
  };
}

/**
 * Build the stream's opening record.
 *
 * @param mode `'chain'` when state persists across transcripts (D3).
 * @param transcriptCount Number of transcripts about to run.
 */
export function runStartRecord(mode: 'tests' | 'chain', transcriptCount: number): RunStartRecord {
  return { schemaVersion: SCHEMA_VERSION, type: 'run-start', mode, transcriptCount };
}

/**
 * Build one finished transcript's records: `transcript-start`, one
 * `command-result` per executed command (with its 1-based `.transcript`
 * source line for click-through), and the closing `transcript-end` whose
 * `status: 'error'` carries `errorMessage` (never a silent skip).
 *
 * @param result The transcript's result — including error-status results
 *   that never ran (zero commands).
 * @param index 0-based position in the run order.
 */
export function transcriptRecords(result: TranscriptResult, index: number): TestResultRecord[] {
  const file = result.transcript.filePath;
  const start: TranscriptStartRecord = { schemaVersion: SCHEMA_VERSION, type: 'transcript-start', file, index };
  const commands: CommandResultRecord[] = result.commands.map((c) => ({
    schemaVersion: SCHEMA_VERSION,
    type: 'command-result',
    file,
    line: c.command.lineNumber,
    input: c.command.input,
    passed: c.passed,
    expectedFailure: c.expectedFailure,
    skipped: c.skipped,
    ...(c.error !== undefined ? { error: c.error } : {}),
  }));
  const end: TranscriptEndRecord = {
    schemaVersion: SCHEMA_VERSION,
    type: 'transcript-end',
    file,
    status: result.status,
    passed: result.passed,
    failed: result.failed,
    expectedFailures: result.expectedFailures,
    skipped: result.skipped,
    duration: result.duration,
    ...(result.errorMessage !== undefined ? { errorMessage: result.errorMessage } : {}),
  };
  return [start, ...commands, end];
}

/**
 * Build the stream's closing record.
 *
 * @param run The aggregated run result.
 * @param exitCode The exit code the CLI is about to return.
 */
export function runEndRecord(run: TestRunResult, exitCode: number): RunEndRecord {
  return {
    schemaVersion: SCHEMA_VERSION,
    type: 'run-end',
    totalPassed: run.totalPassed,
    totalFailed: run.totalFailed,
    totalExpectedFailures: run.totalExpectedFailures,
    totalSkipped: run.totalSkipped,
    totalErrors: run.totalErrors,
    totalDuration: run.totalDuration,
    exitCode,
  };
}

/** Serialize one record as an NDJSON line (single line, trailing newline). */
export function ndjsonLine(record: TestResultRecord): string {
  return `${JSON.stringify(record)}\n`;
}
