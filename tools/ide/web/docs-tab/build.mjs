/**
 * build.mjs — bundles the Documentation tab into the IDE's app resources.
 *
 * Purpose: walks sharpee.net's own author documentation
 *   (`website/src/app/chord/**\/content.mdx` and `.../learn/**`), reduces the
 *   MDX to markdown, renders it to HTML fragments, and emits them alongside a
 *   navigation index — plus one esbuild pass for the tab's own script. The
 *   result is `SharpeeIDE/Resources/docs-tab/`, which project.yml copies whole
 *   into the app, exactly as it does for the Testing tab (ADR-301 D1).
 *
 *   Why not the website's own Next build: it would put `npm install` +
 *   `next build` inside an Xcode pre-build phase. project.yml already draws
 *   that line — the Testing tab's esbuild pass is unconditional BECAUSE it is
 *   cheap, while the toolchain vendoring is opt-in BECAUSE it is not. Reading
 *   the same source directly keeps the docs bundle on the cheap side of it, and
 *   `website/` need not even be installed.
 *
 * Version gate: the bundle records the CHORD_LANGUAGE_VERSION it was built
 *   against. The tab shows a banner when the running toolchain reports a
 *   different one — documentation for a language the bundled compiler does not
 *   speak is worse than none.
 *
 * Usage: `node tools/ide/web/docs-tab/build.mjs`
 * Owner context: tools/ide — the Documentation tab's web bundle.
 */

import {
  readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync, cpSync, renameSync,
} from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { reduceMdx, parseGrammarBlocks } from './src/mdx.mjs';
import { renderMarkdown } from './src/markdown.mjs';
import { shippedNav } from './src/nav-bridge.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const appDir = resolve(repoRoot, 'website/src/app');
const outDir = resolve(repoRoot, 'tools/ide/SharpeeIDE/Resources/docs-tab');
// Everything is written HERE and moved into place only once the whole build has
// succeeded. Writing directly into outDir cost a shipped release: on 2026-08-11
// an unhandled-component throw fired after the output had already been wiped,
// leaving pages/ with no index.html, docs.js or docs.css — and because
// build-docs-tab.sh downgrades failures to warnings, Xcode packaged and Apple
// was asked to notarize an app whose Documentation tab could not render.
// A failed build must leave the last good bundle untouched.
const stageDir = `${outDir}.staging`;
const pagesDir = join(stageDir, 'pages');

/** URL prefixes under `website/src/app` that hold documentation Chord Writer ships. */
const SECTIONS = ['chord-writer', 'chord', 'learn'];

/**
 * Nav section titles to ship, in rail order. These are nav.ts's section
 * TITLES, not URL segments — `/learn/*` lives under the section titled
 * "Tutorial", which is exactly the kind of thing deriving structure from file
 * paths got wrong.
 */
const NAV_SECTIONS = ['Chord Writer', 'Chord', 'Tutorial'];

/**
 * Groups dropped from the shipped set. This is a DECISION, not an oversight:
 * Chord's Getting Started group is `npm install -g @sharpee/devkit`,
 * `sharpee init`, and `sharpee play` — instructions for a tool the reader is
 * not using, since Chord Writer bundles its own toolchain and scaffolds from a
 * menu. The Chord Writer section supersedes it. Removing this entry puts three
 * command-line pages back in front of an author who has no terminal open.
 */
const EXCLUDED_GROUPS = [{ section: 'Chord', group: 'Getting Started' }];

/** Recursively collect every content.mdx under `dir`. */
function findContentFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findContentFiles(full, acc);
    else if (name === 'content.mdx') acc.push(full);
  }
  return acc;
}

/** src/app/chord/getting-started/install/content.mdx -> /chord/getting-started/install */
function hrefFor(mdxPath) {
  return '/' + relative(appDir, dirname(mdxPath)).split(sep).join('/');
}

/** "getting-started" -> "Getting started" */
function humanize(segment) {
  const s = segment.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The page's title, by the same rule the website's search index uses: the
 * sibling page.tsx's <DocPage title="…">, else the first heading, else the
 * humanized leaf. Kept identical on purpose — two different titles for one page
 * across two surfaces is a bug nobody reports.
 */
function titleFor(mdxPath, raw) {
  const pagePath = join(dirname(mdxPath), 'page.tsx');
  if (existsSync(pagePath)) {
    const m = readFileSync(pagePath, 'utf8').match(
      /<DocPage[^>]*\btitle=(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\}|\{"([^"]+)"\})/,
    );
    const found = m ? (m[1] ?? m[2] ?? m[3] ?? m[4]) : null;
    if (found) return found;
  }
  const heading = raw.match(/^#{1,6}\s+(.+)$/m);
  if (heading) return heading[1].replace(/[*_`]/g, '').trim();
  return humanize(hrefFor(mdxPath).split('/').filter(Boolean).pop() ?? '');
}

/** Plain text for the tab's search, mirroring the website's stripper. */
function plainText(mdx) {
  return mdx
    .replace(/^\s*(import|export) .*$/gm, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/[*_>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The Chord language version this bundle documents. */
function chordLanguageVersion() {
  const source = readFileSync(resolve(repoRoot, 'packages/chord/src/version.ts'), 'utf8');
  const m = source.match(/CHORD_LANGUAGE_VERSION\s*=\s*'([^']+)'/);
  if (!m) throw new Error('could not read CHORD_LANGUAGE_VERSION from packages/chord/src/version.ts');
  return m[1];
}

/**
 * The website's `NAV`, loaded from its TypeScript source.
 *
 * `nav.ts` is website-owned and stays TypeScript; this is a plain-Node build,
 * so the type annotations are stripped with the esbuild already on hand and the
 * result imported as a data URL. No temp file, and nothing for a later build to
 * find stale. `nav.ts` imports nothing, so a bare transform is sufficient.
 */
async function loadNav() {
  const source = readFileSync(resolve(repoRoot, 'website/src/lib/nav.ts'), 'utf8');
  const { code } = await esbuild.transform(source, { loader: 'ts', format: 'esm' });
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  if (!Array.isArray(module.NAV)) {
    throw new Error('website/src/lib/nav.ts did not export a NAV array');
  }
  return module.NAV;
}

// ── Build ────────────────────────────────────────────────────────────────────

const grammarBlocks = parseGrammarBlocks(
  readFileSync(resolve(appDir, 'chord/stdlib/reference/grammar-blocks.ts'), 'utf8'),
);

const files = SECTIONS.flatMap((section) => findContentFiles(join(appDir, section)));
if (files.length === 0) {
  throw new Error(`no content.mdx found under ${appDir} — is the website checked out?`);
}

const NAV = await loadNav();
const { pages: navPages, tree: navTree } = shippedNav(NAV, {
  sections: NAV_SECTIONS,
  excludedGroups: EXCLUDED_GROUPS,
});

// The same walk with nothing excluded, so a page that is deliberately dropped
// can be told apart from one nobody accounted for. Only the second is a bug.
const { pages: unfilteredPages } = shippedNav(NAV, { sections: NAV_SECTIONS, excludedGroups: [] });

const mdxByHref = new Map(files.map((mdxPath) => [hrefFor(mdxPath), mdxPath]));
const shippedHrefs = new Set(navPages.map((p) => p.href));
const excludedHrefs = new Set(
  unfilteredPages.map((p) => p.href).filter((href) => !shippedHrefs.has(href)),
);

// Both directions throw. The corpus and the nav are two hand-maintained lists
// that have to agree, and the failure mode when they drift is silent: a page
// the author can reach on the website simply is not in the app, or a rail entry
// leads nowhere. Neither shows up as a crash, so the build has to be the check.
const navLeavesWithoutPage = navPages.filter((p) => !mdxByHref.has(p.href));
if (navLeavesWithoutPage.length > 0) {
  throw new Error(
    `nav.ts names pages with no content.mdx:\n` +
      navLeavesWithoutPage.map((p) => `  ${p.href}   [${p.crumb} › ${p.navTitle}]`).join('\n') +
      `\nAdd the page, or remove the entry from website/src/lib/nav.ts.`,
  );
}

const unexplained = [...mdxByHref.keys()].filter(
  (href) => !shippedHrefs.has(href) && !excludedHrefs.has(href),
);
if (unexplained.length > 0) {
  throw new Error(
    `content.mdx files that nav.ts does not place:\n` +
      unexplained.map((href) => `  ${href}`).join('\n') +
      `\nAdd them to website/src/lib/nav.ts, or exclude their group in EXCLUDED_GROUPS here.`,
  );
}

rmSync(stageDir, { recursive: true, force: true });
mkdirSync(pagesDir, { recursive: true });

const pages = [];
const unsupportedFound = new Map();

// NAV order, not directory order — this loop IS the fix for GH #238.
for (const navPage of navPages) {
  const mdxPath = mdxByHref.get(navPage.href);
  const raw = readFileSync(mdxPath, 'utf8');
  const { markdown, unsupported } = reduceMdx(raw, { grammarBlocks });
  if (unsupported.length > 0) {
    unsupportedFound.set(navPage.href, unsupported);
  }
  const slug = navPage.href.replace(/^\//, '').replace(/\//g, '__');
  writeFileSync(join(pagesDir, `${slug}.html`), renderMarkdown(markdown));
  pages.push({
    href: navPage.href,
    slug,
    // The page's own heading, still read the way the website's search index
    // reads it. NAV's title is the RAIL label and is often "Overview", which
    // would be a poor heading — both are carried, neither replaces the other.
    title: titleFor(mdxPath, raw),
    navTitle: navPage.navTitle,
    section: navPage.section,
    crumb: navPage.crumb,
    text: plainText(raw).slice(0, 2000),
  });
}

// A component the website added and this bundler does not know would otherwise
// disappear from the IDE's copy of the page with no signal at all.
if (unsupportedFound.size > 0) {
  const detail = [...unsupportedFound]
    .map(([href, names]) => `  ${href}: <${names.join('>, <')}>`)
    .join('\n');
  throw new Error(
    `unhandled MDX components — the IDE would silently drop them:\n${detail}\n` +
      `Teach tools/ide/web/docs-tab/src/mdx.mjs how to render them.`,
  );
}

writeFileSync(
  join(stageDir, 'docs-index.json'),
  JSON.stringify({ chordLanguageVersion: chordLanguageVersion(), nav: navTree, pages }),
);

await esbuild.build({
  entryPoints: [resolve(here, 'src/main.ts')],
  outfile: join(stageDir, 'docs.js'),
  // Pinned, and load-bearing: esbuild renders its per-module comment banners
  // RELATIVE to absWorkingDir, which defaults to process.cwd(). Xcode's pre-build
  // phase runs this from tools/ide while a hand run starts at the repo root, so
  // without this the same source emitted `web/docs-tab/src/main.ts` one way and
  // `tools/ide/web/docs-tab/src/main.ts` the other — dirtying the committed
  // bundle on every build, from nothing but the caller's cwd.
  absWorkingDir: repoRoot,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['safari16'],
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});

for (const asset of ['index.html', 'docs.css']) {
  writeFileSync(join(stageDir, asset), readFileSync(resolve(here, 'src', asset)));
}

// Images referenced by <Screenshot>. Copied whole rather than per-reference: the
// website owns which shots exist, and a per-reference copy would silently ship a
// page whose image 404s the moment a name is mistyped.
const imagesSrc = resolve(repoRoot, 'website/src/images');
let imageCount = 0;
if (existsSync(imagesSrc)) {
  cpSync(imagesSrc, join(stageDir, 'images'), { recursive: true });
  const countPngs = (dir) =>
    readdirSync(dir).reduce(
      (n, name) =>
        n + (statSync(join(dir, name)).isDirectory() ? countPngs(join(dir, name)) : name.endsWith('.png') ? 1 : 0),
      0,
    );
  imageCount = countPngs(imagesSrc);
}

// The swap. Nothing above this line has touched the shipped bundle, so any throw
// leaves the previous one intact and the app still builds against known-good docs.
rmSync(outDir, { recursive: true, force: true });
renameSync(stageDir, outDir);

console.log(
  `docs tab: ${pages.length} pages in nav order` +
    (excludedHrefs.size > 0 ? `, ${excludedHrefs.size} excluded by EXCLUDED_GROUPS` : '') +
    `, ${imageCount} images` +
    ` (Chord ${chordLanguageVersion()}) -> ${relative(repoRoot, outDir)}`,
);
