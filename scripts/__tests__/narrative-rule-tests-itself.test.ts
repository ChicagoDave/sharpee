/**
 * narrative-rule-tests-itself.test.ts — beat 3 of the author narrative
 * ("Writing a rule, and watching it test itself"): the vine's pruning clause
 * yields derived rows the author never wrote, all green; plant a second rule
 * that fights the first on a scratch copy — an every-turn clause that moves
 * the silver locket to the Cellar once the vine is fruiting — and exactly one
 * derived row goes red, `when flowering`, naming the locket and the room it
 * did not stay in; the tree notices too, at the card that takes the locket.
 * The case clock's negation branch is SKIPPED with its shape and never
 * touches the exit code.
 *
 * WHY A FIGHTING RULE AND NOT A DELETED LINE. The derived tier builds each
 * test from the story's own compiled text, so deleting an effect deletes its
 * claim and nothing fails (GH #532; ADR-356's scenario says otherwise and is
 * wrong about that). What the tier catches is the engine contradicting the
 * text — here, two rules the author wrote that cannot both hold.
 *
 * KNOWN DIVERGENCE, GH #533: the failure message names engine ids where the
 * narrative promises room names. Asserted as it is today, with the flip rule
 * beside the assertion.
 *
 * The mutation runs on a copy under the OS temp directory. The real story is
 * read, never written.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  FERNHILL_DIR,
  commandResults,
  derivedBranches,
  derivedSummary,
  runEnd,
  runFernhillTest,
  runTestJson,
  type TestRun,
} from './support/fernhill-run';
import { copyStoryToScratch, insertAfterLine, type ScratchStory } from './support/scratch-story';

const VINE_BRANCHES = [
  'vine · after pruning, once',
  'vine · on pruning · refused need-shears',
  'vine · on pruning · when seedling',
  'vine · on pruning · when flowering',
  'vine · on pruning · when fruiting',
];
const FLOWERING = 'vine · on pruning · when flowering';
const CLOCK_NEGATION = 'case clock · on winding · refused clock-already-going';

/** The silver locket's `aka` line — unique in the story; the planted clause goes inside its block, right after it. */
const LOCKET_ANCHOR = 'aka locket';
const FIGHTING_RULE = [
  '',
  '  on every turn while the vine is fruiting',
  '    move the silver locket to the Cellar',
  '  end on',
];

let real: TestRun;
let scratch: ScratchStory;
let mutated: TestRun;

beforeAll(() => {
  real = runFernhillTest();
  scratch = copyStoryToScratch(FERNHILL_DIR, 'narrative-fighting-rule-');
  expect(insertAfterLine(join(scratch.dir, 'fernhill.story'), LOCKET_ANCHOR, FIGHTING_RULE)).toBeGreaterThan(0);
  mutated = runTestJson(scratch.dir);
}, 120_000);

afterAll(() => scratch?.cleanup());

const rowsOf = (run: TestRun) => new Map(derivedBranches(run).map((event) => [event.label, event]));

describe('the story as written', () => {
  it('derives five rows under vine, all passed, none of them authored in the tree', () => {
    const rows = rowsOf(real);
    for (const label of VINE_BRANCHES) expect(rows.get(label)?.status, label).toBe('passed');
    for (const label of VINE_BRANCHES) expect(rows.get(label)?.span?.line, label).toBeGreaterThan(0);
  });

  it('the when-flowering row arranged the precondition and typed the one command', () => {
    const flowering = rowsOf(real).get(FLOWERING)!;
    expect(flowering.command).toMatch(/^prune/);
    expect(flowering.arranged?.some((expression) => /vine is flowering/.test(expression))).toBe(true);
    expect(flowering.arranged?.some((expression) => /inventory contains .*shears/.test(expression))).toBe(true);
  });
});

describe('with a second rule that fights the first, on a scratch copy', () => {
  it('exactly one previously green row fails: when flowering, naming the locket, the Greenhouse it should be in and the Cellar it is in', () => {
    const before = rowsOf(real);
    const after = rowsOf(mutated);
    const newlyFailed = [...after.values()].filter(
      (event) => event.status === 'failed' && before.get(event.label)?.status === 'passed',
    );
    expect(newlyFailed.map((event) => event.label)).toEqual([FLOWERING]);
    expect(newlyFailed[0].failure).toMatch(/^silver-locket\.location = greenhouse: silver-locket\.location is "/);
    // GH #533: today the verdict half names engine ids ("r0d", expected "r04"),
    // not the Cellar and the Greenhouse the narrative promises. WHEN #533 SHIPS,
    // the two assertions below flip: the message must match /cellar/ and
    // /greenhouse/ and must not match a bare id. That flip is the suite doing
    // its job, not a test to delete.
    expect(newlyFailed[0].failure).toMatch(/ is "r[0-9a-f]+", expected "r[0-9a-f]+"$/);
    expect(newlyFailed[0].failure).not.toMatch(/cellar/i);
  });

  it('the planted clause is itself one more derived row, and every other row keeps the verdict it had', () => {
    const before = rowsOf(real);
    const after = rowsOf(mutated);
    expect(after.size).toBe(before.size + 1);
    const planted = [...after.keys()].filter((label) => !before.has(label));
    expect(planted).toHaveLength(1);
    expect(planted[0]).toMatch(/^silver locket · on every-turn/);
    expect(['passed', 'skipped']).toContain(after.get(planted[0])!.status);
    for (const [label, event] of before) {
      if (label === FLOWERING) continue;
      expect(after.get(label)?.status, label).toBe(event.status);
    }
    expect(derivedSummary(mutated).branches.declared).toBe(derivedSummary(real).branches.declared + 1);
    expect(derivedSummary(mutated).branches.failed).toBe(derivedSummary(real).branches.failed + 1);
  });

  it('the tree notices the same break at the card that takes the locket — the two tiers agree', () => {
    const realTake = commandResults(real).find((result) => result.file === 'opening-iron-gates' && result.input === 'take locket')!;
    const mutatedTake = commandResults(mutated).find((result) => result.file === 'opening-iron-gates' && result.input === 'take locket')!;
    expect(realTake.passed).toBe(true);
    expect(mutatedTake.passed).toBe(false);
    expect(runEnd(real).totalFailed).toBe(0);
    expect(runEnd(mutated).totalFailed).toBeGreaterThan(0);
  });
});

describe('the SKIPPED branch', () => {
  it('is skipped with shape negation in both runs, and changes neither exit code on its own', () => {
    for (const run of [real, mutated]) {
      const clock = rowsOf(run).get(CLOCK_NEGATION)!;
      expect(clock.status).toBe('skipped');
      expect(clock.shape).toBe('negation');
      expect(clock.detail).toMatch(/already holds in the booted world/);
      const summary = derivedSummary(run);
      expect(summary.branches.gaps.some((gap) => gap.label === CLOCK_NEGATION && gap.status === 'skipped')).toBe(true);
      expect(derivedBranches(run).filter((event) => event.status === 'failed').map((event) => event.label)).not.toContain(CLOCK_NEGATION);
    }
    expect(runEnd(real).exitCode).toBe(1);
    expect(runEnd(mutated).exitCode).toBe(1);
  });
});
