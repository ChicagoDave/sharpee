/**
 * sync-chord-ebnf.mjs — copy the Chord grammar into the site's static assets.
 *
 * `public/chord.ebnf` is a DERIVED COPY. The source of truth is
 * `packages/chord/chord.ebnf`, which `packages/chord/tests/language-version.test.ts`
 * hashes as ADR-257 D5's language-version build gate. This script exists so the
 * published download cannot drift from the grammar the gate pins.
 *
 * It had drifted: between the initial site ship (d0cc4807) and 2026-08-14 the
 * copy sat a month stale across two ADRs, still specifying the positional
 * `story "Title" by "Author"` header that ADR-298 removed, and missing comments
 * (ADR-249), records (ADR-300 D10) and counters (ADR-264). Nothing connected the
 * two files, so nothing noticed.
 *
 * Runs from `prebuild` and `predev`. Fails loudly: a missing or unreadable
 * source means the site would publish a grammar nobody verified, which is the
 * exact failure this replaces.
 *
 * Owner context: website build tooling.
 */
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, '..', '..', 'packages', 'chord', 'chord.ebnf');
const DEST = join(here, '..', 'public', 'chord.ebnf');

if (!existsSync(SOURCE)) {
  console.error(`sync-chord-ebnf: source missing at ${SOURCE}`);
  console.error('The published grammar is derived from it — refusing to build a stale copy.');
  process.exit(1);
}

const unchanged = existsSync(DEST) && readFileSync(SOURCE).equals(readFileSync(DEST));

if (unchanged) {
  console.log('sync-chord-ebnf: public/chord.ebnf already matches packages/chord/chord.ebnf');
} else {
  copyFileSync(SOURCE, DEST);
  console.log('sync-chord-ebnf: refreshed public/chord.ebnf from packages/chord/chord.ebnf');
}
