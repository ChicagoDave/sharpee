#!/usr/bin/env node
/**
 * analytics.mjs — read the JSONL the /api/p collector writes.
 *
 * The collector is deliberately dumb (append a line, never fail); this is
 * where the thinking happens. Run it on plover, where the data lives:
 *
 *   node website/scripts/analytics.mjs                 last 30 days
 *   node website/scripts/analytics.mjs --days 7        last week
 *   node website/scripts/analytics.mjs --downloads     downloads only, by asset
 *   node website/scripts/analytics.mjs --paths         most-read pages
 *   node website/scripts/analytics.mjs --csv           one row per day, for a sheet
 *
 * Reads $SHARPEE_ANALYTICS_DIR (default /var/lib/sharpee-analytics).
 *
 * On "visitors": a visitor is a localStorage id, so it counts browsers, not
 * people — cleared storage or a second device reads as someone new. Good
 * enough for direction, wrong for anything that matters.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIR = process.env.SHARPEE_ANALYTICS_DIR ?? '/var/lib/sharpee-analytics';
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const days = Number(opt('days', 30));
const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

let files;
try {
  files = (await readdir(DIR)).filter((f) => f.startsWith('events-') && f.endsWith('.jsonl'));
} catch {
  console.error(`no analytics directory at ${DIR}`);
  console.error('(nothing has been collected yet, or SHARPEE_ANALYTICS_DIR points elsewhere)');
  process.exit(1);
}

const events = [];
for (const f of files.sort()) {
  const text = await readFile(join(DIR, f), 'utf-8');
  for (const line of text.split('\n')) {
    if (!line) continue;
    try {
      const e = JSON.parse(line);
      if (e.day >= since) events.push(e);
    } catch {
      // A truncated final line is normal if a write raced a read. Skip it.
    }
  }
}

if (events.length === 0) {
  console.log(`no events in the last ${days} days (${DIR})`);
  process.exit(0);
}

const tally = (list, key) => {
  const m = new Map();
  for (const e of list) {
    const k = typeof key === 'function' ? key(e) : e[key];
    if (k == null) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1]);
};

const table = (rows, limit = 15) => {
  const width = Math.min(58, Math.max(...rows.slice(0, limit).map(([k]) => String(k).length), 4));
  for (const [k, n] of rows.slice(0, limit)) {
    console.log(`  ${String(k).padEnd(width)}  ${String(n).padStart(6)}`);
  }
  if (rows.length > limit) console.log(`  … and ${rows.length - limit} more`);
};

const views = events.filter((e) => e.type === 'pageview');
const downloads = events.filter((e) => e.type === 'download');

if (flag('csv')) {
  console.log('day,pageviews,visitors,downloads');
  const byDay = new Map();
  for (const e of events) {
    const d = byDay.get(e.day) ?? { views: 0, vids: new Set(), dl: 0 };
    if (e.type === 'pageview') { d.views++; if (e.vid) d.vids.add(e.vid); }
    if (e.type === 'download') d.dl++;
    byDay.set(e.day, d);
  }
  for (const [day, d] of [...byDay].sort()) {
    console.log(`${day},${d.views},${d.vids.size},${d.dl}`);
  }
  process.exit(0);
}

if (flag('downloads')) {
  console.log(`\nDownloads, last ${days} days — ${downloads.length} clicks\n`);
  table(tally(downloads, 'asset'));
  console.log('\nWhere they came from:\n');
  table(tally(downloads, (e) => e.ref || '(direct)'), 10);
  console.log('\nNote: this counts CLICKS. GitHub\'s own counter counts requests,');
  console.log('including bots and mirrors, so the two will never agree.\n');
  process.exit(0);
}

if (flag('paths')) {
  console.log(`\nMost-read pages, last ${days} days\n`);
  table(tally(views, 'path'), 25);
  process.exit(0);
}

const visitors = new Set(views.map((e) => e.vid).filter(Boolean)).size;
const sessions = new Set(views.map((e) => e.sid).filter(Boolean)).size;

console.log(`\nsharpee.net — last ${days} days (since ${since})\n`);
console.log(`  pageviews   ${views.length}`);
console.log(`  visitors    ${visitors}   (browsers, not people)`);
console.log(`  sessions    ${sessions}`);
console.log(`  downloads   ${downloads.length}`);

console.log('\nTop pages\n');
table(tally(views, 'path'), 10);

if (downloads.length > 0) {
  console.log('\nDownloads\n');
  table(tally(downloads, 'asset'));
}

console.log('\nReferrers\n');
table(tally(views, (e) => {
  if (!e.ref) return '(direct)';
  try { return new URL(e.ref).hostname; } catch { return e.ref.slice(0, 40); }
}), 10);

console.log('\nOS / device\n');
table(tally(views, (e) => `${e.os} · ${e.device}`), 8);
console.log('');
