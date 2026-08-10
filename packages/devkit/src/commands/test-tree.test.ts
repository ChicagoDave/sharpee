/**
 * test-tree.test.ts — tree-document discovery (ADR-307 Phase 1): the
 * `<story-id>.tests.json` lookup beside the `.story` file. The lookup lives
 * ALONGSIDE `tests/` directory discovery until the cutover phase — nothing
 * here routes a run yet.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findTreeDocument } from './test-tree.js';

/** A throwaway project dir; the callback's return survives cleanup. */
function withProjectDir<T>(build: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), 'devkit-tree-document-'));
  try {
    return build(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('findTreeDocument', () => {
  it('finds <story-id>.tests.json beside the .story file', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      writeFileSync(
        join(dir, 'fernhill.tests.json'),
        '{ "version": 1, "story": "fernhill", "seed": 42, "cards": [] }\n',
      );
      return findTreeDocument(dir);
    });
    expect(found).toMatch(/fernhill\.tests\.json$/);
  });

  it('returns undefined when the project has no document', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      return findTreeDocument(dir);
    });
    expect(found).toBeUndefined();
  });

  it('returns undefined when there is no .story file, even beside a stray document', () => {
    const found = withProjectDir((dir) => {
      // A document not anchored to a .story stem is not discoverable — the
      // id comes from the story, never from globbing json files.
      writeFileSync(
        join(dir, 'fernhill.tests.json'),
        '{ "version": 1, "story": "fernhill", "seed": 42, "cards": [] }\n',
      );
      return findTreeDocument(dir);
    });
    expect(found).toBeUndefined();
  });

  it('keys off the .story stem — a document under another name is not found', () => {
    const found = withProjectDir((dir) => {
      writeFileSync(join(dir, 'fernhill.story'), 'story\n  id: fernhill\n');
      writeFileSync(
        join(dir, 'other.tests.json'),
        '{ "version": 1, "story": "other", "seed": 42, "cards": [] }\n',
      );
      return findTreeDocument(dir);
    });
    expect(found).toBeUndefined();
  });
});
