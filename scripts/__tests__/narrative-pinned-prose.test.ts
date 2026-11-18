/**
 * narrative-pinned-prose.test.ts — beat 2 of the author narrative
 * ("Pinning the prose"): a turn becomes a card whose claims the author never
 * typed, and the CLI evaluates exactly those claims. The test tree is read
 * from its segments as recorded; the verdicts come from a real
 * `sharpee test --json` run of the test story `orchard`, matched card to command-result.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { STORY_TREE, commandResults, lineLabel, runOrchardTest, type TestRun } from './support/story-run';
import { readTree } from './support/scratch-story';

interface Card { type: 'opening' | 'turn'; command?: string; assertions: { contains?: string[]; channels?: Array<{ id: string; is: string }> } }
interface TreeDocument { version: number; seed: number; story: string; cards: Card[] }

let tree: TreeDocument;
let run: TestRun;

beforeAll(() => {
  // The beats below read the recorded cards, so an empty tree must fail here
  // rather than let each beat pass vacuously.
  tree = readTree(STORY_TREE) as unknown as TreeDocument;
  expect(tree.cards.length).toBeGreaterThan(2);
  run = runOrchardTest();
}, 60_000);

/** The main line's command-results, in order — the line the tree's own cards are. */
function mainLine() {
  return commandResults(run).filter((result) => lineLabel(run, result.file) === 'opening-gate');
}

describe('the opening card pins the room name and its description', () => {
  it('the tree\'s one opening card carries "Gate" and the opening paragraph, and the CLI passed both as its first row', () => {
    const opening = tree.cards[0];
    expect(opening.type).toBe('opening');
    // The opening is one card: no card stands between it and the first move.
    expect(tree.cards.filter((card) => card.type === 'opening')).toHaveLength(1);
    expect(opening.assertions.contains?.[0]).toBe('Gate');
    expect(opening.assertions.contains?.[1]).toMatch(/^The orchard gate stands open on the lane/);

    // The opening's row comes first, is no turn, and nothing was typed for it.
    const [row] = mainLine();
    expect(row.input).toBe('(opening)');
    expect(row.turn).toBeUndefined();
    expect(mainLine().some((result) => result.input === 'look' && result.turn === 1)).toBe(false);
    expect(row.passed).toBe(true);
    expect(row.assertionResults?.map((verdict) => verdict.description)).toEqual(
      opening.assertions.contains!.map((text) => `contains "${text}"`),
    );
    expect(row.assertionResults?.every((verdict) => verdict.passed)).toBe(true);
  });
});

describe('the first move becomes a card', () => {
  it('the Rows card carries the room name the default policy pinned, and the CLI evaluated exactly that, as turn 1', () => {
    const card = tree.cards[1];
    expect(card.type).toBe('turn');
    expect(card.command).toBe('north');
    expect(card.assertions.contains).toEqual(['Rows']);

    const north = mainLine().find((result) => result.turn === 1);
    expect(north?.input).toBe('north');
    expect(north?.passed).toBe(true);
    expect(north?.assertionResults).toEqual([{ description: 'contains "Rows"', passed: true }]);
  });

  it('the whole main line passes: every card\'s claims, one verdict each', () => {
    const results = mainLine();
    expect(results.length).toBeGreaterThan(10);
    expect(results.every((result) => result.passed)).toBe(true);
    const verdicts = results.flatMap((result) => result.assertionResults ?? []);
    expect(verdicts.length).toBeGreaterThan(results.length);
    expect(verdicts.every((verdict) => verdict.passed)).toBe(true);
  });
});
