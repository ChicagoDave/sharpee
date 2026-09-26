/**
 * narrative-pinned-prose.test.ts — beat 2 of the author narrative
 * ("Pinning the prose"): a turn becomes a card whose claims the author never
 * typed, and the CLI evaluates exactly those claims. The tree document is
 * read as the static file it is; the verdicts come from a real
 * `sharpee test --json` run of fernhill, matched card to command-result.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { FERNHILL_TREE, commandResults, runFernhillTest, type TestRun } from './support/fernhill-run';

interface Card { type: 'opening' | 'boot' | 'turn'; command?: string; assertions: { contains?: string[]; channels?: Array<{ id: string; is: string }> } }
interface TreeDocument { version: number; seed: number; story: string; cards: Card[] }

let tree: TreeDocument;
let run: TestRun;

beforeAll(() => {
  tree = JSON.parse(readFileSync(FERNHILL_TREE, 'utf-8')) as TreeDocument;
  run = runFernhillTest();
}, 60_000);

/** The main line's command-results, in order — the line the tree's own cards are. */
function mainLine() {
  return commandResults(run).filter((result) => result.file === 'opening-iron-gates');
}

describe('the boot card pins the room name and its description', () => {
  it('the tree\'s boot card carries "Iron Gates" and the opening paragraph, and the CLI passed both', () => {
    const boot = tree.cards[1];
    expect(boot.type).toBe('boot');
    expect(boot.assertions.contains?.[0]).toBe('Iron Gates');
    expect(boot.assertions.contains?.[1]).toMatch(/^The cab is already grinding away down the lane/);

    const look = mainLine().find((result) => result.turn === 1);
    expect(look?.input).toBe('look');
    expect(look?.passed).toBe(true);
    expect(look?.assertionResults?.map((verdict) => verdict.description)).toEqual(
      boot.assertions.contains!.map((text) => `contains "${text}"`),
    );
    expect(look?.assertionResults?.every((verdict) => verdict.passed)).toBe(true);
  });
});

describe('the first move becomes a card', () => {
  it('the Gravel Drive card carries the room name the default policy pinned, and the CLI evaluated exactly that', () => {
    const card = tree.cards[2];
    expect(card.type).toBe('turn');
    expect(card.command).toBe('north');
    expect(card.assertions.contains).toEqual(['Gravel Drive']);

    const north = mainLine().find((result) => result.turn === 2);
    expect(north?.input).toBe('north');
    expect(north?.passed).toBe(true);
    expect(north?.assertionResults).toEqual([{ description: 'contains "Gravel Drive"', passed: true }]);
  });

  it('the whole main line passes: every card\'s claims, one verdict each', () => {
    const results = mainLine();
    expect(results.length).toBeGreaterThan(20);
    expect(results.every((result) => result.passed)).toBe(true);
    const verdicts = results.flatMap((result) => result.assertionResults ?? []);
    expect(verdicts.length).toBeGreaterThan(results.length);
    expect(verdicts.every((verdict) => verdict.passed)).toBe(true);
  });
});
