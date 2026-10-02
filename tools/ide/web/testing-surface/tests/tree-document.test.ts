/**
 * tree-document.test.ts — the surface reads the SAME wire module the
 * harness ships (rule 8b): this import resolves through the vitest alias to
 * `packages/branch-tester/src/tree-document.ts`, the source file tsconfig
 * checks and build.mjs bundles. One round-trip here pins the wiring — the
 * format's own contract is tested in branch-tester.
 */
import { describe, expect, it } from 'vitest';
import {
  assembleTree,
  segmentTree,
  treeDirectoryNameFor,
  TREE_DOCUMENT_VERSION,
  type TreeDocument,
} from '@sharpee/branch-tester/tree-document';

describe('shared tree-document module (rule 8b wiring)', () => {
  it('round-trips a tree through the aliased source import', () => {
    const document: TreeDocument = {
      version: TREE_DOCUMENT_VERSION,
      story: 'fernhill',
      seed: 42,
      id: 'root0000',
      cards: [
        { id: 'card0001', type: 'opening' },
        { id: 'card0002', type: 'boot' },
        {
          id: 'card0003',
          type: 'turn',
          command: 'north',
          assertions: { contains: ['The drive curves'] },
          branches: [{ id: 'branch01', cards: [{ id: 'card0004', type: 'turn', command: 'east' }] }],
        },
      ],
    };
    const files = segmentTree(document);
    const read = assembleTree(files);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(segmentTree(read.document)).toEqual(files);
  });

  it('derives the directory name the Swift side will look for', () => {
    expect(treeDirectoryNameFor('fernhill')).toBe('fernhill.tests');
  });
});
