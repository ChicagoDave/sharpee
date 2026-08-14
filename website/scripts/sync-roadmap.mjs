/**
 * sync-roadmap.mjs — derive the site's roadmap data from `docs/roadmap/`.
 *
 * `src/lib/roadmap-data.json` is a DERIVED ARTIFACT. The source of truth is
 * `docs/roadmap/roadmap-*.md`, one file per item. This script exists for the same
 * reason `sync-chord-ebnf.mjs` does: a published page that restates repo content
 * drifts from it silently, and a roadmap that says something different from the
 * repository is worse than no roadmap.
 *
 * Public interface: none — run from `prebuild` and `predev`. Fails loudly. A
 * missing source directory, an unparseable item, or an item missing a required
 * header field stops the build rather than publishing a half-read roadmap.
 *
 * Owner context: website build tooling.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(here, '..', '..', 'docs', 'roadmap');
const DEST = join(here, '..', 'src', 'lib', 'roadmap-data.json');

/** Header fields every item file must carry, mapped to their JSON keys. */
const FIELDS = {
  'Status': 'status',
  'Built?': 'built',
  'Created': 'created',
  'Target date': 'targetDate',
  'Target Sharpee version': 'targetSharpee',
  'Target Chord version': 'targetChord',
  'Traces to': 'tracesTo',
};

/**
 * Flatten inline markdown to plain text for display on the site.
 *
 * Item files link with repo-relative paths (`../work/...`), which are
 * meaningless once rendered on the web, so links keep their label and lose
 * their target. Code spans lose their backticks.
 *
 * @param {string} s inline markdown
 * @returns {string} plain text
 */
function plain(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`/g, '')
    .replace(/\*\*/g, '')
    .trim();
}

/**
 * Parse one roadmap item file.
 *
 * @param {string} filename bare filename, used in error messages
 * @param {string} text full file contents
 * @returns {object} the item record written to the JSON
 * @throws if the title line or any required header field is absent
 */
function parseItem(filename, text) {
  const titleMatch = text.match(/^#\s*(\d+)\s*[—-]\s*(.+)$/m);
  if (!titleMatch) {
    throw new Error(`${filename}: no "# NNN — Title" heading found`);
  }

  const item = { id: titleMatch[1], title: titleMatch[2].trim() };

  for (const [label, key] of Object.entries(FIELDS)) {
    // Header lines look like: **Status**: DRAFT
    const escaped = label.replace(/[?]/g, '\\?');
    const match = text.match(new RegExp(`^\\*\\*${escaped}\\*\\*:\\s*(.+)$`, 'm'));
    if (!match) {
      throw new Error(`${filename}: missing required header field "${label}"`);
    }
    item[key] = plain(match[1]);
  }

  // Summary: the first paragraph under "## What it is".
  const whatItIs = text.split(/^##\s*What it is\s*$/m)[1];
  if (!whatItIs) {
    throw new Error(`${filename}: no "## What it is" section`);
  }
  const paragraph = whatItIs.replace(/^\s*\n/, '').split(/\n\s*\n/)[0];
  item.summary = plain(paragraph.replace(/\s*\n\s*/g, ' '));

  return item;
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`sync-roadmap: source missing at ${SOURCE_DIR}`);
  console.error('The published roadmap is derived from it — refusing to build without it.');
  process.exit(1);
}

const files = readdirSync(SOURCE_DIR)
  .filter((f) => /^roadmap-\d+\.md$/.test(f))
  .sort();

if (files.length === 0) {
  console.error(`sync-roadmap: no roadmap-NNN.md files in ${SOURCE_DIR}`);
  process.exit(1);
}

let items;
try {
  items = files.map((f) => parseItem(f, readFileSync(join(SOURCE_DIR, f), 'utf8')));
} catch (err) {
  console.error(`sync-roadmap: ${err.message}`);
  console.error('Every item needs the header block documented in docs/roadmap/README.md.');
  process.exit(1);
}

const next = JSON.stringify({ items }, null, 2) + '\n';
const unchanged = existsSync(DEST) && readFileSync(DEST, 'utf8') === next;

if (unchanged) {
  console.log(`sync-roadmap: src/lib/roadmap-data.json already matches docs/roadmap/ (${items.length} items)`);
} else {
  writeFileSync(DEST, next);
  console.log(`sync-roadmap: refreshed src/lib/roadmap-data.json from docs/roadmap/ (${items.length} items)`);
}
