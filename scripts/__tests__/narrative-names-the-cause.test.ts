/**
 * narrative-names-the-cause.test.ts — UPPS finding F-15: a failed card says
 * what is wrong and what to do, not only what the story printed.
 *
 * Two of room 1's seeded authoring mistakes run through the real CLI, each
 * on a scratch copy of the UPPS project with the seed copied over
 * `upps.story` the way the Testing tab checks were done: `T` (the satchel is
 * never placed, so the parser cannot see it) and `U` (the satchel is not
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
import { REPO_ROOT, commandResults, runTestJson, spawnCli, type TestRun } from './support/fernhill-run';
import { copyStoryToScratch, type ScratchStory } from './support/scratch-story';

const UPPS_DIR = join(REPO_ROOT, 'branch-stories', 'upps');

/** A scratch UPPS project with one seeded room-1 file copied over `upps.story`. */
function seededUpps(letter: string): ScratchStory {
  const scratch = copyStoryToScratch(UPPS_DIR, `narrative-cause-${letter}-`);
  copyFileSync(join(scratch.dir, 'seeded', 'room-01', `TEST-001-${letter}.story`), join(scratch.dir, 'upps.story'));
  return scratch;
}

let unplaced: ScratchStory;
let notWearable: ScratchStory;
let correct: ScratchStory;
let unplacedRun: TestRun;
let notWearableRun: TestRun;
let correctRun: TestRun;

beforeAll(() => {
  unplaced = seededUpps('T');
  notWearable = seededUpps('U');
  correct = seededUpps('Z');
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

describe('seed T — the satchel is never placed', () => {
  it('the one failed card is "wear satchel", and the wire names the satchel as placed nowhere, with the fix', () => {
    const failed = failedCards(unplacedRun);
    expect(failed.map((result) => result.input)).toEqual(['wear satchel']);
    expect(failed[0].actualOutput).toBe("You can't see any such thing.");
    expect(failed[0].cause).toEqual({
      kind: 'placed-nowhere',
      entity: 'mail-satchel',
      name: 'mail satchel',
      word: 'satchel',
      says: '"satchel" is the mail satchel, which is placed nowhere and never moved into play.',
      fix: 'Give it a place (in the Sorting Room) or move it into play.',
    });
    expect(unplacedRun.status).toBe(1);
  });

  it('the human report prints the two sentences under the failed line', () => {
    const report = spawnCli(['test', unplaced.dir]);
    expect(report.status).toBe(1);
    const lines = report.stdout.split('\n');
    const failedLine = lines.findIndex((line) => line.startsWith('✗ opening-sorting-room'));
    expect(failedLine).toBeGreaterThan(-1);
    expect(lines[failedLine + 1]).toBe('  "satchel" is the mail satchel, which is placed nowhere and never moved into play.');
    expect(lines[failedLine + 2]).toBe('  Give it a place (in the Sorting Room) or move it into play.');
  });
});

describe('seed U — the satchel is not wearable', () => {
  it('the one failed card is "wear satchel", and the wire names the missing trait, with the fix', () => {
    const failed = failedCards(notWearableRun);
    expect(failed.map((result) => result.input)).toEqual(['wear satchel']);
    expect(failed[0].actualOutput).toBe("You can't wear the mail satchel.");
    expect(failed[0].cause).toEqual({
      kind: 'not-wearable',
      entity: 'mail-satchel',
      name: 'mail satchel',
      word: 'satchel',
      says: '"satchel" is the mail satchel, which is not declared wearable.',
      fix: 'Add wearable to the mail satchel.',
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
