/**
 * build-adr-index.mjs — Phase 1 ADR index. Records each ADR's number, title,
 * Status line VERBATIM, and any date it states, plus git's first-commit date
 * for the file, which is the only trustworthy dating.
 *
 * Status lines are known-unreliable in this project ("Proposed" often means
 * shipped). This script deliberately does not correct them — it records what
 * each file claims and lets the reading phases judge.
 *
 * Emits index-adrs.json and index-adrs.md. Owner: retrospective tooling.
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = '/Users/david/repos/sharpee';
const ADR_DIR = join(REPO, 'docs/architecture/adrs');
const OUT = '/Volumes/Workspace/sharpee-corpus/retrospective';

/** The date of the commit that first added this path — the honest "when". */
function firstCommitDate(relPath) {
  try {
    const out = execFileSync(
      'git',
      ['-C', REPO, 'log', '--diff-filter=A', '--follow', '--format=%ad', '--date=short', '--', relPath],
      { encoding: 'utf8' },
    ).trim().split('\n').filter(Boolean);
    return out[out.length - 1] ?? null;
  } catch {
    return null;
  }
}

const records = [];
for (const name of readdirSync(ADR_DIR).sort()) {
  if (!name.endsWith('.md')) continue;
  const text = readFileSync(join(ADR_DIR, name), 'utf8');
  const head = text.split('\n').slice(0, 40).join('\n');
  const num = name.match(/adr-(\d+)/)?.[1] ?? null;
  const title = head.match(/^#\s+(.+)$/m)?.[1] ?? null;
  // Three status conventions coexist in this corpus, and the split itself is a
  // dating signal: `**Status:** X`, `## Status: X`, and a `## Status` heading
  // with the value on the following line.
  const status =
    head.match(/^\*\*Status:?\*\*:?\s*(.+)$/mi)?.[1]?.trim() ??
    head.match(/^##\s*Status:\s*(.+)$/mi)?.[1]?.trim() ??
    head.match(/^##\s*Status\s*$\n+\s*(.+)$/mi)?.[1]?.trim() ??
    null;
  const stated = head.match(/^\*?\*?Date:?\*?\*?:?\s*(\d{4}-\d{2}-\d{2})/mi)?.[1] ?? null;
  const session = head.match(/^\*?\*?Session:?\*?\*?:?\s*(.+)$/mi)?.[1]?.trim() ?? null;
  records.push({
    number: num,
    name,
    title,
    status,
    statedDate: stated,
    session,
    firstCommit: firstCommitDate(`docs/architecture/adrs/${name}`),
    bytes: text.length,
  });
}

writeFileSync(join(OUT, 'index-adrs.json'), JSON.stringify(records, null, 1));

const byStatus = {};
for (const r of records) {
  const k = (r.status ?? '(none)').split(/[\s—-]/)[0].toUpperCase();
  byStatus[k] = (byStatus[k] ?? 0) + 1;
}
const byMonth = {};
for (const r of records) {
  const d = r.firstCommit ?? r.statedDate;
  if (!d) continue;
  const m = d.slice(0, 7);
  byMonth[m] = (byMonth[m] ?? 0) + 1;
}

const lines = ['# ADR index', ''];
lines.push(`${records.length} ADRs in \`docs/architecture/adrs/\`. Status lines are recorded verbatim and`);
lines.push('are known-unreliable in this project — several say "Proposed" for work that shipped');
lines.push('months earlier. `firstCommit` is git\'s date for the commit that added the file, which is', 'the only dating that does not depend on the document telling the truth about itself.', '');
lines.push('## By status (first word)', '', '| Status | ADRs |', '| --- | --- |');
for (const [k, v] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
lines.push('', '## ADRs added per month (git)', '', '| Month | ADRs | Bar |', '| --- | --- | --- |');
for (const m of Object.keys(byMonth).sort()) lines.push(`| ${m} | ${byMonth[m]} | ${'█'.repeat(Math.min(60, byMonth[m]))} |`);
lines.push('', '## Every ADR', '', '| # | Title | Status (verbatim) | Added (git) |', '| --- | --- | --- | --- |');
for (const r of records) {
  lines.push(`| ${r.number ?? '?'} | ${(r.title ?? '').replace(/\|/g, '\\|')} | ${(r.status ?? '—').replace(/\|/g, '\\|')} | ${r.firstCommit ?? '—'} |`);
}
writeFileSync(join(OUT, 'index-adrs.md'), lines.join('\n') + '\n');

console.log(`indexed ${records.length} ADRs`);
console.log('status:', byStatus);
console.log('months:', Object.keys(byMonth).sort().join(' '));
