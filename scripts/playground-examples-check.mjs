#!/usr/bin/env node
/**
 * scripts/playground-examples-check.mjs — compile every playground example
 * with the real Chord compiler and fail on any diagnostic error.
 *
 * website/src/app/playground/examples.ts has claimed since it was written that
 * its examples are "verified by scripts/playground-examples-check.mjs". That
 * script had never existed — no file, no git history — so nothing ever checked
 * the claim, and all four examples silently rotted past Chord 3.0.0's fielded
 * story block (ADR-298): every one still opened with the removed positional
 * `story "Title" by "Author"` form and a removed `version:` key, three errors
 * apiece. The seeded starter in a public playground did not compile.
 *
 * The examples are strings inside a .ts module rather than .story files, so
 * this transpiles that module with esbuild and imports it, instead of scraping
 * the template literals with a regex. Scraping would drift from the module's
 * real exports the moment anyone reformats it — the same class of unverified
 * assumption this script exists to end.
 *
 * Public interface: run it. Exit 0 = every example compiles clean.
 * Owner context: repo-root tooling; checks a website-owned source file against
 * the platform's compiler, which is why it lives here and not in website/
 * (the website has its own separate npm tree with no @sharpee/chord in it).
 *
 * Usage:  node scripts/playground-examples-check.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { transformSync } from 'esbuild';
import { compile } from '@sharpee/chord';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES_TS = join(REPO_ROOT, 'website/src/app/playground/examples.ts');

/** Transpile the examples module and import it for its real exports. */
async function loadExamples() {
  const ts = readFileSync(EXAMPLES_TS, 'utf8');
  const { code } = transformSync(ts, { loader: 'ts', format: 'esm' });
  const dir = mkdtempSync(join(tmpdir(), 'playground-examples-'));
  try {
    const file = join(dir, 'examples.mjs');
    writeFileSync(file, code);
    return await import(pathToFileURL(file).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const { EXAMPLES, STARTER_EXAMPLE } = await loadExamples();

if (!Array.isArray(EXAMPLES) || EXAMPLES.length === 0) {
  console.error('playground-examples: EXAMPLES is empty — nothing to check.');
  process.exit(1);
}

// The starter is what a first-time visitor sees before touching anything, so
// a broken one is the worst single failure here. Assert it is actually in the
// picker rather than trusting the module to keep them in sync.
if (!EXAMPLES.some((e) => e.id === STARTER_EXAMPLE?.id)) {
  console.error('playground-examples: STARTER_EXAMPLE is not present in EXAMPLES.');
  process.exit(1);
}

let failed = 0;

for (const example of EXAMPLES) {
  const result = compile(example.source, { fileName: `${example.id}.story` });
  const diagnostics = result.diagnostics ?? [];
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');

  if (errors.length === 0) {
    const note = warnings.length > 0 ? ` (${warnings.length} warning(s))` : '';
    console.log(`  ok   ${example.id}${note}`);
    for (const w of warnings) console.log(`         warning ${w.code} — ${w.message}`);
    continue;
  }

  failed++;
  console.error(`  FAIL ${example.id} — ${errors.length} error(s)`);
  for (const e of errors) console.error(`         ${e.code} — ${e.message}`);
}

if (failed > 0) {
  console.error(`\nplayground-examples: ${failed} of ${EXAMPLES.length} example(s) do not compile.`);
  console.error(`Source: ${EXAMPLES_TS}`);
  process.exit(1);
}

console.log(`\nplayground-examples: all ${EXAMPLES.length} example(s) compile clean.`);
