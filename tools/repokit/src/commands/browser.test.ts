/**
 * browser.test.ts — rejection-path unit tests for the browser client build.
 * Byte-for-byte parity with build.sh is covered by scripts/parity-browser.sh.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBrowserClient, chordStoryFile } from './browser';

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
