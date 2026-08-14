#!/usr/bin/env node
/**
 * verify-examples.mjs — compile-check harness for the Chord language
 * reference (docs/reference/chord-language.md).
 *
 * Purpose: prove every example in the reference compiles (or fails exactly
 * as documented) against the real @sharpee/chord parser — the doc's drift
 * protection, per the chord-language-reference plan.
 *
 * Public interface: `node verify-examples.mjs` — compiles every *.story
 * under ./fixtures/ (recursive) and exits 0 only if all match expectation.
 * Owner context: docs tooling (chord-language-reference work target); reads
 * the built platform package, never modifies it.
 *
 * Expectation convention (decided Phase 1):
 *   fixtures/manifest.json maps fixture path (relative to fixtures/, POSIX
 *   separators) → { "expect": "fail", "codes": ["parse.removed-flag", …] }.
 *   - Absent from the manifest ⇒ the fixture must compile clean (ok: true).
 *   - Listed with expect "fail" ⇒ compile must report ok: false AND every
 *     listed diagnostic code must be present (extra diagnostics allowed).
 *
 * Doc traceability convention (enforced by Phase 6's extension):
 *   each fenced code block in chord-language.md is preceded by
 *   `<!-- fixture: <relpath> -->` naming the fixture that backs it.
 */
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');
const chordDist = path.join(repoRoot, 'packages', 'chord', 'dist', 'index.js');
const fixturesDir = path.join(here, 'fixtures');
const manifestPath = path.join(fixturesDir, 'manifest.json');

if (!existsSync(chordDist)) {
  console.error(`verify-examples: built compiler not found at ${chordDist}`);
  console.error('Build it first (e.g. ./repokit build, or pnpm --filter @sharpee/chord build).');
  process.exit(2);
}

// Same resolution compose.ts uses: the built CJS package, loaded via require.
const require = createRequire(import.meta.url);
const { compile } = require(chordDist);

const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf-8'))
  : {};

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

const fixtures = collectStories(fixturesDir);
if (fixtures.length === 0) {
  console.error('verify-examples: no fixtures found under fixtures/');
  process.exit(2);
}

let passed = 0;
const failures = [];

for (const rel of fixtures) {
  const source = readFileSync(path.join(fixturesDir, rel), 'utf-8');
  const result = compile(source);
  const expectation = manifest[rel];
  const codes = result.diagnostics.map((d) => d.code);

  if (expectation && expectation.expect === 'fail') {
    const missing = (expectation.codes ?? []).filter((c) => !codes.includes(c));
    if (!result.ok && missing.length === 0) {
      passed++;
      console.log(`PASS (expected-fail) ${rel} [${(expectation.codes ?? []).join(', ')}]`);
    } else if (result.ok) {
      failures.push(`${rel}: expected to fail with [${expectation.codes}] but compiled clean`);
    } else {
      failures.push(`${rel}: failed, but missing expected code(s) [${missing.join(', ')}]; got [${codes.join(', ')}]`);
    }
  } else if (result.ok) {
    passed++;
    console.log(`PASS ${rel}`);
  } else {
    failures.push(`${rel}: expected clean compile, got:`);
    for (const d of result.diagnostics) {
      failures.push(`  ${rel}:${d.span.line}:${d.span.column} ${d.severity} [${d.code}] ${d.message}`);
    }
  }
}

// Orphan manifest entries are mistakes too: every listed fixture must exist.
for (const listed of Object.keys(manifest)) {
  if (!fixtures.includes(listed)) failures.push(`manifest.json: no such fixture ${listed}`);
}

console.log(`\n${passed}/${fixtures.length} fixtures match expectation`);
if (failures.length > 0) {
  console.error('\nFAILURES:');
  for (const f of failures) console.error(f);
  process.exit(1);
}
