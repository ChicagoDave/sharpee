/**
 * narrative-coverage-numbers.test.ts — beat 6 of the author narrative
 * ("Reading the numbers"): the three ratios, measured against what the story
 * declares, with the gaps named. The structured `derived-summary` event and
 * the human report on stderr come from the same `sharpee test --json` run of
 * fernhill and must agree.
 *
 * The numbers are fernhill's as of 2026-09-27: 33 of 63 branches exercised,
 * all 33 passing (the two Tobias rows went green when the runner learned to
 * bring the topic entity to the speaker), 2 of 3 endings reached with
 * `dawn-comes` unreached, 13 of 13 rooms entered. A story edit or an
 * arrange-floor extension (GH #525, #529) moves them, and this file says
 * which one moved.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { derivedBranches, derivedSummary, runFernhillTest, type TestRun } from './support/fernhill-run';

let run: TestRun;

beforeAll(() => {
  run = runFernhillTest();
}, 60_000);

describe('the Coverage strip', () => {
  it('Branches 33 / 63 — the gaps are the SKIPPED branches, each with a shape and a span', () => {
    const { branches } = derivedSummary(run);
    expect(branches).toMatchObject({ declared: 63, exercised: 33, passed: 33, failed: 0 });
    expect(branches.gaps).toHaveLength(branches.declared - branches.exercised);
    expect(branches.gaps.every((gap) => gap.status === 'skipped' && typeof gap.shape === 'string')).toBe(true);
    expect(branches.gaps.every((gap) => gap.span !== null)).toBe(true);
    // The event stream and the summary count the same branches.
    const events = derivedBranches(run);
    expect(events).toHaveLength(branches.declared);
    expect(events.filter((event) => event.status === 'skipped')).toHaveLength(branches.gaps.length);
  });

  it('Endings 2 / 3 — dawn-comes is the ending no line reaches, at its source line', () => {
    const { endings } = derivedSummary(run);
    expect(endings).toEqual({
      declared: 3,
      reached: 2,
      unreached: [{ id: 'dawn-comes', statement: 'lose', line: 636, file: null }],
      unnamed: [],
    });
  });

  it('Rooms 13 / 13 — every declared room entered by one tier or the other', () => {
    expect(derivedSummary(run).rooms).toEqual({ declared: 13, entered: 13, unentered: [] });
  });

  it('the human report on stderr reads the same three ratios as the wire, from the same run', () => {
    const { branches, endings, rooms } = derivedSummary(run);
    expect(run.stderr).toContain(`Branches exercised: ${branches.exercised} / ${branches.declared}`);
    expect(run.stderr).toContain(`Not exercised (${branches.gaps.length}):`);
    expect(run.stderr).toContain(`Endings reached: ${endings.reached} / ${endings.declared}`);
    expect(run.stderr).toContain('  fernhill.story:636 · dawn-comes (lose)');
    expect(run.stderr).toContain(`Rooms entered: ${rooms.entered} / ${rooms.declared}`);
  });
});
