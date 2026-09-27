/**
 * boot-document.ts — admits the tree document the host injected at boot.
 *
 * Purpose: one decision, in one place — whether the persisted
 *   `<story-id>.tests.json` the IDE handed the surface at boot becomes this
 *   session's tree. Two refusals, each named to the author and each
 *   write-locking the session so a document this build must not clobber is
 *   never written (AC-4):
 *   - a newer-version document — the shared reader refuses it by name;
 *   - a document pinned at a seed the engine did not boot at — the tree is
 *     reproducible only at its own seed (ADR-307 D5), so cards recorded from
 *     a differently seeded engine would be turns no replay can reproduce.
 *     The hosts boot the engine at the document's seed, so this guard is the
 *     surface stating the invariant where the two values meet (GH #540).
 *   A malformed document is neither adopted nor locked: the session degrades
 *   to a fresh empty tree that always-recording overwrites.
 *
 * Public interface: admitBootDocument, BootDocumentAdmission.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { deserializeTreeDocument, type TreeDocument } from '@sharpee/branch-tester/tree-document';

/** What the session does with the document the host handed it. */
export interface BootDocumentAdmission {
  /** The document to adopt as the session's tree; absent when refused or malformed. */
  document?: TreeDocument;
  /** The session must never write the document on disk. */
  writeLocked: boolean;
  /** The refusal, worded for the author; absent when nothing was refused. */
  notice?: string;
}

/**
 * Decides whether the boot-time document becomes the session's tree.
 * @param text the document's bytes as the host read them; undefined when the
 *   story has no document yet.
 * @param engineSeed the seed the live engine booted at — the host derives it
 *   from the same document, so a mismatch means a host that did not.
 */
export function admitBootDocument(text: string | undefined, engineSeed: number): BootDocumentAdmission {
  if (text === undefined) return { writeLocked: false };
  const read = deserializeTreeDocument(text);
  if (read.status === 'refused') return { writeLocked: true, notice: read.message };
  if (read.status !== 'ok') return { writeLocked: false };
  if (read.document.seed !== engineSeed) {
    return {
      writeLocked: true,
      notice: `This tree is pinned at seed ${read.document.seed}, but the engine booted at seed ${engineSeed}. `
        + `Nothing is recorded until the host boots at the document's seed.`,
    };
  }
  return { document: read.document, writeLocked: false };
}
