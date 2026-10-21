/**
 * lock-gesture-real-path.test.ts — the Testing tab's lock, end to end
 * against the REAL CLI (ADR-367 D7, AC-6; rule 13a — nothing stubbed): the
 * three `sharpee claim --json` steps the page posts, spawned exactly as a
 * host spawns them, each answer decoded through the page's own decoder; the
 * pin and the manifest key through the page's model; and the files the
 * model then writes compared byte for byte with what the CLI writes on its
 * own for the same lock on a second scratch copy — the two surfaces, one
 * path.
 *
 * The project is devkit's claims-tier fixture (two rooms, a note), with a
 * tree of one line written by the tree's own writer, copied to scratch.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { assembleTree, segmentTree, turnOfCard, type TreeDocument, type TreeFiles } from '@sharpee/branch-tester/tree-document';
import { applyLockWritten, decodeLockResult, lockArgumentsOf, type LockStep } from '../src/lock';
import { TreeSessionModel } from '../src/model';
import { spawnCli } from './spawn-cli';

const testsDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(testsDir, '../../../../..');
const devkitCli = join(repoRoot, 'packages/devkit/dist/cli.js');
const fixture = join(repoRoot, 'packages/devkit/tests/fixtures/claims-tier');
const FRAGMENT = 'claims-tier.claims.chord';
const available = existsSync(devkitCli) && existsSync(join(fixture, 'claims-tier.story'));

const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** A scratch copy of the fixture with no fragment and a one-line tree: opening, boot, `read note`, `north`. */
function project(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sharpee-lock-gesture-'));
  scratch.push(dir);
  cpSync(fixture, dir, { recursive: true });
  rmSync(join(dir, FRAGMENT));
  const treeDir = join(dir, 'claims-tier.tests');
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
  for (const [name, text] of Object.entries(segmentTree(document))) writeFileSync(join(treeDir, name), text);
  return dir;
}

function treeFilesOf(dir: string): TreeFiles {
  const treeDir = join(dir, 'claims-tier.tests');
  const files: TreeFiles = {};
  for (const name of readdirSync(treeDir).filter((entry) => entry.endsWith('.json'))) files[name] = readFileSync(join(treeDir, name), 'utf8');
  return files;
}

/** One step as a host runs it: the page's arguments, the project appended, the one object decoded. */
async function runStep(dir: string, step: LockStep) {
  const run = await spawnCli([devkitCli, ...lockArgumentsOf(step), dir], dir);
  expect(run.error).toBeUndefined();
  return { status: run.status, result: decodeLockResult(run.stdout), stderr: run.stderr };
}

describe.skipIf(!available)('the lock gesture through the real CLI (AC-6)', () => {
  it('offer, proposal, write: the page pins and writes the same bytes the CLI writes alone', async () => {
    const page = project();
    const model = new TreeSessionModel('claims-tier', 7);
    const read = assembleTree(treeFilesOf(page));
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    model.load(read.document);

    // The page's half of the request: the card's owning line and its turn as a player counts it.
    const cardId = 'card0003';
    const line = model.lineOfCard(cardId);
    const turn = turnOfCard(model.document, cardId);
    expect(line).toBe('mainline');
    expect(turn).toBe(2);
    const step: LockStep = { line: line!, turn: turn! };

    // Step one: the offer.
    const offer = await runStep(page, step);
    expect(offer.status).toBe(0);
    expect(offer.result.kind).toBe('offer');
    if (offer.result.kind !== 'offer') return;
    expect(offer.result.cardId).toBe(cardId);
    expect(offer.result.offer).toContain('the player is in the Landing');

    // Step two: the proposal for the picked fact — nothing written yet.
    const fact = 'the player is in the Landing';
    const proposal = await runStep(page, { ...step, fact });
    expect(proposal.result.kind).toBe('proposal');
    if (proposal.result.kind !== 'proposal') return;
    expect(proposal.result.rooms).toEqual(['the Hall', 'the Landing']);
    expect(proposal.result.things).toEqual([]);
    expect(proposal.result.trimmed).toEqual(['the note']);
    expect(proposal.result.verbs).toEqual(['read']);
    expect(existsSync(join(page, FRAGMENT))).toBe(false);

    // Step three: Keep with the sheet's lists as proposed — the fragment only.
    const written = await runStep(page, {
      ...step, fact, name: proposal.result.name,
      needs: { rooms: proposal.result.rooms, things: proposal.result.things, verbs: proposal.result.verbs },
    });
    expect(written.result.kind).toBe('written');
    if (written.result.kind !== 'written') return;
    expect(written.result).toMatchObject({ pinned: false, created: true, manifestKey: FRAGMENT, cardId });

    // The page's own handler for a written lock — the pin and the manifest key — then its files
    // to disk, which is what `update()` posts to the host.
    expect(applyLockWritten(model, cardId, written.result)).toBe(true);
    expect(model.document.claims).toBe(FRAGMENT);
    for (const [name, text] of Object.entries(model.files())) writeFileSync(join(page, 'claims-tier.tests', name), text);

    // The CLI alone, on a second copy.
    const cli = project();
    const alone = await spawnCli([devkitCli, 'claim', 'mainline', fact, '--at', '2', cli], cli);
    expect(alone.status).toBe(0);

    // Byte for byte: the fragment, the segment, the manifest.
    expect(readFileSync(join(page, FRAGMENT), 'utf8')).toBe(readFileSync(join(cli, FRAGMENT), 'utf8'));
    expect(treeFilesOf(page)).toEqual(treeFilesOf(cli));
    const segment = JSON.parse(readFileSync(join(page, 'claims-tier.tests', 'mainline.json'), 'utf8')) as { cards: Array<{ id: string; locks?: string[] }> };
    expect(segment.cards.find((card) => card.id === cardId)?.locks).toEqual([fact]);

    // And the next run holds the lock by line (AC-1 on the page's files).
    const test = await spawnCli([devkitCli, 'test', page], page);
    expect(test.status).toBe(0);
    expect(test.stdout).toContain(`  lock "${fact}" at line mainline "opening-hall" at turn 2 — held there`);
  }, 120_000);

  it('a refused step decodes as an error the page can say', async () => {
    const page = project();
    const refused = await runStep(page, { line: 'mainline', turn: 1, fact: 'the player is in the Landing' });
    expect(refused.status).toBe(2);
    expect(refused.result.kind).toBe('error');
    if (refused.result.kind === 'error') expect(refused.result.message).toContain('does not hold at turn 1');
  }, 60_000);
});
