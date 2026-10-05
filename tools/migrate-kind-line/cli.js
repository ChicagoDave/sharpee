#!/usr/bin/env node
/**
 * cli.js — runs the ADR-359 D1 kind-line migration over files and directories.
 *
 * Dry run by default: prints a per-file count by rule, the totals, the blocks
 * it refused, and the places that need a hand edit (Swift/C# fixtures, one-line
 * literals, `${}` inside a block). `--write` writes the migrated files.
 *
 *   node tools/migrate-kind-line/cli.js [--write] [--quiet] (--corpus | <path>...)
 *
 * `--corpus` is the cutover's scope: every Chord host in the repository except
 * the records ruled to stay as written — ADR examples and `docs/work` fixtures
 * (David, 2026-10-05) — and generated or archived output. Inside the
 * repository a directory walk reads only files git tracks.
 *
 * Public interface: the CLI; walk(paths) and run(paths, opts) for tests.
 * Owner context: tools/ — a one-time corpus migration.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { migrateFile, hostOf } = require('./hosts.js');
const { KIND_RULES } = require('./core.js');

const REPO = path.resolve(__dirname, '..', '..');

/** The cutover's roots, repo-relative. */
const CORPUS_ROOTS = ['stories', 'branch-stories', 'packages', 'tools', 'website/src', 'scripts'];

/**
 * Repo-relative paths git tracks. A directory walk reads only these, so build
 * output (app bundles, release folders, generated copies) is never rewritten.
 */
function trackedFiles() {
  const out = require('node:child_process').execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return new Set(out.split('\0').filter(Boolean));
}

/** Directory names never entered. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-esm', '_archive', '.git', '.next', 'build', 'bin', 'obj', 'DerivedData', 'coverage']);

/**
 * Repo-relative path prefixes never entered: records, this tool's own
 * fixtures, and the tests whose blocks lack a kind on purpose (they pin the
 * kind-line errors themselves).
 */
const SKIP_PREFIXES = ['docs/', 'tools/migrate-kind-line/', 'packages/chord/tests/adr-359-d1-thing.test.ts'];

/** File names that are generated output, never sources. */
const SKIP_FILE = (name) => name.endsWith('.map') || name === 'game.js' || name.endsWith('.min.js') || name.endsWith('.d.ts');

/**
 * Every file under the given paths that a host can read.
 * @param {string[]} paths files or directories (absolute or cwd-relative)
 * @returns {string[]} absolute paths, sorted
 */
function walk(paths) {
  const out = [];
  const tracked = trackedFiles();
  const visit = (abs) => {
    const rel = path.relative(REPO, abs).split(path.sep).join('/');
    const inRepo = !rel.startsWith('..');
    if (inRepo && SKIP_PREFIXES.some((p) => rel.startsWith(p))) return;
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(path.basename(abs))) return;
      for (const e of fs.readdirSync(abs)) visit(path.join(abs, e));
    } else if (hostOf(abs) && !SKIP_FILE(path.basename(abs)) && (!inRepo || tracked.has(rel))) {
      out.push(abs);
    }
  };
  for (const p of paths) {
    const abs = path.resolve(p);
    // An explicitly named file is always read, even under a skipped prefix.
    if (fs.statSync(abs).isFile()) {
      if (hostOf(abs)) out.push(abs);
    } else visit(abs);
  }
  return [...new Set(out)].sort();
}

/**
 * Migrate files and tally the result.
 * @param {string[]} files absolute paths
 * @param {{ write?: boolean }} opts
 * @returns {{ files: object[], totals: Record<string, number>, skipped: string[], reports: string[], parseErrorFiles: string[] }}
 */
function run(files, opts = {}) {
  const totals = Object.fromEntries(KIND_RULES.map((r) => [r, 0]));
  const perFile = [];
  const skipped = [];
  const reports = [];
  const parseErrorFiles = [];
  for (const abs of files) {
    const rel = path.relative(REPO, abs).split(path.sep).join('/');
    const text = fs.readFileSync(abs, 'utf8');
    const result = migrateFile(abs, text);
    reports.push(...result.reports.map((r) => r.replace(abs, rel)));
    for (const s of result.skipped) skipped.push(`${rel}:${s.line}: ${s.name} — ${s.reason}`);
    if (result.blocks.length === 0) continue;
    if (result.parseErrorViews > 0) parseErrorFiles.push(rel);
    const counts = Object.fromEntries(KIND_RULES.map((r) => [r, 0]));
    for (const b of result.blocks) {
      counts[b.rule]++;
      totals[b.rule]++;
    }
    perFile.push({ file: rel, counts, blocks: result.blocks.length });
    if (opts.write && result.text !== text) fs.writeFileSync(abs, result.text);
  }
  return { files: perFile, totals, skipped, reports, parseErrorFiles };
}

function main(argv) {
  const write = argv.includes('--write');
  const quiet = argv.includes('--quiet');
  const corpus = argv.includes('--corpus');
  const paths = argv.filter((a) => !a.startsWith('--'));
  if (!corpus && paths.length === 0) {
    process.stderr.write('usage: cli.js [--write] [--quiet] (--corpus | <path>...)\n');
    return 2;
  }
  const roots = corpus ? CORPUS_ROOTS.map((r) => path.join(REPO, r)) : paths;
  const result = run(walk(roots), { write });

  if (!quiet) for (const f of result.files) process.stdout.write(`${f.file}\t${KIND_RULES.map((r) => `${r}=${f.counts[r]}`).join(' ')}\n`);
  const sum = KIND_RULES.reduce((n, r) => n + result.totals[r], 0);
  process.stdout.write(`\n${write ? 'migrated' : 'would migrate'} ${sum} blocks in ${result.files.length} files: ${KIND_RULES.map((r) => `${r} ${result.totals[r]}`).join(', ')}\n`);
  if (result.parseErrorFiles.length) process.stdout.write(`\nfiles with parse errors in a migrated view (${result.parseErrorFiles.length}):\n${result.parseErrorFiles.join('\n')}\n`);
  if (result.skipped.length) process.stdout.write(`\nblocks left alone (${result.skipped.length}):\n${result.skipped.join('\n')}\n`);
  if (result.reports.length) process.stdout.write(`\nneeds a hand edit (${result.reports.length}):\n${result.reports.join('\n')}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { walk, run, CORPUS_ROOTS };
