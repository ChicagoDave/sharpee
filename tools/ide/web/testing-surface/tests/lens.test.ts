/**
 * lens.test.ts — the run column folds the examinable lens's tier (ADR-408
 * D8) and names a run that carried none of it (AC-4).
 *
 * The events are built from the wire's own types; the AC-4 premise is a
 * committed fixture, `fixtures/scullery-run-without-lens.ndjson`, recorded
 * 2026-11-23 from a real `sharpee test scullery.story --tree --json` by a
 * devkit that had no lens tier yet.
 *
 * The section's view functions are pinned here too (ADR-408 D2, D9, D10):
 * the strips and their order, the not-a-thing count, the range request a
 * card builds from `at`, the line-only request for a source with none, and
 * the No-text card's description offer.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RUN_EVENT_SCHEMA_VERSION, type LensFindingEvent, type LensSummaryEvent } from '@sharpee/ide-protocol/run-events';
import {
  LENS_STRIP_ORDER, lensAbsenceAt, lensAbsenceText, lensCardLines, lensCardRequest, lensDescriptionRequest, lensHeaderText,
  lensSoundnessLines, lensSourceLabel, lensSourceRequest, lensStatusOf, lensStripsOf, openSourcePost, type LensFindingRow,
} from '../src/lens';
import { beginRun, createRunState, foldRunLine, resetRun } from '../src/run';

const envelope = { schemaVersion: RUN_EVENT_SCHEMA_VERSION, elapsedMs: 0 } as const;
const line = (event: object): string => JSON.stringify(event);

const whetstone: LensFindingEvent = {
  ...envelope,
  seq: 8,
  type: 'lens-finding',
  lens: 'examinable',
  phrase: 'whetstone',
  kind: 'resolved-default',
  detail: 'if.action.examining.default_description',
  thing: true,
  target: 'whetstone',
  targetId: 'whetstone',
  targetSpan: { line: 35, column: 1, endLine: 37, endColumn: 17 },
  sources: [{ key: 'scullery.description', kind: 'description', ownerId: 'scullery', ownerName: 'Scullery', span: { line: 18, column: 3, endLine: 19, endColumn: 39 } }],
  rooms: [{ roomId: 'scullery', room: 'Scullery' }],
};
const summary: LensSummaryEvent = {
  ...envelope,
  seq: 9,
  type: 'lens-summary',
  lens: 'examinable',
  seed: 42,
  maxSeconds: 30,
  reach: { roomsReached: 2, roomsDeclared: 2, unreached: [], commandsTyped: 1, ms: 90, maxSeconds: 30, stoppedBy: 'every-route' },
  phrasesExecuted: 42,
  counts: { 'resolved-default': 1 },
};
const runEnd = (exitCode: number, seq = 10) => ({ ...envelope, seq, type: 'run-end', totalPassed: 2, totalFailed: 0, totalExpectedFailures: 0, totalSkipped: 0, totalErrors: 0, totalUnreached: 0, totalDuration: 40, exitCode });

describe('the lens tier folds into the run column', () => {
  it('keeps each finding as a row, envelope dropped, and the summary as the section\'s soundness line', () => {
    const state = createRunState();
    beginRun(state);
    foldRunLine(state, line(whetstone));
    foldRunLine(state, line(summary));
    foldRunLine(state, line(runEnd(0)));
    expect(state.lensFindings).toHaveLength(1);
    expect(state.lensFindings[0]).toMatchObject({ phrase: 'whetstone', targetId: 'whetstone', targetSpan: { line: 35 } });
    expect(state.lensFindings[0]).not.toHaveProperty('seq');
    expect(state.lensFindings[0].sources[0]).toMatchObject({ key: 'scullery.description', span: { line: 18 } });
    expect(lensStatusOf(state)).toEqual({ kind: 'reported', summary: expect.objectContaining({ seed: 42, maxSeconds: 30, phrasesExecuted: 42 }) });
    expect(state.lensAbsence).toBeUndefined();
  });

  it('a finding never touches the tally: a lens never gates (D7)', () => {
    const withLens = createRunState();
    beginRun(withLens);
    for (const event of [whetstone, summary, runEnd(0)]) foldRunLine(withLens, line(event));
    const without = createRunState();
    beginRun(without);
    foldRunLine(without, line(runEnd(0)));
    expect(withLens.tally).toEqual(without.tally);
  });

  it('a refused lens shows its one refusal line, not an empty list', () => {
    const state = createRunState();
    beginRun(state);
    const refusal = "No noun extractor for language 'xx-YY': @sharpee/lang-xx-yy/nouns does not provide one.";
    foldRunLine(state, line({ ...envelope, seq: 5, type: 'lens-summary', lens: 'examinable', seed: 42, maxSeconds: 30, refusal }));
    foldRunLine(state, line(runEnd(0, 6)));
    expect(lensStatusOf(state)).toEqual({ kind: 'refused', message: refusal });
    expect(state.lensFindings).toEqual([]);
  });

  it('is running while the stream is open, and not-run before any run', () => {
    const state = createRunState();
    expect(lensStatusOf(state)).toEqual({ kind: 'not-run' });
    beginRun(state);
    expect(lensStatusOf(state)).toEqual({ kind: 'running' });
  });

  it('a new run and a reset clear the last run\'s findings, summary and absence', () => {
    const state = createRunState();
    beginRun(state);
    for (const event of [whetstone, summary, runEnd(0)]) foldRunLine(state, line(event));
    beginRun(state);
    expect(state.lensFindings).toEqual([]);
    expect(state.lensSummary).toBeUndefined();
    foldRunLine(state, line(runEnd(0, 0)));
    expect(state.lensAbsence).toBe('toolchain-without-lens');
    resetRun(state);
    expect(state.lensAbsence).toBeUndefined();
    expect(lensStatusOf(state)).toEqual({ kind: 'not-run' });
  });
});

describe('a run with no lens events names why (ADR-408 AC-4)', () => {
  const fixture = fileURLToPath(new URL('./fixtures/scullery-run-without-lens.ndjson', import.meta.url));

  it('the recorded stream from a toolchain with no lens tier is named as such, with its own sentence', () => {
    const lines = readFileSync(fixture, 'utf8').split('\n').filter((text) => text.trim() !== '');
    // The premise: the fixture is a whole run that closed normally and carries no lens event.
    expect(lines.some((text) => text.includes('"type":"lens-'))).toBe(false);
    expect(JSON.parse(lines[lines.length - 1])).toMatchObject({ type: 'run-end', exitCode: 0 });

    const state = createRunState();
    beginRun(state);
    for (const text of lines) foldRunLine(state, text);
    expect(state.inFlight).toBe(false);
    expect(lensStatusOf(state)).toEqual({ kind: 'absent', absence: 'toolchain-without-lens' });
    expect(lensAbsenceText('toolchain-without-lens')).toBe(
      'This project\'s sharpee does not run the examinable lens. Update the toolchain to see nouns the player reads but cannot use.',
    );
  });

  it('a run that stopped before its tiers (exit 2 or 3) is named as stopped, never as an old toolchain', () => {
    expect(lensAbsenceAt(2)).toBe('run-stopped-early');
    expect(lensAbsenceAt(3)).toBe('run-stopped-early');
    expect(lensAbsenceAt(1)).toBe('toolchain-without-lens');
    const state = createRunState();
    beginRun(state);
    foldRunLine(state, line(runEnd(2, 0)));
    expect(lensStatusOf(state)).toEqual({ kind: 'absent', absence: 'run-stopped-early' });
    expect(lensAbsenceText('run-stopped-early')).not.toBe(lensAbsenceText('toolchain-without-lens'));
  });
});

describe('the lens section\'s cards (ADR-408 D2, D9, D10)', () => {
  const { schemaVersion: _v, seq: _s, elapsedMs: _e, type: _t, ...whetstoneRow } = whetstone;
  const at = { line: 19, column: 3, endLine: 19, endColumn: 12 };
  const located: LensFindingRow = { ...whetstoneRow, sources: [{ ...whetstoneRow.sources[0], at, length: 9 }] };
  const finding = (extra: Partial<LensFindingRow>): LensFindingRow => ({ ...whetstoneRow, target: undefined, targetId: undefined, targetSpan: undefined, ...extra });

  it('orders the strips No text first, lists each class\'s things, counts its not-a-thing findings, and puts a described row in none', () => {
    expect(LENS_STRIP_ORDER[0]).toBe('resolved-default');
    const rows: LensFindingRow[] = [
      finding({ phrase: 'corks', kind: 'not-in-scope' }),
      finding({ phrase: 'silence', kind: 'not-in-scope', thing: false }),
      finding({ phrase: 'crock', kind: 'number-form', resolvedForm: 'crocks' }),
      located,
      finding({ phrase: 'jars', kind: 'resolved-described' }),
    ];
    const strips = lensStripsOf(rows);
    expect(strips.map((strip) => [strip.title, strip.listed.map((row) => row.phrase), strip.notAThing])).toEqual([
      ['No text', ['whetstone'], 0],
      ['Not answered', ['corks'], 1],
      ['Number form', ['crock'], 0],
    ]);
    expect(lensHeaderText(rows)).toBe('examinable lens · 4 findings');
  });

  it('a card with a located source asks for the phrase\'s range, and the page posts its column and length', () => {
    const request = lensCardRequest(located);
    expect(request).toEqual({ file: null, line: 19, range: { column: 3, length: 9 } });
    expect(openSourcePost(request!.file, request!.line, request!.range)).toEqual({ file: null, line: 19, column: 3, length: 9 });
    expect(lensSourceLabel(located.sources[0])).toBe('Scullery description · line 19');
  });

  it('a source with no `at` asks for its passage\'s first line only, and the post carries no range (AC-6)', () => {
    expect(lensSourceRequest(whetstoneRow.sources[0])).toEqual({ file: null, line: 18 });
    const request = lensCardRequest(whetstoneRow);
    expect(request).toEqual({ file: null, line: 18 });
    expect(openSourcePost(request!.file, request!.line, request!.range)).toEqual({ file: null, line: 18 });
  });

  it('the card picks the first located source over an earlier one with no `at`, keeps a source\'s file, and has nothing to open with no span at all', () => {
    const unlocated = { key: 'larder.description', kind: 'description' as const, ownerId: 'larder', ownerName: 'Larder', span: { file: 'rooms.story', line: 4, column: 3, endLine: 5, endColumn: 10 } };
    const elsewhere = { ...located.sources[0], at: { ...at, file: 'rooms.story' } };
    expect(lensCardRequest(finding({ sources: [unlocated, elsewhere] }))).toEqual({ file: 'rooms.story', line: 19, range: { column: 3, length: 9 } });
    expect(lensCardRequest(finding({ sources: [unlocated] }))).toEqual({ file: 'rooms.story', line: 4 });
    const spanless = { key: null, kind: 'state' as const, ownerId: null, ownerName: 'stranger', span: null };
    expect(lensSourceRequest(spanless)).toBeNull();
    expect(lensSourceLabel(spanless)).toBe('stranger state text');
    expect(lensCardRequest(finding({ sources: [spanless] }))).toBeNull();
  });

  it('a No-text card offers its target\'s declaration line; no other card does, nor one whose declaration has no span (D10)', () => {
    expect(lensDescriptionRequest(located)).toEqual({ file: null, line: 35 });
    expect(lensDescriptionRequest(finding({ kind: 'not-in-scope' }))).toBeNull();
    expect(lensDescriptionRequest({ ...located, targetSpan: null })).toBeNull();
  });

  it('a card reads its phrase, its class title, its target and its rooms', () => {
    expect(lensCardLines(located)).toEqual({ phrase: '"whetstone"  → whetstone', badge: 'No text', rooms: 'in Scullery' });
    expect(lensCardLines(finding({ phrase: 'crock', kind: 'number-form', resolvedForm: 'crocks' })).phrase).toBe('"crock"  ("crocks" resolves)');
  });

  it('the soundness lines name the seed, budget, stop reason, reach and each room not reached, then the lens\'s footer', () => {
    const { schemaVersion: _sv, seq: _sq, elapsedMs: _el, type: _ty, ...reported } = summary;
    expect(lensSoundnessLines(reported)).toEqual([
      'seed 42 · budget 30 s · every route typed',
      'rooms reached 2 of 2 declared',
      expect.stringContaining('Absence is not proof'),
    ]);
    const short = { ...reported, reach: { ...reported.reach!, roomsReached: 1, stoppedBy: 'budget' as const, unreached: [{ roomId: 'larder', room: 'Larder', reason: 'the time budget ran out' }] } };
    expect(lensSoundnessLines(short).slice(0, 3)).toEqual([
      'seed 42 · budget 30 s · the time budget ran out',
      'rooms reached 1 of 2 declared',
      'not reached: Larder — the time budget ran out',
    ]);
  });
});
