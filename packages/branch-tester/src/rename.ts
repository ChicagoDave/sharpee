/**
 * rename.ts — renaming a transcript as a harness operation (ADR-302 D14).
 *
 * **The filename is the identity.** `continues:` names a parent by stem, so a
 * rename is not a file operation an author can do in a file manager: it has
 * to move the transcript and rewrite every child's pointer together. Doing
 * one without the other by hand leaves a tree that fails validation.
 *
 * **Validate then write.** The whole edit set is resolved and checked before
 * anything is touched, so a rejected rename leaves every file byte-identical.
 * That is not politeness — a rename that half-applies leaves the tree in a
 * state neither the old nor the new name describes, and the author has to
 * reconstruct which half landed.
 *
 * Public interface: `planRename`, `applyRename`, `renameTranscript`.
 * Owner context: branch-tester (testing tooling).
 *
 * @see ADR-302 — Transcript Branches — D14, AC-8
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseTranscriptFile } from './parser.js';
import { serializeTranscript } from './serializer.js';
import { TranscriptTree } from './tree.js';

/** One file operation in a rename's edit set. */
export type RenameEdit =
  | { readonly kind: 'move'; readonly from: string; readonly to: string }
  | { readonly kind: 'rewrite'; readonly file: string; readonly content: string };

/** A resolved, checked rename. `problems` non-empty means nothing may be applied. */
export interface RenamePlan {
  readonly from: string;
  readonly to: string;
  readonly edits: RenameEdit[];
  /** Every reason this rename cannot proceed. Empty means applicable. */
  readonly problems: string[];
}

/** Legal stem, matching the `continues:` grammar (ADR-302 D1). */
const STEM = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Resolve the complete edit set for a rename, and check it (ADR-302 D14).
 *
 * Nothing is written. Every problem found is reported together, for the same
 * reason tree assembly reports every defect together: "fix this, try again,
 * find the next" is a bad way to learn what a rename needs.
 *
 * @param tree the story's assembled tree
 * @param from the stem to rename
 * @param to the stem to rename it to
 */
export function planRename(tree: TranscriptTree, from: string, to: string): RenamePlan {
  const problems: string[] = [];
  const edits: RenameEdit[] = [];

  if (tree.defects.length > 0) {
    problems.push(
      `the tree has ${tree.defects.length} structural defect(s) — a rename rewrites parent ` +
        `pointers, so the tree has to be readable before one can be planned`,
    );
    return { from, to, edits, problems };
  }

  const node = tree.byStem.get(from);
  if (!node) {
    problems.push(`no transcript named "${from}" in this story`);
  }
  if (!STEM.test(to)) {
    problems.push(
      `"${to}" is not a legal stem — it must be a single name of letters, digits, ` +
        `\`.\`, \`-\` or \`_\` (ADR-302 D1), since it becomes a \`continues:\` value`,
    );
  }
  if (tree.byStem.has(to)) {
    problems.push(
      `"${to}" is already a transcript in this story — the stem is a transcript's ` +
        `identity (ADR-302 D14), so two files cannot share one`,
    );
  }
  if (!node || problems.length > 0) {
    return { from, to, edits, problems };
  }

  const dir = path.dirname(node.transcript.filePath);
  const target = (stem: string, suffix: string) => path.join(dir, `${stem}${suffix}`);

  // ── The transcript itself ──────────────────────────────────────────
  edits.push({ kind: 'move', from: node.transcript.filePath, to: target(to, '.transcript') });

  // ── Every child's pointer ──────────────────────────────────────────
  // Re-read from disk rather than reusing the parsed tree: the plan must
  // describe the files as they are now, and a stale in-memory copy would write
  // back whatever the tree was built from.
  for (const child of node.children) {
    try {
      const reparsed = parseTranscriptFile(child.transcript.filePath);
      reparsed.header.continues = to;
      edits.push({
        kind: 'rewrite',
        file: child.transcript.filePath,
        content: serializeTranscript(reparsed),
      });
    } catch (error) {
      problems.push(
        `cannot rewrite the pointer in "${child.stem}": ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── Writability, before anything is touched ────────────────────────
  for (const edit of edits) {
    const source = edit.kind === 'rewrite' ? edit.file : edit.from;
    const destination = edit.kind === 'rewrite' ? edit.file : edit.to;
    if (!fs.existsSync(source)) {
      problems.push(`missing: ${source}`);
      continue;
    }
    try {
      fs.accessSync(source, fs.constants.W_OK);
    } catch {
      problems.push(`not writable: ${source}`);
    }
    if (destination !== source && fs.existsSync(destination)) {
      problems.push(`would overwrite an existing file: ${destination}`);
    }
  }

  return { from, to, edits, problems };
}

/**
 * Apply a checked plan. Throws without touching anything when the plan carries
 * problems — the check is not advisory.
 */
export function applyRename(plan: RenamePlan): void {
  if (plan.problems.length > 0) {
    throw new Error(
      `cannot rename "${plan.from}" to "${plan.to}":\n  ${plan.problems.join('\n  ')}`,
    );
  }
  for (const edit of plan.edits) {
    switch (edit.kind) {
      case 'move':
        fs.renameSync(edit.from, edit.to);
        break;
      case 'rewrite':
        fs.writeFileSync(edit.file, edit.content, 'utf-8');
        break;
    }
  }
}

/**
 * Plan and apply in one call (ADR-302 D14, AC-8).
 *
 * @returns the plan that was applied
 * @throws when the rename cannot proceed, having written nothing
 */
export function renameTranscript(
  tree: TranscriptTree,
  from: string,
  to: string,
): RenamePlan {
  const plan = planRename(tree, from, to);
  applyRename(plan);
  return plan;
}
