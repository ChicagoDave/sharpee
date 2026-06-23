/**
 * Real-path test for the browser scaffold (ADR-185). Runs the ACTUAL
 * runInitCommand → runInitBrowserCommand → runBuildBrowserCommand against the
 * devkit-owned template, then asserts the real dist/web/ deliverable: an esbuilt
 * game.js bundled from the real @sharpee/* packages, the platform-owned page +
 * CSS + theme fonts, and the author override stylesheet.
 *
 * No stubs of esbuild or the template — this is the integration's acceptance
 * gate (Integration Reality). The scratch project is created INSIDE the repo so
 * esbuild resolves @sharpee/* by walking up to the monorepo node_modules; it
 * therefore exercises bundling against the built packages, not npm-registry
 * availability of the pinned versions (a separate, install-time concern).
 */
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runInitCommand } from './init';
import { runInitBrowserCommand } from './init-browser';
import { runBuildBrowserCommand } from './build-browser';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');

describe('browser scaffold (real path)', () => {
  let tmp = '';
  let projectDir = '';

  beforeAll(() => {
    // Sanity: the packages browser-entry imports must resolve from the repo, or
    // esbuild can't bundle and this test would be meaningless.
    for (const p of ['engine', 'world-model', 'parser-en-us', 'lang-en-us', 'stdlib', 'platform-browser', 'sharpee']) {
      expect(() => require.resolve(`@sharpee/${p}`), `@sharpee/${p} unresolved`).not.toThrow();
    }
  });

  afterEach(() => {
    if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('scaffolds, adds deps, and builds a complete dist/web/', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); // quiet command chatter; keep console.error
    // process.exit(1) on a build failure would kill vitest; surface it as a test failure instead.
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    tmp = mkdtempSync(join(REPO_ROOT, '.tmp-browser-verify-'));
    projectDir = join(tmp, 'my-story'); // basename → storyId 'my-story'

    await runInitCommand([projectDir, '-y']);
    await runInitBrowserCommand([], projectDir);

    // init-browser: entry wired + override seeded + runtime deps added.
    const entry = readFileSync(join(projectDir, 'src', 'browser-entry.ts'), 'utf-8');
    expect(entry).not.toContain('{{STORY_ID}}');
    expect(entry).toContain("storagePrefix: 'my-story-'");
    // The scaffold tsconfig is NodeNext: relative imports MUST carry .js or the
    // author's `npm run build` (tsc) fails (TS2835). Regression guard.
    expect(entry).toContain("from './index.js'");
    expect(entry).toContain("from './version.js'");
    expect(existsSync(join(projectDir, 'browser', 'my-story.css'))).toBe(true);

    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'));
    for (const dep of ['@sharpee/engine', '@sharpee/parser-en-us', '@sharpee/lang-en-us', '@sharpee/stdlib', '@sharpee/platform-browser']) {
      expect(pkg.dependencies[dep], `${dep} missing`).toMatch(/^\^\d+\.\d+\.\d+$/);
    }
    // version.ts is seeded NOW (at init-browser), not only at build-browser time — so
    // `sharpee build` (tsc over src/, incl. browser-entry → ./version) compiles before any
    // browser build. Regression guard for the TS2307 "Cannot find module './version.js'" bug.
    const seededVersion = readFileSync(join(projectDir, 'src', 'version.ts'), 'utf-8');
    expect(seededVersion).toContain('export const STORY_VERSION');

    // Author assets (ADR-187 AC-2): a referenced media path under assets/ must be
    // bundled so audio/x.mp3 resolves in the served output; dotfiles are skipped.
    mkdirSync(join(projectDir, 'assets', 'audio'), { recursive: true });
    writeFileSync(join(projectDir, 'assets', 'audio', 'ambience.mp3'), 'FAKE-MP3-BYTES');
    writeFileSync(join(projectDir, 'assets', '.DS_Store'), 'junk');

    await runBuildBrowserCommand([], projectDir);

    const web = join(projectDir, 'dist', 'web');

    // ADR-187 AC-2: assets/ contents copied (audio/ambience.mp3 → web/audio/ambience.mp3),
    // path preserved; the dotfile was NOT copied.
    expect(existsSync(join(web, 'audio', 'ambience.mp3'))).toBe(true);
    expect(readFileSync(join(web, 'audio', 'ambience.mp3'), 'utf-8')).toBe('FAKE-MP3-BYTES');
    expect(existsSync(join(web, '.DS_Store'))).toBe(false);

    // The bundle exists, is non-empty, and is named game.js (what index.html loads).
    const gameJs = join(web, 'game.js');
    expect(existsSync(gameJs)).toBe(true);
    expect(statSync(gameJs).size).toBeGreaterThan(10_000); // a real bundle, not an empty file

    // version.ts was stamped (browser-entry imports it).
    const version = readFileSync(join(projectDir, 'src', 'version.ts'), 'utf-8');
    expect(version).toContain('export const STORY_VERSION');

    // Platform-owned page: tokens substituted, references game.js + the override sheet.
    const html = readFileSync(join(web, 'index.html'), 'utf-8');
    expect(html).not.toContain('{{STORY_ID}}');
    expect(html).toContain('<script src="game.js">');
    expect(html).toContain('href="my-story.css"');

    // Platform-owned CSS + theme fonts present.
    for (const css of ['base.css', 'decorations.css', 'styles.css']) {
      expect(existsSync(join(web, css)), `${css} missing`).toBe(true);
    }
    expect(existsSync(join(web, 'themes', 'system-6', 'fonts', 'ChicagoFLF.woff2'))).toBe(true);

    // Author override emitted (stubbed if absent; here seeded by init-browser).
    expect(existsSync(join(web, 'my-story.css'))).toBe(true);
  }, 180_000);
});
