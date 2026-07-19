/**
 * Unit tests for resolveEngineStylesDir (ADR-188) — the build's locator for
 * @sharpee/platform-browser's bundled `styles/` (engine CSS + built-in themes).
 *
 * Regression guard: the original locator used `require.resolve('…/package.json')`,
 * which works in-repo (the source package.json exposes the subpath) but throws
 * against a PUBLISHED install — tsf flattens `exports` to `.`-only and ships
 * styles/ as plain asset files. These tests exercise BOTH layouts with synthetic
 * fixtures, so the published (flat) path is covered without an actual publish.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveEngineStylesDir } from './build-browser.js';

/** Create node_modules/@sharpee/platform-browser under `root` in the given layout. */
function makePlatformBrowser(
  root: string,
  layout: 'flat' | 'nested',
  opts: { withStyles?: boolean } = {},
): string {
  const withStyles = opts.withStyles !== false;
  const pkgDir = join(root, 'node_modules', '@sharpee', 'platform-browser');
  // The published layout is flat (index.js at the package root); the in-repo
  // layout emits to dist/.
  const mainRel = layout === 'flat' ? './index.js' : './dist/index.js';
  const mainAbs = join(pkgDir, mainRel);
  mkdirSync(join(mainAbs, '..'), { recursive: true });
  writeFileSync(mainAbs, 'module.exports = {};\n');
  writeFileSync(
    join(pkgDir, 'package.json'),
    JSON.stringify({
      name: '@sharpee/platform-browser',
      version: '1.1.2',
      main: mainRel,
      // tsf publishes a `.`-only exports map — no `./package.json`, no `./styles/*`.
      exports: { '.': { require: mainRel, default: mainRel } },
    }),
  );
  if (withStyles) {
    mkdirSync(join(pkgDir, 'styles'), { recursive: true });
    writeFileSync(join(pkgDir, 'styles', 'engine.css'), ':root{}\n');
  }
  return join(pkgDir, 'styles');
}

describe('resolveEngineStylesDir', () => {
  let tmp = '';
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = '';
  });

  // require.resolve returns a realpath, so compare against the realpath of the
  // fixture (macOS /var → /private/var symlink).
  it('finds styles/ in the PUBLISHED flat layout (index.js + styles/ at root)', () => {
    tmp = mkdtempSync(join(tmpdir(), 'pb-flat-'));
    const stylesDir = makePlatformBrowser(tmp, 'flat');
    expect(resolveEngineStylesDir(tmp)).toBe(realpathSync(stylesDir));
  });

  it('finds styles/ in the in-repo NESTED layout (dist/index.js, styles/ at parent)', () => {
    tmp = mkdtempSync(join(tmpdir(), 'pb-nested-'));
    const stylesDir = makePlatformBrowser(tmp, 'nested');
    expect(resolveEngineStylesDir(tmp)).toBe(realpathSync(stylesDir));
  });

  it('throws when the package resolves but ships no styles/', () => {
    tmp = mkdtempSync(join(tmpdir(), 'pb-nostyles-'));
    makePlatformBrowser(tmp, 'flat', { withStyles: false });
    expect(() => resolveEngineStylesDir(tmp)).toThrow(/Could not locate .*styles/);
  });
});
