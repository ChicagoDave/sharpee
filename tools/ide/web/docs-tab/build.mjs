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

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { reduceMdx, parseGrammarBlocks } from './src/mdx.mjs';
import { renderMarkdown } from './src/markdown.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const appDir = resolve(repoRoot, 'website/src/app');
const outDir = resolve(repoRoot, 'tools/ide/SharpeeIDE/Resources/docs-tab');
const pagesDir = join(outDir, 'pages');

/** The documentation the IDE ships (Phase 2 decision). Not the whole site. */
const SECTIONS = ['chord', 'learn'];

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

// ── Build ────────────────────────────────────────────────────────────────────

const grammarBlocks = parseGrammarBlocks(
  readFileSync(resolve(appDir, 'chord/stdlib/reference/grammar-blocks.ts'), 'utf8'),
);

const files = SECTIONS.flatMap((section) => findContentFiles(join(appDir, section)));
if (files.length === 0) {
  throw new Error(`no content.mdx found under ${appDir} — is the website checked out?`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(pagesDir, { recursive: true });

const pages = [];
const unsupportedFound = new Map();

for (const mdxPath of files) {
  const raw = readFileSync(mdxPath, 'utf8');
  const href = hrefFor(mdxPath);
  const { markdown, unsupported } = reduceMdx(raw, { grammarBlocks });
  if (unsupported.length > 0) {
    unsupportedFound.set(href, unsupported);
  }
  const slug = href.replace(/^\//, '').replace(/\//g, '__');
  writeFileSync(join(pagesDir, `${slug}.html`), renderMarkdown(markdown));
  pages.push({
    href,
    slug,
    title: titleFor(mdxPath, raw),
    section: href.split('/').filter(Boolean)[0],
    crumb: href.split('/').filter(Boolean).slice(0, -1).map(humanize).join(' › '),
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
  join(outDir, 'docs-index.json'),
  JSON.stringify({ chordLanguageVersion: chordLanguageVersion(), pages }),
);

await esbuild.build({
  entryPoints: [resolve(here, 'src/main.ts')],
  outfile: join(outDir, 'docs.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['safari16'],
  sourcemap: false,
  minify: false,
  logLevel: 'info',
});

for (const asset of ['index.html', 'docs.css']) {
  writeFileSync(join(outDir, asset), readFileSync(resolve(here, 'src', asset)));
}

console.log(
  `docs tab: ${pages.length} pages (Chord ${chordLanguageVersion()}) -> ${relative(repoRoot, outDir)}`,
);
