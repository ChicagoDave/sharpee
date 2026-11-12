/**
 * narrative-coverage-numbers.test.ts — beat 6 of the author narrative
 * ("Reading the numbers"): the three ratios, measured against what the story
 * declares, with the gaps named. The structured `derived-summary` event and
 * the human report on stderr come from the same `sharpee test --json` run of
 * the test story `orchard` and must agree.
 *
 * The numbers are orchard's as of 2026-11-11: 16 of 20 branches exercised,
 * all 16 passing, 2 of 3 endings reached with `bellyache` unreached, 5 of 5
 * rooms entered. (Until that date the suite pinned Fernhill's figures.) A story edit or an
 * arrange-floor extension (GH #525, #529) moves them, and this file says
 * which one moved.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { derivedBranches, derivedSummary, runOrchardTest, type TestRun } from './support/story-run';

let run: TestRun;

beforeAll(() => {
  run = runOrchardTest();
}, 60_000);

describe('the Coverage strip', () => {
  it('Branches 16 / 20 — the gaps are the SKIPPED branches, each with a shape and a span', () => {
    const { branches } = derivedSummary(run);
    expect(branches).toMatchObject({ declared: 20, exercised: 16, passed: 16, failed: 0 });
    expect(branches.gaps).toHaveLength(branches.declared - branches.exercised);
    expect(branches.gaps.every((gap) => gap.status === 'skipped' && typeof gap.shape === 'string')).toBe(true);
    expect(branches.gaps.every((gap) => gap.span !== null)).toBe(true);
    // The event stream and the summary count the same branches.
    const events = derivedBranches(run);
    expect(events).toHaveLength(branches.declared);
    expect(events.filter((event) => event.status === 'skipped')).toHaveLength(branches.gaps.length);
  });

  it('Endings 2 / 3 — bellyache is the ending no line reaches, at its source line', () => {
    const { endings } = derivedSummary(run);
    expect(endings).toEqual({
      declared: 3,
      reached: 2,
      unreached: [{ id: 'bellyache', statement: 'lose', line: 203, file: null }],
      unnamed: [],
    });
  });

  it('Rooms 5 / 5 — every declared room entered by one tier or the other', () => {
    expect(derivedSummary(run).rooms).toEqual({ declared: 5, entered: 5, unentered: [] });
  });

  it('the human report on stderr reads the same three ratios as the wire, from the same run', () => {
    const { branches, endings, rooms } = derivedSummary(run);
    expect(run.stderr).toContain(`Branches exercised: ${branches.exercised} / ${branches.declared}`);
    expect(run.stderr).toContain(`Not exercised (${branches.gaps.length}):`);
    expect(run.stderr).toContain(`Endings reached: ${endings.reached} / ${endings.declared}`);
    expect(run.stderr).toContain('  orchard.story:203 · bellyache (lose)');
    expect(run.stderr).toContain(`Rooms entered: ${rooms.entered} / ${rooms.declared}`);
  });
});
