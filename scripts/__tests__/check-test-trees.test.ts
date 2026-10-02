/**
 * check-test-trees.test.ts — the canonical gate's hook half, on the real path:
 * the real `scripts/check-test-trees.mjs`, real `git`, and the built
 * `@sharpee/branch-tester`, against a scratch repository. What it checks is
 * the STAGED copy of each tree, because that is what the commit records.
 *
 * Needs `@sharpee/branch-tester` built (its dist carries checkCanonicalTree).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TREE_DOCUMENT_VERSION,
  segmentTree,
  type TreeDocument,
} from '../../packages/branch-tester/src/tree-document';

const checker = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-test-trees.mjs');

/** A small forked tree, fully identified — what a writer would hand to disk. */
function tree(): TreeDocument {
  return {
    version: TREE_DOCUMENT_VERSION,
    story: 'mini',
    seed: 7,
    id: 'root0000',
    cards: [
      { id: 'card0001', type: 'opening' },
      {
        id: 'card0002',
        type: 'turn',
        command: 'north',
        continuation: 'maincont',
        branches: [{ id: 'branch01', cards: [{ id: 'card0003', type: 'turn', command: 'east' }] }],
      },
      { id: 'card0004', type: 'turn', command: 'look', assertions: { contains: ['A hall.'] } },
    ],
  };
}

let repo: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
}

function writeTree(files: Record<string, string>): void {
  const directory = join(repo, 'mini.tests');
  mkdirSync(directory, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(directory, name), text);
}

function runChecker(...args: string[]): { status: number | null; stderr: string } {
  const result = spawnSync('node', [checker, ...args], { cwd: repo, encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr };
}

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'check-test-trees-'));
  git('init', '--quiet');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('check-test-trees — the pre-commit gate', () => {
  it('passes a staged tree exactly as segmentTree writes it', () => {
    writeTree(segmentTree(tree()));
    git('add', '.');
    expect(runChecker()).toEqual({ status: 0, stderr: '' });
  });

  it('refuses a staged tree with a re-indented file, and names the file', () => {
    const files = segmentTree(tree());
    files['branch01.json'] = `${JSON.stringify(JSON.parse(files['branch01.json']), null, 1)}\n`;
    writeTree(files);
    git('add', '.');
    expect(runChecker()).toEqual({
      status: 1,
      stderr:
        'check-test-trees: mini.tests/ has files not in canonical form ' +
        '(re-save them from the Testing tab or sharpee test):\n' +
        '  branch01.json\n',
    });
  });

  it('checks the staged copy, not the working copy', () => {
    writeTree(segmentTree(tree()));
    git('add', '.');
    // Re-indent on disk only: the commit would still record canonical bytes.
    const files = segmentTree(tree());
    writeTree({ 'root0000.json': `${JSON.stringify(JSON.parse(files['root0000.json']), null, 1)}\n` });
    expect(runChecker()).toEqual({ status: 0, stderr: '' });
  });

  it('refuses a staged tree the reader cannot read, naming why', () => {
    const { ['manifest.json']: _manifest, ...noManifest } = segmentTree(tree());
    writeTree(noManifest);
    git('add', '.');
    const result = runChecker();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('mini.tests/ cannot be read (malformed): the tree has no manifest.json');
  });

  it('ignores a commit that stages no tree, and one that removes a tree whole', () => {
    writeFileSync(join(repo, 'README.md'), 'hello\n');
    git('add', '.');
    expect(runChecker()).toEqual({ status: 0, stderr: '' });

    writeTree(segmentTree(tree()));
    git('add', '.');
    git('commit', '--quiet', '-m', 'tree');
    git('rm', '-r', '--quiet', 'mini.tests');
    expect(runChecker()).toEqual({ status: 0, stderr: '' });
  });

  it('refuses a staged tree from a newer format, naming the refusal', () => {
    const files = segmentTree(tree());
    files['manifest.json'] = JSON.stringify({ version: TREE_DOCUMENT_VERSION + 1, story: 'mini', seed: 7 });
    writeTree(files);
    git('add', '.');
    const result = runChecker();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `mini.tests/ cannot be read (refused): this test tree is version ${TREE_DOCUMENT_VERSION + 1}`,
    );
  });

  it('ignores a staged dotfile inside a tree, and files nested below it', () => {
    writeTree({ ...segmentTree(tree()), '.DS_Store': 'x' });
    // A nested file is not the tree's: only the directory's own files are read.
    mkdirSync(join(repo, 'mini.tests', 'notes'), { recursive: true });
    writeFileSync(join(repo, 'mini.tests', 'notes', 'todo.txt'), 'later\n');
    git('add', '--force', '.');
    expect(runChecker()).toEqual({ status: 0, stderr: '' });
  });

  it('checks each staged tree on its own — one bad tree fails the commit, and only it is named', () => {
    writeTree(segmentTree(tree()));
    const other = join(repo, 'other.tests');
    mkdirSync(other);
    const files = segmentTree({ ...tree(), story: 'other' });
    files['root0000.json'] = files['root0000.json'].trimEnd();
    for (const [name, text] of Object.entries(files)) writeFileSync(join(other, name), text);
    git('add', '.');
    expect(runChecker()).toEqual({
      status: 1,
      stderr:
        'check-test-trees: other.tests/ has files not in canonical form ' +
        '(re-save them from the Testing tab or sharpee test):\n' +
        '  root0000.json\n',
    });
  });

  it('exits 2 outside a git repository', () => {
    const outside = mkdtempSync(join(tmpdir(), 'check-test-trees-outside-'));
    try {
      const result = spawnSync('node', [checker], { cwd: outside, encoding: 'utf8' });
      expect(result.status).toBe(2);
      expect(result.stderr).toBe('check-test-trees: not inside a git repository.\n');
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('exits 2 when branch-tester is not built, rather than passing unchecked', () => {
    // A copy of the checker whose repository has no branch-tester build.
    const toolRoot = mkdtempSync(join(tmpdir(), 'check-test-trees-unbuilt-'));
    try {
      mkdirSync(join(toolRoot, 'scripts'));
      copyFileSync(checker, join(toolRoot, 'scripts', 'check-test-trees.mjs'));
      writeTree(segmentTree(tree()));
      git('add', '.');
      const result = spawnSync('node', [join(toolRoot, 'scripts', 'check-test-trees.mjs')], { cwd: repo, encoding: 'utf8' });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('@sharpee/branch-tester is not built with checkCanonicalTree');
    } finally {
      rmSync(toolRoot, { recursive: true, force: true });
    }
  });

  it('the installed pre-commit hook blocks a non-canonical commit and lets a canonical one through', () => {
    // The hook runs the checker from the committing repository's own scripts/;
    // link this repository's scripts in, then install the hook the documented way.
    symlinkSync(dirname(checker), join(repo, 'scripts'));
    const hooks = resolve(repo, git('rev-parse', '--git-path', 'hooks').trim());
    mkdirSync(hooks, { recursive: true });
    symlinkSync(join(dirname(checker), 'hooks', 'pre-commit'), join(hooks, 'pre-commit'));

    const files = segmentTree(tree());
    files['branch01.json'] = `${JSON.stringify(JSON.parse(files['branch01.json']), null, 1)}\n`;
    writeTree(files);
    git('add', 'mini.tests');
    const blocked = spawnSync('git', ['commit', '-m', 'bad tree'], { cwd: repo, encoding: 'utf8' });
    expect(blocked.status).toBe(1);
    expect(blocked.stderr).toContain('  branch01.json\n');
    expect(git('rev-list', '--all').trim()).toBe('');

    writeTree(segmentTree(tree()));
    git('add', 'mini.tests');
    const committed = spawnSync('git', ['commit', '--quiet', '-m', 'good tree'], { cwd: repo, encoding: 'utf8' });
    expect(committed.status).toBe(0);
    expect(git('log', '--format=%s').trim()).toBe('good tree');
  });

  it('--all checks every tracked tree, staged change or not', () => {
    const files = segmentTree(tree());
    files['maincont.json'] = files['maincont.json'].trimEnd();
    writeTree(files);
    git('add', '.');
    git('commit', '--quiet', '--no-verify', '-m', 'tree');
    expect(runChecker()).toEqual({ status: 0, stderr: '' });
    const result = runChecker('--all');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('  maincont.json\n');
  });
});
