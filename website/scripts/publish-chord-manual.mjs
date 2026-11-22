/**
 * publish-chord-manual.mjs — place The Chord Manual's rendered outputs on the
 * site: the PDF and the EPUB as downloads, and the web build to read online.
 *
 * Everything it writes is a DERIVED COPY of what `scripts/build-book.sh`
 * rendered from `docs/book/chord-v<version>/`:
 *
 *   build/the-chord-manual-<version>.pdf    → public/downloads/
 *   build/the-chord-manual-<version>.epub   → public/downloads/
 *   web/  (the chunked web build)           → public/chord-manual/<version>/book/
 *
 * The printable interior (`…-print.pdf`) is never copied. It is for
 * print-on-demand and does not go on the website (David, 2026-11-19).
 *
 * Unlike the `sync-*` scripts this one is NOT part of `npm run sync`. Its
 * sources are build outputs, which are git-ignored and need pandoc and
 * weasyprint to make; the server that builds the site has neither. So it is
 * run by hand after the book is rendered, and its results are committed:
 *
 *   ./scripts/build-book.sh chord-v<version> all
 *   ./scripts/build-book.sh chord-v<version> web
 *   node website/scripts/publish-chord-manual.mjs
 *
 * Public interface: the command above; no arguments.
 * Fails loudly: a missing output stops it before anything is written, so the
 * site never carries a download from one build beside a web edition from
 * another. So does a revision date that differs between the title page and
 * src/app/chord/manual/content.mdx.
 *
 * Owner context: website build tooling; the Chord manual plan, Phase 9.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, '..', '..');

/** The edition's version: its directory under docs/book/ is `chord-v<VERSION>`. */
const VERSION = '4.1.0';
const EDITION = join(REPO, 'docs', 'book', `chord-v${VERSION}`);
const NAME = `the-chord-manual-${VERSION}`;

const DOWNLOADS = join(here, '..', 'public', 'downloads');
const BOOK = join(here, '..', 'public', 'chord-manual', VERSION, 'book');

const die = (message) => {
  console.error(`publish-chord-manual: ${message}`);
  process.exit(1);
};

// Invariant: every source exists before any destination is touched.
const pdf = join(EDITION, 'build', `${NAME}.pdf`);
const epub = join(EDITION, 'build', `${NAME}.epub`);
const web = join(EDITION, 'web');
for (const [path, how] of [
  [pdf, `./scripts/build-book.sh chord-v${VERSION} all`],
  [epub, `./scripts/build-book.sh chord-v${VERSION} all`],
  [join(web, 'index.html'), `./scripts/build-book.sh chord-v${VERSION} web`],
]) {
  if (!existsSync(path)) die(`missing ${path} (run ${how})`);
}

// Invariant: the revision date a reader compares is the same in both places
// it is written by hand: the title page and the site's page for the book. A
// copy that disagrees with the site would tell a reader to download again, or
// not to, wrongly.
const titlePage = readFileSync(join(EDITION, 'frontmatter', '00-title-page.md'), 'utf-8');
const revised = /\[Revised ([^\]]+)\]/.exec(titlePage)?.[1];
if (!revised) die('frontmatter/00-title-page.md has no [Revised <date>] line');
const sitePage = join(here, '..', 'src', 'app', 'chord', 'manual', 'content.mdx');
if (!readFileSync(sitePage, 'utf-8').includes(revised)) {
  die(`${sitePage} does not carry the title page's revision date, "${revised}"`);
}

mkdirSync(DOWNLOADS, { recursive: true });
cpSync(pdf, join(DOWNLOADS, `${NAME}.pdf`));
cpSync(epub, join(DOWNLOADS, `${NAME}.epub`));

// The web edition is replaced whole, so a page dropped from the book does not
// linger on the site.
rmSync(BOOK, { recursive: true, force: true });
mkdirSync(BOOK, { recursive: true });
cpSync(web, BOOK, { recursive: true });

const kb = (path) => Math.round(statSync(path).size / 1024);
const pages = readdirSync(BOOK).filter((f) => f.endsWith('.html')).length;
console.log(
  `publish-chord-manual: ${NAME}.pdf (${kb(pdf)} KB) and ${NAME}.epub (${kb(epub)} KB) → public/downloads/; ` +
    `${pages} pages → public/chord-manual/${VERSION}/book/`,
);
