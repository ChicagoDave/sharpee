/**
 * lock-failed-card.test.ts — a broken lock is a failed card (ADR-367 D6;
 * AC-4's harness half), on the claim-bits fixture against a REAL tree run:
 * the floor hands the walker each lock's verdict at its card, the walker
 * merges it into the card's result as a `lock-assert`, a lock that does not
 * hold fails the card in the claim's own words, the line fails, the CLI
 * report names the lock and prints the story's output under the cite, and
 * the claims report says which pin broke. Also pins what a miss is called
 * for every predicate kind, and that the opening row carries its output
 * (GH #585).
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
import { claimNamesOf, clauseKeysByFiredOf, describeClaimMiss, entityIdByIrOf } from '../src/claims/claim-predicates.js';
import { normalizeClaimSet } from '../src/claims/claim-set.js';
import { readWorldSnapshot, type ClaimsWorld } from '../src/claims/claims-game.js';
import { claimHeadline, claimResultRowOf, claimSentence, claimsRatioLine, claimsSummaryRowOf } from '../src/claims/claim-report.js';
import { formatClaimsRun, runClaims } from '../src/claims/claims-runner.js';
import type { ClaimsGame } from '../src/claims/claims-game.js';
import { emptyTreeDocument, type TreeDocument } from '../src/tree-document.js';
import { formatTreeDocumentRun, runTreeDocument, type TreeWalkerGame } from '../src/tree-walker.js';

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
      { name: 'the note is in the Landing', placement: { thing: 'note', in: 'landing' } },
    ],
  },
  'locks.json',
);

/**
 * Main line: opening (claims the hall), boot, `read note` (turn 1, locks the
 * flag — held), `north` (turn 2, locks the room — held). A branch at `read
 * note`: `north` (turn 2, locks the note's place — NOT held — and a name the
 * fragment lacks), then a skipped `south` (turn 3, locks the room — NOT
 * held: the player is back in the Hall).
 */
function tree(): TreeDocument {
  return {
    ...emptyTreeDocument('claim-bits-fixture', SEED, 'mainline'),
    cards: [
      { id: 'card0000', type: 'opening', assertions: { contains: ['Hall'] } },
      { id: 'card0001', type: 'boot', skip: true },
      {
        id: 'card0002', type: 'turn', command: 'read note', assertions: { contains: ['Back by dawn.'] }, locks: ['the note has been read'],
        continuation: 'contin00',
        branches: [{
          id: 'branch01',
          cards: [
            { id: 'card0010', type: 'turn', command: 'north', assertions: { contains: ['Landing'] }, locks: ['the note is in the Landing', 'no such claim'] },
            { id: 'card0011', type: 'turn', command: 'south', skip: true, locks: ['the Landing is reached'] },
            // A skipped card whose lock holds stays skipped (turn 4).
            { id: 'card0012', type: 'turn', command: 'look', skip: true, locks: ['the note has been read'] },
            // A card whose own claim fails beside a broken lock keeps its own failure (turn 5).
            { id: 'card0013', type: 'turn', command: 'north', assertions: { contains: ['nope'] }, locks: ['the note is in the Landing'] },
          ],
        }],
      },
      { id: 'card0003', type: 'turn', command: 'north', assertions: { contains: ['Landing'] }, locks: ['the Landing is reached'] },
    ],
  };
}

describe('a broken lock is a failed card (D6)', () => {
  it('a held lock is a passing lock-assert; a broken one fails the card in the claim\'s words, un-skipping a skipped card', async () => {
    const floor = createClaimFloor(IR, CLAIMS);
    const run = await runTreeDocument(tree(), loadGame, { lineObserver: { onCard: floor.onCard } });
    expect(run.lines.map((line) => [line.id, line.status])).toEqual([['mainline', 'passed'], ['branch01', 'failed']]);

    const main = run.lines[0].result!.commands;
    const readNote = main.find((row) => row.command.input === 'read note')!;
    expect(readNote.passed).toBe(true);
    expect(readNote.assertionResults.map((entry) => [entry.assertion.type, entry.assertion.value, entry.passed])).toEqual([
      ['ok-contains', 'Back by dawn.', true],
      ['lock-assert', 'the note has been read', true],
    ]);

    const branch = run.lines[1].result!.commands;
    const north = branch.find((row) => row.command.input === 'north')!;
    expect(north.passed).toBe(false);
    expect(north.skipped).toBe(false);
    expect(north.failure).toBe('lock "the note is in the Landing" not held here: the note is in the Hall');
    expect(north.assertionResults.map((entry) => [entry.assertion.type, entry.assertion.value, entry.passed, entry.message])).toEqual([
      ['ok-contains', 'Landing', true, undefined],
      ['lock-assert', 'the note is in the Landing', false, 'lock "the note is in the Landing" not held here: the note is in the Hall'],
      ['lock-assert', 'no such claim', false, 'lock "no such claim" not held here: the fragment declares no claim of that name'],
    ]);
    // The story's output stays on the failed card (GH #584): what the lock was checked beside.
    expect(north.actualOutput).toContain('Landing');

    const south = branch.find((row) => row.command.input === 'south')!;
    expect(south.skipped).toBe(false);
    expect(south.passed).toBe(false);
    expect(south.failure).toBe('lock "the Landing is reached" not held here: the player is in the Hall');

    // A held lock on a skipped card leaves it skipped and passing.
    const look = branch.find((row) => row.command.input === 'look')!;
    expect(look.skipped).toBe(true);
    expect(look.passed).toBe(true);
    expect(look.assertionResults.map((entry) => [entry.assertion.type, entry.passed])).toEqual([['skip', true], ['lock-assert', true]]);

    // A card whose own claim failed first keeps that failure; the lock is still recorded beside it.
    const northAgain = branch.filter((row) => row.command.input === 'north')[1];
    expect(northAgain.passed).toBe(false);
    expect(northAgain.failure).toContain('nope');
    expect(northAgain.failure?.startsWith('lock ')).toBe(false);
    expect(northAgain.assertionResults.map((entry) => [entry.assertion.type, entry.passed])).toEqual([['ok-contains', false], ['lock-assert', false]]);

    // The floor's own record carries the same sentences for the claims report.
    expect(floor.reading().locks.map((lock) => [lock.claim, lock.lineId, lock.turn, lock.outcome, lock.message])).toEqual([
      ['the note has been read', 'mainline', 1, 'held', undefined],
      ['the Landing is reached', 'mainline', 2, 'held', undefined],
      ['the note is in the Landing', 'branch01', 2, 'not-held', 'the note is in the Hall'],
      ['no such claim', 'branch01', 2, 'unknown-claim', 'the fragment declares no claim of that name'],
      ['the Landing is reached', 'branch01', 3, 'not-held', 'the player is in the Hall'],
      ['the note has been read', 'branch01', 4, 'held', undefined],
      ['the note is in the Landing', 'branch01', 5, 'not-held', 'the note is in the Hall'],
    ]);
  }, 60_000);

  it('the CLI report cites the lock, prints the story\'s output under it, and names every other broken lock on the line', async () => {
    const floor = createClaimFloor(IR, CLAIMS);
    const run = await runTreeDocument(tree(), loadGame, { lineObserver: { onCard: floor.onCard } });
    const rows = formatTreeDocumentRun(run);
    expect(rows[0]).toBe('✓ opening-hall');
    expect(rows[1]).toBe('✗ hall · north — north: lock "the note is in the Landing" not held here: the note is in the Hall');
    // The output of the `north` turn, indented four spaces, line by line.
    const output = rows.slice(2).filter((row) => row.startsWith('    '));
    expect(output.length).toBeGreaterThan(0);
    expect(output.join('\n')).toContain('Landing');
    expect(rows).toContain('  south: lock "the Landing is reached" not held here: the player is in the Hall');
    // The cited card's lock is not printed a second time as a lock row: only the later `north` (turn 5) gets one.
    expect(rows.filter((row) => row === '  north: lock "the note is in the Landing" not held here: the note is in the Hall')).toHaveLength(1);
    // The skipped `look` with its held lock prints nothing.
    expect(rows.some((row) => row.startsWith('  look:'))).toBe(false);
    // Main: opening, `read note`, `north` (five assertions, two of them locks). Branch: `north` fails two locks
    // beside its passing text claim; the un-skipped `south` fails its lock beside its skip marker; the skipped
    // `look` counts nowhere; the second `north` fails its text claim and its lock.
    expect(rows.find((row) => row.includes('cards passing'))).toBe('3 cards passing, 7 assertions passing, 3 cards failing, 5 assertions failing');
  }, 60_000);

  it('the claims report: held by another line with its broken pin named; a pin NOT held carries the miss', async () => {
    const floor = createClaimFloor(IR, CLAIMS);
    await runTreeDocument(tree(), loadGame, { lineObserver: { onCard: floor.onCard } });
    const result = await runClaims(IR, CLAIMS, loadGame, { seed: SEED, floor: floor.reading(), maxStates: 500, maxSeconds: 30, maxDepth: 20 });
    const report = formatClaimsRun(result);
    expect(report).toContain('HELD  the Landing is reached — by line mainline "opening-hall" at turn 2; its lock at line branch01 "hall · north" turn 3 is NOT held there');
    expect(report).toContain('HELD  the note has been read — by line mainline "opening-hall" at turn 1');
    expect(report).toContain('UNPROVEN  the note is in the Landing — not reached by any line; no reachable state under its set satisfies it');
    expect(report).toContain('  lock "the note is in the Landing" at line branch01 "hall · north" at turn 2 — NOT held there: the note is in the Hall');
    expect(report).toContain('  lock "the Landing is reached" at line branch01 "hall · north" at turn 3 — NOT held there: the player is in the Hall');
    expect(report).toContain('  lock "the note is in the Landing" at line branch01 "hall · north" at turn 5 — NOT held there: the note is in the Hall');
    // Verdicts never gate (ADR-365 D9): the broken pins change no verdict count.
    expect([result.held, result.violated, result.unproven]).toEqual([2, 0, 1]);

    // The wire's rows (D6): each claim with every lock the run checked on it, and the report reads them back.
    const rows = result.claims.map((claim) => claimResultRowOf(claim, result));
    expect(rows.map((row) => [row.name, row.verdict, row.settledBy, row.floored, row.locks?.map((pin) => [pin.lineId, pin.turn, pin.cardId, pin.outcome])])).toEqual([
      ['the note has been read', 'held', 'line', true, [['mainline', 1, 'card0002', 'held'], ['branch01', 4, 'card0012', 'held']]],
      ['the Landing is reached', 'held', 'line', true, [['mainline', 2, 'card0003', 'held'], ['branch01', 3, 'card0011', 'not-held']]],
      ['the note is in the Landing', 'unproven', 'exhaustion', true, [['branch01', 2, 'card0010', 'not-held'], ['branch01', 5, 'card0013', 'not-held']]],
    ]);
    expect(rows[2].locks?.[0].message).toBe('the note is in the Hall');
    for (const row of rows) expect(report).toContain(`${claimHeadline(row)} — ${claimSentence(row)}`);
    expect(claimsRatioLine(claimsSummaryRowOf(result))).toBe('claims: 2 of 3 held, 1 unproven (seed 1209)');
  }, 60_000);

  it('the opening row carries the output its claims read (GH #585)', async () => {
    const run = await runTreeDocument(tree(), loadGame, {});
    const opening = run.lines[0].result!.commands[0];
    expect(opening.command.input).toBe('(opening)');
    expect(opening.passed).toBe(true);
    expect(opening.actualOutput).toContain('A bare hall.');
  }, 60_000);
});

describe('what a miss is called, per predicate kind (D6)', () => {
  it('names the state reached in the lock\'s vocabulary, at boot of the fixture', async () => {
    const game = await loadGame();
    const world = game.world as ClaimsWorld;
    const ctx = { world, snapshot: readWorldSnapshot(world), events: [], entityIdByIr: entityIdByIrOf(world), clauseKeysByFired: clauseKeysByFiredOf(IR) };
    const names = claimNamesOf(IR);
    const set = normalizeClaimSet(
      {
        rooms: ['hall', 'landing'],
        things: ['note'],
        verbs: ['read'],
        claims: [
          { name: 'room', room: 'landing' },
          { name: 'flag', flag: { thing: 'note', trait: 'readable', field: 'hasBeenRead' } },
          { name: 'in', placement: { thing: 'note', in: 'landing' } },
          { name: 'carried', placement: { thing: 'note', in: 'player' } },
          { name: 'notIn', never: true, placement: { thing: 'note', notIn: 'hall' } },
          { name: 'ending', ending: {} },
          { name: 'fired', fired: 'note.reading' },
          { name: 'event', event: { type: 'if.event.read' } },
          { name: 'state', state: { entity: 'story', value: 'x' } },
          { name: 'entity-state', state: { entity: 'note', value: 'loose' } },
        ],
      },
      'miss.json',
    );
    expect(set.claims.map((claim) => describeClaimMiss(claim, ctx, names))).toEqual([
      'the player is in the Hall',
      'the note is unread',
      'the note is in the Hall',
      'the player does not have the note; it is in the Hall',
      'the note is in the Hall',
      'the story has not ended',
      'the note has not been read',
      'no if.event.read event this turn',
      'the story has no state',
      'the note has no state',
    ]);
  }, 60_000);
});
