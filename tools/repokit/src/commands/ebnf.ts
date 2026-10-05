/**
 * ebnf.ts — reads `packages/chord/chord.ebnf` as a grammar: well-formedness
 * checks that gate the chord build, and grammar metrics to track per language
 * version.
 *
 * The language-version pin hashes the file's bytes; it never checked that the
 * text is valid EBNF, and four defects slipped through it (2026-10-05): a
 * comment opened mid-rule swallowed alternatives and a terminator, productions
 * were defined but never listed, and the header nested a comment. The build
 * now refuses a grammar with any of these:
 *
 *   - a rule that does not parse, or does not end in `;`
 *   - a rule defined twice
 *   - a rule unreachable from `story-file` / `grammar-file` (except the
 *     prose-only lexical rules in EXPECTED_UNREACHABLE)
 *   - a comment opened inside a comment
 *   - a character the reader does not know
 *
 * The reader is a hand-written tokenizer and recursive-descent parser for this
 * file's own dialect (`>>>` layout marker, postfix `*`); no regex. Metric
 * definitions follow Power & Malloy, "A metrics suite for grammar-based
 * software" (2004); the counting conventions are this reader's own, so compare
 * the numbers across Chord versions, not against other languages. Ported from
 * `docs/work/chord-analyzer/grammar-metrics.mjs` (Claude Desktop, 2026-10-05).
 *
 * Public interface: analyzeEbnf(text), ebnfDefects(analysis),
 * runEbnfStep(root, quiet), EbnfCommand (`repokit ebnf [--check]`).
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRepoRoot } from '../repo';
import type { Command } from './command';

/** The grammar file, repo-relative. */
export const EBNF_PATH = 'packages/chord/chord.ebnf';

/** Start symbols: a file is a story or a grammar. */
const START_RULES = ['story-file', 'grammar-file'];

/** Lexical rules that live inside prose, so no production references them. */
export const EXPECTED_UNREACHABLE: readonly string[] = ['MARKER'];

interface Token {
  t: string;
  v: string;
  line: number;
}

type Node =
  | { n: 'alt' | 'seq' | 'opt' | 'rep' | 'grp' | 'star'; kids: Node[] }
  | { n: 'sym' | 'lit'; v: string }
  | { n: 'layout' };

/** Everything the reader learns from one grammar text. */
export interface EbnfAnalysis {
  parse: { tokens: number; rules: number; errors: string[]; duplicateRules: string[]; unknownChars: string[]; nestedComments: number[] };
  size: { VAR: number; TERM: number; keywordLiterals: number; punctuationLiterals: string[]; lexicalPrimitives: string[] };
  complexity: { MCC: number; MCCperRule: number; AVS: number; halstead: { volume: number; difficulty: number; effort: number } };
  structure: { levels: number; CLEV: number; recursiveLevels: string[][]; DEP: number; TIMP: number };
  hotspots: string[];
  fanout: Record<string, number | null>;
  unreachable: string[];
  keywords: string[];
}

const isLetter = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
const isDigit = (c: string) => c >= '0' && c <= '9';
const isIdent = (c: string) => isLetter(c) || isDigit(c) || c === '-' || c === '_';
const isSpace = (c: string) => c === ' ' || c === '\n' || c === '\r' || c === '\t';
const PUNCT = ['=', ';', '|', '[', ']', '{', '}', '(', ')', '*', ','];

/**
 * Tokenize the grammar. Comments are skipped; one opened inside another is
 * recorded (by line) and still skipped as nested, so the rest of the file
 * reads the same either way.
 */
function tokenize(s: string): { toks: Token[]; unknown: Map<string, number>; nested: number[] } {
  const toks: Token[] = [];
  const unknown = new Map<string, number>();
  const nested: number[] = [];
  let i = 0;
  let line = 1;
  while (i < s.length) {
    const c = s[i];
    if (c === '\n') { line++; i++; continue; }
    if (isSpace(c)) { i++; continue; }
    if (c === '(' && s[i + 1] === '*') {
      let j = i + 2;
      let depth = 1;
      while (j < s.length && depth > 0) {
        if (s[j] === '(' && s[j + 1] === '*') { nested.push(line); depth++; j += 2; continue; }
        if (s[j] === '*' && s[j + 1] === ')') { depth--; j += 2; continue; }
        if (s[j] === '\n') line++;
        j++;
      }
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== c && s[j] !== '\n') j++;
      toks.push({ t: 'lit', v: s.slice(i + 1, j), line });
      i = j + 1;
      continue;
    }
    if (c === '>' && s[i + 1] === '>' && s[i + 2] === '>') { toks.push({ t: 'layout', v: '>>>', line }); i += 3; continue; }
    if (isLetter(c)) {
      let j = i;
      while (j < s.length && isIdent(s[j])) j++;
      toks.push({ t: 'id', v: s.slice(i, j), line });
      i = j;
      continue;
    }
    if (PUNCT.includes(c)) { toks.push({ t: c, v: c, line }); i++; continue; }
    unknown.set(c, (unknown.get(c) ?? 0) + 1);
    i++;
  }
  return { toks, unknown, nested };
}

/** Parse rules `name = expr ;` into a map, collecting errors and duplicates. */
function parseRules(toks: Token[]): { rules: Map<string, { body: Node; line: number }>; errors: string[]; dupes: string[] } {
  let p = 0;
  const errors: string[] = [];
  const peek = () => toks[p];
  const at = (t: string) => peek() !== undefined && peek().t === t;
  const startsRule = () => at('id') && toks[p + 1] !== undefined && toks[p + 1].t === '=';

  const parseExpr = (): Node => {
    const alts = [parseSeq()];
    while (at('|')) { p++; alts.push(parseSeq()); }
    return alts.length === 1 ? alts[0] : { n: 'alt', kids: alts };
  };
  const parseSeq = (): Node => {
    const kids: Node[] = [];
    while (peek() && !at('|') && !at(']') && !at('}') && !at(')') && !at(';') && !startsRule()) {
      const f = parseFactor();
      if (!f) break;
      kids.push(f);
    }
    return { n: 'seq', kids };
  };
  const closeOrReport = (close: string, open: Token) => {
    if (at(close)) p++;
    else errors.push(`line ${open.line}: unclosed ${open.t}`);
  };
  const parseFactor = (): Node | null => {
    const k = peek();
    let node: Node;
    if (k.t === 'id') { p++; node = { n: 'sym', v: k.v }; }
    else if (k.t === 'lit') { p++; node = { n: 'lit', v: k.v }; }
    else if (k.t === 'layout') { p++; node = { n: 'layout' }; }
    else if (k.t === '[') { p++; node = { n: 'opt', kids: [parseExpr()] }; closeOrReport(']', k); }
    else if (k.t === '{') { p++; node = { n: 'rep', kids: [parseExpr()] }; closeOrReport('}', k); }
    else if (k.t === '(') { p++; node = { n: 'grp', kids: [parseExpr()] }; closeOrReport(')', k); }
    else { errors.push(`line ${k.line}: unexpected '${k.v}'`); p++; return null; }
    if (at('*')) { p++; node = { n: 'star', kids: [node] }; }
    return node;
  };

  const rules = new Map<string, { body: Node; line: number }>();
  const dupes: string[] = [];
  while (p < toks.length) {
    const name = peek();
    if (!startsRule()) { errors.push(`line ${name.line}: expected rule head, got '${name.v}'`); p++; continue; }
    p += 2;
    const body = parseExpr();
    if (at(';')) p++;
    else errors.push(`line ${name.line}: rule ${name.v} missing ;`);
    if (rules.has(name.v)) dupes.push(name.v);
    rules.set(name.v, { body, line: name.line });
  }
  return { rules, errors, dupes };
}

function walk(node: Node, fn: (n: Node) => void): void {
  fn(node);
  if ('kids' in node) for (const k of node.kids) walk(k, fn);
}

/**
 * Read a grammar text: well-formedness facts plus metrics.
 * @param text the EBNF source
 * @returns the analysis; `ebnfDefects` turns it into the build's refusals
 */
export function analyzeEbnf(text: string): EbnfAnalysis {
  const { toks, unknown, nested } = tokenize(text);
  const { rules, errors, dupes } = parseRules(toks);

  const stats = new Map<string, { mcc: number; syms: number; refs: Set<string> }>();
  const literals = new Map<string, number>();
  const undefinedSyms = new Map<string, number>();
  let totalSyms = 0;
  let totalOps = 0;
  const opKinds = new Set<string>();
  for (const [name, r] of rules) {
    let mcc = 0;
    let syms = 0;
    const refs = new Set<string>();
    walk(r.body, (n) => {
      if (n.n === 'alt') { mcc += n.kids.length - 1; totalOps += n.kids.length - 1; opKinds.add('|'); }
      if (n.n === 'opt' || n.n === 'rep' || n.n === 'star') { mcc += 1; totalOps += 1; opKinds.add(n.n); }
      if (n.n === 'grp') { totalOps += 1; opKinds.add('grp'); }
      if (n.n === 'sym') {
        syms++;
        if (rules.has(n.v)) refs.add(n.v);
        else undefinedSyms.set(n.v, (undefinedSyms.get(n.v) ?? 0) + 1);
      }
      if (n.n === 'lit') { syms++; literals.set(n.v, (literals.get(n.v) ?? 0) + 1); }
      if (n.n === 'layout') syms++;
    });
    totalSyms += syms;
    stats.set(name, { mcc, syms, refs });
  }
  const names = [...rules.keys()];
  const VAR = names.length;
  const wordLits = [...literals.keys()].filter((l) => l.length > 0 && [...l].every((c) => isLetter(c) || c === '-' || c === "'"));
  const punctLits = [...literals.keys()].filter((l) => !wordLits.includes(l));
  const TERM = literals.size + undefinedSyms.size;
  const MCC = [...stats.values()].reduce((a, s) => a + s.mcc, 0);

  // Strongly connected components (Tarjan): the grammar's levels.
  let idx = 0;
  const stack: string[] = [];
  const info = new Map<string, { i: number; low: number; on: boolean }>();
  const sccs: string[][] = [];
  const strong = (v: string): void => {
    info.set(v, { i: idx, low: idx, on: true });
    idx++;
    stack.push(v);
    for (const w of stats.get(v)!.refs) {
      if (!info.has(w)) { strong(w); info.get(v)!.low = Math.min(info.get(v)!.low, info.get(w)!.low); }
      else if (info.get(w)!.on) info.get(v)!.low = Math.min(info.get(v)!.low, info.get(w)!.i);
    }
    if (info.get(v)!.low === info.get(v)!.i) {
      const comp: string[] = [];
      let w: string;
      do { w = stack.pop()!; info.get(w)!.on = false; comp.push(w); } while (w !== v);
      sccs.push(comp);
    }
  };
  for (const v of names) if (!info.has(v)) strong(v);
  const recursive = sccs.filter((c) => c.length > 1 || stats.get(c[0])!.refs.has(c[0]));

  // Transitive closure: reachability and the tree-impurity metric.
  let closureEdges = 0;
  const reachFrom = new Map<string, Set<string>>();
  for (const v of names) {
    const seen = new Set<string>();
    const q = [...stats.get(v)!.refs];
    while (q.length) {
      const w = q.pop()!;
      if (seen.has(w)) continue;
      seen.add(w);
      for (const x of stats.get(w)!.refs) q.push(x);
    }
    reachFrom.set(v, seen);
    closureEdges += seen.size;
  }
  const TIMP = VAR > 2 ? (100 * (2 * (closureEdges - VAR + 1))) / ((VAR - 1) * (VAR - 2)) : 0;
  const reachable = new Set(START_RULES);
  for (const s of START_RULES) for (const x of reachFrom.get(s) ?? []) reachable.add(x);
  const unreachable = names.filter((n) => !reachable.has(n));

  // Halstead: '=' counts as one operator kind with VAR occurrences.
  const n1 = opKinds.size + 1;
  const N1 = totalOps + VAR;
  const n2 = TERM + VAR;
  const N2 = totalSyms;
  const vol = n1 + n2 > 0 ? (N1 + N2) * Math.log2(n1 + n2) : 0;
  const diff = n2 > 0 ? (n1 / 2) * (N2 / n2) : 0;
  const altCount = (r: string) => {
    const b = rules.get(r)?.body;
    return b ? (b.n === 'alt' ? b.kids.length : 1) : null;
  };

  return {
    parse: { tokens: toks.length, rules: VAR, errors, duplicateRules: dupes, unknownChars: [...unknown.keys()], nestedComments: nested },
    size: { VAR, TERM, keywordLiterals: wordLits.length, punctuationLiterals: punctLits, lexicalPrimitives: [...undefinedSyms.keys()] },
    complexity: {
      MCC,
      MCCperRule: VAR ? +(MCC / VAR).toFixed(2) : 0,
      AVS: VAR ? +(totalSyms / VAR).toFixed(2) : 0,
      halstead: { volume: Math.round(vol), difficulty: +diff.toFixed(1), effort: Math.round(diff * vol) },
    },
    structure: {
      levels: sccs.length,
      CLEV: VAR ? +((100 * sccs.length) / VAR).toFixed(1) : 0,
      recursiveLevels: recursive.map((c) => [...c].sort()),
      DEP: sccs.length ? Math.max(...sccs.map((c) => c.length)) : 0,
      TIMP: +TIMP.toFixed(2),
    },
    hotspots: [...stats].sort((a, b) => b[1].mcc - a[1].mcc).slice(0, 10).map(([n, s]) => `${n} mcc=${s.mcc} syms=${s.syms}`),
    fanout: Object.fromEntries(['declaration', 'statement', 'create-line', 'unary', 'predicate', 'goal-line'].map((r) => [r, altCount(r)])),
    unreachable,
    keywords: wordLits.sort(),
  };
}

/**
 * The well-formedness refusals in an analysis, one message each.
 * @returns an empty list for a grammar the build accepts
 */
export function ebnfDefects(a: EbnfAnalysis): string[] {
  const out: string[] = [...a.parse.errors];
  for (const d of a.parse.duplicateRules) out.push(`rule \`${d}\` is defined twice`);
  for (const c of a.parse.unknownChars) out.push(`unknown character \`${c}\` outside a comment or literal`);
  for (const line of a.parse.nestedComments) out.push(`line ${line}: a comment opens inside a comment`);
  for (const r of a.unreachable) {
    if (!EXPECTED_UNREACHABLE.includes(r)) out.push(`rule \`${r}\` is unreachable from ${START_RULES.join(' / ')}`);
  }
  for (const r of EXPECTED_UNREACHABLE) {
    if (!a.unreachable.includes(r)) out.push(`rule \`${r}\` is listed as prose-only but is now referenced (or gone) — update EXPECTED_UNREACHABLE`);
  }
  return out;
}

/**
 * The chord build's grammar gate: refuse a malformed `chord.ebnf`.
 * @throws when the grammar has any defect; the message lists every one
 */
export function runEbnfStep(root: string, quiet = false): void {
  const a = analyzeEbnf(readFileSync(join(root, EBNF_PATH), 'utf8'));
  const defects = ebnfDefects(a);
  if (defects.length > 0) {
    throw new Error(`ebnf: ${EBNF_PATH} is not well-formed —\n  ${defects.join('\n  ')}`);
  }
  if (!quiet) console.log(`ebnf: ${EBNF_PATH} well-formed — ${a.size.VAR} rules, ${a.size.keywordLiterals} keywords`);
}

export class EbnfCommand implements Command {
  readonly name = 'ebnf';
  readonly summary = 'Check chord.ebnf is well-formed and print its grammar metrics (--check: the build gate only)';

  run(args: string[]): number {
    const root = findRepoRoot();
    const a = analyzeEbnf(readFileSync(join(root, EBNF_PATH), 'utf8'));
    const defects = ebnfDefects(a);
    if (!args.includes('--check')) console.log(JSON.stringify(a, null, 1));
    if (defects.length > 0) {
      console.error(`ebnf --check: ${EBNF_PATH} is not well-formed —\n  ${defects.join('\n  ')}`);
      return 1;
    }
    if (args.includes('--check')) console.log(`ebnf --check: ${EBNF_PATH} is well-formed`);
    return 0;
  }
}
