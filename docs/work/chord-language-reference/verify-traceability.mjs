#!/usr/bin/env node
/**
 * verify-traceability.mjs — doc<->fixture traceability check for the Chord
 * language reference (docs/reference/chord-language.md).
 *
 * Purpose: prove the reference's second core claim — that no example is
 * hand-typed drift. Companion to verify-examples.mjs (which proves the
 * fixtures compile as documented); this script proves the doc and the
 * fixtures are the same text, in both directions:
 *
 *   doc -> fixture  every ```story code block is immediately preceded by a
 *                   `<!-- fixture: <relpath> -->` marker AND is a verbatim
 *                   excerpt of that fixture (up to a uniform indentation
 *                   shift, so a block nested in a Markdown list still counts).
 *   fixture -> doc  every fixture is referenced: either a marker names it, or
 *                   it is an expected-fail fixture (manifest expect:"fail")
 *                   whose diagnostic code(s) appear in the doc prose — the
 *                   §6.3 migration table / §3.4 gate discussion cite those by
 *                   code, never as a passing code block.
 *
 * Public interface: `node verify-traceability.mjs` — exits 0 only if both
 * directions are clean; prints a per-failure report and a summary line.
 * Owner context: docs tooling (chord-language-reference work target); reads
 * the doc and the fixtures, modifies nothing.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const docPath = path.resolve(here, '..', '..', 'reference', 'chord-language.md');
const fixturesDir = path.join(here, 'fixtures');
const manifestPath = path.join(fixturesDir, 'manifest.json');

const doc = readFileSync(docPath, 'utf-8');
const docLines = doc.split('\n');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf-8')) : {};

/** Recursively collect *.story files under dir, as fixtures-relative POSIX paths. */
function collectStories(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...collectStories(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.story')) out.push(rel);
  }
  return out;
}

/** Strip the common leading whitespace shared by every non-blank line. */
function dedent(lines) {
  const indents = lines.filter((l) => l.trim() !== '').map((l) => l.match(/^\s*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}

/** True iff `block` (array of lines) appears as a contiguous run of `source`, up to a uniform indent shift. */
function isExcerpt(block, source) {
  const src = source.split('\n');
  const needle = dedent(block);
  for (let i = 0; i + block.length <= src.length; i++) {
    if (dedent(src.slice(i, i + block.length)) === needle) return true;
  }
  return false;
}

const fixtures = collectStories(fixturesDir);
const failures = [];
const marked = new Set();
let blockCount = 0;

// --- doc -> fixture: every ```story block is marked and verbatim ---
for (let i = 0; i < docLines.length; i++) {
  if (docLines[i].trim() !== '```story') continue;
  blockCount++;
  const marker = i > 0 ? docLines[i - 1].trim().match(/^<!-- fixture: (.+?) -->$/) : null;
  const start = i + 1;
  let end = start;
  while (end < docLines.length && docLines[end].trim() !== '```') end++;
  const block = docLines.slice(start, end);
  i = end;

  if (!marker) {
    failures.push(`doc:${start}: story code block has no <!-- fixture: … --> marker directly above it`);
    continue;
  }
  const rel = marker[1];
  marked.add(rel);
  const fixturePath = path.join(fixturesDir, rel);
  if (!existsSync(fixturePath)) {
    failures.push(`doc:${start}: marker names missing fixture ${rel}`);
    continue;
  }
  if (!isExcerpt(block, readFileSync(fixturePath, 'utf-8'))) {
    failures.push(`doc:${start}: block is not a verbatim excerpt of ${rel} (drift)`);
  }
}

// --- fixture -> doc: every fixture is referenced ---
let byCode = 0;
for (const rel of fixtures) {
  if (marked.has(rel)) continue;
  const spec = manifest[rel];
  if (spec && spec.expect === 'fail' && (spec.codes ?? []).length > 0 && spec.codes.every((c) => doc.includes(c))) {
    byCode++;
    continue;
  }
  failures.push(`fixture ${rel}: orphan — no doc code block cites it, and it is not an expected-fail fixture whose code the doc mentions`);
}

console.log(`doc→fixture: ${blockCount} story code blocks, all marked and verbatim (unless listed below)`);
console.log(`fixture→doc: ${marked.size} cited by marker, ${byCode} expected-fail cited by code, ${fixtures.length} total`);
if (failures.length) {
  console.error(`\nFAILURES (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`\nOK — ${blockCount}/${blockCount} blocks verbatim, ${fixtures.length}/${fixtures.length} fixtures referenced`);
