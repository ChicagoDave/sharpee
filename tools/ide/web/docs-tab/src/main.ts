/**
 * main.ts — the Documentation tab's page script.
 *
 * Purpose: renders the bundled corpus — a navigation tree down the left, one
 *   page's HTML on the right, and a filter over titles and body text. Every
 *   asset is served from the app bundle over `sharpee-docs://`, so the tab
 *   works with no network at all, which is Phase 3's acceptance.
 *
 *   Swift's only jobs are transport: it tells the page which Chord version the
 *   running toolchain reports (so the page can say so when the bundle documents
 *   a different one), and it opens external links in the real browser, because
 *   a WKWebView with no chrome is a bad place to land on GitHub.
 *
 * Public interface (called by the host): setToolchainVersion(v), showPage(href).
 * Owner context: tools/ide — the Documentation tab's web bundle.
 */

interface DocPage {
  href: string;
  slug: string;
  title: string;
  section: string;
  crumb: string;
  text: string;
}

interface DocsIndex {
  chordLanguageVersion: string;
  pages: DocPage[];
}

declare global {
  interface Window {
    __sharpeeDocs: {
      setToolchainVersion(version: string): void;
      showPage(href: string): void;
    };
    webkit?: { messageHandlers?: Record<string, { postMessage(body: unknown): void }> };
  }
}

const host = (body: unknown) => window.webkit?.messageHandlers?.docsTab?.postMessage(body);

let index: DocsIndex = { chordLanguageVersion: '', pages: [] };
let current = '';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Group pages by their first two path segments: section, then area. */
function groups(pages: DocPage[]): Map<string, DocPage[]> {
  const map = new Map<string, DocPage[]>();
  for (const page of pages) {
    const segments = page.href.split('/').filter(Boolean);
    const key = segments.slice(0, Math.min(2, segments.length - 1)).join('/') || segments[0];
    const list = map.get(key);
    if (list) list.push(page);
    else map.set(key, [page]);
  }
  return map;
}

function humanize(segment: string): string {
  const s = segment.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderNav(pages: DocPage[]): void {
  const nav = el<HTMLElement>('nav');
  nav.textContent = '';
  if (pages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'nav-empty';
    empty.textContent = 'No pages match.';
    nav.appendChild(empty);
    return;
  }
  for (const [key, list] of groups(pages)) {
    const heading = document.createElement('p');
    heading.className = 'nav-group';
    heading.textContent = key.split('/').map(humanize).join(' › ');
    nav.appendChild(heading);
    for (const page of list) {
      const link = document.createElement('a');
      link.className = 'nav-link' + (page.href === current ? ' is-current' : '');
      link.textContent = page.title;
      link.dataset.href = page.href;
      link.href = page.href;
      nav.appendChild(link);
    }
  }
}

async function showPage(href: string): Promise<void> {
  const page = index.pages.find((p) => p.href === href);
  const content = el<HTMLElement>('content');
  if (!page) {
    content.innerHTML = `<p class="missing">This page is not in the bundled documentation.</p>`;
    return;
  }
  current = href;
  const response = await fetch(`pages/${page.slug}.html`);
  const html = await response.text();
  content.innerHTML =
    `<p class="crumb">${page.crumb}</p><h1 class="page-title">${page.title}</h1>` + html;
  content.scrollTop = 0;
  renderNav(filtered());
  host({ type: 'shown', href });
}

function filtered(): DocPage[] {
  const query = el<HTMLInputElement>('search').value.trim().toLowerCase();
  if (query === '') return index.pages;
  return index.pages.filter(
    (p) => p.title.toLowerCase().includes(query) || p.text.toLowerCase().includes(query),
  );
}

/**
 * One delegated click handler for the whole page: nav links and in-page links
 * both navigate inside the tab, and anything external goes to the real browser
 * through the host.
 */
function handleClick(event: MouseEvent): void {
  const anchor = (event.target as HTMLElement | null)?.closest('a');
  if (!anchor) return;
  const href = anchor.getAttribute('href') ?? '';
  if (href.startsWith('#')) return; // an in-page anchor — let the browser do it
  event.preventDefault();
  if (/^https?:/.test(href)) {
    host({ type: 'openExternal', url: href });
    return;
  }
  void showPage(href.split('#')[0]);
}

function setToolchainVersion(version: string): void {
  const banner = el<HTMLElement>('version-banner');
  const bundled = index.chordLanguageVersion;
  if (version === '' || bundled === '' || version === bundled) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.textContent =
    `These pages document Chord ${bundled}, but the toolchain in use reports ` +
    `Chord ${version}. Where they disagree, the compiler is right.`;
}

async function boot(): Promise<void> {
  index = (await (await fetch('docs-index.json')).json()) as DocsIndex;
  el<HTMLElement>('version').textContent = `Chord ${index.chordLanguageVersion}`;
  el<HTMLInputElement>('search').addEventListener('input', () => renderNav(filtered()));
  document.addEventListener('click', handleClick);

  window.__sharpeeDocs = { setToolchainVersion, showPage: (href) => void showPage(href) };

  const first = index.pages.find((p) => p.href === '/chord/getting-started/first-story');
  await showPage(first ? first.href : (index.pages[0]?.href ?? ''));
  host({ type: 'ready' });
}

void boot();
