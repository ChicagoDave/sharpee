/**
 * boot-document.test.ts — admitting the boot-time tree (AC-4, GH #540).
 *
 * Derived from the Behavior Statement: a tree at the engine's seed is
 * adopted unlocked; one pinned at another seed is refused by name and
 * write-locked; a newer-version tree is refused with the reader's own
 * message; a malformed or absent one is neither adopted nor locked. Every
 * tree goes through the REAL shared reader — a hand-rolled shape it would
 * reject must not pass here.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import {
  segmentTree,
  TREE_DOCUMENT_VERSION,
  TREE_MANIFEST_FILE_NAME,
  type TreeFiles,
} from '@sharpee/branch-tester/tree-document';
import { admitBootDocument } from '../src/boot-document';

const treeAt = (seed: number): TreeFiles =>
  segmentTree({
    version: TREE_DOCUMENT_VERSION,
    story: 'mini',
    seed,
    id: 'root0000',
    cards: [{ id: 'card0001', type: 'opening' }, { id: 'card0002', type: 'boot' }],
  });

describe('admitBootDocument', () => {
  it('adopts a tree pinned at the seed the engine booted at, unlocked', () => {
    const admission = admitBootDocument(treeAt(1209), 1209);

    expect(admission.document?.seed).toBe(1209);
    expect(admission.document?.id).toBe('root0000');
    expect(admission.document?.cards).toHaveLength(2);
    expect(admission.writeLocked).toBe(false);
    expect(admission.notice).toBeUndefined();
  });

  it('refuses a tree pinned at another seed by name and write-locks the session', () => {
    const admission = admitBootDocument(treeAt(1209), 42);

    expect(admission.document).toBeUndefined();
    expect(admission.writeLocked).toBe(true);
    expect(admission.notice).toBe(
      "This tree is pinned at seed 1209, but the engine booted at seed 42. "
        + "Nothing is recorded until the host boots at the tree's seed.",
    );
  });

  it("refuses a newer-version tree with the reader's own message and write-locks", () => {
    const newer = { ...treeAt(42), [TREE_MANIFEST_FILE_NAME]: JSON.stringify({ version: 99, story: 'mini', seed: 42 }) };
    const admission = admitBootDocument(newer, 42);

    expect(admission.document).toBeUndefined();
    expect(admission.writeLocked).toBe(true);
    expect(admission.notice).toMatch(/version 99/);
  });

  it('neither adopts nor locks a malformed tree', () => {
    const admission = admitBootDocument({ ...treeAt(42), 'root0000.json': 'not json {{{' }, 42);

    expect(admission).toEqual({ writeLocked: false });
  });

  it('neither adopts nor locks when the story has no tree', () => {
    expect(admitBootDocument(undefined, 42)).toEqual({ writeLocked: false });
  });
});
