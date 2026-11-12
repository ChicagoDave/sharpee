/**
 * narrative-rule-tests-itself.test.ts — beat 3 of the author narrative
 * ("Writing a rule, and watching it test itself"): the apple tree's shaking clause
 * yields derived rows the author never wrote, all green; plant a second rule
 * that fights the first on a scratch copy — an every-turn clause that moves
 * the windfall to the Cellar once the apple tree is picked — and exactly one
 * derived row goes red, `when laden`, naming the windfall and the room it
 * did not stay in; the tree notices too, at the card that takes the windfall.
 * The cider press's negation branch is SKIPPED with its shape and never
 * touches the exit code.
 *
 * WHY A FIGHTING RULE AND NOT A DELETED LINE. The derived tier builds each
 * test from the story's own compiled text, so deleting an effect deletes its
 * claim and nothing fails (GH #532; ADR-356's scenario says otherwise and is
 * wrong about that). What the tier catches is the engine contradicting the
 * text — here, two rules the author wrote that cannot both hold.
 *
 * The mutation runs on a copy under the OS temp directory. The real story is
 * read, never written.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  STORY_DIR,
  commandResults,
  derivedBranches,
  derivedSummary,
  lineLabel,
  runEnd,
  runOrchardTest,
  runTestJson,
  type TestRun,
} from './support/story-run';
import { copyStoryToScratch, insertAfterLine, type ScratchStory } from './support/scratch-story';

const TREE_BRANCHES = [
  'apple tree · after shaking, once',
  'apple tree · on shaking · refused need-pole',
  'apple tree · on shaking · when budding',
  'apple tree · on shaking · when laden',
  'apple tree · on shaking · when picked',
];
const LADEN = 'apple tree · on shaking · when laden';
const PRESS_NEGATION = 'cider press · on cranking · refused press-already-running';

/** The windfall's `aka` line — unique in the story; the planted clause goes inside its block, right after it. */
const WINDFALL_ANCHOR = 'aka apple';
const FIGHTING_RULE = [
  '',
  '  on every turn while the apple tree is picked',
  '    move the windfall to the Cellar',
  '  end on',
];

let real: TestRun;
let scratch: ScratchStory;
let mutated: TestRun;

beforeAll(() => {
  real = runOrchardTest();
  scratch = copyStoryToScratch(STORY_DIR, 'narrative-fighting-rule-');
  expect(insertAfterLine(join(scratch.dir, 'orchard.story'), WINDFALL_ANCHOR, FIGHTING_RULE)).toBeGreaterThan(0);
  mutated = runTestJson(scratch.dir);
}, 120_000);

afterAll(() => scratch?.cleanup());

const rowsOf = (run: TestRun) => new Map(derivedBranches(run).map((event) => [event.label, event]));

describe('the story as written', () => {
  it('derives five rows under the apple tree, all passed, none of them authored in the tree', () => {
    const rows = rowsOf(real);
    for (const label of TREE_BRANCHES) expect(rows.get(label)?.status, label).toBe('passed');
    for (const label of TREE_BRANCHES) expect(rows.get(label)?.span?.line, label).toBeGreaterThan(0);
  });

  it('the when-laden row arranged the precondition and typed the one command', () => {
    const laden = rowsOf(real).get(LADEN)!;
    expect(laden.command).toMatch(/^shake/);
    expect(laden.arranged?.some((expression) => /apple-tree is laden/.test(expression))).toBe(true);
    expect(laden.arranged?.some((expression) => /inventory contains .*pole/.test(expression))).toBe(true);
  });
});

describe('with a second rule that fights the first, on a scratch copy', () => {
  it('exactly one previously green row fails: when laden, naming the windfall, the Rows it should be in and the Cellar it is in', () => {
    const before = rowsOf(real);
    const after = rowsOf(mutated);
    const newlyFailed = [...after.values()].filter(
      (event) => event.status === 'failed' && before.get(event.label)?.status === 'passed',
    );
    expect(newlyFailed.map((event) => event.label)).toEqual([LADEN]);
    expect(newlyFailed[0].failure).toMatch(/^windfall\.location = rows: windfall\.location is "/);
    // The verdict half names the Cellar the windfall is in and the Rows it
    // should be in, never engine ids (GH #533).
    expect(newlyFailed[0].failure).toMatch(/ is "Cellar", expected "Rows"$/);
    expect(newlyFailed[0].failure).not.toMatch(/"r[0-9a-f]+"/);
  });

  it('the planted clause is itself one more derived row, and every other row keeps the verdict it had', () => {
    const before = rowsOf(real);
    const after = rowsOf(mutated);
    expect(after.size).toBe(before.size + 1);
    const planted = [...after.keys()].filter((label) => !before.has(label));
    expect(planted).toHaveLength(1);
    expect(planted[0]).toMatch(/^windfall · on every-turn/);
    expect(['passed', 'skipped']).toContain(after.get(planted[0])!.status);
    for (const [label, event] of before) {
      if (label === LADEN) continue;
      expect(after.get(label)?.status, label).toBe(event.status);
    }
    expect(derivedSummary(mutated).branches.declared).toBe(derivedSummary(real).branches.declared + 1);
    expect(derivedSummary(mutated).branches.failed).toBe(derivedSummary(real).branches.failed + 1);
  });

  it('the tree notices the same break at the card that takes the windfall — the two tiers agree', () => {
    const realTake = commandResults(real).find((result) => lineLabel(real, result.file) === 'opening-gate' && result.input === 'take windfall')!;
    const mutatedTake = commandResults(mutated).find((result) => lineLabel(mutated, result.file) === 'opening-gate' && result.input === 'take windfall')!;
    expect(realTake.passed).toBe(true);
    expect(mutatedTake.passed).toBe(false);
    expect(runEnd(real).totalFailed).toBe(0);
    expect(runEnd(mutated).totalFailed).toBeGreaterThan(0);
  });
});

describe('the SKIPPED branch', () => {
  it('is skipped with shape negation in both runs, and changes neither exit code on its own', () => {
    for (const run of [real, mutated]) {
      const press = rowsOf(run).get(PRESS_NEGATION)!;
      expect(press.status).toBe('skipped');
      expect(press.shape).toBe('negation');
      expect(press.detail).toMatch(/already holds in the arranged world/);
      const summary = derivedSummary(run);
      expect(summary.branches.gaps.some((gap) => gap.label === PRESS_NEGATION && gap.status === 'skipped')).toBe(true);
      expect(derivedBranches(run).filter((event) => event.status === 'failed').map((event) => event.label)).not.toContain(PRESS_NEGATION);
    }
    // The real story exits 0; only the planted fighting rule turns it to 1.
    expect(runEnd(real).exitCode).toBe(0);
    expect(runEnd(mutated).exitCode).toBe(1);
  });
});
