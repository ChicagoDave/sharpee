/**
 * claim-broken.test.ts — the breaking edit, demonstrated (ADR-367 D6, AC-4;
 * GH #584, #585): a story edit that breaks a locked claim makes `sharpee
 * test` fail the pinned card by the claim's name, print the story's output
 * under the cite, exit 1, and report the claim as not reached by any line;
 * while an edit that leaves every card green and a claim unproven by walk
 * exits 0, because a claim's own verdict moves nothing (ADR-365 D9). Each
 * case runs the real command functions over a real scratch project — the
 * compiled `@sharpee/chord` and `@sharpee/branch-tester` with the engine
 * behind them, no stub. The UPPS and Fernhill cases are the REAL-PATH tests
 * on the repository's own stories at their pinned seeds.
 *
 * Owner context: devkit test suite.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { segmentTree, type TreeDocument } from '@sharpee/branch-tester';
import { runClaimCommand } from '../src/commands/claim.js';
import { runTestCommand } from '../src/commands/test.js';

const FIXTURE = path.resolve(__dirname, 'fixtures', 'claims-tier');
const FRAGMENT = 'claims-tier.claims.chord';
const STORIES = path.resolve(__dirname, '..', '..', '..', 'branch-stories');
const UPPS = path.join(STORIES, 'upps');
const FERNHILL = path.join(STORIES, 'fernhill');

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A scratch copy of a project directory, removed after the suite. */
function copyOf(source: string, prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  scratch.push(dir);
  cpSync(source, dir, { recursive: true });
  return dir;
}

/** Edit one file in place by exact replacement; the anchor must be there exactly once. */
function edit(file: string, anchor: string, replacement: string): void {
  const text = readFileSync(file, 'utf8');
  const first = text.indexOf(anchor);
  if (first === -1 || text.indexOf(anchor, first + 1) !== -1) throw new Error(`anchor not found exactly once in ${file}: ${anchor}`);
  writeFileSync(file, text.replace(anchor, replacement));
}

/**
 * A scratch claims-tier project with no fragment and a tree of one line:
 * opening, boot, `read note` (turn 1), `north` (turn 2), written by the
 * tree's own writer so the canonical gate passes.
 */
function tierProject(): string {
  const dir = copyOf(FIXTURE, 'sharpee-claim-broken-');
  rmSync(path.join(dir, FRAGMENT));
  const treeDir = path.join(dir, 'claims-tier.tests');
  rmSync(treeDir, { recursive: true, force: true });
  mkdirSync(treeDir);
  const document: TreeDocument = {
    version: 3,
    story: 'claims-tier',
    seed: 7,
    id: 'mainline',
    cards: [
      // The opening claims the first look's text, so the run has an opening row (GH #585's case).
      { id: 'card0000', type: 'opening', assertions: { contains: ['A bare hall.'] } },
      { id: 'card0001', type: 'boot', assertions: { states: ['the note is pinned'] } },
      { id: 'card0002', type: 'turn', command: 'read note', assertions: { contains: ['Back by dawn.'] } },
      { id: 'card0003', type: 'turn', command: 'north', assertions: { contains: ['landing'] } },
    ],
  };
  for (const [name, text] of Object.entries(segmentTree(document))) writeFileSync(path.join(treeDir, name), text);
  return dir;
}

async function run(fn: () => Promise<number>): Promise<{ code: number; stdout: string[]; stderr: string[] }> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await fn();
    return { code, stdout: log.mock.calls.map((call) => call.join(' ')), stderr: error.mock.calls.map((call) => call.join(' ')) };
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
}

/** Run with `--json`, capturing the NDJSON events stdout carries. */
async function runStreaming(args: string[]): Promise<{ code: number; events: Array<Record<string, unknown>>; stderr: string[] }> {
  const chunks: string[] = [];
  const write = vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const code = await runTestCommand([...args, '--json']);
    const events = chunks.join('').split('\n').filter((line) => line.trim().length > 0).map((line) => JSON.parse(line) as Record<string, unknown>);
    return { code, events, stderr: error.mock.calls.map((call) => call.join(' ')) };
  } finally {
    write.mockRestore();
    log.mockRestore();
    error.mockRestore();
  }
}

/**
 * The story edit that breaks only the lock: `north` from the Hall now leads
 * to a Gallery whose description still says "landing", so the card's own
 * text claim passes and the pinned room claim is the one thing that breaks.
 */
function breakTheLanding(dir: string): void {
  edit(
    path.join(dir, 'claims-tier.story'),
    'create the Hall\n  a room\n  north to the Landing\n',
    'create the Hall\n  a room\n  north to the Gallery\n',
  );
  // The Landing's own exit would otherwise imply `north` back to it from the Hall.
  edit(
    path.join(dir, 'claims-tier.story'),
    'create the Landing\n  a room\n  south to the Hall\n',
    'create the Landing\n  a room\n  south to the Hall, one-way\n',
  );
  writeFileSync(
    path.join(dir, 'claims-tier.story'),
    `${readFileSync(path.join(dir, 'claims-tier.story'), 'utf8')}\ncreate the Gallery\n  a room\n  south to the Hall\n\n  A gallery with a landing at one end.\n`,
  );
}

describe('a broken lock fails its card and the run (ADR-367 D6)', () => {
  it('names the claim and what is so instead, prints the story\'s output under it, exits 1, and the claims tier reports the claim unreached', async () => {
    const dir = tierProject();
    const locked = await run(() => runClaimCommand(['mainline', 'the player is in the Landing', dir]));
    expect(locked.code).toBe(0);
    const green = await run(() => runTestCommand([dir]));
    expect(green.code).toBe(0);
    expect(green.stdout).toContain('  lock "the player is in the Landing" at line mainline "opening-hall" at turn 2 — held there');

    breakTheLanding(dir);
    const { code, stdout } = await run(() => runTestCommand([dir]));
    expect(code).toBe(1);
    const cite = stdout.indexOf('✗ opening-hall — north: lock "the player is in the Landing" not held here: the player is in the Gallery');
    expect(cite).toBeGreaterThan(-1);
    // The story's words on that turn, indented under the cite (GH #584).
    expect(stdout[cite + 1]).toMatch(/^ {4}\S/);
    expect(stdout.slice(cite + 1, cite + 6).join('\n')).toContain('A gallery with a landing at one end.');
    expect(stdout).toContain('3 cards passing, 4 assertions passing, 1 card failing, 1 assertion failing');
    // The claims tier (D6): no line reaches the claim now, the walk is tried, nothing gates beyond the card.
    expect(stdout).toContain('UNPROVEN  the player is in the Landing — not reached by any line; no reachable state under its set satisfies it (the set of "the player is in the Landing")');
    expect(stdout).toContain('  lock "the player is in the Landing" at line mainline "opening-hall" at turn 2 — NOT held there: the player is in the Gallery');
  }, 120_000);

  it('on the wire the failed command-result names the card, carries the output and the lock\'s verdict (GH #584)', async () => {
    const dir = tierProject();
    await run(() => runClaimCommand(['mainline', 'the player is in the Landing', dir]));
    breakTheLanding(dir);
    const { code, events } = await runStreaming([dir]);
    expect(code).toBe(1);
    const north = events.find((event) => event.type === 'command-result' && event.cardId === 'card0003')!;
    expect(north).toBeDefined();
    expect(north.passed).toBe(false);
    expect(north.skipped).toBe(false);
    expect(north.failure).toBe('lock "the player is in the Landing" not held here: the player is in the Gallery');
    expect(String(north.actualOutput)).toContain('A gallery with a landing at one end.');
    expect(north.assertionResults).toEqual([
      { description: 'contains "landing"', passed: true },
      { description: 'lock "the player is in the Landing"', passed: false, message: 'lock "the player is in the Landing" not held here: the player is in the Gallery' },
    ]);
    const end = events.find((event) => event.type === 'run-end')!;
    expect(end.exitCode).toBe(1);
    // The claims tier's row for the same claim (D6): unreached, with the broken lock pointing at the card.
    const claim = events.find((event) => event.type === 'claim-result')!;
    expect(claim).toMatchObject({ name: 'the player is in the Landing', verdict: 'unproven', settledBy: 'exhaustion', floored: true });
    expect(claim.locks).toEqual([{ lineId: 'mainline', label: 'opening-hall', turn: 2, cardId: 'card0003', outcome: 'not-held', message: 'the player is in the Gallery' }]);
    expect(events.find((event) => event.type === 'claims-summary')).toMatchObject({ declared: 1, held: 0, unproven: 1 });
  }, 120_000);

  it('the opening row carries the banner and prologue it was checked against (GH #585)', async () => {
    const dir = tierProject();
    const { events } = await runStreaming([dir, '--capture-output']);
    const opening = events.find((event) => event.type === 'command-result' && event.cardId === 'card0000')!;
    expect(opening).toBeDefined();
    expect(String(opening.actualOutput)).toContain('A bare hall.');
  }, 120_000);
});

const describeUpps = existsSync(path.join(UPPS, 'upps.story')) ? describe : describe.skip;
describeUpps('AC-4 on UPPS — the drop lever no longer sends the shuttle', () => {
  it('`sharpee test` fails the pinned card naming the claim, shows the story\'s output, exits 1, and the claim is not reached by any line', async () => {
    const dir = copyOf(UPPS, 'sharpee-upps-broken-');
    edit(path.join(dir, 'upps.story'), '    phrase shuttle-rises when the drop shuttle is at the Kraken Landing\n    start the drop shuttle\n', '    phrase shuttle-rises when the drop shuttle is at the Kraken Landing\n');
    const { code, stdout } = await run(() => runTestCommand([dir]));
    expect(code).toBe(1);
    const cite = stdout.findIndex((row) => row.startsWith('✗ landing-pad · show card to quint — wait: '));
    expect(cite).toBeGreaterThan(-1);
    // The shuttle never arrives, so the wait card breaks first: the story's words on that turn sit under the
    // cite, and the lock card that breaks after it is named on its own row.
    const under = stdout.slice(cite + 1);
    const outputEnd = under.findIndex((row) => !row.startsWith('    '));
    expect(outputEnd).toBeGreaterThan(0);
    expect(under.slice(0, outputEnd).join('\n')).toContain('Time passes');
    expect(stdout).toContain('  exit: lock "the player is in the Kraken Landing" not held here: the player is in the Shuttle Gate');
    expect(stdout.find((row) => row.startsWith('UNPROVEN  the player is in the Kraken Landing — not reached by any line; the walk stopped at'))).toBeDefined();
    expect(stdout).toContain('  lock "the player is in the Kraken Landing" at line a366titn "landing-pad · show card to quint" at turn 160 — NOT held there: the player is in the Shuttle Gate');
  }, 600_000);
});

const describeFernhill = existsSync(path.join(FERNHILL, 'fernhill.story')) ? describe : describe.skip;
describeFernhill('AC-4 on Fernhill — a claim\'s own verdict moves nothing (ADR-365 D9)', () => {
  it('the auction notice moved out of reach: every card green, the claim UNPROVEN by walk, exit 0', async () => {
    const dir = copyOf(FERNHILL, 'sharpee-fernhill-unproven-');
    edit(path.join(dir, 'fernhill.story'), '  a thing, scenery, readable\n  in the Iron Gates\n', '  a thing, scenery, readable\n  in the Folly\n');
    const { code, stdout } = await run(() => runTestCommand([dir]));
    expect(code).toBe(0);
    expect(stdout.some((row) => row.startsWith('✗'))).toBe(false);
    expect(stdout).toContain('claims: 8 of 10 held, 1 violated, 1 unproven (seed 42)');
    expect(stdout).toContain('UNPROVEN  the auction notice has been read — not reached by any line; no reachable state under its set satisfies it (the set of "the auction notice has been read")');
    expect(stdout).toContain('  lock "the deed box is open" at line hpjuaufx "folly · open deed box with locket" at turn 22 — held there');
  }, 600_000);
});
