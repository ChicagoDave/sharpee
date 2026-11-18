/**
 * make-story-artifacts.test.ts — the artifact generator's opening, on the real
 * path: the real `scripts/make-story-artifacts.mjs` driving the built bundle
 * over the test story `quay`.
 *
 * What it pins: the generator types no `look` to see the first room. The
 * run's own opening (the engine's routine) is where the room comes from, the
 * tests document opens with one `opening` card that asserts it, and the
 * walkthrough prints the opening above the first command.
 *
 * Needs the bundle (`./repokit build dungeo`).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'make-story-artifacts.mjs');

interface Card { type: string; command?: string; assertions: { contains?: string[] } }

let scratch: string;
let cards: Card[];
let walkthrough: string;

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'make-story-artifacts-'));
  const recipe = join(scratch, 'recipe.json');
  writeFileSync(recipe, JSON.stringify({
    story: 'test-stories/quay/quay.story',
    id: 'quay',
    title: 'The Quay',
    seed: 42,
    spine: ['take key', 'wait'],
  }));
  const testsOut = join(scratch, 'quay.tests.json');
  const walkOut = join(scratch, 'WALKTHROUGH.txt');
  const result = spawnSync('node', [script, recipe, '--tests-out', testsOut, '--walkthrough-out', walkOut], { encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  cards = (JSON.parse(readFileSync(testsOut, 'utf8')) as { cards: Card[] }).cards;
  walkthrough = readFileSync(walkOut, 'utf8');
}, 60_000);

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('make-story-artifacts — the opening is the run\'s own', () => {
  it('the tests document opens with one opening card asserting the first room, and types no look', () => {
    expect(cards.map((card) => [card.type, card.command])).toEqual([
      ['opening', undefined],
      ['turn', 'take key'],
      ['turn', 'wait'],
    ]);
    // The room heading, read from the opening after the banner's `By …` line.
    expect(cards[0].assertions.contains?.[0]).toBe('Quay');
    expect(cards[0].assertions.contains?.join('\n')).not.toContain('By Test Story');
    // Each turn asserts its own reply, not the opening's room.
    expect(cards[1].assertions.contains?.[0]).toBe('Taken.');
  });

  it('the walkthrough prints the prologue, banner and first room above the first command, with no look typed', () => {
    const firstCommand = walkthrough.indexOf('> take key');
    expect(firstCommand).toBeGreaterThan(-1);
    const opening = walkthrough.slice(0, firstCommand);
    expect(opening).toContain('The last ferry left an hour ago, and someone has to light the lamp.');
    expect(opening).toContain('By Test Story');
    expect(opening).toContain('You have not stood here since you were a child');
    expect(walkthrough).not.toContain('> look');
    expect(walkthrough).not.toContain('Seed: 42');
  });
});
