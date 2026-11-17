/**
 * runtime-packages.test.ts — real-path tests for the browser build's fallback
 * to devkit's own install (rule 13a).
 *
 * The defect these guard: a Chord project is one `.story` file with no
 * node_modules, so esbuild, run from the project folder, found none of the
 * `@sharpee/*` packages the generated entry imports. The tests SPAWN devkit's
 * esbuild on an entry in an empty folder, once with the environment the build
 * now passes and once without, so the second run is the known failure the
 * first one fixes.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import { resolveEsbuild } from './esbuild-bin.js';
import { devkitModuleRoots, esbuildEnv, runtimeResolveBases } from './runtime-packages.js';

/** Bundle `entry.js` in `dir` for the browser, as the build does, under `env`. */
function bundle(dir: string, env: NodeJS.ProcessEnv): void {
  const esbuild = resolveEsbuild();
  execFileSync(
    esbuild.command,
    [
      ...esbuild.prefixArgs,
      'entry.js',
      '--bundle',
      '--platform=browser',
      '--format=iife',
      '--conditions=require',
      '--log-level=error',
      `--outfile=${join(dir, 'out.js')}`,
    ],
    { cwd: dir, env, stdio: 'pipe' },
  );
}

/** The caller's environment with NODE_PATH removed, so nothing leaks in. */
function withoutNodePath(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.NODE_PATH;
  return env;
}

describe('devkitModuleRoots', () => {
  it('names a directory that holds @sharpee/platform-browser', () => {
    const roots = devkitModuleRoots();
    expect(roots.length).toBeGreaterThan(0);
    const holding = roots.filter((root) => {
      try {
        return statSync(join(root, '@sharpee', 'platform-browser')).isDirectory();
      } catch {
        return false;
      }
    });
    expect(holding.length).toBeGreaterThan(0);
  });
});

describe('runtimeResolveBases', () => {
  it('puts the project ahead of devkit', () => {
    const bases = runtimeResolveBases('/some/project');
    expect(bases[0]).toBe('/some/project');
    expect(bases).toHaveLength(2);
  });
});

describe('esbuildEnv', () => {
  it('keeps a NODE_PATH the caller set ahead of devkit\'s roots', () => {
    const env = esbuildEnv({ NODE_PATH: ['/sealed/a', '/sealed/b'].join(delimiter) });
    const parts = (env.NODE_PATH ?? '').split(delimiter);
    expect(parts.slice(0, 2)).toEqual(['/sealed/a', '/sealed/b']);
    expect(parts.slice(2)).toEqual(devkitModuleRoots());
  });

  it('does not modify the environment it was given', () => {
    const base: NodeJS.ProcessEnv = { OTHER: 'kept' };
    const env = esbuildEnv(base);
    expect(base.NODE_PATH).toBeUndefined();
    expect(env.OTHER).toBe('kept');
  });

  describe('bundling from a folder with no node_modules', () => {
    let dir = '';
    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true });
      dir = '';
    });

    const ENTRY =
      "import { BrowserClient } from '@sharpee/platform-browser';\n" +
      "import { Parser } from '@sharpee/parser-en-us';\n" +
      'console.log(typeof BrowserClient, typeof Parser);\n';

    it('resolves the runtime packages through devkit\'s install', () => {
      dir = mkdtempSync(join(tmpdir(), 'runtime-packages-'));
      writeFileSync(join(dir, 'entry.js'), ENTRY);
      bundle(dir, esbuildEnv(withoutNodePath()));
      expect(statSync(join(dir, 'out.js')).size).toBeGreaterThan(1000);
    });

    it('fails without that environment, which is the defect', () => {
      dir = mkdtempSync(join(tmpdir(), 'runtime-packages-'));
      writeFileSync(join(dir, 'entry.js'), ENTRY);
      expect(() => bundle(dir, withoutNodePath())).toThrow(/Could not resolve/);
    });
  });
});
