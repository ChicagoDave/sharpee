#!/usr/bin/env node
/**
 * post-swap-check.cjs — ADR-269 D2, post-swap half: the rules the REBUILT
 * parser registers (generated grammar.ts + platform-grammar.ts) must match
 * the frozen pre-swap baseline (rules-baseline.json) as a shape multiset,
 * and the TIE-pair order constraints must still hold in the live sequence.
 *
 * Usage: node docs/work/standard-grammar-chord-source/post-swap-check.cjs
 */
const path = require('path');
const fs = require('fs');
const repo = path.join(__dirname, '..', '..', '..');
const { EnglishGrammarEngine } = require(path.join(repo, 'packages/parser-en-us/dist/english-grammar-engine.js'));
const { defineGrammar } = require(path.join(repo, 'packages/parser-en-us/dist/grammar.js'));
const { definePlatformGrammar } = require(path.join(repo, 'packages/parser-en-us/dist/platform-grammar.js'));

let failures = 0;
const finding = (msg) => {
  failures++;
  console.error(`DIVERGE: ${msg}`);
};

const engine = new EnglishGrammarEngine();
const builder = engine.createBuilder();
defineGrammar(builder);
definePlatformGrammar(builder);
const live = engine.getRules().map((r) => ({
  pattern: r.pattern,
  action: r.action,
  tier: r.tier,
  defaults: r.defaultSemantics ?? null,
  slotTypes: Object.fromEntries(
    [...r.slots.entries()]
      .filter(([, c]) => c.slotType && c.slotType !== 'entity')
      .map(([n, c]) => [n, c.slotType]),
  ),
}));
for (const r of live) if (r.tier !== 'standard') finding(`non-standard tier on ${r.pattern}`);

const baseline = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'rules-baseline.json'), 'utf8'),
).map((r) => ({
  pattern: r.pattern,
  action: r.action,
  defaults: r.defaults,
  slotTypes: Object.fromEntries(
    Object.entries(r.slots)
      .filter(([, s]) => s.type && s.type !== 'entity')
      .map(([n, s]) => [n, s.type]),
  ),
}));

const shapeKey = (r) =>
  JSON.stringify([
    r.pattern,
    r.action,
    r.defaults ? Object.entries(r.defaults).sort() : null,
    Object.entries(r.slotTypes).sort(),
  ]);
const count = (list) => {
  const m = new Map();
  for (const r of list) m.set(shapeKey(r), (m.get(shapeKey(r)) ?? 0) + 1);
  return m;
};
const base = count(baseline);
const cur = count(live);
for (const [key, n] of base) if ((cur.get(key) ?? 0) !== n) finding(`baseline rule missing/miscounted: ${key}`);
for (const [key, n] of cur) if (!base.has(key)) finding(`live rule not in baseline (${n}x): ${key}`);
if (live.length !== baseline.length) finding(`count: baseline ${baseline.length} vs live ${live.length}`);

const pairs = JSON.parse(fs.readFileSync(path.join(repo, 'docs/work/chord-grammar-ordering/pairs.json'), 'utf8'));
const parsePair = (s) => {
  const m = s.match(/^\d+\/\[lit=\d+\] (.*) -> (\S+)$/);
  return { pattern: m[1], action: m[2] };
};
const firstIndex = (p, a) => live.findIndex((r) => r.pattern === p && r.action === a);
let checked = 0;
for (const t of pairs.TIE) {
  const w = parsePair(t.winner);
  const l = parsePair(t.loser);
  const wi = firstIndex(w.pattern, w.action);
  const li = firstIndex(l.pattern, l.action);
  if (wi < 0 || li < 0) {
    finding(`pair rule not found: ${w.pattern} / ${l.pattern}`);
    continue;
  }
  if (wi > li) finding(`pair order violated: ${w.pattern} -> ${w.action} must precede ${l.pattern} -> ${l.action}`);
  checked++;
}

console.log(`live ${live.length} vs baseline ${baseline.length}; pair-order checks ${checked}; divergences ${failures}`);
process.exit(failures === 0 ? 0 : 1);
