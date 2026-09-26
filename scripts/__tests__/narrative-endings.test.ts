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
import { FERNHILL_DIR, commandResults, derivedSummary, runEnd, runFernhillTest, runTestJson, type TestRun } from './support/fernhill-run';
import { copyStoryToScratch, editJson, type ScratchStory } from './support/scratch-story';

interface Card { type: string; command?: string; ending?: string; assertions: Record<string, unknown> }
interface TreeDocument { cards: Card[] }

/** The main line's terminal card — the last of the document's own cards, whatever the branches hold. */
function terminalCardIndex(document: TreeDocument): number {
  return document.cards.length - 1;
}

let real: TestRun;
let withoutEndCard: ScratchStory;
let stopsShort: ScratchStory;
let gapRun: TestRun;
let failRun: TestRun;

beforeAll(() => {
  real = runFernhillTest();

  withoutEndCard = copyStoryToScratch(FERNHILL_DIR, 'narrative-ending-gap-');
  const removedEnd = editJson<TreeDocument, Card>(join(withoutEndCard.dir, 'fernhill.tests.json'), (document) =>
    document.cards.splice(terminalCardIndex(document), 1)[0],
  );
  expect(removedEnd.ending).toBe('fernhill-saved');
  gapRun = runTestJson(withoutEndCard.dir);

  stopsShort = copyStoryToScratch(FERNHILL_DIR, 'narrative-ending-short-');
  const removedBefore = editJson<TreeDocument, Card>(join(stopsShort.dir, 'fernhill.tests.json'), (document) =>
    document.cards.splice(terminalCardIndex(document) - 1, 1)[0],
  );
  expect(removedBefore.ending).toBeUndefined();
  expect(removedBefore.command).toBe('south');
  failRun = runTestJson(stopsShort.dir);
}, 180_000);

afterAll(() => {
  withoutEndCard?.cleanup();
  stopsShort?.cleanup();
});

const mainLine = (run: TestRun) => commandResults(run).filter((result) => result.file === 'opening-iron-gates');

describe('END STATE cards prove their endings', () => {
  it('the main line ends at the gates with fernhill-saved, asserted from the engine\'s ending record', () => {
    const victory = commandResults(real).find((result) => result.ending === 'victory')!;
    expect(victory.file).toBe('opening-iron-gates');
    expect(victory.input).toBe('south');
    expect(victory.assertionResults).toContainEqual({ description: 'ending fernhill-saved', passed: true });
    expect(mainLine(real).at(-1)).toBe(victory);
  });

  it('the wait branch at the Folly ends with fuse-blast', () => {
    const defeat = commandResults(real).find((result) => result.ending === 'defeat')!;
    expect(defeat.file).toBe('folly · wait');
    expect(defeat.input).toBe('wait');
    expect(defeat.assertionResults).toContainEqual({ description: 'ending fuse-blast', passed: true });
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
    expect(failed[0].failure).toBe('Ending "fernhill-saved" not reached: the story did not end');
    expect(failed[0].assertionResults).toContainEqual({
      description: 'ending fernhill-saved',
      passed: false,
      message: 'Ending "fernhill-saved" not reached: the story did not end',
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
    expect(endings.unreached.map((ending) => ending.id)).toEqual(['fernhill-saved', 'dawn-comes']);
    expect(endings.unreached[0]).toEqual({ id: 'fernhill-saved', statement: 'win', line: 65, file: null });
    expect(gapRun.stderr).toContain('Endings reached: 1 / 3');
    expect(gapRun.stderr).toContain('  fernhill.story:65 · fernhill-saved (win)');
  });
});
