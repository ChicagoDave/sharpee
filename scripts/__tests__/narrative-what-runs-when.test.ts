/**
 * narrative-what-runs-when.test.ts — beat 8 of the author narrative ("What
 * runs when"): one gesture runs the tree, the derived suite and the ratios.
 * A failed card or a failed rule exits 1. A SKIPPED branch never does. A
 * document the tester cannot read runs nothing and exits 2, saying why.
 *
 * Fernhill as written is the exit-0 case: every card and every exercised
 * branch passes. The exit-1 case uses devkit's own failing fixture project — a
 * dedicated test story whose one clause has no vocabulary, so its derived
 * row fails at parse. The SKIPPED case uses devkit's SKIPPED fixture, and the
 * exit-2 cases corrupt a scratch copy's test tree, never fernhill's.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FERNHILL_DIR, REPO_ROOT, derivedBranches, runEnd, runFernhillTest, runTestJson, spawnCli } from './support/fernhill-run';
import type { TreeFiles } from '../../packages/branch-tester/src/tree-document';
import { copyStoryToScratch, readTreeFiles, type ScratchStory } from './support/scratch-story';

const SKIP_FIXTURE = join(REPO_ROOT, 'packages', 'devkit', 'tests', 'fixtures', 'derived-pass');
const FAIL_FIXTURE = join(REPO_ROOT, 'packages', 'devkit', 'tests', 'fixtures', 'derived-fail');

describe('one gesture runs everything, and a clean story exits 0', () => {
  it('fernhill today: every card passes, every exercised derived row passes, the run exits 0', () => {
    const run = runFernhillTest();
    const end = runEnd(run);
    expect(end.totalFailed).toBe(0);
    expect(derivedBranches(run).filter((event) => event.status === 'failed')).toHaveLength(0);
    expect(derivedBranches(run).filter((event) => event.status === 'passed').length).toBeGreaterThan(0);
    expect(end.exitCode).toBe(0);
    expect(run.status).toBe(0);
  }, 60_000);
});

describe('a failed rule exits 1', () => {
  it('a project whose one derived row fails exits 1 though every card passed', () => {
    const run = runTestJson(FAIL_FIXTURE);
    const end = runEnd(run);
    expect(end.totalFailed).toBe(0);
    expect(derivedBranches(run).filter((event) => event.status === 'failed')).toHaveLength(1);
    expect(end.exitCode).toBe(1);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Derived failures: 1');
  }, 60_000);
});

describe('a SKIPPED branch never fails the build', () => {
  it('a project whose only non-pass is SKIPPED exits 0, with the skip reported by shape', () => {
    const run = runTestJson(SKIP_FIXTURE);
    const branches = derivedBranches(run);
    expect(branches.length).toBeGreaterThan(1);
    expect(branches.filter((event) => event.status === 'failed')).toHaveLength(0);
    const skipped = branches.filter((event) => event.status === 'skipped');
    expect(skipped).toHaveLength(1);
    expect(skipped[0].shape).toBe('predicate-is');
    expect(runEnd(run).exitCode).toBe(0);
    expect(run.status).toBe(0);
    expect(run.stderr).toContain('Not exercised (1):');
  }, 60_000);
});

describe('a tree the tester cannot read runs nothing and exits 2', () => {
  let scratch: ScratchStory;
  let treeDir: string;
  let original: TreeFiles;

  beforeAll(() => {
    scratch = copyStoryToScratch(FERNHILL_DIR, 'narrative-exit-codes-');
    treeDir = join(scratch.dir, 'fernhill.tests');
    original = readTreeFiles(treeDir);
    // An empty snapshot would make every case below pass for the wrong reason.
    expect(Object.keys(original).length).toBeGreaterThan(1);
  });

  // Every case starts from fernhill's own tree, so each carries one defect only.
  beforeEach(() => {
    rmSync(treeDir, { recursive: true, force: true });
    mkdirSync(treeDir);
    for (const [name, text] of Object.entries(original)) writeFileSync(join(treeDir, name), text, 'utf-8');
  });

  afterAll(() => scratch?.cleanup());

  /** Run the CLI over the scratch copy and require that nothing ran. */
  function refusedRun(): string {
    const outcome = spawnCli(['test', scratch.dir, '--json']);
    expect(outcome.status).toBe(2);
    expect(outcome.stdout.trim()).toBe('');
    return outcome.stderr;
  }

  it('a newer tree version is refused by name, nothing runs, exit 2', () => {
    writeFileSync(join(treeDir, 'manifest.json'), '{ "seed": 42, "story": "fernhill", "version": 99 }\n', 'utf-8');
    expect(refusedRun()).toContain(
      'test: fernhill.tests/: this test tree is version 99; this build reads up to version 3 — update Sharpee to open it',
    );
  }, 60_000);

  it('a manifest that is not a tree manifest at all is malformed, nothing runs, exit 2', () => {
    // Seed and story are fernhill's own: the version is the only defect.
    writeFileSync(join(treeDir, 'manifest.json'), '{ "seed": 42, "story": "fernhill", "version": "two" }\n', 'utf-8');
    expect(refusedRun()).toContain("test: fernhill.tests/: 'version' must be an integer");
  }, 60_000);

  it('a tree with no manifest is malformed — never run at a default seed, exit 2', () => {
    rmSync(join(treeDir, 'manifest.json'));
    expect(refusedRun()).toContain('test: fernhill.tests/: the tree has no manifest.json');
  }, 60_000);

  it('a segment naming a parent that is gone is malformed — the subtree is never silently dropped, exit 2', () => {
    const [name, text] = Object.entries(original).find(([, body]) => body.includes('"parent"'))!;
    const segment = JSON.parse(text) as { id: string; parent: string };
    segment.parent = 'gone0000';
    writeFileSync(join(treeDir, name), `${JSON.stringify(segment, null, 2)}\n`, 'utf-8');
    expect(refusedRun()).toContain(
      `test: fernhill.tests/: segment '${segment.id}' names parent 'gone0000', which no segment in the tree carries`,
    );
  }, 60_000);

  it('a tree a second writer re-indented is named by the canonical gate, nothing runs, exit 2', () => {
    writeFileSync(join(treeDir, 'manifest.json'), `${JSON.stringify(JSON.parse(original['manifest.json']), null, 1)}\n`, 'utf-8');
    // Exactly the manifest is named: every segment is still canonical.
    expect(refusedRun()).toBe(
      'test: fernhill.tests/ has files not in canonical form (re-save them from the Testing tab):\n  manifest.json\n',
    );
  }, 60_000);

  it('no test tree beside the story is a named condition, never an empty pass', () => {
    rmSync(treeDir, { recursive: true, force: true });
    expect(refusedRun()).toContain('test: no test tree found in');
  }, 60_000);
});
