/**
 * Real-path test for the browser scaffold (ADR-185). Runs the ACTUAL
 * runInitCommand → runInitBrowserCommand → runBuildBrowserCommand against the
 * devkit-owned template, then asserts the real dist/web/ deliverable: an esbuilt
 * game.js bundled from the real @sharpee/* packages, the platform-owned page +
 * engine CSS (base/engine/decorations from @sharpee/platform-browser, ADR-188),
 * and the author override stylesheet. No theme CSS ships until a package is listed
 * in `sharpee.themes`; a second build pass then proves the wiring (ADR-188 Phase 4).
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
import { runInitCommand } from './init.js';
import { runInitBrowserCommand } from './init-browser.js';
import { runBuildBrowserCommand } from './build-browser.js';

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

  it('Chord scaffold: init seeds the themes: header and wires all four into the hand-written entry', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);
    tmp = mkdtempSync(join(REPO_ROOT, '.tmp-browser-verify-'));
    projectDir = join(tmp, 'my-story');

    // Default mode IS Chord (David's 2026-07-18 ruling) — no --ts flag. Chord
    // init chains into init-browser itself, so one call scaffolds everything.
    await runInitCommand([projectDir, '-y']);

    // #249: a fresh story starts with the full built-in set; the author trims.
    const story = readFileSync(join(projectDir, 'my-story.story'), 'utf-8');
    expect(story).toContain('themes: modern-dark, retro-terminal, paper, system-6');

    // The hand-written entry (build's escape hatch) starts in sync with the
    // same set. isChord routes to chord-browser-entry.ts.template — the one
    // template whose {{THEMES_JSON}} substitution is live.
    const entry = readFileSync(join(projectDir, 'src', 'browser-entry.ts'), 'utf-8');
    expect(entry).not.toContain('{{THEMES_JSON}}');
    for (const id of ['modern-dark', 'retro-terminal', 'paper', 'system-6']) {
      expect(entry, `${id} missing from scaffolded entry`).toContain(`id: '${id}'`);
    }
  }, 60_000);

  it('scaffolds, adds deps, and builds a complete dist/web/', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {}); // quiet command chatter; keep console.error
    // process.exit(1) on a build failure would kill vitest; surface it as a test failure instead.
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    tmp = mkdtempSync(join(REPO_ROOT, '.tmp-browser-verify-'));
    projectDir = join(tmp, 'my-story'); // basename → storyId 'my-story'

    // `--ts`: this test pins the preserved TypeScript scaffold/build path
    // (Chord is the default scaffold since David's 2026-07-18 ruling; the
    // Chord browser build is covered by chord-build.test.ts).
    await runInitCommand([projectDir, '-y', '--ts']);
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

    // ADR-299 D5: the TS entry honors a pre-set pinned play seed, and it must
    // land in EngineConfig (`options.config.seed`) — a top-level `seed` on the
    // GameEngine options object is silently ignored by the constructor, which
    // is exactly how this shipped dead once (Phase 5 finding, 2026-08-03).
    // The chord entry carries the same guard in chord-build.test.ts; this path
    // had none, so the identical regression could ship here unseen.
    const bundle = readFileSync(gameJs, 'utf-8');
    expect(bundle).toContain('__SHARPEE_PLAY_SEED__');
    expect(bundle).toMatch(/config:\s*\{\s*seed:/);
    // ADR-305 D4: anchor contract + turn feed ship in every built bundle.
    expect(bundle).toContain('data-turn');
    expect(bundle).toContain('turnEvents');
    // ADR-299 D5: the same page must be able to run a forced branch — the
    // global alone proves nothing without the loadForces call behind it.
    expect(bundle).toContain('__SHARPEE_PLAY_FORCES__');
    expect(bundle).toMatch(/loadForces\(/);

    // version.ts was stamped (browser-entry imports it).
    const version = readFileSync(join(projectDir, 'src', 'version.ts'), 'utf-8');
    expect(version).toContain('export const STORY_VERSION');

    // Platform-owned page: tokens substituted, references game.js, engine CSS + override.
    const html = readFileSync(join(web, 'index.html'), 'utf-8');
    expect(html).not.toContain('{{STORY_ID}}');
    expect(html).toContain('<script src="game.js">');

    // ADR-306 Phase 2: the TS path emits the testing page too — same bundle,
    // no chrome, tokens substituted.
    const testing = readFileSync(join(web, 'index-testing.html'), 'utf-8');
    expect(testing).not.toContain('{{STORY_TITLE}}');
    expect(testing).toContain('<script src="game.js">');
    for (const chrome of ['menu-bar', 'status-line', 'THEME_LINKS', 'menu-title']) {
      expect(testing, `testing page must not carry ${chrome}`).not.toContain(chrome);
    }
    // P-3: the Reset menu item ships in the built page — the id MenuManager binds.
    expect(html).toContain('id="menu-reset"');
    expect(html).toContain('href="engine.css"');
    expect(html).toContain('href="my-story.css"');

    // Engine CSS present (base/engine/decorations from @sharpee/platform-browser, ADR-188).
    for (const css of ['base.css', 'engine.css', 'decorations.css']) {
      expect(existsSync(join(web, css)), `${css} missing`).toBe(true);
    }
    // No stale monolith (AC-4's other half).
    expect(existsSync(join(web, 'styles.css')), 'styles.css should not ship').toBe(false);
    // #249: the scaffold seeds all four built-ins, so a fresh project's first
    // build ships them — CSS copied and linked, no silent menu-without-CSS.
    for (const id of ['modern-dark', 'retro-terminal', 'paper', 'system-6']) {
      expect(existsSync(join(web, 'themes', `${id}.css`)), `${id}.css missing from scaffold build`).toBe(true);
      expect(html).toContain(`href="themes/${id}.css"`);
    }

    // Author override emitted (stubbed if absent; here seeded by init-browser).
    expect(existsSync(join(web, 'my-story.css'))).toBe(true);

    // AC-4: de-listing every theme un-ships them — no theme CSS/fonts linger.
    const pkgPath = join(projectDir, 'package.json');
    const proj = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    proj.sharpee = { ...(proj.sharpee || {}), themes: [] };
    writeFileSync(pkgPath, JSON.stringify(proj, null, 2));
    await runBuildBrowserCommand([], projectDir);
    expect(existsSync(join(web, 'themes')), 'themes/ should not ship when none listed').toBe(false);

    // ADR-188 (AC-3/AC-5/AC-9): `sharpee.themes` wires a BUILT-IN theme (by id, from
    // platform-browser) AND an AUTHOR theme (inline { id, name }, CSS in the override).
    proj.sharpee = {
      ...(proj.sharpee || {}),
      themes: ['modern-dark', { id: 'my-theme', name: 'My Theme' }],
    };
    writeFileSync(pkgPath, JSON.stringify(proj, null, 2));

    await runBuildBrowserCommand([], projectDir);

    const themed = readFileSync(join(web, 'index.html'), 'utf-8');
    // Built-in: CSS copied to themes/<id>.css, linked AFTER the engine and BEFORE the
    // author override so the cascade is correct.
    expect(existsSync(join(web, 'themes', 'modern-dark.css')), 'built-in CSS missing').toBe(true);
    expect(themed).toContain('href="themes/modern-dark.css"');
    expect(themed.indexOf('engine.css')).toBeLessThan(themed.indexOf('themes/modern-dark.css'));
    expect(themed.indexOf('themes/modern-dark.css')).toBeLessThan(themed.indexOf('my-story.css'));
    // Author theme: NO CSS copied (it lives in the override stylesheet), but it DOES
    // reach the menu — via the page's wired-themes DATA block, which is what
    // ThemeManager renders the menu from at runtime (P-4). The build no longer
    // writes menu MARKUP at all; the static page carries the list as JSON and
    // an untouched #theme-menu for the client to fill.
    expect(existsSync(join(web, 'themes', 'my-theme.css')), 'author theme must not copy CSS').toBe(false);
    expect(themed).toContain('<script id="sharpee-wired-themes" type="application/json">');
    expect(themed).toContain('{"id":"modern-dark","name":"Modern Dark"}');
    expect(themed).toContain('{"id":"my-theme","name":"My Theme"}');
    expect(themed).not.toContain('data-theme="modern-dark">');
  }, 240_000);
});
