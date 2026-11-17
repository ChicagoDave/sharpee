/**
 * build-genai-index.mjs — Phase 1b: the GenAI-assistance timeline, extracted
 * from what the repository already records about itself.
 *
 * Two mechanical signals, no interpretation:
 *   1. `Co-Authored-By: Claude …` trailers name the model that helped write a
 *      commit, so commits per model per month is a directly measurable record of
 *      which assistant was in use when.
 *   2. Commit size (files changed, insertions, deletions) per month gives the
 *      throughput half — deliberately reported raw, because lines-changed is a
 *      terrible productivity metric on its own and the retrospective should say
 *      so rather than dress it up.
 *
 * Emits index-genai.md and index-genai.json. Owner: retrospective tooling.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const REPO = '/Users/david/repos/sharpee';
const OUT = '/Volumes/Workspace/sharpee-corpus/retrospective';
const SEP = ''; // record separator no commit message will contain

function git(args) {
  return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

// One record per commit: hash, month, author, and the model trailer if present.
const raw = git(['log', '--all', '--no-merges', `--format=${SEP}%H|%ad|%an|%b`, '--date=format:%Y-%m']);
const commits = [];
for (const chunk of raw.split(SEP)) {
  if (!chunk.trim()) continue;
  const [head, ...bodyParts] = chunk.split('\n');
  const [hash, month, author] = head.split('|');
  const body = [head.split('|').slice(3).join('|'), ...bodyParts].join('\n');
  const m = body.match(/Co-Authored-By:\s*(Claude[^<\n]*)/i);
  commits.push({ hash, month, author, model: m ? m[1].trim() : null });
}

const byMonth = {};
const byModel = {};
for (const c of commits) {
  byMonth[c.month] ??= { total: 0, attributed: 0, models: {} };
  byMonth[c.month].total++;
  if (c.model) {
    byMonth[c.month].attributed++;
    byMonth[c.month].models[c.model] = (byMonth[c.month].models[c.model] ?? 0) + 1;
    byModel[c.model] ??= { commits: 0, first: c.month, last: c.month };
    byModel[c.model].commits++;
    if (c.month < byModel[c.model].first) byModel[c.model].first = c.month;
    if (c.month > byModel[c.model].last) byModel[c.model].last = c.month;
  }
}

// Churn per month, from --shortstat. Raw counts only; no rate is derived here.
const churn = {};
for (const line of git(['log', '--all', '--no-merges', '--format=%ad', '--date=format:%Y-%m', '--shortstat']).split('\n')) {
  const t = line.trim();
  if (/^\d{4}-\d{2}$/.test(t)) { churn._current = t; continue; }
  if (!t.includes('changed')) continue;
  const month = churn._current;
  if (!month) continue;
  churn[month] ??= { files: 0, ins: 0, del: 0 };
  churn[month].files += Number(t.match(/(\d+) files? changed/)?.[1] ?? 0);
  churn[month].ins += Number(t.match(/(\d+) insertions?/)?.[1] ?? 0);
  churn[month].del += Number(t.match(/(\d+) deletions?/)?.[1] ?? 0);
}
delete churn._current;

writeFileSync(`${OUT}/index-genai.json`, JSON.stringify({ byMonth, byModel, churn }, null, 1));

const months = Object.keys(byMonth).sort();
const lines = ['# GenAI assistance timeline', ''];
lines.push(`Extracted from ${commits.length} non-merge commits across all branches. The`);
lines.push('`Co-Authored-By: Claude …` trailer names the assisting model, so this is the');
lines.push("project's own record of which assistant wrote with David, and when — not an", 'estimate.', '');

lines.push('## Models, in order of first appearance', '', '| Model | Commits | First | Last |', '| --- | --- | --- | --- |');
for (const [model, v] of Object.entries(byModel).sort((a, b) => a[1].first.localeCompare(b[1].first) || b[1].commits - a[1].commits)) {
  lines.push(`| ${model} | ${v.commits} | ${v.first} | ${v.last} |`);
}

lines.push('', '## Per month', '');
lines.push('`Attributed` counts commits carrying a model trailer; the rest are David\'s own');
lines.push('commits or predate the convention. Churn is raw and unweighted — a generated', 'bundle and a rewritten parser count the same, which is exactly why it must not be', 'read as productivity on its own.', '');
lines.push('| Month | Commits | Attributed | Files | +Lines | −Lines | Dominant model |', '| --- | --- | --- | --- | --- | --- | --- |');
for (const m of months) {
  const v = byMonth[m];
  const c = churn[m] ?? { files: 0, ins: 0, del: 0 };
  const dom = Object.entries(v.models).sort((a, b) => b[1] - a[1])[0];
  lines.push(`| ${m} | ${v.total} | ${v.attributed} | ${c.files} | ${c.ins} | ${c.del} | ${dom ? `${dom[0]} (${dom[1]})` : '—'} |`);
}

lines.push('', '## Caveats this file will not let you skip', '');
lines.push('- **Attribution is a convention, not instrumentation.** A commit without a trailer');
lines.push('  was not necessarily written unassisted; the convention started partway through.');
lines.push('- **Churn measures text, not work.** Deleting 12,000 lines of retired grammar was');
lines.push('  one of the most valuable months in this project.');
lines.push('- **Model names are release names, not capability marks.** A month attributed to');
lines.push('  one model may include work by another through a subagent.');

writeFileSync(`${OUT}/index-genai.md`, lines.join('\n') + '\n');
console.log(`${commits.length} commits, ${Object.keys(byModel).length} models, ${months.length} months`);
console.log(Object.entries(byModel).map(([k, v]) => `${k}: ${v.commits} (${v.first}..${v.last})`).join('\n'));
