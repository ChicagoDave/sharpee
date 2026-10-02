/**
 * tree-document-discovery.test.ts — test tree discovery (ADR-307, ADR-355):
 * the `<story-id>.tests/` directory beside the `.story` file. This is the
 * ONLY lookup `sharpee test` performs; the retired one-document form
 * (`<story-id>.tests.json`) is never picked up in its place.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findTreeDirectory } from './test-tree-document.js';

/** A throwaway project dir; the callback's return survives cleanup. */
function withProjectDir<T>(build: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'devkit-tree-document-'));
  try {
    return build(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('findTreeDirectory', () => {
  it('finds the <story-id>.tests/ directory beside the .story file', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      mkdirSync(join(dir, 'fernhill.tests'));
      return findTreeDirectory(dir)?.slice(dir.length);
    });
    expect(found).toBe('/fernhill.tests');
  });

  it('returns undefined when the project has no tree directory', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      return findTreeDirectory(dir);
    });
    expect(found).toBeUndefined();
  });

  it('never picks up the retired one-document form in its place', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      writeFileSync(
        join(dir, 'fernhill.tests.json'),
        '{ "version": 2, "story": "fernhill", "seed": 42, "cards": [] }\n',
      );
      return findTreeDirectory(dir);
    });
    expect(found).toBeUndefined();
  });

  it('a FILE named <story-id>.tests is not a tree', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      writeFileSync(join(dir, 'fernhill.tests'), 'not a directory\n');
      return findTreeDirectory(dir);
    });
    expect(found).toBeUndefined();
  });

  it('returns undefined when there is no .story file, even beside a stray tree', () => {
    const found = withProjectDir((dir) => {
      // A tree not anchored to a .story stem is not discoverable — the id
      // comes from the story, never from globbing directories.
      mkdirSync(join(dir, 'fernhill.tests'));
      return findTreeDirectory(dir);
    });
    expect(found).toBeUndefined();
  });

  it('with two stories, falls through to the one that has a tree', () => {
    const found = withProjectDir((dir) => {
      // `alpha` sorts first and has no tree; `beta` has one.
      writeFileSync(join(dir, 'alpha.story'), 'story\n  id: alpha\n');
      writeFileSync(join(dir, 'beta.story'), 'story\n  id: beta\n');
      mkdirSync(join(dir, 'beta.tests'));
      return findTreeDirectory(dir)?.slice(dir.length);
    });
    expect(found).toBe('/beta.tests');
  });

  it('with two stories that both have trees, the first in code-unit order wins — never locale order', () => {
    const found = withProjectDir((dir) => {
      // Code units put 'Z' (0x5A) before 'a' (0x61); a locale-aware sort
      // would put `alpha` first.
      writeFileSync(join(dir, 'alpha.story'), 'story\n  id: alpha\n');
      writeFileSync(join(dir, 'Zed.story'), 'story\n  id: Zed\n');
      mkdirSync(join(dir, 'alpha.tests'));
      mkdirSync(join(dir, 'Zed.tests'));
      return findTreeDirectory(dir)?.slice(dir.length);
    });
    expect(found).toBe('/Zed.tests');
  });

  it('keys off the .story stem — a tree under another name is not found', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      mkdirSync(join(dir, 'other.tests'));
      return findTreeDirectory(dir);
    });
    expect(found).toBeUndefined();
  });
});
