/**
 * browser.test.ts — rejection-path unit tests for the browser client build.
 * Byte-for-byte parity with build.sh is covered by scripts/parity-browser.sh.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildBrowserClient,
  chordStoryFile,
  mirrorToWebsite,
  processStoryTokens,
  writeOverrideStylesheet,
} from './browser';
import { findMonorepoRoot } from '../repo';

describe('buildBrowserClient rejection paths (TypeScript story)', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'devkit-browser-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('throws when the story does not exist', () => {
    expect(() => buildBrowserClient(root, 'nope', { quiet: true })).toThrow(/story not found/);
  });

  it('throws when the story has no browser-entry.ts', () => {
    mkdirSync(join(root, 'stories', 'foo', 'src'), { recursive: true });
    expect(() => buildBrowserClient(root, 'foo', { quiet: true })).toThrow(/browser entry not found/);
  });
});

describe('chordStoryFile — Chord vs TypeScript story detection (ADR-252 D5)', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'devkit-chorddetect-'));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('returns the .story path for a Chord story (routes to the shared core)', () => {
    mkdirSync(join(root, 'stories', 'ferny'), { recursive: true });
    writeFileSync(join(root, 'stories', 'ferny', 'ferny.story'), 'story "F" by "T"\n  id: ferny\n');
    expect(chordStoryFile(root, 'ferny')).toBe(join(root, 'stories', 'ferny', 'ferny.story'));
  });

  it('returns null for a TypeScript story (dungeo shape — keeps the legacy path)', () => {
    mkdirSync(join(root, 'stories', 'tsy', 'src'), { recursive: true });
    writeFileSync(join(root, 'stories', 'tsy', 'src', 'index.ts'), 'export const story = {};\n');
    expect(chordStoryFile(root, 'tsy')).toBeNull();
  });

  it('returns null when the story does not exist', () => {
    expect(chordStoryFile(root, 'ghost')).toBeNull();
  });
});

describe('writeOverrideStylesheet — the story override the TS path used to drop (#147)', () => {
  let root: string;
  let storyDir: string;
  let outDir: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'repokit-override-'));
    storyDir = join(root, 'stories', 'dungeo');
    outDir = join(root, 'dist', 'web', 'dungeo');
    mkdirSync(outDir, { recursive: true });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("copies the story's browser/<id>.css into the deliverable", () => {
    mkdirSync(join(storyDir, 'browser'), { recursive: true });
    writeFileSync(join(storyDir, 'browser', 'dungeo.css'), '[data-theme="cave"]{--x:1}\n');

    const copied = writeOverrideStylesheet(storyDir, outDir, 'dungeo');

    expect(copied).toBe(true);
    expect(readFileSync(join(outDir, 'dungeo.css'), 'utf8')).toContain('[data-theme="cave"]');
  });

  it('writes a placeholder when the story ships no override, so the link never 404s', () => {
    mkdirSync(storyDir, { recursive: true });

    const copied = writeOverrideStylesheet(storyDir, outDir, 'dungeo');

    expect(copied).toBe(false);
    expect(existsSync(join(outDir, 'dungeo.css'))).toBe(true);
    expect(readFileSync(join(outDir, 'dungeo.css'), 'utf8')).toMatch(/^\/\*.*\*\/\n$/);
  });

  it('overwrites a stale override from a previous build', () => {
    mkdirSync(join(storyDir, 'browser'), { recursive: true });
    writeFileSync(join(outDir, 'dungeo.css'), '.stale{}');
    writeFileSync(join(storyDir, 'browser', 'dungeo.css'), '.fresh{}');

    writeOverrideStylesheet(storyDir, outDir, 'dungeo');

    expect(readFileSync(join(outDir, 'dungeo.css'), 'utf8')).toBe('.fresh{}');
  });
});

describe('processStoryTokens', () => {
  it('substitutes every {{STORY_ID}} occurrence', () => {
    const html = '<!-- browser/{{STORY_ID}}.css --><link href="{{STORY_ID}}.css">';

    expect(processStoryTokens(html, 'dungeo')).toBe(
      '<!-- browser/dungeo.css --><link href="dungeo.css">',
    );
  });

  it('leaves markup without tokens untouched', () => {
    expect(processStoryTokens('<link href="engine.css">', 'dungeo')).toBe(
      '<link href="engine.css">',
    );
  });
});

describe('templates/browser/index.html — override cascade order (ADR-188 R4)', () => {
  // The shipped template, not a fixture: the override must be linked last or it loses to
  // the theme CSS on equal specificity, which is the whole point of the override slot.
  const template = () => {
    const repoRoot = findMonorepoRoot(__dirname);
    expect(repoRoot).not.toBeNull();
    return readFileSync(join(repoRoot!, 'templates', 'browser', 'index.html'), 'utf8');
  };

  it('links the story override after the engine CSS and the theme links', () => {
    const html = template();
    const override = html.indexOf('{{STORY_ID}}.css">');
    const engine = html.indexOf('href="engine.css"');
    const themeMarker = html.indexOf('THEME_LINKS');

    expect(override).toBeGreaterThan(-1);
    expect(engine).toBeGreaterThan(-1);
    expect(themeMarker).toBeGreaterThan(-1);
    expect(override).toBeGreaterThan(engine);
    expect(override).toBeGreaterThan(themeMarker);
  });

  it('links the override inside <head>, before the page body', () => {
    const html = template();

    expect(html.indexOf('{{STORY_ID}}.css">')).toBeLessThan(html.indexOf('</head>'));
  });
});

describe('mirrorToWebsite — full-tree parity into website/public/web/<id>', () => {
  let root: string;
  let outDir: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'devkit-mirror-'));
    // A website exists (else the mirror is a no-op).
    mkdirSync(join(root, 'website', 'public'), { recursive: true });
    // A fully-built app dir, as buildBrowser produces it.
    outDir = join(root, 'dist', 'web', 'ferny');
    mkdirSync(join(outDir, 'audio'), { recursive: true });
    mkdirSync(join(outDir, 'images'), { recursive: true });
    writeFileSync(join(outDir, 'game.js'), '// bundle');
    writeFileSync(join(outDir, 'index.html'), '<link href="ferny.css">');
    writeFileSync(join(outDir, 'story.story'), 'story "F" by "T"\n');
    writeFileSync(join(outDir, 'ferny.css'), '.x{}');
    writeFileSync(join(outDir, 'base.css'), '');
    writeFileSync(join(outDir, 'audio', 'night-wind.wav'), 'RIFF');
    writeFileSync(join(outDir, 'images', 'folly.png'), 'PNG');
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const webDir = () => join(root, 'website', 'public', 'web', 'ferny');

  it('copies the story source the client fetches at boot (not just game.js)', () => {
    mirrorToWebsite(root, outDir, 'ferny');
    expect(existsSync(join(webDir(), 'story.story'))).toBe(true);
    expect(readFileSync(join(webDir(), 'story.story'), 'utf8')).toContain('story "F"');
  });

  it('copies story-specific CSS and runtime asset dirs (audio/images)', () => {
    mirrorToWebsite(root, outDir, 'ferny');
    expect(existsSync(join(webDir(), 'ferny.css'))).toBe(true);
    expect(existsSync(join(webDir(), 'audio', 'night-wind.wav'))).toBe(true);
    expect(existsSync(join(webDir(), 'images', 'folly.png'))).toBe(true);
  });

  it('is a no-op when no website/public exists', () => {
    rmSync(join(root, 'website'), { recursive: true, force: true });
    mirrorToWebsite(root, outDir, 'ferny');
    expect(existsSync(webDir())).toBe(false);
  });

  it('clears stale files so a de-listed/renamed asset never lingers', () => {
    mirrorToWebsite(root, outDir, 'ferny');
    writeFileSync(join(webDir(), 'orphan.css'), 'stale');
    // Rebuild without the orphan.
    mirrorToWebsite(root, outDir, 'ferny');
    expect(existsSync(join(webDir(), 'orphan.css'))).toBe(false);
    expect(existsSync(join(webDir(), 'game.js'))).toBe(true);
  });
});
