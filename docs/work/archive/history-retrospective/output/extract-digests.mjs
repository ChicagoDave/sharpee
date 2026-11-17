/**
 * extract-digests.mjs — turn the Phase 3 workflow journal into the retrospective's
 * monthly digest artifacts.
 *
 * Reads one {"type":"result"} line per month-reader agent and writes:
 *   monthly-digests.json   the structured records, for later synthesis
 *   monthly-digests.md     the same, readable, in date order
 *
 * Public interface: `node extract-digests.mjs <journal.jsonl>`.
 * Owner: retrospective tooling.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const JOURNAL = process.argv[2];
const OUT = '/Volumes/Workspace/sharpee-corpus/retrospective';

const digests = [];
for (const line of readFileSync(JOURNAL, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let row;
  try { row = JSON.parse(line); } catch { continue; }
  if (row.type !== 'result') continue;
  // The agent's return value lands under one of a few keys depending on runner version.
  const v = row.result ?? row.value ?? row.output ?? row.data;
  const obj = typeof v === 'string' ? tryParse(v) : v;
  if (obj && obj.month) digests.push(obj);
}

function tryParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

digests.sort((a, b) => String(a.month).localeCompare(String(b.month)));
writeFileSync(`${OUT}/monthly-digests.json`, JSON.stringify(digests, null, 1));

const list = (arr) => (arr?.length ? arr.map((x) => `- ${x}`).join('\n') : '_none recorded_');

const lines = ['# Monthly digests — the repo era', ''];
lines.push('Phase 3 of the history retrospective. One reader per month (January 2026 split at');
lines.push('the 13th), each working from an exact file manifest, treating git as the authority');
lines.push('over self-reported summaries, and required to state what it read versus sampled.', '');
lines.push(`${digests.length} digests covering 1,247 session summaries.`, '');
lines.push('---', '');

for (const d of digests) {
  lines.push(`## ${d.month}`, '');
  lines.push(d.narrative ?? '', '');
  if (d.shipped?.length) lines.push('### Shipped', '', list(d.shipped), '');
  if (d.broke?.length) lines.push('### Broke', '', list(d.broke), '');
  if (d.decided?.length) lines.push('### Decided', '', list(d.decided), '');
  if (d.abandoned?.length) lines.push('### Abandoned', '', list(d.abandoned), '');
  if (d.carried?.length) lines.push('### Carried forward', '', list(d.carried), '');
  if (d.contradictions?.length) lines.push('### Summaries vs git', '', list(d.contradictions), '');
  if (d.tooling) lines.push('### Tooling and models', '', d.tooling, '');
  if (d.quotes?.length) {
    lines.push('### Quotes', '');
    for (const q of d.quotes) lines.push(`> ${String(q.text).replace(/\n/g, ' ')}`, `> — \`${q.source}\``, '');
  }
  if (d.readingStrategy) lines.push(`_Coverage: ${d.readingStrategy}_`, '');
  lines.push('---', '');
}

writeFileSync(`${OUT}/monthly-digests.md`, lines.join('\n') + '\n');

console.log(`${digests.length} digests written`);
for (const d of digests) {
  console.log(
    `${String(d.month).padEnd(11)} shipped ${String(d.shipped?.length ?? 0).padStart(2)}  broke ${String(d.broke?.length ?? 0).padStart(2)}  decided ${String(d.decided?.length ?? 0).padStart(2)}  abandoned ${String(d.abandoned?.length ?? 0).padStart(2)}  contradictions ${String(d.contradictions?.length ?? 0).padStart(2)}`,
  );
}
