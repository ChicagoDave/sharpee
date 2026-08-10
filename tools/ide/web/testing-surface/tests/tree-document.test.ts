/**
 * tree-document.test.ts — the surface reads the SAME wire module the
 * harness ships (rule 8b): this import resolves through the vitest alias to
 * `packages/branch-tester/src/tree-document.ts`, the source file tsconfig
 * checks and build.mjs bundles. One round-trip here pins the wiring — the
 * format's own contract is tested in branch-tester.
 */
import { describe, expect, it } from 'vitest';
import {
  deserializeTreeDocument,
  serializeTreeDocument,
  treeDocumentFileNameFor,
  type TreeDocument,
} from '@sharpee/branch-tester/tree-document';

describe('shared tree-document module (rule 8b wiring)', () => {
  it('round-trips a document through the aliased source import', () => {
    const document: TreeDocument = {
      version: 1,
      story: 'fernhill',
      seed: 42,
      cards: [
        { type: 'opening' },
        { type: 'boot' },
        {
          type: 'turn',
          command: 'north',
          assertions: { contains: ['The drive curves'] },
          branches: [{ branch: 1, cards: [{ type: 'turn', command: 'east' }] }],
        },
      ],
    };
    const text = serializeTreeDocument(document);
    const read = deserializeTreeDocument(text);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(serializeTreeDocument(read.document)).toBe(text);
  });

  it('derives the document name the Swift side will look for', () => {
    expect(treeDocumentFileNameFor('fernhill')).toBe('fernhill.tests.json');
  });
});
