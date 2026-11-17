/**
 * build-index.mjs — Phase 1 of the Sharpee history retrospective: a purely
 * mechanical index of the session corpus. No judgment, no reading; every field
 * is either parsed from a filename, read from a document's own header, or
 * marked unknown.
 *
 * Emits, into this directory:
 *   index-corpus.json   one record per file
 *   index-corpus.md     human-readable overview + monthly histogram
 *
 * Public interface: run it — `node build-index.mjs`. Owner: retrospective
 * tooling, not the Sharpee platform.
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CORPUS = '/Volumes/Workspace/sharpee-corpus';
const OUT = join(CORPUS, 'retrospective');

/**
 * Parse a date (and branch/slug where the convention carries them) out of a
 * filename. Returns null when no convention matches — the caller then falls
 * back to the document's own header.
 */
function dateFromName(name) {
  let m;
  // session-YYYYMMDD-HHMM-<branch>.md — the current convention
  if ((m = name.match(/^session-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-(.+)\.md$/))) {
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}`, branch: m[6], convention: 'session' };
  }
  // session-YYYYMMDD-<branch>.md — same era, no time component
  if ((m = name.match(/^session-(\d{4})(\d{2})(\d{2})-(.+)\.md$/))) {
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null, branch: m[4], convention: 'session-notime' };
  }
  // YYYY-MM-DD-HHMM-slug.md and YYYY-MM-DD-slug.md — the middle era
  if ((m = name.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{4})-(.+)\.md$/))) {
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4].slice(0, 2)}:${m[4].slice(2)}`, slug: m[5], convention: 'dated' };
  }
  if ((m = name.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/))) {
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null, slug: m[4], convention: 'dated-notime' };
  }
  // work-summary-YYYY-MM-DD… and work-summary-YYYYMMDD… — the 2025 era
  if ((m = name.match(/^work-summary-(\d{4})-?(\d{2})-?(\d{2})(.*)\.md$/))) {
    return { date: `${m[1]}-${m[2]}-${m[3]}`, time: null, slug: m[4].replace(/^[-.]/, ''), convention: 'work-summary' };
  }
  // Embedded-date forms: <slug>-YYYYMMDD.md and <slug>-YYYYMMDD-HHMM.md.
  // These must be tried before the header fallback: `work-summary-eprf-20250704-0215.md`
  // carries a different date in its own header, and the filename is the reliable one.
  if ((m = name.match(/-(\d{4})(\d{2})(\d{2})(?:-(\d{2})(\d{2}))?\.md$/))) {
    const slug = name.slice(0, m.index);
    return {
      date: `${m[1]}-${m[2]}-${m[3]}`,
      time: m[4] ? `${m[4]}:${m[5]}` : null,
      slug,
      convention: 'embedded-date',
    };
  }
  return null;
}

/** A date the document states about itself, from its own first lines. */
function dateFromHeader(head) {
  let m;
  if ((m = head.match(/^\*\*Date\*\*:\s*(\d{4}-\d{2}-\d{2})/m))) return m[1];
  if ((m = head.match(/^#\s*Session Summary:\s*(\d{4}-\d{2}-\d{2})/m))) return m[1];
  if ((m = head.match(/\b(20\d{2}-\d{2}-\d{2})\b/))) return m[1];
  return null;
}

/** First markdown heading, used as the document's title. */
function titleFrom(head) {
  const m = head.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/\s+$/, '') : null;
}

/** Branch, when the document states one in its header. */
function branchFrom(head) {
  const m = head.match(/^\*\*Branch\*\*:\s*(\S+)/m);
  return m ? m[1] : null;
}

/**
 * Session summary, or something else? Session summaries either follow a dated
 * filename convention or announce themselves in their first heading. Plans,
 * checklists, templates, and status reports are the "something else" the
 * reading phases must not treat as session records.
 */
function classify(name, parsed, title) {
  const t = (title ?? '').toLowerCase();
  const n = name.toLowerCase();
  if (parsed && ['session', 'session-notime', 'work-summary'].includes(parsed.convention)) return 'summary';
  if (/session summary|work summary/.test(t)) return 'summary';
  if (/checklist|template|plan\b|-plan|roadmap|guide|spec\b/.test(n) || /checklist|template|^plan\b|roadmap/.test(t)) return 'plan-or-checklist';
  if (parsed) return 'dated-note';
  return 'undated-note';
}

function indexDir(dir, source) {
  const records = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) { records.push({ source, name, kind: 'directory', files: readdirSync(full).length }); continue; }
    const parsed = dateFromName(name);
    let head = '';
    if (/\.(md|txt)$/i.test(name)) {
      head = readFileSync(full, 'utf8').split('\n').slice(0, 20).join('\n');
    }
    const headerDate = head ? dateFromHeader(head) : null;
    const title = head ? titleFrom(head) : null;
    // mtime is the last resort and the weakest evidence: rsync -a preserved it
    // through the copy, but a file edited years after it was written carries the
    // edit's date. Recorded separately so a reader can discount it.
    const mtime = st.mtime.toISOString().slice(0, 10);
    records.push({
      source,
      name,
      kind: 'file',
      bytes: st.size,
      mtime,
      date: parsed?.date ?? headerDate ?? mtime,
      dateSource: parsed ? 'filename' : headerDate ? 'header' : 'mtime',
      time: parsed?.time ?? null,
      convention: parsed?.convention ?? 'none',
      branch: parsed?.branch ?? branchFrom(head) ?? null,
      title,
      class: classify(name, parsed, title),
    });
  }
  return records;
}

const records = [
  ...indexDir(join(CORPUS, 'work-history'), 'work-history'),
  ...indexDir(join(CORPUS, 'context-history'), 'context-history'),
];

writeFileSync(join(OUT, 'index-corpus.json'), JSON.stringify(records, null, 1));

// ---- overview ----
const files = records.filter((r) => r.kind === 'file');
const byClass = {};
for (const r of files) byClass[r.class] = (byClass[r.class] ?? 0) + 1;

const byMonth = {};
for (const r of files) {
  if (!r.date) continue;
  const m = r.date.slice(0, 7);
  byMonth[m] ??= { summary: 0, other: 0 };
  if (r.class === 'summary') byMonth[m].summary++;
  else byMonth[m].other++;
}
const months = Object.keys(byMonth).sort();

const undated = files.filter((r) => r.dateSource === 'mtime');
const lines = [];
lines.push('# Corpus index — session summaries and notes', '');
lines.push(`Generated by \`build-index.mjs\`. ${files.length} files across two source directories.`, '');
lines.push('## By classification', '');
lines.push('| Class | Files |', '| --- | --- |');
for (const [k, v] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v} |`);
lines.push('', '## By month', '');
lines.push('| Month | Summaries | Other dated | Bar |', '| --- | --- | --- | --- |');
for (const m of months) {
  const { summary, other } = byMonth[m];
  lines.push(`| ${m} | ${summary} | ${other} | ${'█'.repeat(Math.min(60, Math.ceil(summary / 3)))} |`);
}
lines.push('', `## Dated by mtime only (${undated.length})`, '');
lines.push(
  'No date in the filename and none stated in the first 20 lines, so the date shown',
  'is the file mtime — preserved through the copies, but it records the last edit,',
  'not the writing. Treat these dates as weak evidence.',
  '',
);
for (const r of undated.slice(0, 400)) lines.push(`- \`${r.name}\` (mtime ${r.mtime}) — ${r.title ?? '(no heading)'} [${r.class}]`);
if (undated.length > 400) lines.push(`- …and ${undated.length - 400} more (see index-corpus.json)`);

writeFileSync(join(OUT, 'index-corpus.md'), lines.join('\n') + '\n');

console.log(`indexed ${files.length} files`);
console.log('classes:', byClass);
console.log(`months: ${months[0]} .. ${months[months.length - 1]} (${months.length})`);
console.log(`undated: ${undated.length}`);
