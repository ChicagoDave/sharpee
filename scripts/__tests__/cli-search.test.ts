/**
 * Tests for the bundle CLI's --search mode (ADR-293 D12, Phase C/4).
 *
 * The three input-validation branches (malformed target, missing/extra
 * driver transcript, bad --search-budget) must reject loudly with exit 2
 * before any story loads, and the success path must print the paste-ready
 * `seed:`/`point-seed:` reproduction lines. Exercised end-to-end via
 * `spawnSync` against the real compiled bundle (`dist/cli/sharpee.js`)
 * and the real dungeo story — the contract the test asserts is the
 * contract authors get.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const BUNDLE = join(REPO_ROOT, 'dist', 'cli', 'sharpee.js');

let driverDir: string;
let driverPath: string;

beforeAll(() => {
  driverDir = mkdtempSync(join(tmpdir(), 'cli-search-'));
  driverPath = join(driverDir, 'forest-driver.transcript');
  writeFileSync(
    driverPath,
    'title: Forest search driver\nstory: dungeo\nseed: 4242\n---\n> north\n\n> north\n'
  );
});

afterAll(() => rmSync(driverDir, { recursive: true, force: true }));

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync('node', [BUNDLE, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 120_000
  });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

describe('--search input validation (exit 2, before any story loads)', () => {
  it('rejects a malformed target', () => {
    const { status, stderr } = runCli(['--search', 'not-a-target', driverPath, '--story', 'stories/dungeo']);
    expect(status).toBe(2);
    expect(stderr).toContain('expected point=CLASS');
  });

  it('rejects a missing driver transcript', () => {
    const { status, stderr } = runCli(['--search', 'dungeo.forest.ambience=no', '--story', 'stories/dungeo']);
    expect(status).toBe(2);
    expect(stderr).toContain('exactly one driver transcript');
  });

  it('rejects a non-integer --search-budget', () => {
    const { status, stderr } = runCli([
      '--search', 'dungeo.forest.ambience=no', driverPath,
      '--story', 'stories/dungeo', '--search-budget', 'lots'
    ]);
    expect(status).toBe(2);
    expect(stderr).toContain('must be a positive integer');
  });
});

describe('--search against the real story (D12)', () => {
  it('finds a point-seed and prints the paste-ready reproduction lines, exit 0', () => {
    // At seed 4242 the natural first firing is yes, so searching =no must go
    // through the candidate loop and report an explicit point-seed.
    const { status, stdout } = runCli([
      '--search', 'dungeo.forest.ambience=no', driverPath, '--story', 'stories/dungeo'
    ]);
    expect(status).toBe(0);
    expect(stdout).toMatch(/✓ found in \d+ of 20 tries/);
    expect(stdout).toContain('seed: 4242');
    expect(stdout).toMatch(/point-seed: dungeo\.forest\.ambience=\d+/);
  });

  it('reports budget-exhausted with exit 1 when the budget is too small', () => {
    const { status, stderr } = runCli([
      '--search', 'dungeo.forest.ambience=no', driverPath,
      '--story', 'stories/dungeo', '--search-budget', '1'
    ]);
    expect(status).toBe(1);
    expect(stderr).toContain('budget exhausted after 1 tries');
  });

  it('an undeclared class is a named search failure with exit 1', () => {
    const { status, stderr } = runCli([
      '--search', 'dungeo.forest.ambience=MAYBE', driverPath, '--story', 'stories/dungeo'
    ]);
    expect(status).toBe(1);
    expect(stderr).toContain("does not declare class 'MAYBE'");
  });
});
