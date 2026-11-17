/**
 * extract-throughlines.mjs — turn the Phase 4 workflow journal into the
 * retrospective's throughline artifacts.
 *
 * Writes throughlines.json (structured) and throughlines.md (readable, with
 * each arc's thesis, dated timeline, analysis, counter-evidence, and an explicit
 * statement of what the tracer verified versus took second-hand).
 *
 * Public interface: `node extract-throughlines.mjs <journal.jsonl>`.
 * Owner: retrospective tooling.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const JOURNAL = process.argv[2];
const OUT = '/Volumes/Workspace/sharpee-corpus/retrospective';

const arcs = [];
for (const line of readFileSync(JOURNAL, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let row;
  try { row = JSON.parse(line); } catch { continue; }
  if (row.type !== 'result') continue;
  const v = row.result ?? row.value ?? row.output ?? row.data;
  const obj = typeof v === 'string' ? safeParse(v) : v;
  if (obj && obj.key) arcs.push(obj);
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// Narrative order, not completion order.
const ORDER = [
  'world-model-spine',
  'output-path',
  'dogfooding',
  'build-then-delete',
  'chord',
  'ide',
  'verification-debt',
  'capability-and-devarch',
];
arcs.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));

writeFileSync(`${OUT}/throughlines.json`, JSON.stringify(arcs, null, 1));

const lines = ['# Throughlines', ''];
lines.push('Phase 4 of the history retrospective: eight cross-cutting arcs, each traced by its');
lines.push('own reader across the full corpus and **verified against git rather than against the');
lines.push('monthly digests**. Every tracer was required to return counter-evidence and to state');
lines.push('what it checked directly versus took second-hand.', '');
lines.push('---', '');

for (const a of arcs) {
  lines.push(`## ${a.title}`, '', `_${a.key}_`, '');
  lines.push('### Thesis', '', a.thesis ?? '', '');
  if (a.timeline?.length) {
    lines.push('### Timeline', '', '| Date | Event | Source |', '| --- | --- | --- |');
    for (const t of a.timeline) {
      const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');
      lines.push(`| ${cell(t.date)} | ${cell(t.event)} | ${cell(t.source)} |`);
    }
    lines.push('');
  }
  lines.push('### Analysis', '', a.analysis ?? '', '');
  if (a.counterEvidence?.length) {
    lines.push('### Counter-evidence', '');
    for (const c of a.counterEvidence) lines.push(`- ${c}`);
    lines.push('');
  }
  if (a.confidence) lines.push('### What was verified', '', a.confidence, '');
  lines.push('---', '');
}

writeFileSync(`${OUT}/throughlines.md`, lines.join('\n') + '\n');

console.log(`${arcs.length} throughlines written`);
for (const a of arcs) {
  console.log(
    `${a.key.padEnd(24)} timeline ${String(a.timeline?.length ?? 0).padStart(2)}  analysis ${String((a.analysis ?? '').split(/\s+/).length).padStart(4)}w  counter ${String(a.counterEvidence?.length ?? 0).padStart(2)}`,
  );
}
