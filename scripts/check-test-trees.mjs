#!/usr/bin/env node
/**
 * check-test-trees.mjs — the canonical gate for test trees (ADR-355 D7 rulings, 2026-09-29).
 *
 * Every file in a `<story-id>.tests/` directory must carry exactly the bytes
 * `segmentTree` writes for it. A second writer that re-indents or reorders
 * keys rewrites whole files without changing a single claim — about 95% of
 * secret-letter's measured churn (docs/work/desktop-claude/
 * secret-letter-tree-churn-20260929.md). This names every such file.
 *
 * Public interface:
 *   node scripts/check-test-trees.mjs            check the STAGED copy of every
 *                                                tree directory with a staged change
 *   node scripts/check-test-trees.mjs --all      check the staged copy of every
 *                                                tracked tree directory
 *   Exit 0 when every checked tree is canonical (or none was checked); 1 when a
 *   tree is non-canonical or unreadable; 2 when the checker itself cannot run
 *   (branch-tester not built, not in a git repository).
 *
 * Run by the local pre-commit hook (scripts/hooks/pre-commit) — never by CI.
 * It reads `@sharpee/branch-tester`'s built output: after changing the format,
 * rebuild that package before committing.
 *
 * Owner context: repository tooling for the Chord/IDE testing world.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Where this script lives — the repository whose branch-tester build it uses. */
const toolRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Run git in the working directory's repository and return its stdout.
 * Git's own stderr is captured, never passed through: the checker reports
 * in its own words.
 */
function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Whether the working directory is inside a git work tree. */
function insideWorkTree() {
  try {
    return git(['rev-parse', '--is-inside-work-tree']).trim() === 'true';
  } catch {
    return false;
  }
}

/** The tree directories (repository-relative) holding any of these paths. */
function treeDirectoriesOf(paths) {
  const directories = new Set();
  for (const path of paths) {
    const directory = dirname(path);
    if (basename(directory).endsWith('.tests')) directories.add(directory);
  }
  return [...directories].sort();
}

/** The staged files of one tree directory, keyed by file name. */
function stagedTreeFiles(directory) {
  const files = {};
  for (const path of git(['ls-files', '--cached', '--', `${directory}/`]).split('\n').filter(Boolean)) {
    if (dirname(path) !== directory) continue;
    files[path.slice(directory.length + 1)] = git(['show', `:${path}`]);
  }
  return files;
}

function loadGate() {
  const require = createRequire(import.meta.url);
  try {
    const { checkCanonicalTree } = require(join(toolRoot, 'packages/branch-tester/dist/index.js'));
    if (typeof checkCanonicalTree === 'function') return checkCanonicalTree;
  } catch {
    // Reported below.
  }
  process.stderr.write(
    'check-test-trees: @sharpee/branch-tester is not built with checkCanonicalTree — rebuild it and commit again.\n',
  );
  process.exit(2);
}

function main() {
  const all = process.argv.includes('--all');
  // Asked first: outside a repository, `git diff --cached` does not fail as
  // "not a repository" — it falls back to a plain-file diff and rejects the flag.
  if (!insideWorkTree()) {
    process.stderr.write('check-test-trees: not inside a git repository.\n');
    process.exit(2);
  }
  const paths = all
    ? git(['ls-files', '--cached']).split('\n').filter(Boolean)
    : git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);

  const directories = treeDirectoriesOf(paths);
  if (directories.length === 0) return 0;
  const checkCanonicalTree = loadGate();

  let failed = false;
  for (const directory of directories) {
    const files = stagedTreeFiles(directory);
    // The whole tree was removed in this commit: nothing left to check.
    if (Object.keys(files).length === 0) continue;
    const result = checkCanonicalTree(files);
    if (result.status === 'canonical') continue;
    failed = true;
    if (result.status === 'non-canonical') {
      process.stderr.write(
        `check-test-trees: ${directory}/ has files not in canonical form ` +
          `(re-save them from the Testing tab or sharpee test):\n` +
          result.files.map((name) => `  ${name}\n`).join(''),
      );
    } else {
      process.stderr.write(`check-test-trees: ${directory}/ cannot be read (${result.status}): ${result.message}\n`);
    }
  }
  return failed ? 1 : 0;
}

process.exit(main());
