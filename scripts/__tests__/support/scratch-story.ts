/**
 * scratch-story.ts — the "never modify a real story" boundary, as a path.
 *
 * Purpose: give a beat that must change a story (delete a rule's effect,
 *   remove an END STATE card, corrupt the test tree) a private copy in a
 *   temp directory outside the repository, so the mutation happens there and
 *   `branch-stories/fernhill` is never written. The copy skips every directory
 *   the root `.gitignore` ignores — build output is rebuilt by the CLI from
 *   source anyway, and copying five megabytes of `dist/` would only slow the
 *   suite down.
 *
 *   Mutations report what they did, so a test can prove the change was real:
 *   `deleteLine` returns the count and refuses anything but exactly one match.
 *
 * Public interface: copyStoryToScratch, deleteLine, insertAfterLine, readTreeFiles, readTree, editTree, ScratchStory.
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import {
  assembleTree,
  diffTreeFiles,
  ensureSegmentIds,
  segmentTree,
  type TreeDocument,
  type TreeFiles,
} from '../../../packages/branch-tester/src/tree-document';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');

/** A private copy of a story, and how to remove it. */
export interface ScratchStory {
  /** The copy's directory, under the OS temp directory — never inside the repo. */
  dir: string;
  /** Remove the copy. Safe to call more than once. */
  cleanup: () => void;
}

/**
 * The directory names the root `.gitignore` ignores as directories — the
 * lines ending in `/`, plus `node_modules` whichever form it takes. Read at
 * call time so the list follows the file rather than a hardcoded copy of it.
 */
function ignoredDirectoryNames(): Set<string> {
  const names = new Set<string>(['node_modules']);
  const text = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf-8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith('#') || line.startsWith('!')) continue;
    if (!line.endsWith('/')) continue;
    const name = line.slice(0, -1);
    // Only bare names apply everywhere; a path rule (`docs/book/*/web/`) is not a name.
    if (name.includes('/') || name.includes('*')) continue;
    names.add(name);
  }
  return names;
}

/**
 * Copy a story directory into a fresh temp directory, skipping ignored
 * build output.
 *
 * @param sourceDir the real story directory
 * @param prefix the temp directory's name prefix, for a readable `ls /tmp`
 * @returns the copy and its cleanup
 * @throws when the source does not exist
 */
export function copyStoryToScratch(sourceDir: string, prefix = 'narrative-scratch-'): ScratchStory {
  if (!existsSync(sourceDir)) throw new Error(`scratch copy: ${sourceDir} does not exist`);
  const ignored = ignoredDirectoryNames();
  const parent = mkdtempSync(join(tmpdir(), prefix));
  const dir = join(parent, basename(sourceDir));
  cpSync(sourceDir, dir, {
    recursive: true,
    filter: (source) => !ignored.has(basename(source)),
  });
  return {
    dir,
    cleanup: () => rmSync(parent, { recursive: true, force: true }),
  };
}

/**
 * Delete the one line of a file whose trimmed text equals the needle.
 *
 * @param file the file to edit in place
 * @param needle the line's text, whitespace-trimmed
 * @returns the number of lines removed — always 1 when this returns
 * @throws when zero or more than one line matches; a mutation that did not
 *   happen, or happened twice, is not the mutation the beat describes
 */
export function deleteLine(file: string, needle: string): number {
  const lines = readFileSync(file, 'utf-8').split('\n');
  const kept = lines.filter((line) => line.trim() !== needle);
  const removed = lines.length - kept.length;
  if (removed !== 1) {
    throw new Error(`deleteLine: expected exactly one line equal to ${JSON.stringify(needle)} in ${file}, found ${removed}`);
  }
  writeFileSync(file, kept.join('\n'), 'utf-8');
  return removed;
}

/**
 * Insert lines immediately after the one line whose trimmed text equals the
 * needle.
 *
 * @param file the file to edit in place
 * @param needle the anchor line's text, whitespace-trimmed
 * @param insertion the lines to insert, verbatim (carry their own indentation)
 * @returns the 1-based line number of the anchor
 * @throws when zero or more than one line matches the anchor
 */
export function insertAfterLine(file: string, needle: string, insertion: string[]): number {
  const lines = readFileSync(file, 'utf-8').split('\n');
  const matches = lines.map((line, index) => (line.trim() === needle ? index : -1)).filter((index) => index >= 0);
  if (matches.length !== 1) {
    throw new Error(`insertAfterLine: expected exactly one line equal to ${JSON.stringify(needle)} in ${file}, found ${matches.length}`);
  }
  const at = matches[0];
  lines.splice(at + 1, 0, ...insertion);
  writeFileSync(file, lines.join('\n'), 'utf-8');
  return at + 1;
}

/**
 * Read a test tree directory's own files, keyed by file name.
 *
 * @param treeDir the `<story-id>.tests/` directory
 * @returns the files branch-tester assembles
 */
export function readTreeFiles(treeDir: string): TreeFiles {
  const files: TreeFiles = {};
  for (const name of readdirSync(treeDir)) {
    const path = join(treeDir, name);
    if (statSync(path).isFile()) files[name] = readFileSync(path, 'utf-8');
  }
  return files;
}

/**
 * Read a test tree directory as the tree it holds.
 *
 * @param treeDir the `<story-id>.tests/` directory
 * @returns the assembled tree
 * @throws when the directory does not read as a tree — a suite must not
 *   trust verdicts about a tree it could not read
 */
export function readTree(treeDir: string): TreeDocument {
  const read = assembleTree(readTreeFiles(treeDir));
  if (read.status !== 'ok') throw new Error(`${treeDir} does not read as a tree: ${read.message}`);
  return read.document;
}

/**
 * Edit a scratch copy's test tree through a function, and return what it
 * returned. The tree is assembled, edited, and written back the way the
 * Testing tab writes it — new ids minted, only changed segments rewritten,
 * segments that no longer exist removed — so the result passes the canonical
 * gate and the CLI runs it.
 *
 * @param treeDir the scratch copy's `<story-id>.tests/` directory
 * @param edit receives the assembled tree to mutate; its return value is
 *   handed back so the test can assert on what the edit actually removed or changed
 * @returns whatever `edit` returned
 */
export function editTree<R>(treeDir: string, edit: (document: TreeDocument) => R): R {
  const before = readTreeFiles(treeDir);
  const document = readTree(treeDir);
  const result = edit(document);
  ensureSegmentIds(document);
  const { written, removed } = diffTreeFiles(before, segmentTree(document));
  for (const [name, text] of Object.entries(written)) writeFileSync(join(treeDir, name), text, 'utf-8');
  for (const name of removed) rmSync(join(treeDir, name));
  return result;
}
