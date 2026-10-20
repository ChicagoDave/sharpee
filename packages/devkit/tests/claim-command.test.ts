/**
 * claim-command.test.ts — `sharpee claim` at the command surface (ADR-367
 * D1, D2, D4, D5, D7; AC-1, AC-5): the offer prints and writes nothing; a
 * lock on a project with no fragment creates it and the manifest key; a
 * second lock appends to the same block; the pin lands on the card through
 * the tree's writer; and the next `sharpee test` holds both claims by their
 * line with no walk. Each case runs the real command functions over a real
 * scratch project — the compiled `@sharpee/chord` and `@sharpee/branch-tester`
 * with the engine behind them, no stub.
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

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/**
 * A scratch copy of the claims-tier project with no fragment and a tree of
 * one line: opening, boot, `read note` (turn 1), `north` (turn 2), written
 * by the tree's own writer so the canonical gate passes.
 */
function project(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'sharpee-claim-'));
  scratch.push(dir);
  cpSync(FIXTURE, dir, { recursive: true });
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
      { id: 'card0000', type: 'opening', assertions: {} },
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

describe('sharpee claim — the offer (D1) writes nothing', () => {
  it('lists the facts true at the last card and not at boot, and leaves the project as it was', async () => {
    const dir = project();
    const before = readFileSync(path.join(dir, 'claims-tier.tests', 'mainline.json'), 'utf8');
    const { code, stdout } = await run(() => runClaimCommand(['mainline', dir]));
    expect(code).toBe(0);
    expect(stdout[0]).toBe('At turn 2 of line mainline "opening-hall", true now and not at boot:');
    expect(stdout.slice(1, 4)).toEqual(['  the player is in the Landing', '  the note is read', '  the note has been read']);
    expect(existsSync(path.join(dir, FRAGMENT))).toBe(false);
    expect(readFileSync(path.join(dir, 'claims-tier.tests', 'mainline.json'), 'utf8')).toBe(before);
  }, 60_000);

  it('a line that is not there exits 2 naming the lines', async () => {
    const dir = project();
    const { code, stderr } = await run(() => runClaimCommand(['nowhere0', dir]));
    expect(code).toBe(2);
    expect(stderr.join('\n')).toMatch(/no line "nowhere0"[\s\S]*mainline {2}read note/);
  }, 60_000);

  it('--propose prints the set and the block and writes nothing', async () => {
    const dir = project();
    const { code, stdout } = await run(() => runClaimCommand(['mainline', 'the player is in the Landing', '--propose', dir]));
    expect(code).toBe(0);
    expect(stdout).toContain('  needs rooms: the Hall, the Landing');
    expect(stdout).toContain('    (trimmed: the note — the claim cannot depend on them)');
    expect(stdout).toContain('Proposed block (not written):');
    expect(existsSync(path.join(dir, FRAGMENT))).toBe(false);
  }, 60_000);
});

describe('sharpee claim — the lock (D2, D4, D5) and the rerun (AC-1, AC-5)', () => {
  it('creates the fragment and the manifest key, pins the card, appends a second lock, and both hold by line on the next run', async () => {
    const dir = project();
    const first = await run(() => runClaimCommand(['mainline', 'the player is in the Landing', dir]));
    expect(first.code).toBe(0);
    expect(first.stdout).toContain('Locking at turn 2 of line mainline "opening-hall": the player is in the Landing');
    expect(first.stdout).toContain(`Written: created ${path.relative(process.cwd(), path.join(dir, FRAGMENT))}`);
    expect(first.stdout).toContain('Pinned "the player is in the Landing" on card card0003.');

    const fragment = readFileSync(path.join(dir, FRAGMENT), 'utf8');
    expect(fragment).toContain('\nclaims\n  claim the player is in the Landing\n    the player is in the Landing\n    needs rooms: the Hall, the Landing\n    needs verbs: read\nend claims\n');
    const manifest = JSON.parse(readFileSync(path.join(dir, 'claims-tier.tests', 'manifest.json'), 'utf8'));
    expect(manifest).toEqual({ claims: FRAGMENT, seed: 7, story: 'claims-tier', version: 3 });
    const segment = JSON.parse(readFileSync(path.join(dir, 'claims-tier.tests', 'mainline.json'), 'utf8'));
    expect(segment.cards[3].locks).toEqual(['the player is in the Landing']);
    expect(segment.cards[2].locks).toBeUndefined();

    const second = await run(() => runClaimCommand(['mainline', 'the note is read', '--at', '1', '--name', 'the note gets read', dir]));
    expect(second.code).toBe(0);
    expect(second.stdout).toContain(`Written: appended to ${path.relative(process.cwd(), path.join(dir, FRAGMENT))}`);
    const appended = readFileSync(path.join(dir, FRAGMENT), 'utf8');
    expect(appended.startsWith(fragment.slice(0, fragment.indexOf('end claims')))).toBe(true);
    expect(appended).toContain('\n\n  claim the note gets read\n    the note is read\n    needs rooms: the Hall\n    needs things: the note\n    needs verbs: read\nend claims\n');
    expect(JSON.parse(readFileSync(path.join(dir, 'claims-tier.tests', 'mainline.json'), 'utf8')).cards[2].locks).toEqual(['the note gets read']);

    // The rerun: the tree is canonical, both claims are held by the line, no walk runs, exit 0.
    const test = await run(() => runTestCommand([dir]));
    expect(test.code).toBe(0);
    expect(test.stdout).toContain('claims: 2 of 2 held (seed 7)');
    expect(test.stdout).toContain('0 walks, 0.0s in all');
    expect(test.stdout).toContain('HELD  the player is in the Landing — by line mainline "opening-hall" at turn 2');
    expect(test.stdout).toContain('HELD  the note gets read — by line mainline "opening-hall" at turn 1');
    expect(test.stdout).toContain('  lock "the player is in the Landing" at line mainline "opening-hall" at turn 2 — held there');
    expect(test.stdout).toContain('  lock "the note gets read" at line mainline "opening-hall" at turn 1 — held there');
  }, 120_000);

  it('a second lock under a name the fragment already declares is refused, and neither file changes', async () => {
    const dir = project();
    expect((await run(() => runClaimCommand(['mainline', 'the player is in the Landing', dir]))).code).toBe(0);
    const fragment = readFileSync(path.join(dir, FRAGMENT), 'utf8');
    const segment = readFileSync(path.join(dir, 'claims-tier.tests', 'mainline.json'), 'utf8');
    const { code, stderr } = await run(() => runClaimCommand(['mainline', 'the note is read', '--at', '1', '--name', 'the player is in the Landing', dir]));
    expect(code).toBe(2);
    expect(stderr.join('\n')).toContain('already declares `claim the player is in the Landing` — give this lock another name with --name');
    expect(readFileSync(path.join(dir, FRAGMENT), 'utf8')).toBe(fragment);
    expect(readFileSync(path.join(dir, 'claims-tier.tests', 'mainline.json'), 'utf8')).toBe(segment);
  }, 120_000);

  it('a fact false at the card is refused by name and nothing is written', async () => {
    const dir = project();
    const { code, stderr } = await run(() => runClaimCommand(['mainline', 'the player is in the Landing', '--at', '1', dir]));
    expect(code).toBe(2);
    expect(stderr.join('\n')).toContain('"the player is in the Landing" does not hold at turn 1 of line mainline; nothing written');
    expect(existsSync(path.join(dir, FRAGMENT))).toBe(false);
  }, 60_000);
});
