/**
 * tree.ts — assembling and validating a story's transcript tree (ADR-302 D4, D11).
 *
 * **The tree is the input.** v1 has two layers — a file-level parser and a
 * runner that learns about a path while walking it — and neither can host a
 * corpus-level check: `validateTranscript` takes a single transcript and so
 * cannot see a parent pointer at all. v2 is tree-native from the entry point
 * instead: read every transcript in the story, assemble the tree from their
 * headers, report every structural defect together, and only then execute.
 *
 * Eager whole-tree validation is not a policy preference here; it is what "the
 * tree is the input" means. A run that discovered a cycle on its way through
 * would already have executed commands against a game it was about to abandon.
 *
 * **The tree is derived, never stored** (D4). There is no index file, no
 * `.skein`, no committed structure. The parent pointer lives in each
 * transcript's own header and the tree is whatever reading those headers
 * produces — so a tree cannot go stale against its files, because it has no
 * separate existence to go stale in.
 *
 * Public interface: `assembleTree`, `TranscriptTree`, `TreeNode`, `TreeDefect`.
 * Owner context: branch-tester (testing tooling).
 *
 * @see ADR-302 — Transcript Branches — D1, D2, D3, D4, D11
 */

import * as path from 'path';
import { Transcript } from './types.js';

/**
 * One transcript in the tree, with its resolved relationships.
 *
 * `stem` is the identity (D14) — the filename without `.transcript`. Children
 * are ordered by stem so a run is deterministic without anyone declaring an
 * order; D3 retired filename ordering as a *semantic*, not as a tiebreaker.
 */
export interface TreeNode {
  /** Filename stem — the transcript's identity (ADR-302 D14). */
  readonly stem: string;
  readonly transcript: Transcript;
  /** Parent node, or null for a root (a transcript with no `continues:`). */
  parent: TreeNode | null;
  /** Children in stem order. */
  readonly children: TreeNode[];
  /** Root-to-this path, inclusive. Set during assembly once the tree is sound. */
  readonly ancestry: TreeNode[];
}

/**
 * A structural defect in a story's tree. Every defect found is reported —
 * `assembleTree` never stops at the first, because "fix this, run again, find
 * the next" is the workflow eager validation exists to avoid (D11).
 */
export interface TreeDefect {
  readonly kind: 'missing-parent' | 'cycle' | 'cross-story' | 'duplicate-stem' | 'self-parent';
  /** Stem of the transcript the defect is reported against. */
  readonly stem: string;
  readonly message: string;
  /** File the defect lives in, for a clickable report. */
  readonly filePath: string;
}

/**
 * A story's assembled transcript tree.
 *
 * `defects` non-empty means nothing should execute. The nodes are still
 * returned so a reporter can show the shape it *did* manage to read — but a
 * caller that runs anyway is defeating D11.
 */
export interface TranscriptTree {
  /** Roots in stem order — every transcript nobody points at (D1). */
  readonly roots: TreeNode[];
  /** Every node by stem. */
  readonly byStem: ReadonlyMap<string, TreeNode>;
  /** Every structural defect, in a stable order. Empty means runnable. */
  readonly defects: TreeDefect[];
}

/** The filename stem that identifies a transcript (ADR-302 D14). */
export function stemOf(filePath: string): string {
  return path.basename(filePath).replace(/\.transcript$/i, '');
}

/**
 * Assemble one story's transcript tree and validate it whole (ADR-302 D11).
 *
 * Every transcript passed in must belong to one story: the tree is the unit a
 * story's tests form, and a pointer that leaves it is a `cross-story` defect
 * rather than a lookup that happens to fail. Callers pass the story's own
 * transcripts; `storyName` is used only to say so in the message.
 *
 * Diamonds are unrepresentable and so need no check — D1 gives a transcript at
 * most one parent, so the structure is a forest by construction. What can go
 * wrong is a pointer to a stem that is not there, a pointer that eventually
 * comes back to itself, and two files claiming one stem.
 *
 * @param transcripts every parsed transcript in the story
 * @param storyName the story's name, for cross-story defect messages
 * @returns the tree, with every defect found
 */
export function assembleTree(
  transcripts: readonly Transcript[],
  storyName?: string
): TranscriptTree {
  const defects: TreeDefect[] = [];
  const byStem = new Map<string, TreeNode>();

  // ── Identity ───────────────────────────────────────────────────────
  // Two files claiming one stem makes every pointer to it ambiguous, so it is
  // caught before any pointer is resolved.
  const seen = new Map<string, string>();
  for (const transcript of transcripts) {
    const stem = stemOf(transcript.filePath);
    const previous = seen.get(stem);
    if (previous !== undefined) {
      defects.push({
        kind: 'duplicate-stem',
        stem,
        filePath: transcript.filePath,
        message:
          `two transcripts share the stem "${stem}" (${previous} and ${transcript.filePath}) — ` +
          `the stem is a transcript's identity (ADR-302 D14), so a \`continues: ${stem}\` could mean either`,
      });
      continue;
    }
    seen.set(stem, transcript.filePath);
    byStem.set(stem, {
      stem,
      transcript,
      parent: null,
      children: [],
      ancestry: [],
    });
  }

  // ── Pointers ───────────────────────────────────────────────────────
  const nodes = [...byStem.values()].sort((a, b) => a.stem.localeCompare(b.stem));
  for (const node of nodes) {
    const declared = node.transcript.header.continues?.trim();
    if (!declared) continue; // a root

    if (declared === node.stem) {
      defects.push({
        kind: 'self-parent',
        stem: node.stem,
        filePath: node.transcript.filePath,
        message: `"${node.stem}" continues itself — a transcript cannot be its own parent`,
      });
      continue;
    }

    const parent = byStem.get(declared);
    if (!parent) {
      // A stem this story does not have. Whether the author meant a transcript
      // in ANOTHER story or simply mistyped is not knowable from here, so the
      // message names both readings rather than guessing.
      defects.push({
        kind: 'cross-story',
        stem: node.stem,
        filePath: node.transcript.filePath,
        message:
          `"${node.stem}" continues "${declared}", which is not a transcript in ` +
          `${storyName ? `story "${storyName}"` : 'this story'} — a tree spans one story (ADR-302 D1). ` +
          `Either the stem is misspelled, or it names a transcript in another story, which a tree cannot cross.`,
      });
      continue;
    }

    node.parent = parent;
    parent.children.push(node);
  }

  for (const node of nodes) {
    node.children.sort((a, b) => a.stem.localeCompare(b.stem));
  }

  // ── Cycles ─────────────────────────────────────────────────────────
  // Walk up from each node. A node whose walk revisits a stem is in a cycle;
  // every member is reported, so the author sees the whole loop rather than
  // one arbitrary entry point into it.
  const inCycle = new Set<string>();
  for (const node of nodes) {
    const walked: string[] = [];
    const onPath = new Set<string>();
    let current: TreeNode | null = node;
    while (current) {
      if (onPath.has(current.stem)) {
        const start = walked.indexOf(current.stem);
        for (const stem of walked.slice(start)) inCycle.add(stem);
        break;
      }
      onPath.add(current.stem);
      walked.push(current.stem);
      current = current.parent;
    }
  }
  for (const stem of [...inCycle].sort()) {
    const node = byStem.get(stem)!;
    const loop = cycleFrom(node);
    defects.push({
      kind: 'cycle',
      stem,
      filePath: node.transcript.filePath,
      message: `"${stem}" is part of a cycle: ${loop.join(' → ')} — a tree has no way to start such a path`,
    });
  }

  // ── Ancestry ───────────────────────────────────────────────────────
  // Only meaningful once cycles are known; a node inside one has no root-to-here
  // path, so it gets none rather than an arbitrary truncation.
  for (const node of nodes) {
    if (inCycle.has(node.stem)) continue;
    const chain: TreeNode[] = [];
    let current: TreeNode | null = node;
    while (current) {
      chain.unshift(current);
      current = current.parent;
    }
    (node.ancestry as TreeNode[]).push(...chain);
  }

  const roots = nodes.filter((n) => n.parent === null && !inCycle.has(n.stem));

  return { roots, byStem, defects };
}

/**
 * Every root-to-leaf path in the tree, each as its ordered node list.
 *
 * This is what "running the harness runs every path" means (D10) — the runner
 * takes this list and executes each, and a shared prefix is the shared head of
 * several entries rather than anything the paths declare about each other.
 */
export function rootToLeafPaths(tree: TranscriptTree): TreeNode[][] {
  const paths: TreeNode[][] = [];
  const walk = (node: TreeNode, prefix: TreeNode[]): void => {
    const here = [...prefix, node];
    if (node.children.length === 0) {
      paths.push(here);
      return;
    }
    for (const child of node.children) walk(child, here);
  };
  for (const root of tree.roots) walk(root, []);
  return paths;
}

/** The stems of the cycle `node` sits in, starting and ending at the same stem. */
function cycleFrom(node: TreeNode): string[] {
  const walked: string[] = [];
  const onPath = new Set<string>();
  let current: TreeNode | null = node;
  while (current) {
    if (onPath.has(current.stem)) {
      const start = walked.indexOf(current.stem);
      return [...walked.slice(start), current.stem];
    }
    onPath.add(current.stem);
    walked.push(current.stem);
    current = current.parent;
  }
  return walked;
}
