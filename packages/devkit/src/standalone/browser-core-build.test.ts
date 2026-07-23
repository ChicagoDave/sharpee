/**
 * REAL-PATH acceptance gate for the ADR-252 shared build core (Integration
 * Reality, rule 13a). Runs the ACTUAL buildBrowser() against the real fernhill
 * `.story`, the real chord compiler, and real esbuild bundling @sharpee/* from
 * the monorepo node_modules — no stub of any owned dependency.
 *
 * The core is the OWNED integration these tests exercise without injection:
 *  - a bare `.story` builds to a browser app with NO package.json (D1/D2);
 *  - the author env and the in-repo env produce BYTE-IDENTICAL output (D5) —
 *    the acceptance the two copy-drifted builds could never make;
 *  - the generated entry (D4) builds when no hand-written entry exists;
 *  - an unknown `client:` and a hybrid project are rejected (D1).
 */
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { buildBrowser, buildPlaygroundBundle, type BrowserBuildEnv, type PlaygroundBuildEnv } from './browser-core.js';
import { runBuildBrowserCommand } from './build-browser.js';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const FERNHILL = join(REPO_ROOT, 'stories', 'fernhill', 'fernhill.story');
const STYLES = join(REPO_ROOT, 'packages', 'platform-browser', 'styles');
const TEMPLATES = join(REPO_ROOT, 'packages', 'devkit', 'templates', 'browser');

/** Recursively list files under a dir as sorted relative paths. */
function walk(dir: string, base = dir, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, base, acc);
    else acc.push(relative(base, p));
  }
  return acc.sort();
}

beforeAll(() => {
  for (const p of ['engine', 'world-model', 'parser-en-us', 'lang-en-us', 'stdlib', 'platform-browser', 'chord', 'story-loader']) {
    expect(() => require.resolve(`@sharpee/${p}`), `@sharpee/${p} unresolved`).not.toThrow();
  }
});

describe('buildBrowser core (real path, ADR-252)', () => {
  const tmps: string[] = [];
  const mkroot = (prefix: string): string => {
    const t = mkdtempSync(join(REPO_ROOT, `.tmp-${prefix}-`));
    tmps.push(t);
    return t;
  };
  afterEach(() => {
    while (tmps.length) rmSync(tmps.pop()!, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('builds fernhill from a bare .story: IR metadata, no package.json in the output (D1/D2)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = mkroot('core-fernhill');
    const env: BrowserBuildEnv = { stylesDir: STYLES, templatesDir: TEMPLATES, esbuildCwd: root, engineVersion: '9.9.9' };
    const outDir = buildBrowser(FERNHILL, env, { quiet: true, buildDate: '2020-01-01T00:00:00Z' });

    // The deliverable exists and traces to the IR (fernhill id + version 0.1.0).
    expect(outDir).toBe(join(root, 'dist', 'web', 'fernhill'));
    expect(statSync(join(outDir, 'game.js')).size).toBeGreaterThan(100_000);
    // story.story is the source, byte for byte (compile-at-boot, ADR-210).
    expect(readFileSync(join(outDir, 'story.story'), 'utf-8')).toBe(readFileSync(FERNHILL, 'utf-8'));
    // NO package.json / src/index.ts anywhere in the output tree — the ADR-252 point.
    expect(existsSync(join(outDir, 'package.json'))).toBe(false);
    // ADR-253: fernhill has no src/browser-entry.ts — the entry is GENERATED, and its
    // version.ts (bundled into game.js) carries the IR version, not a package.json 1.0.0.
    expect(readFileSync(join(root, 'dist', '.browser-entry', 'fernhill', 'version.ts'), 'utf-8'))
      .toContain("STORY_VERSION = '0.1.0'");
    // index.html is fernhill's OWN custom page (ADR-253 D3): story-id token substituted
    // (override link), classic-only menu, and the clock element it places.
    const html = readFileSync(join(outDir, 'index.html'), 'utf-8');
    expect(html).toContain('href="fernhill.css"');
    expect(html).toContain('data-theme="classic">Classic<');
    expect(html).toContain('id="clock"'); // the custom page's channel element (ADR-253 D2/D3)
    expect(html).not.toContain('{{STORY_ID}}');
  }, 120_000);

  it('author env and in-repo env produce byte-identical output for the same input (D5)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const FIX = { quiet: true, buildDate: '2020-01-01T00:00:00Z' } as const;
    const rootA = mkroot('core-author');
    const rootB = mkroot('core-inrepo');
    // Author env: no mirror (author mode). In-repo env: a mirror that targets a
    // throwaway dir so the website tree is untouched by the test.
    const mirrorDir = mkroot('core-mirror');
    const outA = buildBrowser(FERNHILL, { stylesDir: STYLES, templatesDir: TEMPLATES, esbuildCwd: rootA, engineVersion: '9.9.9' }, FIX);
    const outB = buildBrowser(
      FERNHILL,
      { stylesDir: STYLES, templatesDir: TEMPLATES, esbuildCwd: rootB, engineVersion: '9.9.9', mirror: (o, id) => void [o, id, mirrorDir] },
      FIX,
    );

    const filesA = walk(outA);
    const filesB = walk(outB);
    expect(filesB).toEqual(filesA);
    for (const f of filesA) {
      expect(readFileSync(join(outA, f)).equals(readFileSync(join(outB, f))), `${f} differs`).toBe(true);
    }
  }, 180_000);

  it('generates the browser entry from the template when no hand-written one exists (D4)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = mkroot('core-generated');
    // A pure-IR story with NO src/browser-entry.ts — the generated-entry path.
    const storyFile = join(root, 'panel.story');
    writeFileSync(
      storyFile,
      `story "Panel Proof" by "T"\n  id: panelproof\n  version: 0.0.1\n\ncreate the Hall\n  a room\n\n  A bare proving hall.\n\ncreate the player\n  starts in the Hall\n\n  You.\n`,
    );
    const env: BrowserBuildEnv = { stylesDir: STYLES, templatesDir: TEMPLATES, esbuildCwd: root, engineVersion: '9.9.9' };
    const outDir = buildBrowser(storyFile, env, { quiet: true, buildDate: '2020-01-01T00:00:00Z' });

    // A generated entry was written to the build-scratch dir and bundled.
    const generated = readFileSync(join(root, 'dist', '.browser-entry', 'panelproof', 'browser-entry.ts'), 'utf-8');
    expect(generated).not.toContain('{{'); // all tokens substituted
    expect(generated).toContain("storagePrefix: 'panelproof-'");
    expect(generated).toContain('themes: []'); // no themes declared → empty menu list
    expect(statSync(join(outDir, 'game.js')).size).toBeGreaterThan(100_000);
  }, 120_000);

  it('uses a story custom browser/index.html and warns on an unplaced channel + missing engine.css (D3)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnings: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: string) => warnings.push(m));
    const root = mkroot('core-custompage');
    const storyFile = join(root, 'ch.story');
    writeFileSync(
      storyFile,
      `story "Ch" by "T"\n  id: ch\n\ncreate the Hall\n  a room\n\n  A hall.\n\ncreate the clock\n  in the Hall\n\n  A clock.\n\n  on every turn\n    emit tick with beat "steady"\n  end on\n\ncreate the player\n  starts in the Hall\n\n  You.\n\ndefine channel beat\n  mode replace\n  return beat from tick\nend channel\n`,
    );
    // A custom page that does NOT link engine.css and has no #beat element → two warnings.
    mkdirSync(join(root, 'browser'), { recursive: true });
    writeFileSync(
      join(root, 'browser', 'index.html'),
      '<!DOCTYPE html><html data-theme="classic"><body><div id="text-content"></div><input id="command-input"><script src="game.js"></script></body></html>',
    );
    const env: BrowserBuildEnv = { stylesDir: STYLES, templatesDir: TEMPLATES, esbuildCwd: root, engineVersion: '9.9.9' };
    const outDir = buildBrowser(storyFile, env, { quiet: true, buildDate: '2020-01-01T00:00:00Z' });

    const html = readFileSync(join(outDir, 'index.html'), 'utf-8');
    expect(html).toContain('id="text-content"'); // the author's page was used…
    expect(html).not.toContain('sharpee-window'); // …not the default template
    const warned = warnings.join('\n');
    expect(warned).toMatch(/does not link engine\.css/);
    expect(warned).toMatch(/channel 'beat' has no #beat element/);
  }, 120_000);

  it('rejects a story naming a client the build cannot produce (D1 rejection)', () => {
    const root = mkroot('core-badclient');
    const storyFile = join(root, 'x.story');
    writeFileSync(storyFile, `story "X" by "T"\n  id: x\n  client: terminal\n\ncreate the Hall\n  a room\n\n  Hall.\n\ncreate the player\n  starts in the Hall\n\n  You.\n`);
    const env: BrowserBuildEnv = { stylesDir: STYLES, templatesDir: TEMPLATES, esbuildCwd: root, engineVersion: '9.9.9' };
    expect(() => buildBrowser(storyFile, env, { quiet: true })).toThrow(/unknown client 'terminal'/);
  });

  it('fails before emit on an uncompilable .story (diagnostics, no bundle)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = mkroot('core-badstory');
    const storyFile = join(root, 'bad.story');
    // References an entity that does not exist → analysis gate error.
    writeFileSync(storyFile, `story "Bad" by "T"\n  id: bad\n\ncreate the player\n  starts in the Nowhere\n\n  You.\n`);
    const env: BrowserBuildEnv = { stylesDir: STYLES, templatesDir: TEMPLATES, esbuildCwd: root, engineVersion: '9.9.9' };
    expect(() => buildBrowser(storyFile, env, { quiet: true })).toThrow(/failed the load-time gates/);
    expect(existsSync(join(root, 'dist', 'web', 'bad', 'game.js'))).toBe(false);
  });
});

describe('runBuildBrowserCommand dispatch (ADR-252 D1)', () => {
  let tmp = '';
  afterEach(() => {
    if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('errors on a hybrid project holding both a .story and src/index.ts', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    tmp = mkdtempSync(join(REPO_ROOT, '.tmp-hybrid-'));
    writeFileSync(join(tmp, 'x.story'), `story "X" by "T"\n  id: x\n\ncreate the player\n  a room\n`);
    mkdirSync(join(tmp, 'src'), { recursive: true });
    writeFileSync(join(tmp, 'src', 'index.ts'), 'export const story = {};\n');

    await expect(runBuildBrowserCommand([], tmp)).rejects.toThrow('process.exit(1)');
    const err = stderr.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(err).toMatch(/both a .story file and src\/index\.ts/);
  });
});

describe('buildPlaygroundBundle core (real path, ADR-191)', () => {
  const tmps: string[] = [];
  const mkroot = (prefix: string): string => {
    const t = mkdtempSync(join(REPO_ROOT, `.tmp-${prefix}-`));
    tmps.push(t);
    return t;
  };
  afterEach(() => {
    while (tmps.length) rmSync(tmps.pop()!, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('builds a story-AGNOSTIC bundle pinned to the platform version (no story baked in)', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = mkroot('pg-core');
    const env: PlaygroundBuildEnv = {
      stylesDir: STYLES,
      templatesDir: TEMPLATES,
      esbuildCwd: root,
      engineVersion: '9.9.9',
    };
    const outDir = buildPlaygroundBundle(env, { quiet: true, buildDate: '2020-01-01T00:00:00Z' });

    // The deliverable exists at dist/playground/ with a real bundle.
    expect(outDir).toBe(join(root, 'dist', 'playground'));
    expect(statSync(join(outDir, 'game.js')).size).toBeGreaterThan(100_000);
    expect(existsSync(join(outDir, 'index.html'))).toBe(true);
    for (const css of ['base.css', 'engine.css', 'decorations.css', 'playground.css']) {
      expect(existsSync(join(outDir, css)), `${css} missing`).toBe(true);
    }
    // Story-agnostic: NO story source, NO imports, NO per-story assets.
    expect(existsSync(join(outDir, 'story.story'))).toBe(false);
    expect(existsSync(join(outDir, 'imports.json'))).toBe(false);
    // The generated entry's version.ts carries the pinned platform version (AC-8).
    expect(readFileSync(join(root, 'dist', '.playground-entry', 'version.ts'), 'utf-8'))
      .toContain("STORY_VERSION = '9.9.9'");
  }, 120_000);

  it('invokes the sync callback with the output dir and pinned version', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const root = mkroot('pg-sync');
    const calls: Array<{ outDir: string; version: string }> = [];
    const env: PlaygroundBuildEnv = {
      stylesDir: STYLES,
      templatesDir: TEMPLATES,
      esbuildCwd: root,
      engineVersion: '1.2.3',
      sync: (outDir, version) => calls.push({ outDir, version }),
    };
    const outDir = buildPlaygroundBundle(env, { quiet: true });
    expect(calls).toEqual([{ outDir, version: '1.2.3' }]);
  }, 120_000);
});
