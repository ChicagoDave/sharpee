/**
 * derived.test.ts — the run column's derived-tier shaping (ADR-356 D5 on the
 * wire, GH #524 Phase 2).
 *
 * Derived from the Behavior Statement: failures and errors first in arrival
 * order, passes by subject, SKIPPED by shape, four counts; the subject is the
 * label's first segment; a span's site label; and the summary rendered as
 * the CLI report's OWN lines — pinned by a golden comparison against the
 * REAL `formatDerivedRun` and `formatCoverageSummary` in `@sharpee/branch-tester`,
 * fed the same data, so drift between `sharpee test`'s report and the tab is
 * a failing test rather than a manual eyeball check.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import {
  branchCoverageOf,
  formatCoverageSummary,
  formatDerivedRun,
  streamableDerivedOutcome,
  streamableDerivedSummary,
  type EndingCoverage,
  type RoomCoverage,
} from '@sharpee/branch-tester/coverage';
import type { DerivedOutcome, DerivedSuiteResult } from '@sharpee/branch-tester/derived-runner';
import {
  derivedReportLines,
  endingSiteLabel,
  groupDerivedRows,
  restOf,
  siteLabel,
  subjectOf,
  type DerivedBranchRow,
} from '../src/derived';

const row = (label: string, extra: Partial<DerivedBranchRow> = {}): DerivedBranchRow => ({
  label,
  span: { line: 7, column: 1, endLine: 7, endColumn: 2 },
  status: 'passed',
  ...extra,
});

describe('subjectOf / restOf', () => {
  it('splits a label on its first separator; a bare label is its own subject and its own rest', () => {
    expect(subjectOf('vine · on pruning · when flowering')).toBe('vine');
    expect(restOf('vine · on pruning · when flowering')).toBe('on pruning · when flowering');
    expect(subjectOf('story')).toBe('story');
    expect(restOf('story')).toBe('story');
  });
});

describe('siteLabel / endingSiteLabel', () => {
  it('names an imported file with its line, the main file by line alone, and no span as undefined', () => {
    expect(siteLabel({ file: 'npcs/tobias.chord', line: 3, column: 1, endLine: 3, endColumn: 2 })).toBe('npcs/tobias.chord:3');
    expect(siteLabel({ line: 636, column: 1, endLine: 636, endColumn: 2 })).toBe('line 636');
    expect(siteLabel(null)).toBeUndefined();
    expect(endingSiteLabel({ id: 'dawn-comes', statement: 'lose', line: 636, file: null })).toBe('line 636');
    expect(endingSiteLabel({ id: 'x', statement: 'win', line: 4, file: 'end.chord' })).toBe('end.chord:4');
    expect(endingSiteLabel({ id: 'x', statement: 'win', line: null, file: null })).toBeUndefined();
  });
});

describe('groupDerivedRows', () => {
  it('puts failures and errors first in arrival order, passes by subject, SKIPPED by shape, and counts each status apart', () => {
    const groups = groupDerivedRows([
      row('vine · on pruning · when seedling'),
      row('Tobias · topic boiler', { status: 'failed', failure: 'emitted tobias-boiler-reply: not emitted' }),
      row('boiler · on switching_on', { status: 'skipped', shape: 'negation', detail: 'the guard already holds' }),
      row('vine · on pruning · when flowering'),
      row('story · on turn', { status: 'error', detail: 'engine threw' }),
      row('Tobias · topic locket'),
      row('case clock · on winding', { status: 'skipped', shape: 'negation' }),
      row('story · define action feeding', { status: 'skipped', shape: 'no-claims' }),
      row('old · row', { status: 'skipped' }),
    ]);

    expect(groups.failures.map(f => f.label)).toEqual(['Tobias · topic boiler', 'story · on turn']);
    expect(groups.subjects.map(s => [s.subject, s.rows.map(r => r.label)])).toEqual([
      ['vine', ['vine · on pruning · when seedling', 'vine · on pruning · when flowering']],
      ['Tobias', ['Tobias · topic locket']],
    ]);
    expect(groups.shapes.map(s => [s.shape, s.rows.length])).toEqual([
      ['negation', 2],
      ['no-claims', 1],
      ['skipped', 1],
    ]);
    expect(groups).toMatchObject({ passed: 3, failed: 1, skipped: 4, errors: 1 });
  });

  it('never counts a SKIPPED row as failed, whatever its shape (D5a)', () => {
    const groups = groupDerivedRows([row('a', { status: 'skipped', shape: 'command-lifecycle' })]);
    expect(groups.failed).toBe(0);
    expect(groups.failures).toHaveLength(0);
    expect(groups.skipped).toBe(1);
  });
});

describe('derivedReportLines — golden against the CLI report', () => {
  const span = (line: number, file?: string) => ({ ...(file !== undefined ? { file } : {}), line, column: 1, endLine: line, endColumn: 2 });
  const branch = { kind: 'branch' } as unknown as DerivedOutcome['branch'];
  const outcome = (label: string, extra: Partial<DerivedOutcome> = {}): DerivedOutcome => ({
    branch,
    label,
    status: 'passed',
    arranged: [],
    claims: [],
    span: span(10),
    ...extra,
  });
  const outcomes: DerivedOutcome[] = [
    outcome('vine · on pruning · when seedling'),
    outcome('Tobias · topic boiler', {
      status: 'failed',
      claims: [{ claim: 'emitted tobias-boiler-reply', passed: false, message: 'not emitted' } as DerivedOutcome['claims'][number]],
      span: span(709),
    }),
    outcome('boiler · on switching_on', { status: 'skipped', shape: 'negation', detail: 'the guard already holds', span: span(271) }),
    outcome('story · on turn', { status: 'error', detail: 'engine threw', span: null }),
    outcome('mill · on entering', { status: 'skipped', shape: 'command-lifecycle', span: span(4, 'rooms/mill.chord') }),
  ];
  const run: DerivedSuiteResult = { outcomes, total: outcomes.length, passed: 1, failed: 1, skipped: 2, errored: 1, roomsEntered: [] };
  const endings: EndingCoverage = {
    declared: 3,
    reached: 1,
    unreached: [
      { id: 'dawn-comes', kind: 'defeat', statement: 'lose', owner: {} as EndingCoverage['unreached'][number]['owner'], line: 636, file: null },
      { id: 'far-away', kind: 'victory', statement: 'win', owner: {} as EndingCoverage['unreached'][number]['owner'], line: 9, file: 'ends/far.chord' },
    ],
    unnamed: [
      { id: null, kind: 'defeat', statement: 'kill', owner: {} as EndingCoverage['unnamed'][number]['owner'], line: null, file: null },
    ],
  };
  const rooms: RoomCoverage = {
    declared: 4,
    entered: 2,
    unentered: [{ id: 'r_cellar' }, { id: 'r_attic' }] as RoomCoverage['unentered'],
  };

  it('renders the summary exactly as formatDerivedRun\'s tail and formatCoverageSummary print it, for the same run', () => {
    const summary = streamableDerivedSummary(branchCoverageOf(run), endings, rooms);
    // The CLI's tail: from the blank line before `Branches exercised:`.
    const cliRun = formatDerivedRun(run, 'fernhill.story');
    const tail = cliRun.slice(cliRun.indexOf(''));
    const expected = [...tail, ...formatCoverageSummary(endings, rooms, 'fernhill.story')];

    expect(derivedReportLines(summary, 'fernhill.story')).toEqual(expected);
  });

  it('matches the CLI with no story file name too — the `line:` fallback and `(no span)` included', () => {
    const summary = streamableDerivedSummary(branchCoverageOf(run), endings, rooms);
    const cliRun = formatDerivedRun(run);
    const tail = cliRun.slice(cliRun.indexOf(''));
    expect(derivedReportLines(summary)).toEqual([...tail, ...formatCoverageSummary(endings, rooms)]);
  });

  it('a clean run prints the three ratios and nothing else, exactly as the CLI does', () => {
    const clean: DerivedSuiteResult = {
      outcomes: [outcome('a'), outcome('b')], total: 2, passed: 2, failed: 0, skipped: 0, errored: 0, roomsEntered: [],
    };
    const fullEndings: EndingCoverage = { declared: 1, reached: 1, unreached: [], unnamed: [] };
    const fullRooms: RoomCoverage = { declared: 2, entered: 2, unentered: [] };
    const summary = streamableDerivedSummary(branchCoverageOf(clean), fullEndings, fullRooms);
    const cliRun = formatDerivedRun(clean, 's.story');
    expect(derivedReportLines(summary, 's.story')).toEqual([
      ...cliRun.slice(cliRun.indexOf('')),
      ...formatCoverageSummary(fullEndings, fullRooms, 's.story'),
    ]);
    expect(derivedReportLines(summary, 's.story')).toEqual([
      '', 'Branches exercised: 2 / 2', '', 'Endings reached: 1 / 1', 'Rooms entered: 2 / 2',
    ]);
  });

  it('the wire row a failed outcome maps to carries the same failure line the CLI report cites', () => {
    const wireRow = streamableDerivedOutcome(outcomes[1]!);
    expect(wireRow.failure).toBe('emitted tobias-boiler-reply: not emitted');
    expect(formatDerivedRun(run, 'f.story')[2]).toBe('✗ Tobias · topic boiler — emitted tobias-boiler-reply: not emitted (f.story:709)');
  });
});
