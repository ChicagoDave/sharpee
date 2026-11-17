/**
 * extract-verdicts.mjs — turn the Phase 5 refutation journal into the
 * retrospective's verification record.
 *
 * Writes verification.json and verification.md: every load-bearing claim with
 * its verdict, the command that settled it, and the corrected wording where the
 * claim did not survive. This file is the retrospective's audit trail — the
 * reason a reader can trust the numbers in it.
 *
 * Public interface: `node extract-verdicts.mjs <journal.jsonl>`.
 * Owner: retrospective tooling.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const JOURNAL = process.argv[2];
const OUT = '/Volumes/Workspace/sharpee-corpus/retrospective';

const batches = [];
for (const line of readFileSync(JOURNAL, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let row;
  try { row = JSON.parse(line); } catch { continue; }
  if (row.type !== 'result') continue;
  const v = row.result ?? row.value ?? row.output ?? row.data;
  const obj = typeof v === 'string' ? safeParse(v) : v;
  if (obj && obj.verdicts) batches.push(obj);
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

writeFileSync(`${OUT}/verification.json`, JSON.stringify(batches, null, 1));

const tally = {};
for (const b of batches) for (const v of b.verdicts) tally[v.verdict] = (tally[v.verdict] ?? 0) + 1;
const total = Object.values(tally).reduce((a, b) => a + b, 0);

const lines = ['# Verification record', ''];
lines.push('Phase 5 of the history retrospective. Every load-bearing claim was handed to a');
lines.push('verifier instructed to **break it** — default to REFUTED when the evidence is not');
lines.push('clean, UNVERIFIABLE when no primary source settles it, and reproduce every number');
lines.push('rather than accept it.', '');
lines.push('| Verdict | Claims |', '| --- | --- |');
for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${n} |`);
lines.push(`| **total** | **${total}** |`, '');
lines.push('Anything below marked other than CONFIRMED carries the corrected wording, and that');
lines.push('corrected wording — not the original claim — is what the retrospective may say.', '');
lines.push('---', '');

for (const b of batches) {
  lines.push(`## ${b.key}`, '');
  for (const v of b.verdicts) {
    lines.push(`### ${v.verdict} — ${v.claim}`, '');
    lines.push(`**Evidence.** ${v.evidence}`, '');
    if (v.correction) lines.push(`**Corrected.** ${v.correction}`, '');
  }
  if (b.notes) lines.push('### Verifier notes', '', b.notes, '');
  lines.push('---', '');
}

writeFileSync(`${OUT}/verification.md`, lines.join('\n') + '\n');

console.log(`${total} claims across ${batches.length} batches`);
console.log(tally);
for (const b of batches) {
  const t = {};
  for (const v of b.verdicts) t[v.verdict] = (t[v.verdict] ?? 0) + 1;
  console.log(`  ${b.key.padEnd(34)} ${JSON.stringify(t)}`);
}
