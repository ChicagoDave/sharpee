/**
 * Tests for scripts/validate-bundle-baseline.js (ADR-178 §AC-5).
 *
 * Exercises the validator end-to-end via `spawnSync` against the real
 * compiled baseline (`packages/story-runtime-baseline/dist/index.js`).
 * Drives the script as users do — through process exit code and
 * stdout/stderr — so the contract the test asserts is the contract the
 * build pipeline gets.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const REPO_ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'validate-bundle-baseline.js');
const BASELINE_DIST = join(
  REPO_ROOT,
  'packages',
  'story-runtime-baseline',
  'dist',
  'index.js'
);
const DUNGEO_BUNDLE = join(REPO_ROOT, 'dist', 'stories', 'dungeo.sharpee');

const tmpDirs: string[] = [];

function writeBundle(content: string, filename = 'bundle.js'): string {
  const dir = mkdtempSync(join(tmpdir(), 'baseline-validate-'));
  tmpDirs.push(dir);
  const file = join(dir, filename);
  writeFileSync(file, content);
  return file;
}

function runValidator(bundlePath: string): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync('node', [SCRIPT, bundlePath], { encoding: 'utf8' });
  return {
    status: result.status ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

beforeAll(() => {
  if (!existsSync(BASELINE_DIST)) {
    throw new Error(
      `Baseline build missing: ${BASELINE_DIST}. Run \`pnpm --filter @sharpee/story-runtime-baseline build\` first.`
    );
  }
});

afterAll(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('validate-bundle-baseline', () => {
  it('exits 0 on a bundle that only references baseline packages', () => {
    const bundle = writeBundle(
      'import { x } from "@sharpee/stdlib";\nimport { y } from "@sharpee/world-model";\n'
    );
    const { status, stdout } = runValidator(bundle);
    expect(status).toBe(0);
    expect(stdout).toContain('[baseline-check] OK');
  });

  it('exits 1 and names the offender when a non-baseline package is referenced', () => {
    const bundle = writeBundle(
      'import { foo } from "@sharpee/stdlib";\nimport { bar } from "@fake/nonexistent-xyz";\n'
    );
    const { status, stderr } = runValidator(bundle);
    expect(status).toBe(1);
    expect(stderr).toContain('@fake/nonexistent-xyz');
    expect(stderr).toContain('NOT IN BASELINE');
    // The baseline package should NOT show up as offender.
    expect(stderr).not.toContain('@sharpee/stdlib');
  });

  it('matches CJS require() specifiers, not just ESM imports', () => {
    const bundle = writeBundle(
      'const x = require("nonexistent-cjs-package");\n'
    );
    const { status, stderr } = runValidator(bundle);
    expect(status).toBe(1);
    expect(stderr).toContain('nonexistent-cjs-package');
  });

  it('strips subpath segments before checking against baseline', () => {
    const bundle = writeBundle(
      'import { z } from "@sharpee/stdlib/actions/take";\nimport { q } from "@nonbaseline/deep/path";\n'
    );
    const { status, stderr } = runValidator(bundle);
    expect(status).toBe(1);
    expect(stderr).toContain('@nonbaseline/deep');
    expect(stderr).not.toContain('@sharpee/stdlib');
  });

  it('treats relative imports as internal (not external)', () => {
    const bundle = writeBundle(
      'import { a } from "./helpers";\nimport { b } from "../shared";\n'
    );
    const { status, stdout } = runValidator(bundle);
    expect(status).toBe(0);
    expect(stdout).toContain('[baseline-check] OK');
  });

  it.skipIf(!existsSync(DUNGEO_BUNDLE))(
    'the real dungeo.sharpee bundle validates clean',
    () => {
      const { status, stdout, stderr } = runValidator(DUNGEO_BUNDLE);
      expect(status, `stderr: ${stderr}`).toBe(0);
      expect(stdout).toContain('[baseline-check] OK');
    }
  );
});
