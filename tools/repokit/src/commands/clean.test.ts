/**
 * clean.test.ts — the tsbuildinfo sweep.
 *
 * Guards the silent-no-op class: per-package `clean` scripts remove
 * `tsconfig.tsbuildinfo` but not `tsconfig.esm.tsbuildinfo`, so the ESM pass
 * read a stale file, emitted nothing, and exited 0 — leaving dist-esm gone and
 * every browser build broken with "Could not resolve @sharpee/platform-browser".
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { sweepBuildInfo } from './clean';

let roots: string[] = [];

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), 'repokit-clean-test-'));
  roots.push(root);
  return root;
}

function touch(root: string, relative: string): string {
  const full = join(root, relative);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, 'x');
  return full;
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

describe('sweepBuildInfo', () => {
  it('removes the ESM tsbuildinfo the per-package clean scripts leave behind', () => {
    const root = repo();
    const esm = touch(root, 'packages/platform-browser/tsconfig.esm.tsbuildinfo');
    const cjs = touch(root, 'packages/platform-browser/tsconfig.tsbuildinfo');

    const removed = sweepBuildInfo(root);

    expect(existsSync(esm)).toBe(false);
    expect(existsSync(cjs)).toBe(false);
    expect(removed).toBe(2);
  });

  it('sweeps every buildable tree, not just packages/', () => {
    const root = repo();
    const story = touch(root, 'stories/dungeo/tsconfig.tsbuildinfo');
    const tutorial = touch(root, 'tutorials/familyzoo/tsconfig.esm.tsbuildinfo');
    const tool = touch(root, 'tools/shite/tsconfig.tsbuildinfo');

    expect(sweepBuildInfo(root)).toBe(3);
    expect(existsSync(story)).toBe(false);
    expect(existsSync(tutorial)).toBe(false);
    expect(existsSync(tool)).toBe(false);
  });

  it('spares repokit itself — the tool must survive its own clean', () => {
    const root = repo();
    const own = touch(root, 'tools/repokit/tsconfig.tsbuildinfo');

    expect(sweepBuildInfo(root)).toBe(0);
    expect(existsSync(own)).toBe(true);
  });

  it('never descends into node_modules', () => {
    const root = repo();
    const vendored = touch(root, 'packages/core/node_modules/dep/tsconfig.tsbuildinfo');

    expect(sweepBuildInfo(root)).toBe(0);
    expect(existsSync(vendored)).toBe(true);
  });

  it('leaves every non-tsbuildinfo file alone', () => {
    const root = repo();
    const source = touch(root, 'packages/core/src/index.ts');
    const config = touch(root, 'packages/core/tsconfig.json');

    expect(sweepBuildInfo(root)).toBe(0);
    expect(existsSync(source)).toBe(true);
    expect(existsSync(config)).toBe(true);
  });

  it('is a no-op on a tree with no buildable roots', () => {
    expect(sweepBuildInfo(repo())).toBe(0);
  });
});
