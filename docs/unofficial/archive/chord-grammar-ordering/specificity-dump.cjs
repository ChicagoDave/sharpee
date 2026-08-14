#!/usr/bin/env node
/**
 * specificity-dump.cjs — ADR-268 experiment, step 1 (static).
 *
 * Dumps every registered standard-grammar rule (real EnglishGrammarEngine,
 * same loading path as scripts/chord-gap-report.cjs) with its priority and
 * compiled token shape, then computes the static specificity metric the
 * engine already uses as a tiebreak (ADR-231 D2b literalSpecificity: count
 * of literal/alternate tokens consumed; for a clean zero-skip match this is
 * the count of non-optional literal+alternate pattern tokens).
 *
 * Output: rules.json (full dump) + a priority-band summary on stdout.
 *
 * Usage: node docs/work/chord-grammar-ordering/specificity-dump.cjs
 */
const path = require('path');
const fs = require('fs');
const repo = path.join(__dirname, '..', '..', '..');
const { EnglishGrammarEngine } = require(path.join(repo, 'packages/parser-en-us/dist/english-grammar-engine.js'));
const { defineGrammar } = require(path.join(repo, 'packages/parser-en-us/dist/grammar.js'));

const engine = new EnglishGrammarEngine();
defineGrammar(engine.createBuilder());
const rules = engine.getRules();

const dump = rules.map((rule, i) => {
  const tokens = (rule.compiledPattern?.tokens ?? []).map(t => ({
    type: t.type,
    value: t.value,
    alternates: t.alternates,
    optional: !!t.optional,
    greedy: !!t.greedy
  }));
  const litRequired = tokens.filter(t => t.type !== 'slot' && !t.optional).length;
  const litMax = tokens.filter(t => t.type !== 'slot').length;
  const slots = tokens.filter(t => t.type === 'slot');
  return {
    index: i,
    pattern: rule.pattern,
    action: rule.action,
    priority: rule.priority,
    litRequired,          // literalSpecificity of a clean (zero-skip) match
    litMax,               // ... if every optional literal also matches
    slotCount: slots.length,
    slotNames: slots.map(s => s.value),
    hasGreedy: slots.some(s => s.greedy),
    minTokens: rule.compiledPattern?.minTokens,
    defaultSemantics: rule.defaultSemantics && Object.keys(rule.defaultSemantics).length
      ? rule.defaultSemantics : undefined
  };
});

fs.writeFileSync(path.join(__dirname, 'rules.json'), JSON.stringify(dump, null, 1));

// Summary: priority histogram and, per non-default band, the rules in it.
const hist = {};
for (const r of dump) hist[r.priority] = (hist[r.priority] || 0) + 1;
console.log(`TOTAL: ${dump.length} rules`);
console.log('priority histogram:', JSON.stringify(hist));
console.log('');
for (const p of Object.keys(hist).map(Number).sort((a, b) => b - a)) {
  if (p === 100) continue;
  console.log(`== priority ${p} (${hist[p]} rules) ==`);
  for (const r of dump.filter(r => r.priority === p)) {
    console.log(`  [lit=${r.litRequired}${r.litMax !== r.litRequired ? `..${r.litMax}` : ''} slots=${r.slotCount}] ${r.pattern}  -> ${r.action}`);
  }
  console.log('');
}
