#!/usr/bin/env node
/**
 * migrate-boot-cards.mjs — the one-shot move of every tracked test tree from
 * the opening/boot pair to the single opening card (ADR-404 decision 12).
 *
 * A tree recorded before the opening became a routine holds two cards at the
 * main line's head: an `opening` card and, after it, a card for the first
 * look. The first look is now part of the opening, the reader refuses the
 * second card's type, and nothing in the reader migrates (ADR-307 D8). This
 * script does the move once, for the repository's own trees: in each tree it
 * removes the first-look card and puts that card's assertions on the opening
 * card, then writes the tree through branch-tester's canonical writer
 * (`assembleTree` then `segmentTree`), so every file it leaves is in the
 * bytes `check-test-trees.mjs` accepts.
 *
 * It changes cards only. It runs no story, so what a migrated tree asserts is
 * what the two cards asserted before; whether the opening still says it is
 * for the tree's own run to show, and a tree whose claims move is re-recorded
 * after that.
 *
 * Invariants:
 *   - A tree is written whole or not at all: any card it cannot move, or a
 *     result the reader does not accept, leaves that tree's files untouched
 *     and is reported.
 *   - Trees under `docs/work/archive/` (historical evidence) and
 *     `docs/work/chord-primer/` (supplied by David) are never read.
 *   - Running it again changes nothing.
 *
 * Public interface:
 *   node scripts/migrate-boot-cards.mjs            migrate every tracked tree
 *   node scripts/migrate-boot-cards.mjs --check    report what would change, write nothing
 *   node scripts/migrate-boot-cards.mjs --root <dir>   migrate the trees tracked in another
 *                                                  repository (the script's tests use this);
 *                                                  the reader and writer are still this one's
 *   Exit 0 when every tree was migrated or needed nothing; 1 when a tree could
 *   not be migrated; 2 when the script itself cannot run.
 *
 * Owner context: repository tooling for the Chord/IDE testing world.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository this script lives in: where branch-tester's built reader and writer are. */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The repository whose tracked trees are migrated: `--root <dir>`, else this one. */
const treeRoot = (() => {
  const index = process.argv.indexOf('--root');
  return index === -1 ? repoRoot : resolve(process.argv[index + 1] ?? '');
})();

/** Directories whose trees are never read: historical evidence, and David's primer. */
const EXCLUDED_PREFIXES = ['docs/work/archive/', 'docs/work/chord-primer/'];

/** The card type this script removes, as the old trees spell it. */
const FIRST_LOOK_CARD_TYPE = 'boot';

/** The manifest's file name in a tree directory; every other `.json` there is a segment. */
const MANIFEST_FILE_NAME = 'manifest.json';

/** The assertion families that merge by appending what the opening card lacks. */
const LIST_FAMILIES = ['contains', 'notContains', 'states', 'events'];

/**
 * Every tracked tree directory (repository-relative) outside the exclusions.
 *
 * @returns {string[]} the directories, sorted
 */
function trackedTreeDirectories() {
  const tracked = execFileSync('git', ['ls-files', '--cached'], {
    cwd: treeRoot,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  }).split('\n').filter(Boolean);
  const directories = new Set();
  for (const path of tracked) {
    const directory = dirname(path);
    if (!basename(directory).endsWith('.tests')) continue;
    if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
    directories.add(directory);
  }
  return [...directories].sort();
}

/**
 * The tracked files of one tree directory as they are on disk, by file name.
 *
 * @param {string} directory repository-relative tree directory
 * @returns {Record<string, string>}
 */
function readTreeFiles(directory) {
  const files = {};
  const tracked = execFileSync('git', ['ls-files', '--cached', '--', `${directory}/`], { cwd: treeRoot, encoding: 'utf8' })
    .split('\n').filter(Boolean);
  for (const path of tracked) {
    if (dirname(path) !== directory) continue;
    files[path.slice(directory.length + 1)] = readFileSync(join(treeRoot, path), 'utf8');
  }
  return files;
}

/**
 * Put a first-look card's assertions on the opening card.
 *
 * List families append what the opening card does not already say, in the
 * first-look card's order; channel claims append whole. An `exact` block
 * cannot move: the opening's row is checked against everything the opening
 * printed, so a whole-output match of the look alone could not hold there.
 *
 * @param {Record<string, unknown>} opening the opening card (mutated)
 * @param {Record<string, unknown>} firstLook the card being removed
 * @returns {string | undefined} why the card cannot be moved, or undefined when it was
 */
function mergeOntoOpening(opening, firstLook) {
  const unmovable = ['exact', 'locks', 'ending'].find((key) =>
    firstLook[key] !== undefined || firstLook.assertions?.[key] !== undefined);
  if (unmovable !== undefined) return `its first-look card carries '${unmovable}', which an opening card cannot hold`;
  const from = firstLook.assertions ?? {};
  // A skipped card asserts nothing, whatever it still lists.
  if (firstLook.skip === true || Object.keys(from).length === 0) return undefined;
  const onto = { ...(opening.assertions ?? {}) };
  for (const family of LIST_FAMILIES) {
    const added = (from[family] ?? []).filter((entry) => !(onto[family] ?? []).includes(entry));
    if (added.length > 0) onto[family] = [...(onto[family] ?? []), ...added];
  }
  if ((from.channels ?? []).length > 0) onto.channels = [...(onto.channels ?? []), ...from.channels];
  opening.assertions = onto;
  // An opening that now asserts is no longer one that asserts nothing.
  delete opening.skip;
  return undefined;
}

/**
 * Move one tree's first-look card onto its opening card, in memory.
 *
 * @param {Record<string, string>} files the tree's files by name
 * @returns {{ status: 'unchanged' } | { status: 'moved', files: Record<string, string> } | { status: 'failed', message: string }}
 */
function migrateFiles(files) {
  const next = { ...files };
  let moved = false;
  for (const [name, text] of Object.entries(files)) {
    if (name === MANIFEST_FILE_NAME || !name.endsWith('.json')) continue;
    let segment;
    try {
      segment = JSON.parse(text);
    } catch (error) {
      return { status: 'failed', message: `${name} is not JSON (${error instanceof Error ? error.message : String(error)})` };
    }
    const cards = Array.isArray(segment?.cards) ? segment.cards : [];
    const index = cards.findIndex((card) => card?.type === FIRST_LOOK_CARD_TYPE);
    if (index === -1) continue;
    const opening = cards[0];
    if (index !== 1 || opening?.type !== 'opening') {
      return { status: 'failed', message: `${name} has a first-look card that does not directly follow an opening card` };
    }
    const problem = mergeOntoOpening(opening, cards[index]);
    if (problem !== undefined) return { status: 'failed', message: `${name}: ${problem}` };
    cards.splice(index, 1);
    next[name] = JSON.stringify(segment);
    moved = true;
  }
  return moved ? { status: 'moved', files: next } : { status: 'unchanged' };
}

/** branch-tester's reader and canonical writer, from its built output. */
function loadTreeFormat() {
  const require = createRequire(import.meta.url);
  try {
    const { assembleTree, segmentTree } = require(join(repoRoot, 'packages/branch-tester/dist/index.js'));
    if (typeof assembleTree === 'function' && typeof segmentTree === 'function') return { assembleTree, segmentTree };
  } catch {
    // Reported below.
  }
  process.stderr.write('migrate-boot-cards: @sharpee/branch-tester is not built — run ./repokit build first.\n');
  process.exit(2);
}

function main() {
  const check = process.argv.includes('--check');
  const { assembleTree, segmentTree } = loadTreeFormat();
  let failed = false;
  let movedCount = 0;
  for (const directory of trackedTreeDirectories()) {
    const before = readTreeFiles(directory);
    const result = migrateFiles(before);
    if (result.status === 'unchanged') continue;
    if (result.status === 'failed') {
      failed = true;
      process.stderr.write(`migrate-boot-cards: ${directory}/ left untouched: ${result.message}\n`);
      continue;
    }
    // Through the reader and the canonical writer: the reader must accept
    // the moved tree, and the writer's bytes are the ones the gate accepts.
    const read = assembleTree(result.files);
    if (read.status !== 'ok') {
      failed = true;
      process.stderr.write(`migrate-boot-cards: ${directory}/ left untouched: the moved tree does not read (${read.status}): ${read.message}\n`);
      continue;
    }
    const written = segmentTree(read.document);
    const names = new Set([...Object.keys(before), ...Object.keys(written)]);
    const lost = [...names].filter((name) => written[name] === undefined);
    if (lost.length > 0) {
      failed = true;
      process.stderr.write(`migrate-boot-cards: ${directory}/ left untouched: the writer would drop ${lost.join(', ')}\n`);
      continue;
    }
    const changed = [...names].filter((name) => written[name] !== before[name]).sort();
    movedCount += 1;
    process.stdout.write(`${check ? 'would migrate' : 'migrated'} ${directory}/ (${changed.join(', ')})\n`);
    if (check) continue;
    for (const name of changed) writeFileSync(join(treeRoot, directory, name), written[name]);
  }
  process.stdout.write(`${movedCount} tree(s) ${check ? 'would be migrated' : 'migrated'}\n`);
  return failed ? 1 : 0;
}

process.exit(main());
