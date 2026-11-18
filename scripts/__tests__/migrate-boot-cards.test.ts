/**
 * migrate-boot-cards.test.ts — the one-shot tree migration, on the real path:
 * the real `scripts/migrate-boot-cards.mjs`, real `git`, and the built
 * `@sharpee/branch-tester`, against a scratch repository holding trees as they
 * were recorded when the first look was a card of its own.
 *
 * Derived from the script's Behavior Statement: it removes the first-look
 * card and puts its assertions on the opening card, through the canonical
 * writer; a tree it cannot move is left untouched and reported; the archived
 * and primer trees are never read; `--check` writes nothing; a second run
 * changes nothing.
 *
 * Needs `@sharpee/branch-tester` built.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assembleTree, checkCanonicalTree } from '../../packages/branch-tester/src/tree-document';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'migrate-boot-cards.mjs');

const MANIFEST = JSON.stringify({ seed: 7, story: 'mini', version: 3 });

/** A root segment as an old tree holds it: opening, first-look card, one turn. */
function oldRoot(opening: Record<string, unknown>, firstLook: Record<string, unknown>): string {
  return JSON.stringify({
    cards: [
      { id: 'card0001', type: 'opening', ...opening },
      { id: 'card0002', type: 'boot', ...firstLook },
      { id: 'card0003', type: 'turn', command: 'north', assertions: { contains: ['A hall.'] } },
    ],
    id: 'root0000',
  });
}

let repo: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function writeTree(directory: string, root: string): void {
  mkdirSync(join(repo, directory), { recursive: true });
  writeFileSync(join(repo, directory, 'manifest.json'), MANIFEST);
  writeFileSync(join(repo, directory, 'root0000.json'), root);
}

function readTree(directory: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(join(repo, directory))) files[name] = readFileSync(join(repo, directory, name), 'utf8');
  return files;
}

function runScript(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [script, '--root', repo, ...args], { encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'migrate-boot-cards-'));
  git('init', '--quiet');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('migrate-boot-cards — the first-look card joins the opening card', () => {
  it('the fixture known to fail: the reader refuses the tree before the migration and reads it after', () => {
    writeTree('mini.tests', oldRoot({ assertions: {} }, { assertions: { contains: ['A den.'] } }));
    git('add', '.');
    const before = assembleTree(readTree('mini.tests'));
    expect(before.status).toBe('malformed');

    const result = runScript();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('migrated mini.tests/ (manifest.json, root0000.json)');
    expect(result.stdout).toContain('1 tree(s) migrated');

    const files = readTree('mini.tests');
    const after = assembleTree(files);
    expect(after.status).toBe('ok');
    if (after.status !== 'ok') return;
    expect(after.document.cards.map((card) => [card.id, card.type, card.command])).toEqual([
      ['card0001', 'opening', undefined],
      ['card0003', 'turn', 'north'],
    ]);
    expect(after.document.cards[0].assertions).toEqual({ contains: ['A den.'] });
    // Written through the canonical writer: the gate accepts every file.
    expect(checkCanonicalTree(files)).toEqual({ status: 'canonical' });
  });

  it('merges each family onto what the opening already says, appending only what it lacks', () => {
    writeTree('mini.tests', oldRoot(
      { assertions: { contains: ['By Test Story', 'A den.'], channels: [{ id: 'info.title', is: 'Mini' }] } },
      { assertions: { contains: ['A den.', 'Den'], states: ['the lamp is lit'], channels: [{ id: 'room-name', is: 'Den' }] } },
    ));
    git('add', '.');
    expect(runScript().status).toBe(0);

    const after = assembleTree(readTree('mini.tests'));
    expect(after.status).toBe('ok');
    if (after.status !== 'ok') return;
    expect(after.document.cards[0].assertions).toEqual({
      contains: ['By Test Story', 'A den.', 'Den'],
      states: ['the lamp is lit'],
      channels: [{ id: 'info.title', is: 'Mini' }, { id: 'room-name', is: 'Den' }],
    });
  });

  it('a skipped first-look card adds nothing, and the card still goes', () => {
    writeTree('mini.tests', oldRoot({}, { skip: true }));
    git('add', '.');
    expect(runScript().status).toBe(0);
    const after = assembleTree(readTree('mini.tests'));
    expect(after.status).toBe('ok');
    if (after.status !== 'ok') return;
    expect(after.document.cards.map((card) => card.type)).toEqual(['opening', 'turn']);
    expect(after.document.cards[0].assertions).toBeUndefined();
  });

  it('leaves a tree it cannot move untouched, names why, exits 1, and still migrates the others', () => {
    writeTree('stuck.tests', oldRoot({}, { assertions: { exact: ['Den', 'A den.'] } }));
    writeTree('fine.tests', oldRoot({}, { assertions: { contains: ['A den.'] } }));
    git('add', '.');
    const stuckBefore = readTree('stuck.tests');

    const result = runScript();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("stuck.tests/ left untouched: root0000.json: its first-look card carries 'exact', which an opening card cannot hold");
    expect(readTree('stuck.tests')).toEqual(stuckBefore);
    expect(assembleTree(readTree('fine.tests')).status).toBe('ok');
  });

  it('never reads the archived trees or the primer\'s tree', () => {
    const root = oldRoot({}, { assertions: { contains: ['A den.'] } });
    writeTree('docs/work/archive/old/mini.tests', root);
    writeTree('docs/work/chord-primer/example/mini.tests', root);
    git('add', '.');
    const archived = readTree('docs/work/archive/old/mini.tests');
    const primer = readTree('docs/work/chord-primer/example/mini.tests');

    const result = runScript();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('0 tree(s) migrated');
    expect(readTree('docs/work/archive/old/mini.tests')).toEqual(archived);
    expect(readTree('docs/work/chord-primer/example/mini.tests')).toEqual(primer);
  });

  it('--check reports and writes nothing; a run after a real run changes nothing', () => {
    writeTree('mini.tests', oldRoot({}, { assertions: { contains: ['A den.'] } }));
    git('add', '.');
    const before = readTree('mini.tests');

    const check = runScript('--check');
    expect(check.status).toBe(0);
    expect(check.stdout).toContain('would migrate mini.tests/');
    expect(readTree('mini.tests')).toEqual(before);

    expect(runScript().status).toBe(0);
    const migrated = readTree('mini.tests');
    expect(migrated).not.toEqual(before);

    const again = runScript();
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('0 tree(s) migrated');
    expect(readTree('mini.tests')).toEqual(migrated);
  });
});
