/**
 * chord-import-browser.test.ts — ADR-251 imports × ADR-284 publishing,
 * REAL-PATH.
 *
 * The ACTUAL runInitCommand (Chord default) → runBuildBrowserCommand chain
 * against the devkit-owned template: a story that `import "<file>"`s a real
 * `.chord` fragment is built for the browser, and the fragment is resolved
 * INTO the embedded IR at build time. No stubs — the real chord compiler
 * resolves the real fragment off disk and real esbuild bundles the entry.
 *
 * The inline-bundle shape these cases used to pin (imports.json fetched at
 * boot, David 2026-07-21) is gone: the page reads no files at all, which is
 * what lets a published zip run from `file://`. `story.story` and
 * `imports.json` now travel only under `publish-source: yes`, as artifacts
 * for a reader rather than inputs to the page.
 *
 * Scratch project lives inside the repo so esbuild resolves @sharpee/* from
 * the monorepo node_modules (browser-build.test.ts precedent).
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

/** Add `publish-source: <value>` to the story header, under `title:`. */
function withPublishSource(source: string, value: string): string {
  return source.replace(/^(\s*title:.*)$/m, `$1\n  publish-source: ${value}`);
}

/**
 * The story's output dir, cleared first.
 *
 * `buildBrowser` deliberately does NOT clear (correct for an iterative build —
 * only `publish` clears, ADR-284 A1). These cases assert on the ABSENCE of
 * `story.story`, so without this an earlier case's shipped source would still
 * be sitting there and the absence would be untestable.
 */
function freshOutDir(): string {
  const outDir = join(projectDir, 'dist', 'web', 'harbor');
  rmSync(outDir, { recursive: true, force: true });
  return outDir;
}

describe('ADR-251 imports × ADR-284 publishing', () => {
  it('an imported fragment is resolved into the embedded IR, not shipped for the page to fetch', async () => {
    const good = readFileSync(storyPath, 'utf-8');
    try {
      writeFileSync(join(projectDir, 'extras.chord'), FRAGMENT);
      writeFileSync(storyPath, good + '\nimport "extras"\n');
      const outDir = freshOutDir();
      await runBuildBrowserCommand([], projectDir);

      // Nothing to fetch: `publish-source:` is absent, so neither the source
      // nor its fragments travel — the compiler resolved them at build time.
      expect(existsSync(join(outDir, 'imports.json'))).toBe(false);
      expect(existsSync(join(outDir, 'harbor.story'))).toBe(false);
      // The fragment's CONTENT is in the bundle regardless, proving the
      // import was resolved rather than merely dropped.
      const game = readFileSync(join(outDir, 'game.js'), 'utf-8');
      expect(game).toContain('The cold finds you.');
      expect(game).not.toContain("fetch('./imports.json')");
    } finally {
      writeFileSync(storyPath, good);
    }
  }, 120_000);

  it('`publish-source: yes` ships the source AND its fragments, verbatim', async () => {
    const good = readFileSync(storyPath, 'utf-8');
    try {
      writeFileSync(join(projectDir, 'extras.chord'), FRAGMENT);
      const released = withPublishSource(good, 'yes') + '\nimport "extras"\n';
      writeFileSync(storyPath, released);
      const outDir = freshOutDir();
      await runBuildBrowserCommand([], projectDir);

      // A source release that omitted the fragments would not compile for
      // whoever received it, so the two travel together or not at all.
      // Shipped under the AUTHOR'S filename, not a generic `story.story`.
      expect(existsSync(join(outDir, 'story.story'))).toBe(false);
      expect(readFileSync(join(outDir, 'harbor.story'), 'utf-8')).toBe(released);
      const bundle = JSON.parse(readFileSync(join(outDir, 'imports.json'), 'utf-8')) as Record<string, string>;
      expect(bundle['extras.chord']).toBe(FRAGMENT);
    } finally {
      writeFileSync(storyPath, good);
    }
  }, 120_000);

  it('`publish-source: no` ships neither, the same as leaving it out', async () => {
    const good = readFileSync(storyPath, 'utf-8');
    try {
      writeFileSync(storyPath, withPublishSource(good, 'no'));
      const outDir = freshOutDir();
      await runBuildBrowserCommand([], projectDir);

      expect(existsSync(join(outDir, 'harbor.story'))).toBe(false);
      expect(existsSync(join(outDir, 'imports.json'))).toBe(false);
    } finally {
      writeFileSync(storyPath, good);
    }
  }, 120_000);
});
