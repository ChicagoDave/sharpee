#!/usr/bin/env node
/**
 * check-fences-unchanged.cjs — prove a prose pass over The Chord Manual left
 * every fenced block alone.
 *
 * Logic: each Markdown file under the edition's frontmatter/ and parts/ is
 * read twice, once at a git ref (the baseline) and once in the working tree.
 * Both readings are split into fenced blocks and prose. The fences of the two
 * readings must be the same blocks, byte for byte and in the same order, in
 * the same files. Prose in the tree must hold no em-dash. Either failure
 * exits 1. Headings and inline code spans that differ between the readings
 * are listed without failing, because a prose pass may legitimately drop or
 * repeat a span and the part's change list has to account for each one.
 *
 * Invariant: the script never writes a file and never runs a shell; git is
 * called with an argument vector.
 *
 * Interface:
 *   node check-fences-unchanged.cjs <git ref>     compare the tree with <ref>
 *   node check-fences-unchanged.cjs --self-test   run the embedded fixtures
 *   Exit 0: every fence unchanged and no em-dash in prose.
 *   Exit 1: a fence changed, was added or removed, or prose holds an em-dash;
 *           or, under --self-test, a fixture did not behave as it must.
 *   Exit 2: usage error.
 *
 * Owner: the chord-manual-prose-pass plan (docs/work/chord-manual-prose-pass/).
 */
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..', '..');
const EDITION = 'docs/book/chord-v4.1.0';
const ROOTS = [`${EDITION}/frontmatter`, `${EDITION}/parts`];
const EM_DASH = '—';

/**
 * Split Markdown into its fenced blocks and its prose lines.
 * @param {string} text the file's whole text
 * @returns {{fences: string[], prose: string[]}} each fence as its lines
 *   joined (opening and closing lines included), and every line outside one
 */
function split(text) {
  const fences = [];
  const prose = [];
  let open = null; // { mark: '`' | '~', length: number, lines: string[] }
  for (const line of text.split('\n')) {
    const match = /^\s*(`{3,}|~{3,})/.exec(line);
    if (open === null) {
      if (match) open = { mark: match[1][0], length: match[1].length, lines: [line] };
      else prose.push(line);
      continue;
    }
    open.lines.push(line);
    const closes =
      match &&
      match[1][0] === open.mark &&
      match[1].length >= open.length &&
      line.trim() === match[1];
    if (closes) {
      fences.push(open.lines.join('\n'));
      open = null;
    }
  }
  if (open !== null) fences.push(open.lines.join('\n')); // unterminated: still compared
  return { fences, prose };
}

/** Count each value in a list. */
function tally(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

/** Describe how two multisets differ, as "-old" and "+new" lines. */
function multisetDifference(before, after) {
  const was = tally(before);
  const now = tally(after);
  const lines = [];
  for (const key of new Set([...was.keys(), ...now.keys()])) {
    const delta = (now.get(key) || 0) - (was.get(key) || 0);
    if (delta < 0) lines.push(`- ${key}  (x${-delta})`);
    if (delta > 0) lines.push(`+ ${key}  (x${delta})`);
  }
  return lines;
}

/**
 * Compare one file's two readings.
 * @param {string} name the file's path, for messages
 * @param {string|null} before its text at the baseline, or null if absent
 * @param {string|null} after its text in the tree, or null if absent
 * @returns {{failures: string[], notes: string[], fences: number}}
 */
function compare(name, before, after) {
  const failures = [];
  const notes = [];
  const was = split(before === null ? '' : before);
  const now = split(after === null ? '' : after);

  if (was.fences.length !== now.fences.length) {
    failures.push(`${name}: ${was.fences.length} fences at the baseline, ${now.fences.length} in the tree`);
  }
  const shared = Math.min(was.fences.length, now.fences.length);
  for (let index = 0; index < shared; index += 1) {
    if (was.fences[index] !== now.fences[index]) {
      failures.push(`${name}: fence ${index + 1} changed (opens "${now.fences[index].split('\n')[0].trim()}")`);
    }
  }
  now.prose.forEach((line) => {
    if (line.includes(EM_DASH)) failures.push(`${name}: em-dash in prose: ${line.trim().slice(0, 90)}`);
  });

  const headings = (reading) => reading.prose.filter((line) => /^#{1,6}\s/.test(line));
  for (const line of multisetDifference(headings(was), headings(now))) notes.push(`${name}: heading ${line}`);

  const spans = (reading) => reading.prose.join('\n').match(/`[^`\n]+`/g) || [];
  for (const line of multisetDifference(spans(was), spans(now))) notes.push(`${name}: inline code ${line}`);

  return { failures, notes, fences: now.fences.length };
}

/** List the Markdown files under the roots, in the working tree. */
function treeFiles() {
  const found = [];
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(REPO, relative), { withFileTypes: true })) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.md')) found.push(child);
    }
  };
  ROOTS.forEach(walk);
  return found;
}

/** List the Markdown files under the roots, at a git ref. */
function refFiles(ref) {
  const out = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', ...ROOTS], { cwd: REPO, encoding: 'utf8' });
  return out.split('\n').filter((name) => name.endsWith('.md'));
}

/** Compare the working tree with a git ref; print the result; return the exit code. */
function run(ref) {
  const before = new Set(refFiles(ref));
  const after = new Set(treeFiles());
  let failures = [];
  let notes = [];
  let fences = 0;
  for (const name of [...new Set([...before, ...after])].sort()) {
    const was = before.has(name)
      ? execFileSync('git', ['show', `${ref}:${name}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      : null;
    const now = after.has(name) ? fs.readFileSync(path.join(REPO, name), 'utf8') : null;
    const result = compare(name, was, now);
    failures = failures.concat(result.failures);
    notes = notes.concat(result.notes);
    fences += result.fences;
  }
  notes.forEach((note) => console.log(`note  ${note}`));
  failures.forEach((failure) => console.log(`FAIL  ${failure}`));
  const emDashes = failures.filter((failure) => failure.includes('em-dash in prose')).length;
  console.log(
    `${after.size} files, ${fences} fences in the tree, ${failures.length - emDashes} fence failures, ` +
      `${emDashes} em-dashes outside fences, ${notes.length} notes (baseline ${ref})`,
  );
  return failures.length === 0 ? 0 : 1;
}

/** Run the embedded fixtures: what must pass, and each defect that must be caught. */
function selfTest() {
  const base = ['# Title', '', 'Take the `lamp` now.', '', '```chord', 'create the lamp', '```', ''].join('\n');
  const cases = [
    ['a prose-only change passes', base.replace('Take the `lamp` now.', 'Now take the `lamp`.'), 0],
    ['a one-character fence change is caught', base.replace('create the lamp', 'create the lamq'), 1],
    ['an added fence is caught', `${base}\n\`\`\`text\nTaken.\n\`\`\`\n`, 1],
    ['a removed fence is caught', '# Title\n\nTake the `lamp` now.\n', 1],
    ['an em-dash in prose is caught', base.replace('now.', `now ${EM_DASH} at once.`), 1],
  ];
  let wrong = 0;
  for (const [label, changed, expectedFailures] of cases) {
    const got = compare('fixture.md', base, changed).failures.length;
    const ok = expectedFailures === 0 ? got === 0 : got >= 1;
    if (!ok) wrong += 1;
    console.log(`${ok ? 'ok  ' : 'WRONG'} ${label} (${got} failures)`);
  }
  const quoted = ['```text', `error ${EM_DASH} use spaces.`, '```', ''].join('\n');
  const quotedFailures = compare('fixture.md', quoted, quoted).failures.length;
  if (quotedFailures !== 0) wrong += 1;
  console.log(`${quotedFailures === 0 ? 'ok  ' : 'WRONG'} an em-dash quoted inside a fence passes (${quotedFailures} failures)`);
  const dropped = compare('fixture.md', base, base.replace('Take the `lamp` now.', 'Take it now.')).notes.length;
  if (dropped !== 1) wrong += 1;
  console.log(`${dropped === 1 ? 'ok  ' : 'WRONG'} a dropped inline code span is listed as a note (${dropped} notes)`);
  console.log(wrong === 0 ? 'self-test passed' : `self-test FAILED: ${wrong} fixtures`);
  return wrong === 0 ? 0 : 1;
}

const argument = process.argv[2];
if (!argument || process.argv.length > 3) {
  console.error('usage: node check-fences-unchanged.cjs <git ref> | --self-test');
  process.exit(2);
}
process.exit(argument === '--self-test' ? selfTest() : run(argument));
