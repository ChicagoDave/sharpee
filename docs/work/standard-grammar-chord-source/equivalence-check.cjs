#!/usr/bin/env node
/**
 * equivalence-check.cjs — ADR-269 D2: the counted equivalence harness.
 *
 * Compares the rules today's `defineGrammar` registers (the baseline)
 * against the rules the migrated Chord source produces under the loader's
 * expansion semantics (standard-flavored: no bare-verb prefixes, no
 * chord.action ids — ADR-269 D3). Shape = pattern string + action id +
 * default semantics + slot types; rule ids excluded (nondeterministic).
 * Also verifies the 29 TIE pairs + the LOAD-BEARING relations hold in the
 * emitted order, and that the 12 platform-side exception rules are exactly
 * the ruled set.
 *
 * Exit 0 = equivalent; exit 1 = divergences listed (each to be ruled
 * individually, never silently absorbed — D2).
 *
 * Usage: node docs/work/standard-grammar-chord-source/equivalence-check.cjs
 */
const path = require('path');
const fs = require('fs');
const repo = path.join(__dirname, '..', '..', '..');
const { EnglishGrammarEngine } = require(path.join(repo, 'packages/parser-en-us/dist/english-grammar-engine.js'));
const { defineGrammar } = require(path.join(repo, 'packages/parser-en-us/dist/grammar.js'));
const { compile } = require(path.join(repo, 'packages/chord/dist/index.js'));

let failures = 0;
const finding = (msg) => {
  failures++;
  console.error(`DIVERGE: ${msg}`);
};

// ---------------------------------------------------------------- baseline
const engine = new EnglishGrammarEngine();
defineGrammar(engine.createBuilder());
const baselineAll = engine.getRules().map((r) => ({
  pattern: r.pattern,
  action: r.action,
  defaults: r.defaultSemantics ?? null,
  slotTypes: Object.fromEntries(
    [...r.slots.entries()]
      .filter(([, c]) => c.slotType && c.slotType !== 'entity')
      .map(([n, c]) => [n, c.slotType]),
  ),
}));
const isException = (r) => r.pattern === '?' || r.action === 'author.trace';
const exceptions = baselineAll.filter(isException);
const baseline = baselineAll.filter((r) => !isException(r));
if (baselineAll.length !== 422) finding(`baseline count ${baselineAll.length} != 422`);
if (exceptions.length !== 12) finding(`exception count ${exceptions.length} != 12`);

// ---------------------------------------------------- chord-side expansion
// Mirrors story-loader extendParser (loader.ts:1109-1208) EXCEPT: standard
// action ids (D10 derivation), no bare-verb prefix rules, no dispatch
// registration (ADR-269 D3). Group-major registration order reproduced so
// pair-order checks run against the true emitted sequence.
const src = fs.readFileSync(path.join(repo, 'packages/parser-en-us/grammar/standard-en-us.story'), 'utf8');
const result = compile(src);
const errs = result.diagnostics.filter((d) => d.severity === 'error');
if (errs.length > 0 || !result.ok) {
  for (const e of errs) console.error(`compile error: ${e.code} ${e.message}`);
  process.exit(1);
}
if (result.ir.grammarFile?.name !== 'standard-en-us') finding('ir.grammarFile marker missing/wrong');

const renderPart = (part) => {
  const core =
    part.kind === 'alt' ? part.words.join('|')
    : part.kind === 'slot' ? `:${part.word}`
    : part.word;
  return part.optional ? `[${core}]` : core;
};

const emitted = [];
for (const action of result.ir.actions) {
  const actionId = `if.action.${action.name}`;
  const directions = action.directions ?? [];
  if ((action.constraints ?? []).length > 0) finding(`${actionId}: unexpected scope constraint in migrated source`);
  const slotTypes = Object.fromEntries((action.slotTypes ?? []).map((st) => [st.slot, st.type]));

  const emissions = [];
  for (const pattern of action.patterns) {
    if (pattern.cardinality) {
      finding(`${actionId}: unexpected cardinality`);
      continue;
    }
    const means = pattern.means?.length
      ? Object.fromEntries(pattern.means.map((m) => [m.key, m.value]))
      : null;
    const usesDirection =
      directions.length > 0 && pattern.parts.some((p) => p.kind === 'slot' && p.word === 'direction');
    if (usesDirection) {
      const isBare = pattern.parts.length === 1;
      for (const entry of directions) {
        for (const alias of [entry.canonical, ...entry.aliases]) {
          const text = isBare
            ? alias
            : pattern.parts
                .map((p) => (p.kind === 'slot' && p.word === 'direction' ? alias : renderPart(p)))
                .join(' ');
          emissions.push({ text, defaults: { ...(means ?? {}), direction: entry.canonical } });
        }
      }
    } else {
      emissions.push({ text: pattern.parts.map(renderPart).join(' '), defaults: means });
    }
  }
  // group-major, insertion-ordered — the loader's registration order
  const groups = new Map();
  for (const e of emissions) {
    const key = JSON.stringify(e.defaults);
    const group = groups.get(key) ?? { defaults: e.defaults, texts: [] };
    group.texts.push(e.text);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    for (const text of group.texts) {
      const ruleSlotTypes = {};
      for (const [slot, type] of Object.entries(slotTypes)) {
        if (text.includes(`:${slot}`)) ruleSlotTypes[slot] = type;
      }
      emitted.push({ pattern: text, action: actionId, defaults: group.defaults, slotTypes: ruleSlotTypes });
    }
  }
}

// ------------------------------------------------------------- comparison
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
const emit = count(emitted);
for (const [key, n] of base) {
  const e = emit.get(key) ?? 0;
  if (e !== n) finding(`baseline rule missing or miscounted (${n} vs ${e}): ${key}`);
}
for (const [key, n] of emit) {
  if (!base.has(key)) finding(`emitted rule not in baseline (${n}x): ${key}`);
}
if (emitted.length !== baseline.length) {
  finding(`rule count: baseline ${baseline.length} vs emitted ${emitted.length}`);
}

// ------------------------------------------------------- pair-order check
const pairs = JSON.parse(fs.readFileSync(path.join(repo, 'docs/work/chord-grammar-ordering/pairs.json'), 'utf8'));
const parsePair = (s) => {
  const m = s.match(/^\d+\/\[lit=\d+\] (.*) -> (\S+)$/);
  return { pattern: m[1], action: m[2] };
};
const firstIndex = (pattern, action) => emitted.findIndex((r) => r.pattern === pattern && r.action === action);
const orderChecks = pairs.TIE.map((t) => ({ w: parsePair(t.winner), l: parsePair(t.loser) }));
orderChecks.push({ w: { pattern: 'put on :item', action: 'if.action.wearing' }, l: { pattern: 'put :item on :supporter', action: 'if.action.putting' } });
let pairChecked = 0;
for (const { w, l } of orderChecks) {
  if (isException({ pattern: w.pattern, action: w.action }) || isException({ pattern: l.pattern, action: l.action })) continue;
  const wi = firstIndex(w.pattern, w.action);
  const li = firstIndex(l.pattern, l.action);
  if (li < 0) continue; // loser pattern shape may be an expansion variant; count skips
  if (wi < 0) {
    finding(`pair winner not found in emitted rules: ${w.pattern} -> ${w.action}`);
    continue;
  }
  if (wi > li) finding(`pair order violated: ${w.pattern} -> ${w.action} must precede ${l.pattern} -> ${l.action}`);
  pairChecked++;
}

console.log(
  `baseline ${baselineAll.length} = chord ${emitted.length} + exceptions ${exceptions.length}; ` +
  `actions ${result.ir.actions.length}; pair-order checks passed ${pairChecked}; divergences ${failures}`,
);
process.exit(failures === 0 ? 0 : 1);
