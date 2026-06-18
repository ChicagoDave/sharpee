/**
 * Unit tests for resolveStoryModulePath (ADR-180).
 * Self-contained: builds a temp fixture dir, no platform build required.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStoryModulePath } from './resolve';

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'bootstrap-resolve-'));
  mkdirSync(join(dir, 'dist', 'v17'), { recursive: true });
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'dist', 'index.js'), 'module.exports = {};');
  writeFileSync(join(dir, 'dist', 'v16.js'), 'module.exports = {};'); // file-form entry
  writeFileSync(join(dir, 'dist', 'v17', 'index.js'), 'module.exports = {};'); // dir-form entry
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('resolveStoryModulePath', () => {
  it('resolves the default dist/index.js when no entry is given', () => {
    expect(resolveStoryModulePath(dir)).toBe(join(dir, 'dist', 'index.js'));
  });

  it('resolves a file-form entry to dist/<entry>.js', () => {
    expect(resolveStoryModulePath(dir, 'v16')).toBe(join(dir, 'dist', 'v16.js'));
  });

  it('resolves a directory-form entry to dist/<entry>/index.js', () => {
    expect(resolveStoryModulePath(dir, 'v17')).toBe(join(dir, 'dist', 'v17', 'index.js'));
  });

  it('throws on a nonexistent entry, listing tried paths', () => {
    expect(() => resolveStoryModulePath(dir, 'v99')).toThrow(/v99/);
  });

  it.each(['../escape', 'a/b', 'a\\b', '/abs/path', '..'])(
    'rejects unsafe entry %j (no traversal/separators/absolute)',
    (bad) => {
      expect(() => resolveStoryModulePath(dir, bad)).toThrow(/Invalid story entry/);
    },
  );

  it('throws when the story dir has neither dist/index.js nor src/index.ts', () => {
    const empty = mkdtempSync(join(tmpdir(), 'bootstrap-empty-'));
    try {
      expect(() => resolveStoryModulePath(empty)).toThrow(/Could not load story/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
