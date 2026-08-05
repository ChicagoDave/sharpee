/**
 * rename.ts — renaming a transcript as a harness operation (ADR-302 D14).
 *
 * **The filename is the identity.** `continues:` names a parent by stem, so a
 * rename is not a file operation an author can do in a file manager: it has to
 * move the transcript, rewrite every child's pointer, carry the golden and its
 * provenance, and carry the divergence save. Doing three of those four by hand
 * leaves a tree that fails validation, or worse, a recording that silently
 * belongs to a file that no longer exists.
 *
 * **Validate then write.** The whole edit set is resolved and checked before
 * anything is touched, so a rejected rename leaves every file byte-identical.
 * That is not politeness — a rename that half-applies leaves the tree in a
 * state neither the old nor the new name describes, and the author has to
 * reconstruct which half landed.
 *
 * The golden's *provenance* moves too, not just its filename. `transcript:` is
 * checked against the file's basename on every replay (ADR-294 D3), so a
 * rename that moved only the file would produce a stale-recording error on the
 * next run — technically safe, since staleness is loud, but a pointless one.
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
  | { readonly kind: 'rewrite'; readonly file: string; readonly content: string }
  /** A move whose content also changes — the transcript and its golden. */
  | { readonly kind: 'move-and-rewrite'; readonly from: string; readonly to: string; readonly content: string };

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

  // ── The golden(s), filename and provenance together ────────────────
  for (const golden of goldensFor(dir, from)) {
    const suffix = path.basename(golden).slice(from.length);
    let content: string;
    try {
      content = fs.readFileSync(golden, 'utf-8');
    } catch (error) {
      problems.push(
        `cannot read the recording "${path.basename(golden)}": ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    edits.push({
      kind: 'move-and-rewrite',
      from: golden,
      to: target(to, suffix),
      content: retargetProvenance(content, from, to),
    });
  }

  // ── The divergence save ────────────────────────────────────────────
  const divergence = target(from, '.divergence.json');
  if (fs.existsSync(divergence)) {
    edits.push({ kind: 'move', from: divergence, to: target(to, '.divergence.json') });
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
      case 'move-and-rewrite':
        fs.writeFileSync(edit.to, edit.content, 'utf-8');
        if (edit.to !== edit.from) fs.unlinkSync(edit.from);
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

/**
 * Every recording belonging to a stem: its `.golden` and any per-seed matrix
 * siblings (`<stem>.<seed>.golden`, ADR-294 D8). A matrix transcript's
 * recordings are as much its identity as the single case's.
 */
function goldensFor(dir: string, stem: string): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const exact = `${stem}.golden`;
  const matrix = new RegExp(`^${escapeRegExp(stem)}\\.\\d+\\.golden$`);
  return entries
    .filter((name) => name === exact || matrix.test(name))
    .sort()
    .map((name) => path.join(dir, name));
}

/**
 * Point a recording's provenance at the new filename.
 *
 * Only the `transcript:` line, and only in the provenance block above the
 * `---` separator — a body line that happens to start with `transcript:` is
 * recorded output, not metadata.
 */
function retargetProvenance(content: string, from: string, to: string): string {
  const lines = content.split('\n');
  const separator = lines.indexOf('---');
  const limit = separator === -1 ? lines.length : separator;
  for (let i = 0; i < limit; i++) {
    if (lines[i] === `transcript: ${from}.transcript`) {
      lines[i] = `transcript: ${to}.transcript`;
      break;
    }
  }
  return lines.join('\n');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

