/**
 * narrative-endings.test.ts — beat 5 of the author narrative ("Endings"):
 * the card the story ended on is an END STATE card, the replay asserts the
 * ending it reached by reading the engine's record, and the two shapes of
 * "no longer reaches it" read differently — a line that stops short of the
 * ending its card declares FAILS, naming the ending; a line whose END STATE
 * card is removed passes and the ending becomes a reported GAP.
 *
 * Both mutations run on scratch copies. The real story is read, never written.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { STORY_DIR, commandResults, derivedSummary, lineLabel, runEnd, runOrchardTest, runTestJson, type TestRun } from './support/story-run';
import type { TreeCard, TreeDocument } from '../../packages/branch-tester/src/tree-document';
import { copyStoryToScratch, editTree, type ScratchStory } from './support/scratch-story';

/** The main line's terminal card — the last of the tree's own cards, whatever the branches hold. */
function terminalCardIndex(document: TreeDocument): number {
  return document.cards.length - 1;
}

let real: TestRun;
let withoutEndCard: ScratchStory;
let stopsShort: ScratchStory;
let gapRun: TestRun;
let failRun: TestRun;

beforeAll(() => {
  real = runOrchardTest();

  withoutEndCard = copyStoryToScratch(STORY_DIR, 'narrative-ending-gap-');
  const removedEnd = editTree<TreeCard>(join(withoutEndCard.dir, 'orchard.tests'), (document) =>
    document.cards.splice(terminalCardIndex(document), 1)[0],
  );
  expect(removedEnd.ending).toBe('harvest-home');
  gapRun = runTestJson(withoutEndCard.dir);

  stopsShort = copyStoryToScratch(STORY_DIR, 'narrative-ending-short-');
  const removedBefore = editTree<TreeCard>(join(stopsShort.dir, 'orchard.tests'), (document) =>
    document.cards.splice(terminalCardIndex(document) - 1, 1)[0],
  );
  expect(removedBefore.ending).toBeUndefined();
  expect(removedBefore.command).toBe('east');
  failRun = runTestJson(stopsShort.dir);
}, 180_000);

afterAll(() => {
  withoutEndCard?.cleanup();
  stopsShort?.cleanup();
});

const mainLine = (run: TestRun) => commandResults(run).filter((result) => lineLabel(run, result.file) === 'opening-gate');

describe('END STATE cards prove their endings', () => {
  it('the main line ends at the gate with harvest-home, asserted from the engine\'s ending record', () => {
    const victory = commandResults(real).find((result) => result.ending === 'victory')!;
    expect(lineLabel(real, victory.file)).toBe('opening-gate');
    expect(victory.input).toBe('south');
    expect(victory.assertionResults).toContainEqual({ description: 'ending harvest-home', passed: true });
    expect(mainLine(real).at(-1)).toBe(victory);
  });

  it('the wait branch at the Hive Yard ends with stung', () => {
    const defeat = commandResults(real).find((result) => result.ending === 'defeat')!;
    expect(lineLabel(real, defeat.file)).toBe('hive-yard · wait');
    expect(defeat.input).toBe('wait');
    expect(defeat.assertionResults).toContainEqual({ description: 'ending stung', passed: true });
  });

  it('together they reach two of the three declared endings', () => {
    expect(derivedSummary(real).endings).toMatchObject({ declared: 3, reached: 2 });
  });
});

describe('a line that stops short of the ending its card declares', () => {
  it('fails at the END STATE card, naming the ending that was not reached', () => {
    const failed = mainLine(failRun).filter((result) => !result.passed);
    expect(failed).toHaveLength(1);
    expect(failed[0].input).toBe('south');
    expect(failed[0].failure).toBe('Ending "harvest-home" not reached: the story did not end');
    expect(failed[0].assertionResults).toContainEqual({
      description: 'ending harvest-home',
      passed: false,
      message: 'Ending "harvest-home" not reached: the story did not end',
    });
    expect(runEnd(failRun).totalFailed).toBe(1);
    expect(runEnd(failRun).exitCode).toBe(1);
  });
});

describe('a line whose END STATE card is removed', () => {
  it('still passes, and the ending becomes a named gap in the ratio — not a failure', () => {
    expect(mainLine(gapRun).every((result) => result.passed)).toBe(true);
    expect(runEnd(gapRun).totalFailed).toBe(0);
    const { endings } = derivedSummary(gapRun);
    expect(endings).toMatchObject({ declared: 3, reached: 1 });
    expect(endings.unreached.map((ending) => ending.id)).toEqual(['harvest-home', 'bellyache']);
    expect(endings.unreached[0]).toEqual({ id: 'harvest-home', statement: 'win', line: 67, file: null });
    expect(gapRun.stderr).toContain('Endings reached: 1 / 3');
    expect(gapRun.stderr).toContain('  orchard.story:67 · harvest-home (win)');
  });
});
