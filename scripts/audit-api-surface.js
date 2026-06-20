#!/usr/bin/env node
/**
 * audit-api-surface.js
 *
 * Audits the PUBLIC API surface of every @sharpee/* package.
 *
 * For each package it resolves the true public surface — the declaration files
 * reachable from the package's published entry points (package.json "types" +
 * "exports" subpaths) — using the same re-export walk as
 * scripts/generate-genai-api.js, then extracts a symbol-level inventory
 * (classes / interfaces / type aliases / functions / consts / enums) and emits
 * mechanical findings.
 *
 * Output: docs/work/book/api-audit/inventory.md  (+ console summary)
 * Run: node scripts/audit-api-surface.js
 *
 * Reproducible: re-run any time the API changes. No hand-maintained lists.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'work', 'book', 'api-audit');

// Packages documented by the genai-api generator (for coverage findings).
const GENAI_DOCUMENTED = new Set([
  '@sharpee/core', '@sharpee/if-domain', '@sharpee/world-model', '@sharpee/engine',
  '@sharpee/stdlib', '@sharpee/parser-en-us', '@sharpee/lang-en-us', '@sharpee/plugins',
  '@sharpee/plugin-npc', '@sharpee/plugin-scheduler', '@sharpee/plugin-state-machine',
  '@sharpee/text-blocks', '@sharpee/if-services', '@sharpee/event-processor',
  '@sharpee/ext-basic-combat',
]);

// ---------------------------------------------------------------------------
// Package discovery
// ---------------------------------------------------------------------------

function discoverPackages() {
  const dirs = [];
  for (const base of ['packages', 'packages/extensions']) {
    const baseDir = path.join(ROOT, base);
    if (!fs.existsSync(baseDir)) continue;
    for (const entry of fs.readdirSync(baseDir)) {
      const dir = path.join(baseDir, entry);
      const pj = path.join(dir, 'package.json');
      if (entry === 'extensions') continue; // handled by the second base
      if (fs.existsSync(pj)) dirs.push(dir);
    }
  }
  return dirs.map((dir) => {
    const pj = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return { dir, name: pj.name || path.basename(dir), private: !!pj.private, pj };
  }).filter((p) => p.name.startsWith('@sharpee/')).sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// .d.ts resolution + reachability  (ported from generate-genai-api.js)
// ---------------------------------------------------------------------------

function resolveDeclarationFile(basedir, relPath) {
  relPath = relPath.replace(/['"]/g, '');
  if (relPath.startsWith('@')) return null;
  if (relPath.endsWith('.js')) relPath = relPath.slice(0, -3);
  const full = path.resolve(basedir, relPath);
  if (fs.existsSync(full + '.d.ts')) return full + '.d.ts';
  if (fs.existsSync(path.join(full, 'index.d.ts'))) return path.join(full, 'index.d.ts');
  return null;
}

function isBarrelFile(content) {
  const lines = content.split('\n').map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//') && !l.startsWith('*') && !l.startsWith('/**'));
  if (lines.length === 0) return true;
  return lines.every((l) =>
    (l.startsWith('export ') && l.includes(' from ')) || l === 'export {};' || l.startsWith('import '));
}

function hasLocalDeclarations(content) {
  return /\b(declare (class|function|const|enum|abstract class)|export interface|export type|export declare)\b/.test(content)
    || content.includes('interface ');
}

function collectDeclarationFiles(indexFile, maxDepth = 6) {
  const visited = new Set();
  const result = [];
  const crossPackageReExports = new Set();
  function walk(filePath, depth) {
    if (depth > maxDepth || visited.has(filePath) || !fs.existsSync(filePath)) return;
    visited.add(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const dir = path.dirname(filePath);
    const re = /export\s+(?:type\s+)?(?:\*|{[^}]*})\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      const ref = m[1];
      if (ref.startsWith('@')) { crossPackageReExports.add(ref); continue; }
      const resolved = resolveDeclarationFile(dir, ref);
      if (!resolved) continue;
      const rc = fs.readFileSync(resolved, 'utf8');
      if (isBarrelFile(rc)) walk(resolved, depth + 1);
      else if (!visited.has(resolved)) { visited.add(resolved); result.push(resolved); }
    }
    if (hasLocalDeclarations(content) && !result.includes(filePath)) result.push(filePath);
  }
  walk(indexFile, 0);
  return { files: result, crossPackageReExports: [...crossPackageReExports] };
}

// Entry points = package.json "types" + every "types" found in "exports" subpaths.
function entryPoints(pkg) {
  const entries = new Set();
  const add = (p) => { if (p && p.endsWith('.d.ts')) entries.add(path.join(pkg.dir, p)); };
  add(pkg.pj.types);
  const exp = pkg.pj.exports;
  if (exp && typeof exp === 'object') {
    const collect = (node) => {
      if (!node) return;
      if (typeof node === 'string') { if (node.endsWith('.d.ts')) add(node); return; }
      if (typeof node === 'object') { if (node.types) add(node.types); for (const v of Object.values(node)) collect(v); }
    };
    collect(exp);
  }
  if (entries.size === 0) add('./dist/index.d.ts');
  return [...entries].filter((f) => fs.existsSync(f));
}

// ---------------------------------------------------------------------------
// Symbol extraction
// ---------------------------------------------------------------------------

const KIND_RE = {
  class: /export\s+(?:declare\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)/g,
  interface: /export\s+(?:declare\s+)?interface\s+([A-Za-z0-9_$]+)/g,
  type: /export\s+(?:declare\s+)?type\s+([A-Za-z0-9_$]+)\s*[=<]/g,
  function: /export\s+declare\s+function\s+([A-Za-z0-9_$]+)/g,
  const: /export\s+declare\s+(?:const|let|var)\s+([A-Za-z0-9_$]+)/g,
  enum: /export\s+(?:declare\s+)?(?:const\s+)?enum\s+([A-Za-z0-9_$]+)/g,
};

function extractSymbols(files) {
  const symbols = {}; // kind -> Set(name)
  for (const k of Object.keys(KIND_RE)) symbols[k] = new Set();
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const [kind, reSrc] of Object.entries(KIND_RE)) {
      const re = new RegExp(reSrc.source, 'g');
      let m;
      while ((m = re.exec(content)) !== null) symbols[kind].add(m[1]);
    }
  }
  return symbols;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pkgs = discoverPackages();
  const rows = [];

  for (const pkg of pkgs) {
    const eps = entryPoints(pkg);
    const built = eps.length > 0;
    let symbols = null, total = 0, crossPkg = [];
    if (built) {
      const collected = eps.map((ep) => collectDeclarationFiles(ep));
      const files = [...new Set(collected.flatMap((c) => c.files))];
      crossPkg = [...new Set(collected.flatMap((c) => c.crossPackageReExports))];
      symbols = extractSymbols(files);
      total = Object.values(symbols).reduce((s, set) => s + set.size, 0);
    }
    rows.push({ pkg, built, symbols, total, crossPkg, entryCount: eps.length });
  }

  // ---- Build markdown ----
  const L = [];
  const stamp = process.env.AUDIT_DATE || '(run date not stamped)';
  L.push('# Sharpee API Surface Audit — Inventory');
  L.push('');
  L.push(`Generated by \`scripts/audit-api-surface.js\` — reproducible; re-run after API changes.`);
  L.push(`Date: ${stamp}`);
  L.push('');
  L.push('Public surface = declaration files reachable from each package\'s published entry points');
  L.push('(`package.json` "types" + "exports" subpaths). Counts are de-duplicated by symbol name per');
  L.push('kind. Selective re-exports (`export { X } from`) may slightly over-count (whole source file is');
  L.push('scanned); cross-package re-exports are listed separately, not counted in totals.');
  L.push('');

  const docCount = rows.filter((r) => GENAI_DOCUMENTED.has(r.pkg.name)).length;
  const builtCount = rows.filter((r) => r.built).length;
  L.push('## Summary');
  L.push('');
  L.push(`- Packages: **${rows.length}**  ·  built (auditable): **${builtCount}**  ·  unbuilt: **${rows.length - builtCount}**`);
  L.push(`- Documented in genai-api: **${docCount}**  ·  undocumented: **${rows.length - docCount}**`);
  L.push('');
  L.push('| Package | Priv | Built | genai-api | Classes | Iface | Types | Fns | Const | Enum | Total |');
  L.push('|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|');
  for (const r of rows) {
    const s = r.symbols;
    const c = (k) => (s ? s[k].size : '—');
    L.push(`| \`${r.pkg.name}\` | ${r.pkg.private ? '🔒' : ''} | ${r.built ? '✓' : '**no**'} | ${GENAI_DOCUMENTED.has(r.pkg.name) ? '✓' : '**—**'} | ${c('class')} | ${c('interface')} | ${c('type')} | ${c('function')} | ${c('const')} | ${c('enum')} | ${r.built ? `**${r.total}**` : '—'} |`);
  }
  L.push('');

  // ---- Findings (mechanical) ----
  L.push('## Mechanical Findings');
  L.push('');
  const unbuilt = rows.filter((r) => !r.built);
  L.push(`### Unbuilt — no auditable surface (${unbuilt.length})`);
  L.push(unbuilt.length ? unbuilt.map((r) => `- \`${r.pkg.name}\` (${path.relative(ROOT, r.pkg.dir)})`).join('\n') : '- none');
  L.push('');
  const undoc = rows.filter((r) => r.built && !GENAI_DOCUMENTED.has(r.pkg.name) && r.total > 0);
  L.push(`### Built but undocumented in genai-api (${undoc.length})`);
  L.push(undoc.length ? undoc.map((r) => `- \`${r.pkg.name}\` — ${r.total} exported symbols, 0 in genai-api`).join('\n') : '- none');
  L.push('');
  const priv = rows.filter((r) => r.pkg.private);
  L.push(`### Marked \`private\` in package.json (${priv.length})`);
  L.push(priv.length ? priv.map((r) => `- \`${r.pkg.name}\``).join('\n') : '- none');
  L.push('');
  const big = rows.filter((r) => r.built && r.total >= 150).sort((a, b) => b.total - a.total);
  L.push(`### Large surfaces (≥150 symbols) — candidates for sub-entry-points (${big.length})`);
  L.push(big.length ? big.map((r) => `- \`${r.pkg.name}\` — ${r.total}`).join('\n') : '- none');
  L.push('');
  const xpkg = rows.filter((r) => r.crossPkg && r.crossPkg.length);
  L.push(`### Cross-package re-exports (surface leaks another package's symbols) (${xpkg.length})`);
  L.push(xpkg.length ? xpkg.map((r) => `- \`${r.pkg.name}\` re-exports from: ${r.crossPkg.join(', ')}`).join('\n') : '- none');
  L.push('');

  // ---- Per-package symbol detail ----
  L.push('## Per-Package Inventory');
  L.push('');
  for (const r of rows) {
    L.push(`### \`${r.pkg.name}\``);
    if (!r.built) { L.push(''); L.push('> Unbuilt — no `dist` surface to audit.'); L.push(''); continue; }
    L.push(` (${r.entryCount} entry point${r.entryCount === 1 ? '' : 's'}, ${r.total} symbols)`);
    L.push('');
    for (const kind of ['class', 'interface', 'type', 'function', 'const', 'enum']) {
      const names = [...r.symbols[kind]].sort();
      if (!names.length) continue;
      L.push(`- **${kind}** (${names.length}): ${names.map((n) => `\`${n}\``).join(', ')}`);
    }
    L.push('');
  }

  const out = path.join(OUT_DIR, 'inventory.md');
  fs.writeFileSync(out, L.join('\n'), 'utf8');

  // ---- Console summary ----
  process.stdout.write(`\nAudited ${rows.length} packages (${builtCount} built, ${rows.length - builtCount} unbuilt)\n`);
  process.stdout.write(`Undocumented in genai-api: ${undoc.length}\n`);
  process.stdout.write(`Wrote ${path.relative(ROOT, out)}\n`);
}

main();
