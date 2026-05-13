/**
 * StoryScanner tests — both the filesystem path and the injected-list
 * path. Filesystem path uses a temp dir (REAL fs, not a stub).
 */

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { createStoryScanner } from '../src/stories/scanner.js';

describe('createStoryScanner (filesystem path — REAL fs)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'zifmia-scanner-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('lists *.sharpee files as story slugs (basename without extension)', () => {
    writeFileSync(join(dir, 'dungeo.sharpee'), 'bundle');
    writeFileSync(join(dir, 'familyzoo.sharpee'), 'bundle');
    writeFileSync(join(dir, 'README.md'), 'not a story');

    const scanner = createStoryScanner({ dir });
    const slugs = scanner.list().map((e) => e.slug);
    expect(slugs).toEqual(['dungeo', 'familyzoo']);
    expect(scanner.has('dungeo')).toBe(true);
    expect(scanner.has('readme')).toBe(false);
  });

  it('returns an empty list for an empty dir', () => {
    const scanner = createStoryScanner({ dir });
    expect(scanner.list()).toEqual([]);
  });

  it('rescan() reflects new files added after construction', () => {
    const scanner = createStoryScanner({ dir });
    expect(scanner.list()).toEqual([]);

    writeFileSync(join(dir, 'newstory.sharpee'), 'bundle');
    expect(scanner.list()).toEqual([]); // cache is stale until rescan
    scanner.rescan();
    expect(scanner.has('newstory')).toBe(true);
  });

  it('handles a non-existent directory by returning an empty list', () => {
    const scanner = createStoryScanner({ dir: join(dir, 'does-not-exist') });
    expect(scanner.list()).toEqual([]);
    expect(scanner.has('anything')).toBe(false);
  });
});

describe('createStoryScanner (injected-list path)', () => {
  it('returns the injected entries verbatim', () => {
    const scanner = createStoryScanner({
      entries: [
        { slug: 'a', path: '/tmp/a.sharpee' },
        { slug: 'b', path: '/tmp/b.sharpee' }
      ]
    });
    expect(scanner.list().map((e) => e.slug)).toEqual(['a', 'b']);
    expect(scanner.get('a')?.path).toBe('/tmp/a.sharpee');
    expect(scanner.has('c')).toBe(false);
  });
});
