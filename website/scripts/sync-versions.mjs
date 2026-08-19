/**
 * sync-versions.mjs — derive the docs rail's version badges from the repository.
 *
 * `src/lib/versions.json` is a DERIVED ARTIFACT. The sources of truth are
 * `packages/sharpee/package.json` (platform, lockstep across all workspace
 * packages) and `packages/chord/src/version.ts`'s `CHORD_LANGUAGE_VERSION`
 * (the Chord LANGUAGE version, which moves independently of the npm package
 * that carries it — 5.1.1 shipped a 3.3.0 language).
 *
 * This script exists for the same reason `sync-chord-ebnf.mjs` and
 * `sync-roadmap.mjs` do, and for one specific measured failure: these two
 * numbers were hand-copied into `nav.ts` and went stale nine times across eight
 * sessions — twice on 2026-08-18 alone, while the release that changed them was
 * still in flight. A published version string that disagrees with what shipped
 * is worse than no version string, because a reader has no way to tell.
 *
 * Chord Writer's version is deliberately NOT here. It was dropped from the rail
 * (2026-08-19): an app version on a documentation sidebar is the least useful of
 * the three and the most drift-prone, and the download page already states it
 * authoritatively from `tools/ide/project.yml`.
 *
 * Public interface: none — run from `prebuild` and `predev`. Fails loudly: an
 * unreadable source or an unparseable version stops the build rather than
 * publishing a badge that quietly says nothing.
 *
 * Owner context: website build tooling.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..');
const SHARPEE_PKG = join(REPO, 'packages', 'sharpee', 'package.json');
const CHORD_VERSION_TS = join(REPO, 'packages', 'chord', 'src', 'version.ts');
const IDE_PROJECT_YML = join(REPO, 'tools', 'ide', 'project.yml');
const DEST = join(here, '..', 'src', 'lib', 'versions.json');

const die = (message) => {
  console.error(`sync-versions: ${message}`);
  process.exit(1);
};

/** Read the platform version — every workspace package moves in lockstep. */
function platformVersion() {
  if (!existsSync(SHARPEE_PKG)) die(`missing ${SHARPEE_PKG}`);
  const { version } = JSON.parse(readFileSync(SHARPEE_PKG, 'utf8'));
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
    die(`packages/sharpee/package.json has no plain X.Y.Z version (got ${version})`);
  }
  return version;
}

/**
 * Read `CHORD_LANGUAGE_VERSION`. Deliberately NOT the chord package.json
 * version: that one rides the platform lockstep, and quoting it on a language
 * reference page would claim a grammar change every time the platform patched.
 */
function chordLanguageVersion() {
  if (!existsSync(CHORD_VERSION_TS)) die(`missing ${CHORD_VERSION_TS}`);
  const source = readFileSync(CHORD_VERSION_TS, 'utf8');
  const match = source.match(/CHORD_LANGUAGE_VERSION\s*=\s*['"](\d+\.\d+\.\d+)['"]/);
  if (!match) die(`no CHORD_LANGUAGE_VERSION = 'X.Y.Z' in ${CHORD_VERSION_TS}`);
  return match[1];
}

/**
 * Chord Writer's shipped version, from the same line `package.sh` reads to name
 * the DMGs. It has no nav badge (dropped 2026-08-19) but the docs DO quote it —
 * the status-bar example on the Chord Writer pages names all three versions, and
 * two of the three were stale within a day of being written by hand.
 */
function chordWriterVersion() {
  if (!existsSync(IDE_PROJECT_YML)) die(`missing ${IDE_PROJECT_YML}`);
  const source = readFileSync(IDE_PROJECT_YML, 'utf8');
  const match = source.match(/^ *CFBundleShortVersionString: *"?(\d+\.\d+\.\d+)"? *$/m);
  if (!match) die(`no CFBundleShortVersionString in ${IDE_PROJECT_YML}`);
  return match[1];
}

const next = `${JSON.stringify({
  sharpee: platformVersion(),
  chord: chordLanguageVersion(),
  chordWriter: chordWriterVersion(),
}, null, 2)}\n`;

// Write only on change so a no-op build does not churn the file's mtime.
const current = existsSync(DEST) ? readFileSync(DEST, 'utf8') : '';
if (current !== next) {
  writeFileSync(DEST, next);
  console.log(`sync-versions: wrote ${DEST}`);
}
