/**
 * tree-end-state.test.ts — END STATE cards against the REAL platform
 * (ADR-356 D4, AC-6): the fixture is compiled by `@sharpee/chord`, loaded by
 * `@sharpee/story-loader`, assembled by `@sharpee/bootstrap`, and every card
 * runs through the real parser and engine. The ending claim reads the
 * world's Ending record after the replay — a replay that did not end cannot
 * satisfy it, and a truncated line fails naming the ending.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { emptyTreeDocument, type TreeCard, type TreeDocument } from '../src/tree-document.js';
import { runTreeDocument, type TreeWalkerGame } from '../src/tree-walker.js';

const SEED = 7;
const source = readFileSync(resolve(__dirname, 'fixtures/end-state/end-state.story'), 'utf8');

function compiled() {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}

/** Boots one fresh real game at the pinned seed, the way `sharpee test` does. */
async function loadGame(): Promise<TreeWalkerGame> {
  const story = createStory(compiled(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compiled(), { seed: SEED }) }) as unknown as TreeWalkerGame;
}

/** Cards run and assert only what the test is about: the ending. */
const skip = (command: string, extra?: Partial<TreeCard>): TreeCard => ({ type: 'turn', command, skip: true, ...extra });
const doc = (cards: TreeCard[]): TreeDocument => ({
  ...emptyTreeDocument('end-state', SEED),
  cards: [{ type: 'opening' }, { type: 'boot', skip: true }, ...cards],
});

describe('AC-6 — an END STATE card proves its ending on a real replay', () => {
  it('a win declared by its phrase key passes', async () => {
    const run = await runTreeDocument(doc([skip('look'), skip('examine the box', { ending: 'box-opened' })]), loadGame);
    expect(run.defects).toEqual([]);
    expect(run.lines.map((l) => l.status)).toEqual(['passed']);
    const last = run.lines[0].result!.commands.at(-1)!;
    expect(last.ending).toBe('victory');
    expect(last.assertionResults).toEqual([{ assertion: { type: 'ending-assert', endingId: 'box-opened' }, passed: true }]);
    // D5's contributions, read off the real world: the ending proved and the rooms walked.
    expect(run.endingsReached).toEqual(['box-opened']);
    expect(run.roomsEntered).toEqual(['hall']);
  }, 30_000);

  it('a kill declared by its phrase key passes', async () => {
    const run = await runTreeDocument(doc([skip('touch the beam', { ending: 'cave-in' })]), loadGame);
    expect(run.lines.map((l) => l.status)).toEqual(['passed']);
    expect(run.lines[0].result!.commands.at(-1)!.ending).toBe('defeat');
  }, 30_000);

  it('the line with the winning card removed fails naming the ending', async () => {
    const run = await runTreeDocument(doc([skip('look', { ending: 'box-opened' })]), loadGame);
    expect(run.lines.map((l) => l.status)).toEqual(['failed']);
    expect(run.lines[0].result!.commands.at(-1)!.failure).toBe(
      'Ending "box-opened" not reached: the story did not end',
    );
    expect(run.endingsReached).toEqual([]);
  }, 30_000);

  it('a card declaring the wrong ending fails naming what the story did instead', async () => {
    const run = await runTreeDocument(doc([skip('touch the beam', { ending: 'box-opened' })]), loadGame);
    expect(run.lines.map((l) => l.status)).toEqual(['failed']);
    expect(run.lines[0].result!.commands.at(-1)!.failure).toBe(
      'Ending "box-opened" not reached: the story ended with defeat (cave-in)',
    );
  }, 30_000);

  it('a card after an END STATE card is MALFORMED — reported, nothing runs', async () => {
    let boots = 0;
    const counting = async () => { boots += 1; return loadGame(); };
    const run = await runTreeDocument(doc([skip('examine the box', { ending: 'box-opened' }), skip('look')]), counting);
    expect(run.defects.map((d) => d.path)).toEqual(['cards[3]']);
    expect(run.lines).toEqual([]);
    expect(boots).toBe(0);
  }, 30_000);
});
