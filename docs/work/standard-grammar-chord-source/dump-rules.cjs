#!/usr/bin/env node
/**
 * dump-rules.cjs — ADR-269 Phase 3a, step 1: the equivalence baseline.
 *
 * Dumps every registered standard-grammar rule (real EnglishGrammarEngine,
 * the recording idiom ADR-266 D3 names) with its full shape: ordinal
 * (definition order), pattern string, action id, tier, default semantics,
 * and slot types. Ids are excluded — nondeterministic (ADR-269 Context).
 *
 * Output: rules-baseline.json beside this script.
 *
 * Usage: node docs/work/standard-grammar-chord-source/dump-rules.cjs
 */
const path = require('path');
const fs = require('fs');
const repo = path.join(__dirname, '..', '..', '..');
const { EnglishGrammarEngine } = require(path.join(repo, 'packages/parser-en-us/dist/english-grammar-engine.js'));
const { defineGrammar } = require(path.join(repo, 'packages/parser-en-us/dist/grammar.js'));

const engine = new EnglishGrammarEngine();
defineGrammar(engine.createBuilder());
const rules = engine.getRules();

const dump = rules.map((rule, i) => ({
  ordinal: i,
  pattern: rule.pattern,
  action: rule.action,
  tier: rule.tier,
  defaults: rule.defaultSemantics ?? null,
  slots: Object.fromEntries(
    [...rule.slots.entries()].map(([name, c]) => [name, { type: c.slotType ?? null }]),
  ),
}));

fs.writeFileSync(path.join(__dirname, 'rules-baseline.json'), JSON.stringify(dump, null, 1));

const actions = new Map();
for (const r of dump) {
  if (!actions.has(r.action)) actions.set(r.action, 0);
  actions.set(r.action, actions.get(r.action) + 1);
}
console.log('rules:', dump.length, ' actions:', actions.size);
console.log('with defaults:', dump.filter((r) => r.defaults).length);
console.log('with typed slots:', dump.filter((r) => Object.values(r.slots).some((s) => s.type)).length);
