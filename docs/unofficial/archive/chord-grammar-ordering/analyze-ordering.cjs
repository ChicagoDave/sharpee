#!/usr/bin/env node
/**
 * analyze-ordering.cjs — ADR-268 experiment, step 3 (dynamic aggregation).
 *
 * Reads the per-suite JSONL divergence logs produced by the instrumented
 * bundle (see specificity-experiment.md for the method) and aggregates:
 *   - DIVERGE            specificity-only ordering picked a different winner
 *   - PRIORITY-TIEBREAK  priority broke a (confidence, specificity) tie
 *   - PRIORITY-DECIDED   priority broke a confidence tie; specificity agrees
 * Each group is keyed by (class, best rule identity, alt rule identity) and
 * marked SAME-ACTION when both candidates map to the same action (the choice
 * is then behaviorally invisible).
 *
 * Usage: node analyze-ordering.cjs <dir-with-ordering-*.jsonl>
 */
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
if (!dir) { console.error('usage: analyze-ordering.cjs <log dir>'); process.exit(1); }

const groups = new Map();
let total = 0;
for (const f of fs.readdirSync(dir).filter(f => /^ordering-.*\.jsonl$/.test(f))) {
  const suite = f.replace(/^ordering-/, '').replace(/\.jsonl$/, '');
  for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    total++;
    const id = c => `${c.action}@${c.priority}/lit${c.lit}/conf${c.confidence}`;
    const key = `${r.cls} | best ${id(r.best)} | alt ${id(r.alt)}`;
    if (!groups.has(key)) {
      groups.set(key, {
        cls: r.cls,
        sameAction: r.best.action === r.alt.action,
        best: r.best, alt: r.alt,
        count: 0, inputs: new Set(), suites: new Set()
      });
    }
    const g = groups.get(key);
    g.count++;
    if (g.inputs.size < 12) g.inputs.add(r.input);
    g.suites.add(suite);
  }
}

console.log(`${total} records, ${groups.size} distinct (class, best, alt) groups\n`);
const order = { 'DIVERGE': 0, 'PRIORITY-TIEBREAK': 1, 'PRIORITY-DECIDED': 2 };
const sorted = [...groups.values()].sort((a, b) =>
  (order[a.cls] - order[b.cls]) || (a.sameAction ? 1 : 0) - (b.sameAction ? 1 : 0) || b.count - a.count);
for (const g of sorted) {
  console.log(`${g.cls}${g.sameAction ? ' [SAME-ACTION — invisible]' : ''}  x${g.count}  (${[...g.suites].join(', ')})`);
  console.log(`  won:  ${g.best.action}  prio ${g.best.priority}  lit ${g.best.lit}  conf ${g.best.confidence}`);
  console.log(`  alt:  ${g.alt.action}  prio ${g.alt.priority}  lit ${g.alt.lit}  conf ${g.alt.confidence}`);
  console.log(`  inputs: ${[...g.inputs].map(i => JSON.stringify(i)).join(', ')}`);
  console.log('');
}
