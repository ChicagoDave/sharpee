#!/usr/bin/env node
/**
 * @file audit-templates.js
 * @description Advisory scanner for ADR-158 compliance.
 *
 * Public interface: invoked as `pnpm audit:templates` from the repo root.
 * Owner context: dev-tooling / lang-articles guardrail. Not wired into CI;
 * exits 0 even on findings. Promote to a blocking check (test suite or CI
 * step) only if the bug class recurs.
 *
 * Two passes:
 *   (1) stdlib pass — flags `params: { … }` objects in
 *       packages/stdlib/src/actions/standard/ that pass `<identifier>.name`
 *       (a bare string) where they should pass `entityInfoFrom(<identifier>)`.
 *   (2) lang pass — flags message templates in packages/lang-en-us/src/actions/
 *       that reference an entity-noun placeholder (item, target, recipient,
 *       container, supporter, place, object, vehicle, door, blocking, key,
 *       noun) without going through the formatter chain ({the:…}, {a:…},
 *       {some:…}).
 *
 * Both heuristics produce false positives; the human reading the output
 * decides what to migrate. Exit 0 always.
 */

'use strict';

const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative, resolve } = require('node:path');

const ROOT = resolve(__dirname, '..');
const STDLIB_ACTIONS = join(ROOT, 'packages/stdlib/src/actions/standard');
const LANG_ACTIONS = join(ROOT, 'packages/lang-en-us/src/actions');

// Single-entity placeholders that participate in article rendering.
// Note: `items` is intentionally NOT included — it almost always carries a
// pre-rendered list string ("a sword, a lantern"), not a single EntityInfo.
const ENTITY_PLACEHOLDERS = new Set([
  'item',
  'target',
  'recipient',
  'container',
  'supporter',
  'place',
  'object',
  'vehicle',
  'door',
  'blocking',
  'key',
  'noun',
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (
      st.isFile() &&
      entry.endsWith('.ts') &&
      !entry.endsWith('.test.ts') &&
      !entry.endsWith('.d.ts')
    ) {
      yield full;
    }
  }
}

function scanStdlibFile(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const findings = [];

  let inParamsBlock = false;
  let paramsStartLine = 0;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!inParamsBlock) {
      const open = /\bparams:\s*\{/.exec(line);
      if (open) {
        inParamsBlock = true;
        paramsStartLine = i + 1;
        braceDepth = 0;
        for (const ch of line.slice(open.index)) {
          if (ch === '{') braceDepth++;
          else if (ch === '}') braceDepth--;
        }
        if (braceDepth <= 0) {
          inParamsBlock = false;
        }
      }
    } else {
      for (const ch of line) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') braceDepth--;
      }
    }

    if (inParamsBlock) {
      const stripped = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
      const re = /([A-Za-z_$][\w$]*)\.name\b/g;
      let m;
      while ((m = re.exec(stripped)) !== null) {
        const before = stripped.slice(0, m.index);
        if (/entityInfoFrom\s*\([^)]*$/.test(before)) continue;
        if (/['"`]/.test(before) && /['"`]/.test(stripped.slice(m.index))) continue;
        findings.push({
          file,
          line: i + 1,
          col: m.index + 1,
          hint: `bare ${m[1]}.name inside params: {…} block (opened at line ${paramsStartLine}). Consider entityInfoFrom(${m[1]}) — ADR-158.`,
          snippet: line.trim(),
        });
      }
    }

    if (inParamsBlock && braceDepth <= 0) {
      inParamsBlock = false;
    }
  }
  return findings;
}

function scanLangFile(file) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const findings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!/['"`]/.test(line)) continue;
    if (/^\s*(import|export\s+(type|interface)|interface|type\s+\w+\s*=)/.test(line)) continue;
    // Strip line comments so commentary that mentions {placeholder} does not
    // get reported as a real finding.
    const stripped = line.replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');

    const re = /\{([^{}]+)\}/g;
    let m;
    while ((m = re.exec(stripped)) !== null) {
      const inner = m[1];
      const segments = inner.split(':');
      const name = segments[segments.length - 1].trim();
      const formatters = segments.slice(0, -1).map((s) => s.trim());
      if (!ENTITY_PLACEHOLDERS.has(name)) continue;
      if (formatters.some((f) => f === 'the' || f === 'a' || f === 'some')) continue;
      findings.push({
        file,
        line: i + 1,
        col: m.index + 1,
        hint:
          formatters.length === 0
            ? `bare {${name}} placeholder — consider {the:${name}} or {the:cap:${name}} (ADR-158).`
            : `placeholder {${inner}} lacks a {the:|a:|some:} formatter (ADR-158).`,
        snippet: line.trim(),
      });
    }
  }
  return findings;
}

function main() {
  let stdlibFindings = [];
  let langFindings = [];

  for (const f of walk(STDLIB_ACTIONS)) {
    stdlibFindings = stdlibFindings.concat(scanStdlibFile(f));
  }

  if (statSync(LANG_ACTIONS).isDirectory()) {
    for (const f of walk(LANG_ACTIONS)) {
      langFindings = langFindings.concat(scanLangFile(f));
    }
  }

  const print = (label, items) => {
    console.log(`\n=== ${label} (${items.length} finding${items.length === 1 ? '' : 's'}) ===`);
    if (items.length === 0) {
      console.log('  (clean)');
      return;
    }
    for (const f of items) {
      const rel = relative(ROOT, f.file);
      console.log(`  ${rel}:${f.line}${f.col ? `:${f.col}` : ''}`);
      console.log(`    ${f.hint}`);
      console.log(`    > ${f.snippet}`);
    }
  };

  print('stdlib actions — bare entity.name in params blocks', stdlibFindings);
  print('lang-en-us templates — bare entity placeholders without formatter', langFindings);

  console.log(
    `\nADR-158 advisory scan complete. Total: ${stdlibFindings.length + langFindings.length} finding(s).`,
  );
  console.log(
    'This is advisory — exit 0 regardless. Promote to blocking only if the bug class recurs.',
  );
  process.exit(0);
}

main();
