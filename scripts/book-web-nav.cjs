/*
 * book-web-nav.cjs — post-process the pandoc chunkedhtml output (docs/book/web/)
 * to add a persistent left sidebar (collapsible volumes → chapters) and a bottom
 * Prev/Next bar to every page. Driven by web/sitemap.json (the full structure
 * pandoc emits). Invoked by `scripts/build-book.sh web` after pandoc runs.
 *
 * pandoc's chunkedhtml only ships a minimal top "Up/Next/Prev" line (#sitenav);
 * this gives the parked web build real book navigation.
 */
const fs = require('fs');
const path = require('path');

const WEB = path.join(__dirname, '..', 'docs', 'book', 'web');
const sm = JSON.parse(fs.readFileSync(path.join(WEB, 'sitemap.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fileOf = (p) => p.split('#')[0];

// Level-1 sections in reading order (volumes, chapters, appendices, front matter).
const L1 = sm.subsections.map((s) => s.section);

// Reading order of unique page files (for Prev/Next), index first.
const pageOrder = ['index.html'];
for (const s of L1) {
  const f = fileOf(s.path);
  if (!pageOrder.includes(f)) pageOrder.push(f);
}

// Title lookup per page file.
const titleByPage = { 'index.html': 'Contents' };
for (const s of L1) {
  const f = fileOf(s.path);
  if (!titleByPage[f]) titleByPage[f] = s.title;
}

// Group level-1 entries: front matter (before any volume), volumes (each with the
// chapters that follow it), and appendices/back matter (level-1 entries after the
// last volume whose title is "Appendix …" or "Illustration Credits").
const frontList = [];
const groups = [];
let curVol = null;
let appendixGroup = null;
for (const s of L1) {
  const title = s.title;
  const page = fileOf(s.path);
  const isVol = /^Volume\b/.test(title);
  const isApp = /^Appendix\b/.test(title) || /Illustration Credits/.test(title);
  if (isVol) {
    curVol = { label: title, page, children: [] };
    groups.push(curVol);
    appendixGroup = null;
  } else if (isApp) {
    if (!appendixGroup) {
      appendixGroup = { label: 'Appendices', page: null, children: [] };
      groups.push(appendixGroup);
    }
    appendixGroup.children.push({ title, page });
  } else if (groups.length === 0) {
    frontList.push({ title, page });
  } else if (curVol) {
    curVol.children.push({ title, page });
  }
}

function li(item, current) {
  const active = item.page === current ? ' class="active"' : '';
  return `<li${active}><a href="${item.page}">${esc(item.title)}</a></li>`;
}

function sidebar(current) {
  let h = '<nav id="book-nav"><a class="book-nav-home" href="index.html">The Sharpee Book</a>';
  if (frontList.length) {
    h += '<ul class="book-nav-front">' + frontList.map((c) => li(c, current)).join('') + '</ul>';
  }
  for (const g of groups) {
    const here = g.page === current || g.children.some((c) => c.page === current);
    h += `<details${here ? ' open' : ''}>`;
    // Plain summary = pure expand/collapse toggle. (Wrapping it in an <a> would
    // navigate away on click instead of revealing the chapters — so from the
    // index, where every volume starts collapsed, you could never reach them.)
    h += `<summary>${esc(g.label)}</summary>`;
    let items = g.children;
    // Keep the volume divider page reachable from the sidebar as its first item.
    if (g.page) items = [{ title: g.label, page: g.page }, ...g.children];
    h += '<ul>' + items.map((c) => li(c, current)).join('') + '</ul></details>';
  }
  h += '</nav>';
  return h;
}

function bottomBar(current) {
  const i = pageOrder.indexOf(current);
  const prev = i > 0 ? pageOrder[i - 1] : null;
  const next = i >= 0 && i < pageOrder.length - 1 ? pageOrder[i + 1] : null;
  let h = '<nav class="book-nav-bottom">';
  h += prev ? `<a class="prev" href="${prev}">← ${esc(titleByPage[prev])}</a>` : '<span></span>';
  h += next ? `<a class="next" href="${next}">${esc(titleByPage[next])} →</a>` : '<span></span>';
  h += '</nav>';
  return h;
}

const CSS = `
<style id="book-nav-css">
  #sitenav { display: none; }
  body { margin: 0 0 0 20em !important; max-width: none !important; padding: 1.5rem 2rem 3rem !important; }
  #book-nav { position: fixed; top: 0; left: 0; width: 20em; height: 100vh; overflow-y: auto;
    box-sizing: border-box; padding: 1rem 1.1rem; background: #f4f1e8;
    border-right: 1px solid #d8d2c2; font-size: 0.86rem; line-height: 1.4; }
  #book-nav a { text-decoration: none; color: #3a352c; }
  #book-nav a:hover { text-decoration: underline; }
  #book-nav .book-nav-home { display: block; font-weight: 700; font-size: 1rem;
    margin-bottom: .8rem; color: #1c1a15; }
  #book-nav ul { list-style: none; margin: .2rem 0 .5rem .6rem; padding: 0; }
  #book-nav li { margin: .18rem 0; }
  #book-nav li.active > a { font-weight: 700; color: #000; }
  #book-nav details { margin: .25rem 0; }
  #book-nav summary { cursor: pointer; font-weight: 600; color: #1c1a15; }
  #book-nav summary a { color: inherit; }
  .book-nav-bottom { display: flex; justify-content: space-between; gap: 1rem;
    margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #d8d2c2; }
  .book-nav-bottom .next { margin-left: auto; text-align: right; }
  @media (max-width: 820px) {
    body { margin-left: 0 !important; }
    #book-nav { position: static; width: auto; height: auto;
      border-right: none; border-bottom: 1px solid #d8d2c2; }
  }
</style>`;

let count = 0;
for (const file of fs.readdirSync(WEB)) {
  if (!file.endsWith('.html')) continue;
  const fp = path.join(WEB, file);
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes('id="book-nav"')) continue; // idempotent
  html = html.replace('</head>', `${CSS}\n</head>`);
  html = html.replace(/<body([^>]*)>/, `<body$1>\n${sidebar(file)}`);
  html = html.replace('</body>', `${bottomBar(file)}\n</body>`);
  fs.writeFileSync(fp, html);
  count++;
}
console.log(`book-web-nav: injected sidebar + prev/next into ${count} pages`);
