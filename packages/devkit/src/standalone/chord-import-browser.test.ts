/**
 * chord-import-browser.test.ts — ADR-251 Phase 3 REAL-PATH test.
 *
 * The ACTUAL runInitCommand (Chord default) → runBuildBrowserCommand chain
 * against the devkit-owned template: a story that `import "<file>"`s a real
 * `.chord` fragment is built for the browser, and the resolved fragment
 * ships as dist/web/imports.json for compile-at-boot (inline-bundle shape,
 * David 2026-07-21). No stubs — the real chord compiler resolves the real
 * fragment off disk, real esbuild bundles the updated entry (which fetches
 * imports.json). Also proves the negative: a story with no imports ships NO
 * imports.json, so the single-file path is unchanged. Scratch project lives
 * inside the repo so esbuild resolves @sharpee/* from the monorepo
 * node_modules (browser-build.test.ts / chord-build.test.ts precedent).
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInitCommand } from './init.js';
import { runBuildBrowserCommand } from './build-browser.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

let tmp = '';
let projectDir = '';
let storyPath = '';

const FRAGMENT =
  '## split-out voice fragment (ADR-251)\n\ndefine phrasebook harbor-voice\n  cold-returns:\n    The cold finds you.\nend phrasebook\n';

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {}); // quiet scaffold/build chatter
  vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
    throw new Error(`process.exit(${code})`);
  }) as never);
  tmp = mkdtempSync(join(REPO_ROOT, '.tmp-chord-import-'));
  projectDir = join(tmp, 'harbor'); // basename → storyId 'harbor', source harbor.story
  await runInitCommand([projectDir, '-y']);
  storyPath = join(projectDir, 'harbor.story');
}, 30_000);

afterAll(() => {
  vi.restoreAllMocks();
  if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
});

describe('ADR-251 Phase 3 — browser inline-bundle imports', () => {
  it('a story with no imports ships no imports.json (single-file path unchanged)', async () => {
    await runBuildBrowserCommand([], projectDir);
    expect(existsSync(join(projectDir, 'dist', 'web', 'harbor', 'imports.json'))).toBe(false);
    // The updated entry still wires the resolver + fetch (harmless with no imports).
    const game = readFileSync(join(projectDir, 'dist', 'web', 'harbor', 'game.js'), 'utf-8');
    expect(game).toContain('imports.json');
  }, 120_000);

  it('a story importing a real .chord ships it as imports.json for compile-at-boot', async () => {
    const good = readFileSync(storyPath, 'utf-8');
    try {
      writeFileSync(join(projectDir, 'extras.chord'), FRAGMENT);
      writeFileSync(storyPath, good + '\nimport "extras"\n');
      await runBuildBrowserCommand([], projectDir);

      const bundlePath = join(projectDir, 'dist', 'web', 'harbor', 'imports.json');
      expect(existsSync(bundlePath)).toBe(true);
      const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8')) as Record<string, string>;
      // Keyed by the compiler-appended `<name>.chord`; value is the verbatim fragment.
      expect(bundle['extras.chord']).toBe(FRAGMENT);
      // The build still produced a real bundle (the updated entry compiled).
      expect(existsSync(join(projectDir, 'dist', 'web', 'harbor', 'game.js'))).toBe(true);
    } finally {
      writeFileSync(storyPath, good);
    }
  }, 120_000);
});
