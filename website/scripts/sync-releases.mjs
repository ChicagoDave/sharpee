/**
 * sync-releases.mjs — derive the site's release notes from `docs/releases/`.
 *
 * `src/lib/releases-data.json` is a DERIVED ARTIFACT. The source of truth is
 * `docs/releases/release-<version>.md`, one file per published release. This
 * script exists for the same reason `sync-roadmap.mjs` and `sync-versions.mjs`
 * do: a published page that restates repository content drifts from it
 * silently, and release notes that disagree with what shipped are worse than
 * none.
 *
 * Public interface: none — run from `prebuild` and `predev`. Fails loudly. A
 * missing source directory, an unparseable file, or a file missing a required
 * header field stops the build rather than publishing half-read notes.
 *
 * Owner context: website build tooling.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = join(here, '..', '..', 'docs', 'releases');
const DEST = join(here, '..', 'src', 'lib', 'releases-data.json');

/** Header fields every release file must carry, mapped to their JSON keys. */
const FIELDS = {
  'Status': 'status',
  'Published': 'published',
  'Chord language': 'chord',
  'Traces to': 'tracesTo',
};

/**
 * Flatten inline markdown to plain text for display on the site.
 *
 * Source files link to GitHub issues with absolute URLs and to repo paths with
 * relative ones; neither survives rendering as prose, so a link keeps its label
 * and loses its target. Code spans lose their backticks.
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
 * Compare two `X.Y.Z` strings numerically, newest first.
 *
 * Deliberately not a string sort: `5.10.0` must outrank `5.9.0`, which it does
 * not lexically. The day that bites is the day a release goes missing from the
 * top of the page and nobody notices.
 *
 * @param {{version: string}} a
 * @param {{version: string}} b
 * @returns {number}
 */
function byVersionDesc(a, b) {
  const pa = a.version.split('.').map(Number);
  const pb = b.version.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return 0;
}

/**
 * Parse one release file.
 *
 * @param {string} filename bare filename, used in error messages
 * @param {string} text full file contents
 * @returns {object} the release record written to the JSON
 * @throws if the title line, any required header field, or `## What shipped` is absent
 */
function parseRelease(filename, text) {
  const titleMatch = text.match(/^#\s*(\d+\.\d+\.\d+)\s*[—-]\s*(.+)$/m);
  if (!titleMatch) {
    throw new Error(`${filename}: no "# X.Y.Z — Title" heading found`);
  }

  const release = { version: titleMatch[1], title: plain(titleMatch[2]) };

  for (const [label, key] of Object.entries(FIELDS)) {
    const match = text.match(new RegExp(`^\\*\\*${label}\\*\\*:\\s*(.+)$`, 'm'));
    if (!match) {
      throw new Error(`${filename}: missing required header field "${label}"`);
    }
    release[key] = plain(match[1]);
  }

  // Summary: the first paragraph under "## What shipped".
  const whatShipped = text.split(/^##\s*What shipped\s*$/m)[1];
  if (!whatShipped) {
    throw new Error(`${filename}: no "## What shipped" section`);
  }
  const paragraph = whatShipped.replace(/^\s*\n/, '').split(/\n\s*\n/)[0];
  release.summary = plain(paragraph.replace(/\s*\n\s*/g, ' '));

  // Notes: the "- " bullets under "## Notes", each folded to one line. A
  // release with nothing to itemize is legal — the summary carries it.
  const notesSection = text.split(/^##\s*Notes\s*$/m)[1];
  release.notes = notesSection
    ? notesSection
        .split(/\n(?=- )/)
        .map((b) => b.trim())
        .filter((b) => b.startsWith('- '))
        .map((b) => plain(b.slice(2).replace(/\s*\n\s*/g, ' ')))
    : [];

  return release;
}

if (!existsSync(SOURCE_DIR)) {
  console.error(`sync-releases: source missing at ${SOURCE_DIR}`);
  console.error('The published release notes are derived from it — refusing to build without it.');
  process.exit(1);
}

const files = readdirSync(SOURCE_DIR)
  .filter((f) => /^release-\d+\.\d+\.\d+\.md$/.test(f))
  .sort();

if (files.length === 0) {
  console.error(`sync-releases: no release-X.Y.Z.md files in ${SOURCE_DIR}`);
  process.exit(1);
}

let releases;
try {
  releases = files.map((f) => parseRelease(f, readFileSync(join(SOURCE_DIR, f), 'utf8')));
} catch (err) {
  console.error(`sync-releases: ${err.message}`);
  console.error('Every release needs the header block documented in docs/releases/README.md.');
  process.exit(1);
}

releases.sort(byVersionDesc);

const next = JSON.stringify({ releases }, null, 2) + '\n';
const unchanged = existsSync(DEST) && readFileSync(DEST, 'utf8') === next;

if (unchanged) {
  console.log(`sync-releases: src/lib/releases-data.json already matches docs/releases/ (${releases.length} releases)`);
} else {
  writeFileSync(DEST, next);
  console.log(`sync-releases: refreshed src/lib/releases-data.json from docs/releases/ (${releases.length} releases)`);
}
