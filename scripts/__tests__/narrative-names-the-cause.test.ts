/**
 * narrative-names-the-cause.test.ts — a failed card says (UPPS finding F-15)
 * what is wrong and what to do, not only what the story printed.
 *
 * Two of room 1's seeded authoring mistakes run through the real CLI, each
 * on a scratch copy of the test story `orchard` with the seed copied over
 * `orchard.story` (`test-stories/orchard/seeded/`): `T` (the bee smoker is
 * never placed, so the parser cannot see it) and `U` (the smoker is not
 * wearable, so the wearing action refuses it). The wire's `command-result`
 * must carry the cause the walker named from the turn's events and the
 * story's Reach findings, and the human report must print the same two
 * sentences under the failed line. The correct story `Z` carries none.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { REPO_ROOT, commandResults, runTestJson, spawnCli, type TestRun } from './support/story-run';
import { copyStoryToScratch, type ScratchStory } from './support/scratch-story';

const ORCHARD_DIR = join(REPO_ROOT, 'test-stories', 'orchard');

/** A scratch orchard project with one seeded copy of the story written over `orchard.story`. */
function seededOrchard(letter: string): ScratchStory {
  const scratch = copyStoryToScratch(ORCHARD_DIR, `narrative-cause-${letter}-`);
  copyFileSync(join(scratch.dir, 'seeded', `orchard-${letter}.story`), join(scratch.dir, 'orchard.story'));
  return scratch;
}

let unplaced: ScratchStory;
let notWearable: ScratchStory;
let correct: ScratchStory;
let unplacedRun: TestRun;
let notWearableRun: TestRun;
let correctRun: TestRun;

beforeAll(() => {
  unplaced = seededOrchard('T');
  notWearable = seededOrchard('U');
  correct = seededOrchard('Z');
  unplacedRun = runTestJson(unplaced.dir);
  notWearableRun = runTestJson(notWearable.dir);
  correctRun = runTestJson(correct.dir);
}, 180_000);

afterAll(() => {
  unplaced?.cleanup();
  notWearable?.cleanup();
  correct?.cleanup();
});

const failedCards = (run: TestRun) => commandResults(run).filter((result) => !result.passed && !result.skipped);

describe('seed T — the smoker is never placed', () => {
  it('the one failed card is "wear smoker", and the wire names the smoker as placed nowhere, with the fix', () => {
    const failed = failedCards(unplacedRun);
    expect(failed.map((result) => result.input)).toEqual(['wear smoker']);
    expect(failed[0].actualOutput).toBe("You can't see any such thing.");
    expect(failed[0].cause).toEqual({
      kind: 'placed-nowhere',
      entity: 'bee-smoker',
      name: 'bee smoker',
      word: 'smoker',
      says: '"smoker" is the bee smoker, which is placed nowhere and never moved into play.',
      fix: 'Give it a place (in the Press House) or move it into play.',
    });
    expect(unplacedRun.status).toBe(1);
  });

  it('the human report prints the two sentences under the failed line', () => {
    const report = spawnCli(['test', unplaced.dir]);
    expect(report.status).toBe(1);
    const lines = report.stdout.split('\n');
    const failedLine = lines.findIndex((line) => line.startsWith('✗ opening-gate'));
    expect(failedLine).toBeGreaterThan(-1);
    expect(lines[failedLine + 1]).toBe('  "smoker" is the bee smoker, which is placed nowhere and never moved into play.');
    expect(lines[failedLine + 2]).toBe('  Give it a place (in the Press House) or move it into play.');
  });
});

describe('seed U — the smoker is not wearable', () => {
  it('the one failed card is "wear smoker", and the wire names the missing trait, with the fix', () => {
    const failed = failedCards(notWearableRun);
    expect(failed.map((result) => result.input)).toEqual(['wear smoker']);
    expect(failed[0].actualOutput).toBe("You can't wear the bee smoker.");
    expect(failed[0].cause).toEqual({
      kind: 'not-wearable',
      entity: 'bee-smoker',
      name: 'bee smoker',
      word: 'smoker',
      says: '"smoker" is the bee smoker, which is not declared wearable.',
      fix: 'Add wearable to the bee smoker.',
    });
    expect(notWearableRun.status).toBe(1);
  });
});

describe('seed Z — the correct story', () => {
  it('no card fails and no card carries a cause', () => {
    expect(failedCards(correctRun)).toEqual([]);
    expect(commandResults(correctRun).every((result) => result.cause === undefined)).toBe(true);
    expect(correctRun.status).toBe(0);
  });
});
