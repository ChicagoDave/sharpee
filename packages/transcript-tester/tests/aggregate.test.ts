/**
 * aggregate.test.ts — run aggregation and the `test --json` record builders
 * (ADR-277 D1).
 *
 * Pins: aggregateTestRun's totals including the new totalErrors (the
 * "vanishes from results" regression guard at the aggregate level),
 * transcriptRecords' shape — source-line carriage for click-through, the
 * error-status transcript-end with errorMessage — validated through
 * @sharpee/ide-protocol's own guards (rule 8b: one declaration, both sides
 * checked against it), and getExitCode failing the run on errors.
 */
import { describe, expect, it } from 'vitest';
import {
  isRunEndRecord,
  isRunStartRecord,
  isTestResultRecord,
} from '@sharpee/ide-protocol';
import {
  aggregateTestRun,
  getExitCode,
  ndjsonLine,
  runEndRecord,
  runStartRecord,
  transcriptRecords,
} from '../src/index.js';
import type { Transcript, TranscriptResult } from '../src/index.js';

function transcriptFixture(filePath: string): Transcript {
  return { filePath, header: { title: 'fixture' }, commands: [], comments: [] };
}

const passed: TranscriptResult = {
  transcript: transcriptFixture('/tmp/passed.transcript'),
  commands: [
    {
      command: { lineNumber: 4, input: 'look', expectedOutput: [], assertions: [] },
      actualOutput: 'A small square den.',
      actualEvents: [],
      passed: true,
      expectedFailure: false,
      skipped: false,
      assertionResults: [],
    },
  ],
  status: 'passed',
  passed: 1,
  failed: 0,
  expectedFailures: 0,
  skipped: 0,
  duration: 40,
};

const failed: TranscriptResult = {
  transcript: transcriptFixture('/tmp/failed.transcript'),
  commands: [
    {
      command: { lineNumber: 9, input: 'take lamp', expectedOutput: [], assertions: [] },
      actualOutput: 'You cannot.',
      actualEvents: [],
      passed: false,
      expectedFailure: false,
      skipped: false,
      assertionResults: [],
      error: 'assertion failed',
    },
  ],
  status: 'failed',
  passed: 0,
  failed: 1,
  expectedFailures: 0,
  skipped: 0,
  duration: 25,
};

const errored: TranscriptResult = {
  transcript: transcriptFixture('/tmp/broken.transcript'),
  commands: [],
  status: 'error',
  passed: 0,
  failed: 0,
  expectedFailures: 0,
  skipped: 0,
  duration: 0,
  errorMessage: 'Transcript validation failed: command has no assertion',
};

describe('aggregateTestRun', () => {
  it('sums totals over passed/failed/error results, counting errors distinctly', () => {
    const run = aggregateTestRun([errored, failed, passed]);
    expect(run.transcripts).toHaveLength(3);
    expect(run.totalPassed).toBe(1);
    expect(run.totalFailed).toBe(1);
    expect(run.totalExpectedFailures).toBe(0);
    expect(run.totalSkipped).toBe(0);
    expect(run.totalErrors).toBe(1); // did not exist before ADR-277
    expect(run.totalDuration).toBe(65);
  });

  it('an error-status transcript stays IN the aggregate (the never-vanish rule)', () => {
    const run = aggregateTestRun([errored]);
    expect(run.transcripts.map((t) => t.transcript.filePath)).toContain('/tmp/broken.transcript');
    expect(run.totalErrors).toBe(1);
  });
});

describe('getExitCode with errors', () => {
  it('fails the run (1) on transcript errors even with zero command failures', () => {
    expect(getExitCode(aggregateTestRun([errored, passed]))).toBe(1);
    expect(getExitCode(aggregateTestRun([passed]))).toBe(0);
    expect(getExitCode(aggregateTestRun([failed]))).toBe(1);
  });
});

describe('transcriptRecords', () => {
  it('emits start → command-result (with the source line) → end, all guard-valid', () => {
    const records = transcriptRecords(passed, 0);
    expect(records.map((r) => r.type)).toEqual(['transcript-start', 'command-result', 'transcript-end']);
    for (const record of records) expect(isTestResultRecord(record)).toBe(true);
    const command = records[1];
    if (command.type !== 'command-result') throw new Error('unreachable');
    expect(command.line).toBe(4); // click-through target: the `> look` source line
    expect(command.input).toBe('look');
    expect(command.file).toBe('/tmp/passed.transcript');
  });

  it('an error-status result yields an error transcript-end carrying errorMessage', () => {
    const records = transcriptRecords(errored, 2);
    expect(records.map((r) => r.type)).toEqual(['transcript-start', 'transcript-end']);
    const end = records[1];
    if (end.type !== 'transcript-end') throw new Error('unreachable');
    expect(end.status).toBe('error');
    expect(end.errorMessage).toContain('validation failed');
    expect(isTestResultRecord(end)).toBe(true);
  });

  it('carries a command runtime error through to the record', () => {
    const records = transcriptRecords(failed, 1);
    const command = records[1];
    if (command.type !== 'command-result') throw new Error('unreachable');
    expect(command.passed).toBe(false);
    expect(command.error).toBe('assertion failed');
  });

  // ADR-282 D2 — the "new" side of the IDE's old-vs-new failure view.
  it('a FAILED command result carries what the story actually printed', () => {
    const records = transcriptRecords(failed, 1);
    const command = records[1];
    if (command.type !== 'command-result') throw new Error('unreachable');
    expect(command.actualOutput).toBe('You cannot.');
    expect(isTestResultRecord(command)).toBe(true);
  });

  it('a PASSING command result omits the key entirely, not as undefined', () => {
    const records = transcriptRecords(passed, 0);
    const command = records[1];
    if (command.type !== 'command-result') throw new Error('unreachable');
    // `in`, not `=== undefined`: an explicit `actualOutput: undefined` would
    // still stringify away, but the object would no longer be the shape a green
    // run has today. The point is that nothing was added.
    expect('actualOutput' in command).toBe(false);
    expect(JSON.parse(ndjsonLine(command))).not.toHaveProperty('actualOutput');
  });

  it('a SKIPPED command omits it too — a skip reports passed with nothing asserted', () => {
    const skippedResult: TranscriptResult = {
      ...passed,
      commands: [
        {
          command: { lineNumber: 6, input: 'open hatch', expectedOutput: [], assertions: [] },
          actualOutput: '',
          actualEvents: [],
          passed: true,
          expectedFailure: false,
          skipped: true,
          assertionResults: [],
        },
      ],
    };
    const command = transcriptRecords(skippedResult, 0)[1];
    if (command.type !== 'command-result') throw new Error('unreachable');
    expect(command.skipped).toBe(true);
    expect('actualOutput' in command).toBe(false);
  });

  it('survives the NDJSON round trip with multi-paragraph, bracketed text', () => {
    // The content shape ADR-282 Acceptance 5 names — if the wire mangled a
    // paragraph boundary, the failure view would show a difference that is not
    // the story's.
    const prose = '[posted by order of the proving board]\n\nShe said "take it".';
    const withProse: TranscriptResult = {
      ...failed,
      commands: [{ ...failed.commands[0], actualOutput: prose }],
    };
    const command = transcriptRecords(withProse, 0)[1];
    const decoded: unknown = JSON.parse(ndjsonLine(command));
    expect(isTestResultRecord(decoded)).toBe(true);
    expect((decoded as { actualOutput: string }).actualOutput).toBe(prose);
  });
});

describe('run records and NDJSON framing', () => {
  it('runStartRecord and runEndRecord are guard-valid and carry the exit code', () => {
    expect(isRunStartRecord(runStartRecord('chain', 3))).toBe(true);
    const end = runEndRecord(aggregateTestRun([errored, failed, passed]), 1);
    expect(isRunEndRecord(end)).toBe(true);
    expect(end.totalErrors).toBe(1);
    expect(end.exitCode).toBe(1);
  });

  it('ndjsonLine frames exactly one record per newline-terminated line', () => {
    const line = ndjsonLine(runStartRecord('tests', 2));
    expect(line.endsWith('\n')).toBe(true);
    expect(line.slice(0, -1)).not.toContain('\n');
    expect(isTestResultRecord(JSON.parse(line))).toBe(true);
  });
});
