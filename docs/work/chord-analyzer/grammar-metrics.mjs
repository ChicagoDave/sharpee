// Grammar metrics and well-formedness checks over chord.ebnf.
//
//   node grammar-metrics.mjs [--chord <packages/chord dir>]
//
// Metric definitions follow Power & Malloy, "A metrics suite for grammar-based
// software" (2004). The reader is a hand-written tokenizer + recursive-descent
// parser for this file's own EBNF dialect (`>>>` layout marker, postfix `*`,
// nesting comments); no regex. The counting conventions (what is a terminal, what
// is a Halstead operator) are this script's own, so compare the numbers across
// Chord versions, not against published figures for other languages.
//
// Checks: every rule ends in `;` (parse.errors), no duplicate rules, and every
// rule is reachable from `story-file` or `grammar-file` (unreachable).
import { readFileSync } from 'node:fs';
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
const text = readFileSync(join(chordDir, 'chord.ebnf'), 'utf8');

const isLetter = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isDigit = (c) => c >= '0' && c <= '9';
const isIdent = (c) => isLetter(c) || isDigit(c) || c === '-' || c === '_';
const isSpace = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t';
const PUNCT = ['=', ';', '|', '[', ']', '{', '}', '(', ')', '*', ','];

function tokenize(s) {
  const toks = []; const unknown = new Map(); let i = 0; let line = 1;
  while (i < s.length) {
    const c = s[i];
    if (c === '\n') { line++; i++; continue; }
    if (isSpace(c)) { i++; continue; }
    if (c === '(' && s[i + 1] === '*') {
      let j = i + 2; let depth = 1; // comments nest in this file (the header's Notation block needs it)
      while (j < s.length && depth > 0) {
        if (s[j] === '(' && s[j + 1] === '*') { depth++; j += 2; continue; }
        if (s[j] === '*' && s[j + 1] === ')') { depth--; j += 2; continue; }
        if (s[j] === '\n') line++; j++;
      }
      i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== c && s[j] !== '\n') j++;
      toks.push({ t: 'lit', v: s.slice(i + 1, j), line }); i = j + 1; continue;
    }
    if (c === '>' && s[i + 1] === '>' && s[i + 2] === '>') { toks.push({ t: 'layout', v: '>>>', line }); i += 3; continue; }
    if (isLetter(c)) {
      let j = i; while (j < s.length && isIdent(s[j])) j++;
      toks.push({ t: 'id', v: s.slice(i, j), line }); i = j; continue;
    }
    if (PUNCT.includes(c)) { toks.push({ t: c, v: c, line }); i++; continue; }
    unknown.set(c, (unknown.get(c) ?? 0) + 1); i++;
  }
  return { toks, unknown };
}

const { toks, unknown } = tokenize(text);
let p = 0; const errors = [];
const peek = () => toks[p]; const at = (t) => peek() && peek().t === t;
function parseExpr() { const alts = [parseSeq()]; while (at('|')) { p++; alts.push(parseSeq()); } return alts.length === 1 ? alts[0] : { n: 'alt', kids: alts }; }
function parseSeq() { const kids = []; while (peek() && !at('|') && !at(']') && !at('}') && !at(')') && !at(';') && !(at('id') && toks[p + 1] && toks[p + 1].t === '=')) { const f = parseFactor(); if (!f) break; kids.push(f); } return { n: 'seq', kids }; }
function parseFactor() {
  const k = peek(); let node;
  if (k.t === 'id') { p++; node = { n: 'sym', v: k.v }; }
  else if (k.t === 'lit') { p++; node = { n: 'lit', v: k.v }; }
  else if (k.t === 'layout') { p++; node = { n: 'layout' }; }
  else if (k.t === '[') { p++; node = { n: 'opt', kids: [parseExpr()] }; if (at(']')) p++; else errors.push(`line ${k.line}: unclosed [`); }
  else if (k.t === '{') { p++; node = { n: 'rep', kids: [parseExpr()] }; if (at('}')) p++; else errors.push(`line ${k.line}: unclosed {`); }
  else if (k.t === '(') { p++; node = { n: 'grp', kids: [parseExpr()] }; if (at(')')) p++; else errors.push(`line ${k.line}: unclosed (`); }
  else { errors.push(`line ${k.line}: unexpected '${k.v}'`); p++; return null; }
  if (at('*')) { p++; node = { n: 'star', kids: [node] }; }
  return node;
}
const rules = new Map(); const dupes = [];
while (p < toks.length) {
  const name = peek();
  if (name.t !== 'id' || !toks[p + 1] || toks[p + 1].t !== '=') { errors.push(`line ${name.line}: expected rule head, got '${name.v}'`); p++; continue; }
  p += 2; const body = parseExpr();
  if (at(';')) p++; else errors.push(`line ${name.line}: rule ${name.v} missing ;`);
  if (rules.has(name.v)) dupes.push(name.v);
  rules.set(name.v, { body, line: name.line });
}

function walk(node, fn) { fn(node); if (node.kids) for (const k of node.kids) walk(k, fn); }
const stats = new Map(); const literals = new Map(); const undefinedSyms = new Map();
let totalSyms = 0, totalOps = 0; const opKinds = new Set();
for (const [name, r] of rules) {
  let mcc = 0, syms = 0; const refs = new Set();
  walk(r.body, (n) => {
    if (n.n === 'alt') { mcc += n.kids.length - 1; totalOps += n.kids.length - 1; opKinds.add('|'); }
    if (n.n === 'opt' || n.n === 'rep' || n.n === 'star') { mcc += 1; totalOps += 1; opKinds.add(n.n); }
    if (n.n === 'grp') { totalOps += 1; opKinds.add('grp'); }
    if (n.n === 'sym') { syms++; if (rules.has(n.v)) refs.add(n.v); else undefinedSyms.set(n.v, (undefinedSyms.get(n.v) ?? 0) + 1); }
    if (n.n === 'lit') { syms++; literals.set(n.v, (literals.get(n.v) ?? 0) + 1); }
    if (n.n === 'layout') { syms++; }
  });
  totalSyms += syms; stats.set(name, { mcc, syms, refs, line: r.line });
}
const names = [...rules.keys()]; const VAR = names.length;
const wordLits = [...literals.keys()].filter((l) => l.length > 0 && [...l].every((c) => isLetter(c) || c === '-' || c === "'"));
const punctLits = [...literals.keys()].filter((l) => !wordLits.includes(l));
const TERM = literals.size + undefinedSyms.size;
const MCC = [...stats.values()].reduce((a, s) => a + s.mcc, 0);

// Tarjan SCC
let idx = 0; const st = []; const info = new Map(); const sccs = [];
function strong(v) {
  info.set(v, { i: idx, low: idx, on: true }); idx++; st.push(v);
  for (const w of stats.get(v).refs) {
    if (!info.has(w)) { strong(w); info.get(v).low = Math.min(info.get(v).low, info.get(w).low); }
    else if (info.get(w).on) info.get(v).low = Math.min(info.get(v).low, info.get(w).i);
  }
  if (info.get(v).low === info.get(v).i) { const comp = []; let w; do { w = st.pop(); info.get(w).on = false; comp.push(w); } while (w !== v); sccs.push(comp); }
}
for (const v of names) if (!info.has(v)) strong(v);
const recursive = sccs.filter((c) => c.length > 1 || stats.get(c[0]).refs.has(c[0]));
// transitive closure edges
let closureEdges = 0; const reachFrom = new Map();
for (const v of names) { const seen = new Set(); const q = [...stats.get(v).refs]; while (q.length) { const w = q.pop(); if (seen.has(w)) continue; seen.add(w); for (const x of stats.get(w).refs) q.push(x); } reachFrom.set(v, seen); closureEdges += seen.size; }
const TIMP = 100 * (2 * (closureEdges - VAR + 1)) / ((VAR - 1) * (VAR - 2));
const reachable = new Set(['story-file', 'grammar-file']);
for (const s of ['story-file', 'grammar-file']) if (reachFrom.has(s)) for (const x of reachFrom.get(s)) reachable.add(x);
const unreachable = names.filter((n) => !reachable.has(n));
// Halstead
const n1 = opKinds.size + 1, N1 = totalOps + VAR; // +1 kind / +VAR occurrences for '=' (definition)
const n2 = TERM + VAR, N2 = totalSyms;
const vol = (N1 + N2) * Math.log2(n1 + n2); const diff = (n1 / 2) * (N2 / n2); const eff = diff * vol;
const altCount = (r) => { const b = rules.get(r)?.body; return b ? (b.n === 'alt' ? b.kids.length : 1) : null; };
const out = {
  parse: { tokens: toks.length, rules: VAR, errors, duplicateRules: dupes, unknownChars: [...unknown] },
  size: { VAR, TERM, keywordLiterals: wordLits.length, punctuationLiterals: punctLits, lexicalPrimitives: [...undefinedSyms.keys()] },
  complexity: { MCC, MCCperRule: +(MCC / VAR).toFixed(2), AVS: +(totalSyms / VAR).toFixed(2), halstead: { volume: Math.round(vol), difficulty: +diff.toFixed(1), effort: Math.round(eff) } },
  structure: { levels: sccs.length, CLEV: +(100 * sccs.length / VAR).toFixed(1), recursiveLevels: recursive.map((c) => c.sort()), DEP: Math.max(...sccs.map((c) => c.length)), TIMP: +TIMP.toFixed(2) },
  hotspots: [...stats].sort((a, b) => b[1].mcc - a[1].mcc).slice(0, 10).map(([n, s]) => `${n} mcc=${s.mcc} syms=${s.syms}`),
  fanout: { declaration: altCount('declaration'), statement: altCount('statement'), 'create-line': altCount('create-line'), unary: altCount('unary'), predicate: altCount('predicate'), 'goal-line': altCount('goal-line') },
  unreachable,
};
console.log(JSON.stringify(out, null, 1));
console.log('KEYWORDS', wordLits.sort().join(' '));
