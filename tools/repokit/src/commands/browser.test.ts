/**
 * browser.test.ts — rejection-path unit tests for the browser client build.
 * Byte-for-byte parity with build.sh is covered by scripts/parity-browser.sh.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrowserClient, chordStoryFile, mirrorToWebsite } from './browser';

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
