/**
 * Real-path test for the TypeScript story branch of `sharpee build-browser`
 * (GH #448).
 *
 * The Chord branch of runBuildBrowserCommand delegates to browser-core.ts, which
 * has always spawned devkit's own esbuild through resolveEsbuild(). The legacy
 * TypeScript branch shelled out to `npx esbuild` instead — ENOENT on Windows,
 * where execFileSync spawns without a shell and the launcher is npx.cmd, and a
 * registry download everywhere else, since npm 7+ does not run a PATH binary for
 * `npx <pkg>`. Every existing browser test scaffolds a Chord project, so nothing
 * covered this branch.
 *
 * No stub of esbuild: the assertion is the real dist/web/game.js the real
 * subprocess wrote (Integration Reality). The scratch project is created INSIDE
 * the repo so esbuild resolves @sharpee/* by walking up to the monorepo
 * node_modules, matching browser-build.test.ts's arrangement.
 *
 * Owner context: @sharpee/devkit — standalone (author build paths).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInitCommand } from './init.js';
import { runInitBrowserCommand } from './init-browser.js';
import { runBuildBrowserCommand } from './build-browser.js';
import { resolveEsbuild } from './esbuild-bin.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

describe('build-browser, TypeScript story branch (real path)', () => {
  let tmp = '';

  afterEach(() => {
    if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('bundles game.js through devkit\'s own esbuild, not npx', async () => {
    // Guard the premise: if devkit's esbuild cannot be resolved, resolveEsbuild
    // falls back to npx and this test would pass for the wrong reason.
    expect(resolveEsbuild().bundled, 'devkit\'s own esbuild must resolve').toBe(true);

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    tmp = mkdtempSync(join(REPO_ROOT, '.tmp-browser-ts-path-'));
    const projectDir = join(tmp, 'ts-story');

    // --ts is what selects the branch under test: a TypeScript project has no
    // root .story file, so runBuildBrowserCommand falls past findStoryFile().
    await runInitCommand([projectDir, '-y', '--ts']);
    // (args, projectDirArg) — the directory is the SECOND parameter; passing it
    // inside args leaves projectDir as process.cwd(), i.e. devkit's own package.
    await runInitBrowserCommand(['-y'], projectDir);

    expect(existsSync(join(projectDir, 'src', 'browser-entry.ts'))).toBe(true);
    expect(
      readdirSync(projectDir).filter(f => f.endsWith('.story')),
      'a .story file would route to the Chord branch instead',
    ).toEqual([]);

    // Same shape again: (args, targetArg). The directory is targetArg.
    await runBuildBrowserCommand([], projectDir);

    // The deliverable the subprocess actually wrote — not a return value, not a
    // mock, not "it did not throw".
    const gameJs = join(projectDir, 'dist', 'web', 'game.js');
    expect(existsSync(gameJs), 'dist/web/game.js was not produced').toBe(true);
    expect(statSync(gameJs).size).toBeGreaterThan(100_000);
  }, 120_000);
});
