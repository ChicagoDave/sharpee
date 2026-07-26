/**
 * hatch-transpile-error.test.ts — ADR-274 D2: a cold hatch transpile that
 * cannot get a working esbuild is a named error, never a hang; author-code
 * build failures pass through as esbuild's own BuildFailure; the warm path
 * still costs one existsSync (ADR-259 D6 unchanged).
 *
 * The environmental case runs in a REAL node subprocess against devkit's
 * compiled dist, with a --require preload making `require('esbuild')` throw —
 * inside the repo tree esbuild always resolves, so simulation is the only way
 * to reach that branch here. The bundle-level real path (no node_modules at
 * all) is ADR-274 acceptance 3, verified against dist/cli/sharpee.js.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { requireHatchModule, HatchTranspileError } from '../src/standalone/hatch-transpile.js';

const DIST_MODULE = path.resolve(__dirname, '..', 'dist', 'standalone', 'hatch-transpile.js');
const PRELOAD = path.resolve(__dirname, 'fixtures', 'no-esbuild-preload.cjs');

/** A fresh story dir holding one hatch module with unique content (cold cache guaranteed). */
function freshHatch(sourceText: string): { dir: string; cachePath: string } {
  const dir = mkdtempSync(path.join(tmpdir(), 'hatch-err-test-'));
  const tsPath = path.join(dir, 'extras.ts');
  writeFileSync(tsPath, sourceText, 'utf-8');
  const hash = createHash('sha256')
    .update(tsPath)
    .update('\0')
    .update(sourceText)
    .digest('hex')
    .slice(0, 16);
  return { dir, cachePath: path.join(tmpdir(), 'sharpee-hatch', `${hash}.cjs`) };
}

describe('hatch transpile failure modes (ADR-274 D2)', () => {
  it('cold transpile with esbuild unresolvable throws HatchTranspileError naming the remedy', () => {
    const { dir } = freshHatch(`export const marker = ${JSON.stringify(Math.random())};\n`);
    let output = '';
    try {
      execFileSync(
        process.execPath,
        [
          '--require',
          PRELOAD,
          '-e',
          `require(${JSON.stringify(DIST_MODULE)}).requireHatchModule(${JSON.stringify(dir)}, './extras.ts')`,
        ],
        { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 },
      );
    } catch (err) {
      output = String((err as { stderr?: string }).stderr ?? err);
    }
    expect(output, 'the subprocess must fail, not succeed').toContain('HatchTranspileError');
    expect(output).toContain('esbuild is not available to the CLI bundle');
    expect(output).toContain('Run pnpm install in the workspace');
  });

  it("an author's syntax error passes through as esbuild's BuildFailure, not HatchTranspileError", () => {
    const { dir, cachePath } = freshHatch(`export const broken = {;\n`);
    let thrown: unknown;
    try {
      requireHatchModule(dir, './extras.ts');
    } catch (err) {
      thrown = err;
    }
    expect(thrown, 'the transpile must reject').toBeTruthy();
    expect(thrown).not.toBeInstanceOf(HatchTranspileError);
    expect(Array.isArray((thrown as { errors?: unknown }).errors)).toBe(true);
    expect(existsSync(cachePath), 'a failed build must not populate the cache').toBe(false);
  });

  it('warm path: second load reuses the cached .cjs without re-transpiling', () => {
    const { dir, cachePath } = freshHatch(
      `export const marker = ${JSON.stringify(`warm-${Math.random()}`)};\n`,
    );
    const first = requireHatchModule(dir, './extras.ts');
    expect(existsSync(cachePath), 'cold load populates the cache').toBe(true);
    const mtime = statSync(cachePath).mtimeMs;
    const second = requireHatchModule(dir, './extras.ts');
    expect(second).toEqual(first);
    expect(statSync(cachePath).mtimeMs, 'warm load must not rewrite the cache file').toBe(mtime);
  });
});
