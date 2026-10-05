// What a Chord story uses, measured against the parser's own AST node inventory.
//
//   node story-usage.mjs [--chord <packages/chord dir>] [--story <story dir>] [--main <file.story>]
//
// Compiles the story with packages/chord/dist-esm (build the package first) and
// walks the AST; nothing is searched as text and there is no regex. The node
// universe is every string literal typed on a `kind` property in dist-esm/ast.d.ts,
// read with the TypeScript compiler API (needs a `typescript` 5.x install that
// resolves from packages/chord, this folder, or the current directory).
//
// Diffuseness: `on`/`after` clauses in one create or trait block that are identical
// to a sibling except for the gerund. This is this script's own measure, not a
// published metric.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// Paths default to this repo's layout (docs/work/chord-analyzer -> repo root); override with flags.
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../..');
function flag(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : fallback;
}
const chordDir = flag('--chord', join(REPO, 'packages/chord'));
const storyDir = flag('--story', join(REPO, 'branch-stories/secret-letter'));
const mainIdx = process.argv.indexOf('--main');
const mainFile = mainIdx >= 0 && process.argv[mainIdx + 1] ? process.argv[mainIdx + 1] : 'secret-letter.story';
const chord = await import(join(chordDir, 'dist-esm/index.js'));

// --- universe of `kind` discriminators
const universe = new Map(); let universeHow = 'typescript';
try {
  let ts = null;
  for (const base of [chordDir, HERE, process.cwd()]) {
    try {
      const candidate = createRequire(join(base, 'package.json'))('typescript');
      if (typeof candidate.createSourceFile === 'function') { ts = candidate; break; }
    } catch { /* try the next base */ }
  }
  if (!ts) throw new Error('no usable typescript (5.x) found');
  const file = join(chordDir, 'dist-esm/ast.d.ts');
  const sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (node, owner) => {
    let own = owner;
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) own = node.name.text;
    if (ts.isPropertySignature(node) && node.name && node.name.getText(sf) === 'kind' && node.type) {
      const collect = (t) => {
        if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) { if (!universe.has(t.literal.text)) universe.set(t.literal.text, own); }
        else if (ts.isUnionTypeNode(t)) t.types.forEach(collect);
      };
      collect(node.type);
    }
    ts.forEachChild(node, (c) => visit(c, own));
  };
  visit(sf, null);
} catch (e) { universeHow = 'FAILED: ' + e.message.slice(0, 200); }

// --- compile the story
const files = [mainFile];
const src = readFileSync(join(storyDir, mainFile), 'utf8');
const res = chord.compile(src, { importResolver: (p) => { const f = join(storyDir, p); if (!existsSync(f)) return null; files.push(p); return readFileSync(f, 'utf8'); } });

// --- line census
let total = 0, comment = 0, blank = 0;
for (const f of new Set(files)) for (const line of readFileSync(join(storyDir, f), 'utf8').split('\n')) {
  total++; const t = line.trim(); if (t.length === 0) blank++; else if (line.startsWith('##')) comment++;
}

// --- walk
const used = new Map(); const strategies = new Map(); const gerunds = new Map(); const compKinds = new Map();
const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);
const seen = new Set();
function walk(n) {
  if (n === null || typeof n !== 'object' || seen.has(n)) return; seen.add(n);
  if (Array.isArray(n)) { for (const x of n) walk(x); return; }
  if (typeof n.kind === 'string') bump(used, n.kind);
  if (typeof n.strategy === 'string') bump(strategies, `${n.kind}:${n.strategy}`);
  if (n.kind === 'on-clause') bump(gerunds, n.action ?? '(every turn)');
  for (const [k, v] of Object.entries(n)) if (k !== 'span') walk(v);
}
walk(res.ast);

// --- diffuseness: on-clauses in one owner identical except for the gerund
const strip = (k, v) => (k === 'span' || k === 'action' ? undefined : v);
let owners = 0, clauses = 0, redundant = 0, redundantLines = 0, groupsOver1 = 0; const worst = [];
function scanOwner(label, list) {
  if (!list || list.length === 0) return; owners++; clauses += list.length;
  const groups = new Map();
  for (const c of list) { const key = JSON.stringify(c, strip); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(c); }
  let r = 0;
  for (const g of groups.values()) if (g.length > 1) { groupsOver1++; r += g.length - 1; for (const c of g.slice(1)) redundantLines += c.span.endLine - c.span.line + 1; }
  redundant += r; if (r > 0) worst.push([label, r, list.length]);
}
for (const d of res.ast.declarations) {
  if (d.kind === 'create' || d.kind === 'define-trait') scanOwner((d.name.words ?? [d.name]).join(' '), d.onClauses);
}
worst.sort((a, b) => b[1] - a[1]);

const declKinds = new Map(); for (const d of res.ast.declarations) bump(declKinds, d.kind);
const unused = [...universe.keys()].filter((k) => !used.has(k)).sort();
const notInUniverse = [...used.keys()].filter((k) => !universe.has(k)).sort();
const sortDesc = (m) => [...m].sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify({
  compile: { ok: res.ok, diagnostics: res.diagnostics.length, language: chord.CHORD_LANGUAGE_VERSION, files: new Set(files).size },
  lines: { total, comment, blank, code: total - comment - blank },
  universe: { how: universeHow, kinds: universe.size, used: universe.size - unused.length, pct: +(100 * (universe.size - unused.length) / Math.max(1, universe.size)).toFixed(1), notInUniverse },
  declarations: sortDesc(declKinds),
  strategies: sortDesc(strategies),
  gerunds: { distinct: gerunds.size, top: sortDesc(gerunds).slice(0, 12) },
  diffuseness: { owners, clauses, groupsOver1, redundant, pctOfClauses: +(100 * redundant / clauses).toFixed(1), lines: redundantLines, pctOfCodeLines: +(100 * redundantLines / (total - comment - blank)).toFixed(1), worst: worst.slice(0, 8) },
}, null, 1));
console.log('UNUSED', unused.map((k) => `${k}`).join(', '));
