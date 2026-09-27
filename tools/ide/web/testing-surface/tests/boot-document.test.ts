/**
 * boot-document.test.ts — admitting the boot-time document (AC-4, GH #540).
 *
 * Derived from the Behavior Statement: a document at the engine's seed is
 * adopted unlocked; one pinned at another seed is refused by name and
 * write-locked; a newer-version document is refused with the reader's own
 * message; a malformed or absent one is neither adopted nor locked. Every
 * document goes through the REAL shared reader — a hand-rolled shape it
 * would reject must not pass here.
 *
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { describe, expect, it } from 'vitest';
import { serializeTreeDocument, TREE_DOCUMENT_VERSION } from '@sharpee/branch-tester/tree-document';
import { admitBootDocument } from '../src/boot-document';

const documentAt = (seed: number): string =>
  serializeTreeDocument({
    version: TREE_DOCUMENT_VERSION,
    story: 'mini',
    seed,
    cards: [{ type: 'opening' }, { type: 'boot' }],
  });

describe('admitBootDocument', () => {
  it('adopts a document pinned at the seed the engine booted at, unlocked', () => {
    const admission = admitBootDocument(documentAt(1209), 1209);

    expect(admission.document?.seed).toBe(1209);
    expect(admission.document?.cards).toHaveLength(2);
    expect(admission.writeLocked).toBe(false);
    expect(admission.notice).toBeUndefined();
  });

  it('refuses a document pinned at another seed by name and write-locks the session', () => {
    const admission = admitBootDocument(documentAt(1209), 42);

    expect(admission.document).toBeUndefined();
    expect(admission.writeLocked).toBe(true);
    expect(admission.notice).toBe(
      "This tree is pinned at seed 1209, but the engine booted at seed 42. "
        + "Nothing is recorded until the host boots at the document's seed.",
    );
  });

  it("refuses a newer-version document with the reader's own message and write-locks", () => {
    const newer = JSON.stringify({ version: 99, story: 'mini', seed: 42, cards: [] });
    const admission = admitBootDocument(newer, 42);

    expect(admission.document).toBeUndefined();
    expect(admission.writeLocked).toBe(true);
    expect(admission.notice).toMatch(/version 99/);
  });

  it('neither adopts nor locks a malformed document', () => {
    const admission = admitBootDocument('not json {{{', 42);

    expect(admission).toEqual({ writeLocked: false });
  });

  it('neither adopts nor locks when the story has no document', () => {
    expect(admitBootDocument(undefined, 42)).toEqual({ writeLocked: false });
  });
});
