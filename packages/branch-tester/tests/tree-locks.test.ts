/**
 * tree-locks.test.ts — the card's `locks` field (ADR-367 D5) at rest: a turn
 * card carries the claims locked there, the writer persists it in key
 * order, the reader reads it back, and the shapes the writer cannot emit are
 * malformed by name. No version bump (David, 2026-10-20: the number is
 * dormant until a story ships).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { assembleTree, emptyTreeDocument, segmentTree, TREE_DOCUMENT_VERSION, type TreeDocument } from '../src/tree-document.js';

function document(extra: Record<string, unknown>): TreeDocument {
  return {
    ...emptyTreeDocument('mini', 42, 'root0000'),
    cards: [
      { id: 'card0000', type: 'opening' },
      { id: 'card0001', type: 'boot' },
      { id: 'card0002', type: 'turn', command: 'north', assertions: { contains: ['Landing'] }, ...extra } as TreeDocument['cards'][number],
    ],
  };
}

describe('a card\'s `locks` at rest', () => {
  it('round-trips through the writer and reader, keys sorted', () => {
    const files = segmentTree(document({ locks: ['the Landing is reached', 'the note is read'] }));
    expect(files['root0000.json']).toContain('"id": "card0002",\n      "locks": [\n        "the Landing is reached",\n        "the note is read"\n      ],\n      "type": "turn"');
    const read = assembleTree(files);
    expect(read.status).toBe('ok');
    if (read.status === 'ok') expect(read.document.cards[2].locks).toEqual(['the Landing is reached', 'the note is read']);
    expect(JSON.parse(files['manifest.json']).version).toBe(TREE_DOCUMENT_VERSION);
    expect(TREE_DOCUMENT_VERSION).toBe(3);
  });

  it('an empty list, a non-string, and a lock on the boot card are malformed by name', () => {
    const files = segmentTree(document({}));
    const edit = (replace: (text: string) => string) => assembleTree({ ...files, 'root0000.json': replace(files['root0000.json']) });

    const empty = edit((text) => text.replace('"id": "card0002",', '"id": "card0002",\n      "locks": [],'));
    expect(empty.status).toBe('malformed');
    if (empty.status === 'malformed') expect(empty.message).toMatch(/cards\[2\]\.locks' must be a non-empty array of claim names/);

    const number = edit((text) => text.replace('"id": "card0002",', '"id": "card0002",\n      "locks": [3],'));
    expect(number.status).toBe('malformed');

    const onBoot = edit((text) => text.replace('"id": "card0001",', '"id": "card0001",\n      "locks": ["x"],'));
    expect(onBoot.status).toBe('malformed');
    if (onBoot.status === 'malformed') expect(onBoot.message).toMatch(/cards\[1\]' is type 'boot' and cannot carry 'locks'/);
  });
});
