/**
 * build-search-index.mjs — generate public/search-index.json for docs search.
 *
 * Walks every src/app/**\/content.mdx, derives the route href from the folder
 * path, the title from the sibling page.tsx <DocPage title="…"> (falling back
 * to the first markdown heading), a breadcrumb from the parent path segments,
 * and a plain-text body with MDX/markdown syntax stripped. Emits one JSON
 * array the client search component (Fuse.js) loads at runtime.
 *
 * Owner: website (not the platform workspace). Run via the `prebuild` npm
 * script; regenerate manually with `node scripts/build-search-index.mjs`.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';

const ROOT = process.cwd();
const APP_DIR = join(ROOT, 'src', 'app');
const OUT = join(ROOT, 'public', 'search-index.json');

const BODY_CAP = 2000; // chars of stripped body kept per page — enough to match, small enough to ship
const EXCERPT_CAP = 160;

/** Recursively collect every content.mdx path under src/app. */
function findContentFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) findContentFiles(full, acc);
    else if (name === 'content.mdx') acc.push(full);
  }
  return acc;
}

/** src/app/chord/getting-started/install/content.mdx -> /chord/getting-started/install */
function hrefFor(mdxPath) {
  const rel = relative(APP_DIR, dirname(mdxPath));
  return '/' + rel.split(sep).join('/');
}

/** Title-case a path segment: "getting-started" -> "Getting started". */
function humanize(segment) {
  const s = segment.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Breadcrumb from the parent segments: /chord/stdlib/senses/x -> "Chord › Stdlib › Senses". */
function crumbFor(href) {
  const segs = href.split('/').filter(Boolean);
  segs.pop(); // drop the leaf — that's the title
  return segs.map(humanize).join(' › ');
}

/** Pull the DocPage title from the sibling page.tsx, if present. */
function titleFromPage(mdxPath) {
  const pagePath = join(dirname(mdxPath), 'page.tsx');
  if (!existsSync(pagePath)) return null;
  const src = readFileSync(pagePath, 'utf8');
  const m = src.match(/<DocPage[^>]*\btitle=(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\}|\{"([^"]+)"\})/);
  return m ? (m[1] ?? m[2] ?? m[3] ?? m[4]) : null;
}

/** Strip MDX/markdown syntax down to searchable plain text. */
function plainText(mdx) {
  return mdx
    .replace(/^---\n[\s\S]*?\n---\n/, '')        // frontmatter
    .replace(/^\s*import .*$/gm, '')              // import lines
    .replace(/^\s*export .*$/gm, '')              // export lines
    .replace(/```[\s\S]*?```/g, ' ')              // fenced code blocks
    .replace(/`([^`]+)`/g, '$1')                  // inline code -> text
    .replace(/<[^>]+>/g, ' ')                     // JSX/HTML tags
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')    // links/images -> label
    .replace(/^#{1,6}\s+/gm, '')                  // heading markers
    .replace(/^[-*+]\s+/gm, '')                   // list bullets
    .replace(/[*_>#|]/g, ' ')                     // stray markdown punctuation
    .replace(/\s+/g, ' ')                         // collapse whitespace
    .trim();
}

/** First markdown heading text, used when page.tsx has no title. */
function firstHeading(mdx) {
  const m = mdx.match(/^#{1,6}\s+(.+)$/m);
  return m ? m[1].replace(/[*_`]/g, '').trim() : null;
}

const files = findContentFiles(APP_DIR).sort();
const index = files.map((mdxPath) => {
  const raw = readFileSync(mdxPath, 'utf8');
  const href = hrefFor(mdxPath);
  const leaf = href.split('/').filter(Boolean).pop() ?? '';
  const title = titleFromPage(mdxPath) ?? firstHeading(raw) ?? humanize(leaf);
  const text = plainText(raw);
  return {
    href,
    title,
    crumb: crumbFor(href),
    excerpt: text.slice(0, EXCERPT_CAP),
    text: text.slice(0, BODY_CAP),
  };
});

writeFileSync(OUT, JSON.stringify(index));
console.log(`search-index: ${index.length} pages -> ${relative(ROOT, OUT)} (${(JSON.stringify(index).length / 1024).toFixed(0)} KB)`);
