/**
 * Guard tests for the `test --json` NDJSON wire contract (ADR-277 D1).
 *
 * Validates the decode-boundary predicates: the schemaVersion gate per record
 * variant (unknown versions rejected loudly — the TS-side half of the D1
 * contract), one round-trip acceptance per variant, and the error-status
 * shape a validation-/load-failed transcript now carries instead of
 * vanishing.
 */

import { describe, it, expect } from 'vitest';
import {
  TEST_RESULTS_SCHEMA_VERSION,
  isRunStartRecord,
  isTranscriptStartRecord,
  isCommandResultRecord,
  isTranscriptEndRecord,
  isRunEndRecord,
  isTestResultRecord,
  type RunStartRecord,
  type TranscriptStartRecord,
  type CommandResultRecord,
  type TranscriptEndRecord,
  type RunEndRecord,
} from '../src/index.js';

const runStart: RunStartRecord = {
  schemaVersion: TEST_RESULTS_SCHEMA_VERSION,
  type: 'run-start',
  mode: 'chain',
  transcriptCount: 3,
};

const transcriptStart: TranscriptStartRecord = {
  schemaVersion: TEST_RESULTS_SCHEMA_VERSION,
  type: 'transcript-start',
  file: 'stories/fernhill/tests/smoke.transcript',
  index: 0,
};

const commandResult: CommandResultRecord = {
  schemaVersion: TEST_RESULTS_SCHEMA_VERSION,
  type: 'command-result',
  file: 'stories/fernhill/tests/smoke.transcript',
  line: 7,
  input: 'examine the brass lamp',
  passed: true,
  expectedFailure: false,
  skipped: false,
};

const transcriptEnd: TranscriptEndRecord = {
  schemaVersion: TEST_RESULTS_SCHEMA_VERSION,
  type: 'transcript-end',
  file: 'stories/fernhill/tests/smoke.transcript',
  status: 'passed',
  passed: 4,
  failed: 0,
  expectedFailures: 0,
  skipped: 0,
  duration: 120,
};

const runEnd: RunEndRecord = {
  schemaVersion: TEST_RESULTS_SCHEMA_VERSION,
  type: 'run-end',
  totalPassed: 4,
  totalFailed: 0,
  totalExpectedFailures: 0,
  totalSkipped: 0,
  totalErrors: 0,
  totalDuration: 120,
  exitCode: 0,
};

describe('per-variant guards', () => {
  it('accepts a valid record of each variant', () => {
    expect(isRunStartRecord(runStart)).toBe(true);
    expect(isTranscriptStartRecord(transcriptStart)).toBe(true);
    expect(isCommandResultRecord(commandResult)).toBe(true);
    expect(isTranscriptEndRecord(transcriptEnd)).toBe(true);
    expect(isRunEndRecord(runEnd)).toBe(true);
  });

  it('rejects schemaVersion 999 on every variant (the loud-rejection rule)', () => {
    expect(isRunStartRecord({ ...runStart, schemaVersion: 999 })).toBe(false);
    expect(isTranscriptStartRecord({ ...transcriptStart, schemaVersion: 999 })).toBe(false);
    expect(isCommandResultRecord({ ...commandResult, schemaVersion: 999 })).toBe(false);
    expect(isTranscriptEndRecord({ ...transcriptEnd, schemaVersion: 999 })).toBe(false);
    expect(isRunEndRecord({ ...runEnd, schemaVersion: 999 })).toBe(false);
  });

  // ADR-282 D2 authorized `actualOutput` as ADDITIVE — the claim being that
  // schemaVersion stays 1 because a version-1 line is valid with the key either
  // present or absent. That claim is what makes an old IDE and a new toolchain
  // (and the reverse) interoperate, so it is pinned rather than assumed.
  it('accepts a version-1 command result with actualOutput present OR absent', () => {
    expect(isCommandResultRecord(commandResult)).toBe(true);
    expect(TEST_RESULTS_SCHEMA_VERSION).toBe(1);
    const withOutput: CommandResultRecord = {
      ...commandResult,
      passed: false,
      actualOutput: 'The lamp is already lit.',
    };
    expect(isCommandResultRecord(withOutput)).toBe(true);
    expect(withOutput.schemaVersion).toBe(TEST_RESULTS_SCHEMA_VERSION);
  });

  it('rejects a wrong or missing type discriminator', () => {
    expect(isRunStartRecord({ ...runStart, type: 'run-end' })).toBe(false);
    const { type: _dropped, ...untyped } = commandResult;
    expect(isCommandResultRecord(untyped)).toBe(false);
  });

  it('rejects field-shape violations per variant', () => {
    expect(isRunStartRecord({ ...runStart, mode: 'walkthroughs' })).toBe(false);
    expect(isTranscriptStartRecord({ ...transcriptStart, index: '0' })).toBe(false);
    expect(isCommandResultRecord({ ...commandResult, line: '7' })).toBe(false);
    expect(isCommandResultRecord({ ...commandResult, error: 42 })).toBe(false);
    expect(isCommandResultRecord({ ...commandResult, actualOutput: 42 })).toBe(false);
    expect(isTranscriptEndRecord({ ...transcriptEnd, status: 'skipped' })).toBe(false);
    expect(isRunEndRecord({ ...runEnd, totalErrors: undefined })).toBe(false);
  });

  it('accepts the error-status transcript-end shape (the never-vanish rule)', () => {
    expect(
      isTranscriptEndRecord({
        ...transcriptEnd,
        status: 'error',
        passed: 0,
        errorMessage: 'Transcript validation failed: command at line 3 has no assertion',
      })
    ).toBe(true);
  });
});

describe('isTestResultRecord (the per-line decode boundary)', () => {
  it('accepts every variant through the union guard', () => {
    for (const record of [runStart, transcriptStart, commandResult, transcriptEnd, runEnd]) {
      expect(isTestResultRecord(record)).toBe(true);
    }
  });

  it('rejects unknown types, unknown versions, and non-objects', () => {
    expect(isTestResultRecord({ schemaVersion: TEST_RESULTS_SCHEMA_VERSION, type: 'run-paused' })).toBe(false);
    expect(isTestResultRecord({ ...runEnd, schemaVersion: 999 })).toBe(false);
    expect(isTestResultRecord('{"type":"run-start"}')).toBe(false);
    expect(isTestResultRecord(null)).toBe(false);
  });
});
