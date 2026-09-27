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
 * exit-2 cases corrupt a scratch copy's tree document, never fernhill's.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FERNHILL_DIR, REPO_ROOT, derivedBranches, runEnd, runFernhillTest, runTestJson, spawnCli } from './support/fernhill-run';
import { copyStoryToScratch, type ScratchStory } from './support/scratch-story';

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

describe('a document the tester cannot read runs nothing and exits 2', () => {
  let scratch: ScratchStory;
  let treeFile: string;
  let original: string;

  beforeAll(() => {
    scratch = copyStoryToScratch(FERNHILL_DIR, 'narrative-exit-codes-');
    treeFile = join(scratch.dir, 'fernhill.tests.json');
    original = readFileSync(treeFile, 'utf-8');
  });

  afterAll(() => scratch?.cleanup());

  it('a newer document version is refused by name, nothing runs, exit 2', () => {
    writeFileSync(treeFile, JSON.stringify({ ...JSON.parse(original), version: 99 }), 'utf-8');
    const outcome = spawnCli(['test', scratch.dir, '--json']);
    expect(outcome.status).toBe(2);
    expect(outcome.stdout.trim()).toBe('');
    expect(outcome.stderr).toMatch(/fernhill\.tests\.json/);
    expect(outcome.stderr).toMatch(/version/);
  }, 60_000);

  it('a document that is not a tree at all is malformed, nothing runs, exit 2', () => {
    writeFileSync(treeFile, '{"version": "two", "cards": []}', 'utf-8');
    const outcome = spawnCli(['test', scratch.dir, '--json']);
    expect(outcome.status).toBe(2);
    expect(outcome.stdout.trim()).toBe('');
    expect(outcome.stderr).toMatch(/'version' must be an integer/);
  }, 60_000);

  it('no tree document beside the story is a named condition, never an empty pass', () => {
    rmSync(treeFile);
    const outcome = spawnCli(['test', scratch.dir, '--json']);
    expect(outcome.status).toBe(2);
    expect(outcome.stdout.trim()).toBe('');
    expect(outcome.stderr).toMatch(/no tree document found/);
  }, 60_000);
});
