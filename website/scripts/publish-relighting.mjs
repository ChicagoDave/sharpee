/**
 * publish-relighting.mjs — place the finished Relighting on the site as a
 * page a visitor can play.
 *
 * `public/chord-manual/<version>/play/` is a DERIVED COPY of the browser build
 * `sharpee publish` writes for the book's last companion folder:
 *
 *   tutorials/relighting/chord-v<version>/chapter-40/dist/web/relighting/
 *     → public/chord-manual/<version>/play/
 *
 * Chapter 40's folder is the story as it stands at the end of the book. Like
 * `publish-chord-manual.mjs`, this is NOT part of `npm run sync`: its source is
 * build output, which is git-ignored, so it is run by hand and its result is
 * committed:
 *
 *   cd tutorials/relighting/chord-v<version>/chapter-40
 *   sharpee publish relighting.story
 *   node website/scripts/publish-relighting.mjs      (from the repository root)
 *
 * Left out: `index-testing.html`, the IDE's testing surface, which
 * `sharpee publish` leaves out of its own zip for the same reason.
 *
 * Public interface: the command above; no arguments.
 * Fails loudly: a missing build stops it before the destination is touched.
 *
 * Owner context: website build tooling.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..');

/** The edition's version: the folder under tutorials/relighting/ is `chord-v<VERSION>`. */
const VERSION = '4.1.0';
const FOLDER = join(REPO, 'tutorials', 'relighting', `chord-v${VERSION}`, 'chapter-40');
const SOURCE = join(FOLDER, 'dist', 'web', 'relighting');
const DEST = join(here, '..', 'public', 'chord-manual', VERSION, 'play');

/** Files of the build that are never published. */
const EXCLUDED = new Set(['index-testing.html']);

// Invariant: the build exists, whole, before the destination is touched.
for (const file of ['index.html', 'game.js']) {
  if (!existsSync(join(SOURCE, file))) {
    console.error(`publish-relighting: missing ${join(SOURCE, file)}`);
    console.error(`(run \`sharpee publish relighting.story\` in ${FOLDER})`);
    process.exit(1);
  }
}

// Replaced whole, so a file dropped from the build does not linger on the site.
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(SOURCE, DEST, { recursive: true, filter: (path) => !EXCLUDED.has(basename(path)) });

console.log(
  `publish-relighting: ${readdirSync(DEST).length} entries → public/chord-manual/${VERSION}/play/`,
);
