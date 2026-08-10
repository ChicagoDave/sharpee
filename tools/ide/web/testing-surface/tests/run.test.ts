/**
 * run.test.ts — the run column's fold (design §7, ADR-306 Phase 6).
 *
 * Derived from the Behavior Statement: one result per transcript stem, the
 * first failure on one line, replays never rows, the run-end tally, and the
 * stream-less-death note. Events are built as real wire literals and folded
 * through the REAL `isRunEvent` guard — a hand-rolled shape the guard would
 * reject must not pass here.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import { beginRun, createRunState, finishRun, foldRunLine, resetRun } from '../src/run';

let seq = 0;
const line = (event: Record<string, unknown>): string =>
  JSON.stringify({ schemaVersion: 2, seq: seq++, elapsedMs: seq, ...event });

const start = (file: string, extra: Record<string, unknown> = {}): string =>
  line({ type: 'transcript-start', file, index: 0, ...extra });
const command = (file: string, extra: Record<string, unknown> = {}): string =>
  line({
    type: 'command-result', file, line: 4, input: 'look',
    passed: true, expectedFailure: false, skipped: false, ...extra,
  });
const end = (file: string, extra: Record<string, unknown> = {}): string =>
  line({
    type: 'transcript-end', file, status: 'passed',
    passed: 1, failed: 0, expectedFailures: 0, skipped: 0, duration: 5, ...extra,
  });
const runEnd = (extra: Record<string, unknown> = {}): string =>
  line({
    type: 'run-end', totalPassed: 1, totalFailed: 0, totalExpectedFailures: 0,
    totalSkipped: 0, totalErrors: 0, totalUnreached: 0, totalDuration: 9,
    exitCode: 0, ...extra,
  });

const A = '/proj/tests/arrival.transcript';
const B = '/proj/tests/boiler-east-1.transcript';

describe('foldRunLine', () => {
  it('a passing file lands one PASS row keyed by stem, with its turn count', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(A), command(A), end(A, { passed: 3 })]) foldRunLine(state, raw);

    const result = state.results.get('arrival');
    expect(result?.status).toBe('passed');
    expect(result?.passed).toBe(3);
    expect(result?.firstFailure).toBeUndefined();
  });

  it('a failed file carries its FIRST failure one-line (wire failure message + turn), and counts the rest', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(A),
      command(A, { passed: false, turn: 3, failure: 'Output does not contain "boiler"' }),
      command(A, { passed: false, turn: 4, failure: 'Output does not contain "shed"' }),
      end(A, { status: 'failed', passed: 1, failed: 2 }),
    ]) foldRunLine(state, raw);

    const result = state.results.get('arrival');
    expect(result?.status).toBe('failed');
    expect(result?.firstFailure).toBe('turn 3 — Output does not contain "boiler"');
    expect(result?.moreFailures).toBe(1);
  });

  it('a runtime throw without an assertion message falls back to the error text and source line', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      start(A),
      command(A, { passed: false, error: 'engine exploded' }),
      end(A, { status: 'failed', passed: 0, failed: 1 }),
    ]) foldRunLine(state, raw);

    expect(state.results.get('arrival')?.firstFailure).toBe('line 4 — engine exploded');
  });

  it('a replayed execution is never a row, and the authored one still is', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      // The authored run of A…
      start(A), command(A), end(A),
      // …then A replayed to build B's state: its (possibly diverging)
      // events must not overwrite the authored row.
      start(A, { replayed: true, index: 1 }),
      command(A, { passed: false, turn: 1, failure: 'replay noise' }),
      end(A, { status: 'failed', passed: 0, failed: 1 }),
      start(B, { index: 2, parent: A }), command(B), end(B),
    ]) foldRunLine(state, raw);

    expect(state.results.get('arrival')?.status).toBe('passed');
    expect(state.results.get('boiler-east-1')?.status).toBe('passed');
  });

  it('error and unreached files say why on their one line', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [
      end(A, { status: 'error', passed: 0, failed: 0, errorMessage: '2 parse error(s)' }),
      end(B, { status: 'unreached', passed: 0, failed: 0, blockedBy: A }),
    ]) foldRunLine(state, raw);

    expect(state.results.get('arrival')?.firstFailure).toBe('2 parse error(s)');
    expect(state.results.get('boiler-east-1')?.firstFailure).toBe('blocked by arrival');
  });

  it('run-end closes the run with the tally; undecodable lines never throw', () => {
    const state = createRunState();
    beginRun(state);
    expect(state.inFlight).toBe(true);
    foldRunLine(state, 'not json at all');
    foldRunLine(state, '{"type":"command-result"}');   // fails the guard
    foldRunLine(state, runEnd({ totalPassed: 4, totalFailed: 1, totalUnreached: 2 }));

    expect(state.inFlight).toBe(false);
    expect(state.tally).toEqual({ passed: 4, failed: 1, errors: 0, unreached: 2 });
  });

  it('a stream-less death leaves a note; a clean close never does', () => {
    const dead = createRunState();
    beginRun(dead);
    finishRun(dead, false, 'sharpee not found');
    expect(dead.note).toBe('sharpee not found');

    const clean = createRunState();
    beginRun(clean);
    foldRunLine(clean, runEnd());
    finishRun(clean, true);
    expect(clean.note).toBeUndefined();
  });

  it('beginRun clears the previous run — the column reports THIS run only', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(A), command(A), end(A), runEnd()]) foldRunLine(state, raw);
    expect(state.results.size).toBe(1);
    expect(state.tally).toBeDefined();

    beginRun(state);
    expect(state.inFlight).toBe(true);
    expect(state.results.size).toBe(0);
    expect(state.tally).toBeUndefined();
  });
});

describe('resetRun (David 2026-08-09: a changed suite voids the results)', () => {
  it('drops results, tally, and note back to not-run', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(A), command(A), end(A), runEnd()]) foldRunLine(state, raw);
    finishRun(state, false, 'stale note');
    expect(state.results.size).toBe(1);

    resetRun(state);

    expect(state.inFlight).toBe(false);
    expect(state.results.size).toBe(0);
    expect(state.tally).toBeUndefined();
    expect(state.note).toBeUndefined();
  });
});
