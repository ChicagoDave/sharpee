/**
 * narrative-support.test.ts — the narrative-walk suite's support modules:
 * `support/scratch-story.ts`'s `editTree` writes a scratch tree the way the
 * Testing tab does (minted ids, changed segments only, stale segments
 * removed, canonical bytes), and `support/fernhill-run.ts` makes one spawn per process for fernhill's run
 * (proved by counting, not assumed), and a malformed or unfinished process
 * rejected by name rather than read as an empty result.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  TREE_DOCUMENT_VERSION,
  checkCanonicalTree,
  segmentTree,
  type TreeDocument,
} from '../../packages/branch-tester/src/tree-document';
import { editTree, readTree, readTreeFiles } from './support/scratch-story';
import {
  resetFernhillMemo,
  runFernhillTest,
  runTestJson,
  runWorldIndex,
  spawnCli,
  type Spawner,
} from './support/fernhill-run';

describe('editTree writes a scratch tree the way the Testing tab does', () => {
  /**
   * Root `root0000` holds opening, north (a fork), look. The fork's one branch
   * is `branch01` (east); `look` sits after the fork, so it is the
   * continuation segment `maincont`. Four files: manifest, root0000,
   * branch01, maincont.
   */
  function forkedTree(): TreeDocument {
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
        { id: 'card0004', type: 'turn', command: 'look' },
      ],
    };
  }

  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'edit-tree-'));
    for (const [name, text] of Object.entries(segmentTree(forkedTree()))) writeFileSync(join(dir, name), text);
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('removing the fork removes its branch and its continuation from disk; the rest is canonical', () => {
    expect(readdirSync(dir).sort()).toEqual(['branch01.json', 'maincont.json', 'manifest.json', 'root0000.json']);
    const removed = editTree(dir, (document) => {
      const fork = document.cards[1];
      const branches = fork.branches;
      delete fork.branches;
      return branches;
    });
    expect(removed?.map((branch) => branch.id)).toEqual(['branch01']);
    // `look` merges back into the root; the branch and the continuation are gone.
    expect(readdirSync(dir).sort()).toEqual(['manifest.json', 'root0000.json']);
    expect(checkCanonicalTree(readTreeFiles(dir))).toEqual({ status: 'canonical' });
    expect(readTree(dir).cards.map((card) => card.id)).toEqual(['card0001', 'card0002', 'card0004']);
  });

  it('an unchanged tree rewrites nothing', () => {
    const before = Object.fromEntries(readdirSync(dir).map((name) => [name, statSync(join(dir, name)).mtimeMs]));
    editTree(dir, () => undefined);
    const after = Object.fromEntries(readdirSync(dir).map((name) => [name, statSync(join(dir, name)).mtimeMs]));
    expect(after).toEqual(before);
  });

  it('a new card gets a minted id and lands only in its own segment', () => {
    editTree(dir, (document) => {
      document.cards[1].branches![0].cards.push({ type: 'turn', command: 'wait' });
    });
    const branch = JSON.parse(readTreeFiles(dir)['branch01.json']) as { cards: Array<{ id: string; command?: string }> };
    expect(branch.cards.map((card) => card.command)).toEqual(['east', 'wait']);
    expect(branch.cards[1].id).toMatch(/^[a-z0-9]{8}$/);
    expect(['card0001', 'card0002', 'card0003', 'card0004']).not.toContain(branch.cards[1].id);
    expect(checkCanonicalTree(readTreeFiles(dir))).toEqual({ status: 'canonical' });
  });
});

describe('runFernhillTest', () => {
  beforeAll(() => resetFernhillMemo());

  it('spawns fernhill\'s test --json once and shares the run', () => {
    let spawns = 0;
    const counting: Spawner = (args, cwd) => {
      spawns += 1;
      return spawnCli(args, cwd);
    };
    const first = runFernhillTest(counting);
    const second = runFernhillTest(counting);
    expect(spawns).toBe(1);
    expect(second).toBe(first);
    expect(first.events[0]?.type).toBe('run-start');
    expect(first.events.at(-1)?.type).toBe('run-end');
  }, 60_000);
});

describe('runTestJson rejects what is not a run', () => {
  it('a stdout line that is not a run event throws naming the line', () => {
    const garbage: Spawner = () => ({ status: 0, stdout: '{"type":"run-start"}\nnot json\n', stderr: '' });
    expect(() => runTestJson('/nowhere', garbage)).toThrow(/line 1 is not a run event/);
  });

  it('a process that never exited throws as a timeout, never as an empty run', () => {
    const hung: Spawner = () => ({ status: null, stdout: '', stderr: 'killed' });
    expect(() => runTestJson('/nowhere', hung)).toThrow(/did not exit/);
  });

  it('a non-zero exit is a result, not a throw — exit 1 is what the beats assert on', () => {
    const failing: Spawner = () => ({
      status: 1,
      stdout: '{"schemaVersion":2,"seq":0,"elapsedMs":0,"type":"run-start","mode":"tree"}\n',
      stderr: 'Derived failures: 1\n',
    });
    const run = runTestJson('/nowhere', failing);
    expect(run.status).toBe(1);
    expect(run.events).toHaveLength(1);
    expect(run.stderr).toContain('Derived failures: 1');
  });
});

describe('runWorldIndex', () => {
  it('stdout that is not JSON throws, since the command promises a document either way', () => {
    const broken: Spawner = () => ({ status: 1, stdout: 'Error: boom', stderr: '' });
    expect(() => runWorldIndex('/nowhere.ir.json', broken)).toThrow(/not JSON/);
  });
});
