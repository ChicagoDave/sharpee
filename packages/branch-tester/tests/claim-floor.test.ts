/**
 * claim-floor.test.ts — every line is a proof, and a lock is checked at its
 * card (ADR-367 D5; AC-3, AC-3a), on the claim-bits fixture against a REAL
 * tree run: `runTreeDocument` replays the lines through the real engine and
 * the floor reads the world after each card. Then the claims runner folds
 * the reading in: a claim a line reached is held by that line with no walk,
 * a `never` is walked as always, and the report says which.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';
import { assembleGame } from '@sharpee/bootstrap';
import { createClaimFloor } from '../src/claims/claim-floor.js';
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { formatClaimsRun, runClaims } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';
import { emptyTreeDocument, type TreeCard, type TreeDocument } from '../src/tree-document.js';
import { runTreeDocument, type TreeWalkerGame } from '../src/tree-walker.js';

const SEED = 1209;
const SOURCE = readFileSync(resolve(__dirname, 'fixtures/claims/claim-bits-fixture.story'), 'utf8');

function compileFixture(): StoryIR {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  return result.ir;
}
const IR = compileFixture();

async function loadGame(): Promise<TreeWalkerGame & ClaimsGame> {
  const story = createStory(compileFixture(), { seed: SEED });
  return assembleGame(story, { seed: SEED, freshStory: () => createStory(compileFixture(), { seed: SEED }) }) as unknown as TreeWalkerGame & ClaimsGame;
}

const CLAIMS = normalizeClaimSet(
  {
    rooms: ['hall', 'landing'],
    things: ['note'],
    verbs: ['read'],
    claims: [
      { name: 'the note has been read', flag: { thing: 'note', trait: 'readable', field: 'hasBeenRead' } },
      { name: 'the Landing is reached', room: 'landing' },
      { name: 'the note leaves the Hall', never: true, placement: { thing: 'note', notIn: 'hall' } },
      { name: 'the note is in the Landing', placement: { thing: 'note', in: 'landing' } },
    ],
  },
  'floor.json',
);

const skip = (command: string, extra?: Partial<TreeCard>): TreeCard => ({ type: 'turn', command, skip: true, ...extra });

/** Main line: boot, `north` (1), `south` (2); a branch at `north`: `read note`?? no — the note is in the Hall, so the branch reads it after `south`. */
function tree(locks?: Partial<Record<'mainNorth' | 'branchRead', string[]>>): TreeDocument {
  return {
    ...emptyTreeDocument('claim-bits-fixture', SEED, 'mainline'),
    cards: [
      { id: 'card0000', type: 'opening' },
      { id: 'card0001', type: 'boot', skip: true },
      {
        ...skip('north', { id: 'card0002', ...(locks?.mainNorth ? { locks: locks.mainNorth } : {}) }),
        continuation: 'contin00',
        branches: [{ id: 'branch01', cards: [skip('south', { id: 'card0010' }), skip('read note', { id: 'card0011', ...(locks?.branchRead ? { locks: locks.branchRead } : {}) })] }],
      },
      skip('south', { id: 'card0003' }),
    ],
  };
}

describe('the floor over a real tree run (D5)', () => {
  it('records the first line and turn that reaches each positive claim, and never a `never`', async () => {
    const floor = createClaimFloor(IR, CLAIMS);
    const run = await runTreeDocument(tree(), loadGame, { lineObserver: { onCard: floor.onCard } });
    expect(run.lines.map((line) => line.status)).toEqual(['passed', 'passed']);
    const reading = floor.reading();
    expect([...reading.reached.entries()].map(([index, reach]) => [CLAIMS.claims[index].name, reach.lineId, reach.turn, reach.cardId])).toEqual([
      ['the Landing is reached', 'mainline', 1, 'card0002'],
      ['the note has been read', 'branch01', 3, 'card0011'],
    ]);
    expect(reading.locks).toEqual([]);
  }, 60_000);

  it('checks a lock at its card: held, not held, and a name the fragment lacks', async () => {
    const floor = createClaimFloor(IR, CLAIMS);
    await runTreeDocument(tree({ mainNorth: ['the Landing is reached', 'the note has been read', 'no such claim'], branchRead: ['the note has been read'] }), loadGame, {
      lineObserver: { onCard: floor.onCard },
    });
    expect(floor.reading().locks.map((lock) => [lock.claim, lock.lineId, lock.turn, lock.outcome])).toEqual([
      ['the Landing is reached', 'mainline', 1, 'held'],
      ['the note has been read', 'mainline', 1, 'not-held'],
      ['no such claim', 'mainline', 1, 'unknown-claim'],
      ['the note has been read', 'branch01', 3, 'held'],
    ]);
  }, 60_000);
});

describe('the runner under a floor', () => {
  it('a reached claim is held by its line with no walk; the rest are walked, the `never` always', async () => {
    const floor = createClaimFloor(IR, CLAIMS);
    await runTreeDocument(tree({ mainNorth: ['the Landing is reached'] }), loadGame, { lineObserver: { onCard: floor.onCard } });
    const result = await runClaims(IR, CLAIMS, loadGame, { seed: SEED, floor: floor.reading(), maxStates: 500, maxSeconds: 30, maxDepth: 20 });
    expect(result.floored).toBe(true);
    expect(result.claims.map((claim) => [claim.name, claim.verdict, claim.settledBy])).toEqual([
      ['the note has been read', 'held', 'line'],
      ['the Landing is reached', 'held', 'line'],
      ['the note leaves the Hall', 'held', 'exhaustion'],
      ['the note is in the Landing', 'unproven', 'exhaustion'],
    ]);
    expect(result.claims[0].line).toEqual({ id: 'branch01', label: 'landing · south', turn: 3 });
    expect(result.held).toBe(3);
    // One walk, for the two claims no line reached, under the declared set.
    expect(result.walks).toHaveLength(1);
    expect(result.walks[0].claims.map((claim) => claim.name)).toEqual(['the note leaves the Hall', 'the note is in the Landing']);

    const report = formatClaimsRun(result);
    expect(report).toContain('HELD  the note has been read — by line branch01 "landing · south" at turn 3');
    expect(report).toContain('HELD  the Landing is reached — by line mainline "opening-hall" at turn 1');
    expect(report).toContain('UNPROVEN  the note is in the Landing — not reached by any line; no reachable state under its set satisfies it');
    expect(report).toContain('HELD  the note leaves the Hall (never) — every reachable state');
    expect(report).toContain('  lock "the Landing is reached" at line mainline "opening-hall" at turn 1 — held there');
  }, 60_000);

  it('AC-3a: a claim beyond the walk\'s depth budget is still held by the line that reached it', async () => {
    const floor = createClaimFloor(IR, CLAIMS);
    await runTreeDocument(tree(), loadGame, { lineObserver: { onCard: floor.onCard } });
    // Depth 0: the walk cannot leave the root, so no walk could hold either positive claim.
    const result = await runClaims(IR, CLAIMS, loadGame, { seed: SEED, floor: floor.reading(), maxStates: 500, maxSeconds: 30, maxDepth: 0 });
    expect(result.claims.map((claim) => [claim.name, claim.verdict, claim.settledBy])).toEqual([
      ['the note has been read', 'held', 'line'],
      ['the Landing is reached', 'held', 'line'],
      ['the note leaves the Hall', 'unproven', 'budget'],
      ['the note is in the Landing', 'unproven', 'budget'],
    ]);
  }, 60_000);

  it('without a floor nothing changes: every claim is walked and the report keeps its old words', async () => {
    const result = await runClaims(IR, CLAIMS, loadGame, { seed: SEED, maxStates: 500, maxSeconds: 30, maxDepth: 20 });
    expect(result.floored).toBe(false);
    expect(result.locks).toEqual([]);
    expect(result.claims.map((claim) => claim.settledBy)).toEqual(['witness', 'witness', 'exhaustion', 'exhaustion']);
    expect(formatClaimsRun(result)).not.toContain('not reached by any line');
  }, 60_000);
});
