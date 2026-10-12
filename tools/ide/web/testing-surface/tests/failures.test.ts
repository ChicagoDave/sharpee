/**
 * failures.test.ts — the failure list next/previous walks (ADR-357 D6, D10).
 *
 * Derived from the Behavior Statement: derived failures first in arrival
 * order, then one stop per failing card in run order; an errored line with no
 * failing card is one stop; unreached lines are not stops; stale failures
 * stay and are counted apart; the text filter narrows by label or message;
 * stepping wraps and is inert on an empty list; the switch keeps failed,
 * errored and unreached lines. Events are real wire literals folded through
 * the real `foldRunLine`.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import { beginRun, createRunState, finishRun, foldRunLine, type RunColumnState } from '../src/run';
import { failureCountText, failureStopsOf, filterStops, narrowedLineIds, stepIndex } from '../src/failures';

let seq = 0;
const line = (event: Record<string, unknown>): string =>
  JSON.stringify({ schemaVersion: 2, seq: seq++, elapsedMs: seq, ...event });
const start = (file: string, label?: string): string =>
  line({ type: 'transcript-start', file, index: 0, ...(label !== undefined ? { label } : {}) });
const command = (file: string, extra: Record<string, unknown> = {}): string =>
  line({ type: 'command-result', file, line: 0, input: 'look', passed: true, expectedFailure: false, skipped: false, ...extra });
const end = (file: string, extra: Record<string, unknown> = {}): string =>
  line({ type: 'transcript-end', file, status: 'passed', passed: 1, failed: 0, expectedFailures: 0, skipped: 0, duration: 5, ...extra });
const derived = (label: string, status: string, extra: Record<string, unknown> = {}): string =>
  line({ type: 'derived-branch', label, span: { line: 12, column: 3, endLine: 12, endColumn: 20 }, status, ...extra });
const runEnd = (): string =>
  line({ type: 'run-end', totalPassed: 1, totalFailed: 1, totalExpectedFailures: 0, totalSkipped: 0, totalErrors: 0, totalUnreached: 0, totalDuration: 9, exitCode: 1 });

const MAIN = 'root0000';
const B1 = 'branch01';
const B2 = 'branch02';
const B3 = 'branch03';

/** A run with a derived failure, two tree failures on the main line, an errored branch, an unreached one and a passing one. */
function mixedRun(): RunColumnState {
  const state = createRunState();
  beginRun(state);
  for (const raw of [
    derived('lamp · on rubbing', 'passed'),
    derived('den · on entering', 'failed', { failure: 'contains "A small den" — not in output' }),
    start(MAIN, 'opening-den'),
    command(MAIN, { input: '(opening)', passed: true, cardId: 'c-open' }),
    command(MAIN, { input: 'take lamp', passed: false, turn: 1, failure: 'no lamp here', cardId: 'c-lamp' }),
    command(MAIN, { input: 'north', passed: true, turn: 2, cardId: 'c-north' }),
    command(MAIN, { input: 'open door', passed: false, turn: 3, failure: 'the door is locked', cardId: 'c-door' }),
    end(MAIN, { status: 'failed', passed: 2, failed: 2 }),
    start(B1, 'den · east'),
    command(B1, { input: 'east', passed: true, turn: 1, cardId: 'c-east' }),
    end(B1),
    start(B2, 'den · dig'),
    end(B2, { status: 'error', passed: 0, failed: 0, errorMessage: 'the engine died' }),
    start(B3, 'den · dig · wait'),
    end(B3, { status: 'unreached', passed: 0, failed: 0, blockedBy: B2 }),
    runEnd(),
  ]) foldRunLine(state, raw);
  finishRun(state, true);
  return state;
}

describe('failureStopsOf — order and fold (AC-7)', () => {
  it('walks the derived failure first, then each failing card in run order, then the errored line; passing and unreached lines are not stops', () => {
    const stops = failureStopsOf(mixedRun());
    expect(stops.map((stop) => stop.kind === 'derived' ? `derived:${stop.index}` : `${stop.lineId}:${stop.cardId ?? '-'}`))
      .toEqual(['derived:1', `${MAIN}:c-lamp`, `${MAIN}:c-door`, `${B2}:-`]);
    expect(stops[1]).toMatchObject({ kind: 'card', command: 1, label: 'opening-den · take lamp', message: 'no lamp here', stale: false });
    expect(stops[3]).toMatchObject({ kind: 'card', lineId: B2, message: 'the engine died' });
    expect(stops[3]).not.toHaveProperty('command');
    expect(stops[0]).toMatchObject({ kind: 'derived', label: 'den · on entering', message: 'contains "A small den" — not in output' });
  });

  it('a clean run has no stops, no count beyond "no failures", and stepping is inert (AC-9)', () => {
    const state = createRunState();
    beginRun(state);
    for (const raw of [start(MAIN), command(MAIN), end(MAIN), runEnd()]) foldRunLine(state, raw);
    finishRun(state, true);
    const stops = failureStopsOf(state);
    expect(stops).toEqual([]);
    expect(failureCountText(stops)).toBe('no failures');
    expect(stepIndex(stops.length, undefined, 1)).toBeUndefined();
    expect(stepIndex(stops.length, undefined, -1)).toBeUndefined();
  });

  it('a stale failure stays in the list and the count names it apart (D6)', () => {
    const state = mixedRun();
    state.results.get(MAIN)!.stale = true;
    const stops = failureStopsOf(state);
    expect(stops.filter((stop) => stop.stale).map((stop) => stop.kind === 'card' ? stop.cardId : stop.kind)).toEqual(['c-lamp', 'c-door']);
    expect(failureCountText(stops)).toBe('4 failing, 2 edited since run');
    state.derivedStale = true;
    expect(failureCountText(failureStopsOf(state))).toBe('4 failing, 3 edited since run');
  });
});

describe('filterStops and stepIndex — the text filter and the walk', () => {
  it('matches the label or the message, case-insensitively, and keeps everything on an empty query', () => {
    const stops = failureStopsOf(mixedRun());
    expect(filterStops(stops, '')).toHaveLength(4);
    expect(filterStops(stops, 'LOCKED').map((stop) => stop.kind === 'card' ? stop.cardId : '')).toEqual(['c-door']);
    expect(filterStops(stops, 'den ·').map((stop) => stop.label)).toEqual(['den · on entering', 'opening-den · take lamp', 'opening-den · open door', 'den · dig']);
    expect(filterStops(stops, 'nothing like this')).toEqual([]);
  });

  it('next from nowhere is the first, previous from nowhere is the last, and both wrap', () => {
    expect(stepIndex(4, undefined, 1)).toBe(0);
    expect(stepIndex(4, undefined, -1)).toBe(3);
    expect(stepIndex(4, 3, 1)).toBe(0);
    expect(stepIndex(4, 0, -1)).toBe(3);
    expect(stepIndex(4, 1, 1)).toBe(2);
    // A position the list no longer has (the list shrank) restarts the walk.
    expect(stepIndex(2, 5, 1)).toBe(0);
  });
});

describe('narrowedLineIds — the switch (AC-8)', () => {
  it('keeps failed, errored and unreached lines; with text, the lines holding a matching stop or a matching blocker', () => {
    const run = mixedRun();
    expect([...narrowedLineIds(run, '')].sort()).toEqual([B2, B3, MAIN].sort());
    // Not `locked` alone: an unreached line's blocker reads "blocked by …", which contains it.
    expect([...narrowedLineIds(run, 'door is locked')]).toEqual([MAIN]);
    expect([...narrowedLineIds(run, 'engine died')]).toEqual([B2]);
    // The blocker is named by its label: the errored line matches by its own stop, the unreached one by "blocked by den · dig".
    expect([...narrowedLineIds(run, 'den · dig')].sort()).toEqual([B2, B3].sort());
    expect([...narrowedLineIds(run, 'no such failure')]).toEqual([]);
  });
});
