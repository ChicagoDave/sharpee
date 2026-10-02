/**
 * boot-document.ts — admits the test tree the host injected at boot.
 *
 * Purpose: one decision, in one place — whether the persisted
 *   `<story-id>.tests/` directory the IDE handed the surface at boot (its
 *   files, by name — ADR-355) becomes this session's tree. Two refusals, each
 *   named to the author and each write-locking the session so a tree this
 *   build must not clobber is never written (AC-4):
 *   - a newer-version tree — the shared reader refuses it by name;
 *   - a tree pinned at a seed the engine did not boot at — the tree is
 *     reproducible only at its own seed (ADR-307 D5), so cards recorded from
 *     a differently seeded engine would be turns no replay can reproduce.
 *     The hosts boot the engine at the tree's seed, so this guard is the
 *     surface stating the invariant where the two values meet (GH #540).
 *   A malformed tree is neither adopted nor locked: the session degrades
 *   to a fresh empty tree that always-recording overwrites.
 *
 * Public interface: admitBootDocument, BootDocumentAdmission.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */
import { assembleTree, type TreeDocument, type TreeFiles } from '@sharpee/branch-tester/tree-document';

/** What the session does with the tree the host handed it. */
export interface BootDocumentAdmission {
  /** The tree to adopt as the session's; absent when refused or malformed. */
  document?: TreeDocument;
  /** The session must never write the tree on disk. */
  writeLocked: boolean;
  /** The refusal, worded for the author; absent when nothing was refused. */
  notice?: string;
}

/**
 * Decides whether the boot-time tree becomes the session's tree.
 * @param files the tree directory's files as the host read them, by name;
 *   undefined when the story has no tree yet.
 * @param engineSeed the seed the live engine booted at — the host derives it
 *   from the same tree, so a mismatch means a host that did not.
 */
export function admitBootDocument(files: TreeFiles | undefined, engineSeed: number): BootDocumentAdmission {
  if (files === undefined) return { writeLocked: false };
  const read = assembleTree(files);
  if (read.status === 'refused') return { writeLocked: true, notice: read.message };
  if (read.status !== 'ok') return { writeLocked: false };
  if (read.document.seed !== engineSeed) {
    return {
      writeLocked: true,
      notice: `This tree is pinned at seed ${read.document.seed}, but the engine booted at seed ${engineSeed}. `
        + `Nothing is recorded until the host boots at the tree's seed.`,
    };
  }
  return { document: read.document, writeLocked: false };
}
