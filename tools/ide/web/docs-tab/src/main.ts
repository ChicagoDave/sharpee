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
  /** The page's own heading, from its `<DocPage title>`. */
  title: string;
  /** The rail label, from nav.ts. Often "Overview", which is why it is not the title. */
  navTitle: string;
  section: string;
  crumb: string;
  text: string;
}

interface NavItem {
  href: string;
  title: string;
  children?: NavItem[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavSection {
  title: string;
  version?: string;
  groups: NavGroup[];
}

interface DocsIndex {
  chordLanguageVersion: string;
  /** The website's own navigation, filtered to what this app ships (GH #238). */
  nav: NavSection[];
  pages: DocPage[];
}

/** A page's place in the reading order, used by the pager. */
interface Step {
  href: string;
  /** The pager's label. A generic "Overview" is shown as its group's title. */
  label: string;
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

let index: DocsIndex = { chordLanguageVersion: '', nav: [], pages: [] };
let current = '';

/** Reading order per section, built once from the bundled nav. */
let stepsBySection = new Map<string, Step[]>();

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/**
 * Flattens the nav into a reading order, one sequence PER SECTION.
 *
 * Per-section on purpose: the pager must never walk off the end of Chord into
 * the Tutorial, which is a change of audience rather than the next chapter.
 * This mirrors `pagerFor` in the website's own nav.ts, including its rule that
 * a generic "Overview" is labeled with its group's title, so a pager link says
 * where it goes instead of saying "Overview".
 */
function buildSteps(nav: NavSection[]): Map<string, Step[]> {
  const map = new Map<string, Step[]>();
  for (const section of nav) {
    const steps: Step[] = [];
    for (const group of section.groups) {
      for (const item of group.items) {
        steps.push({ href: item.href, label: item.title === 'Overview' ? group.title : item.title });
        for (const child of item.children ?? []) {
          steps.push({ href: child.href, label: child.title });
        }
      }
    }
    map.set(section.title, steps);
  }
  return map;
}

function navLink(href: string, label: string, className: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = className + (href === current ? ' is-current' : '');
  link.textContent = label;
  link.dataset.href = href;
  link.href = href;
  return link;
}

/**
 * The rail, as the website builds it: sections, groups within a section, items
 * within a group, and an item's children only while the reader is on that
 * branch — the last part is nav.ts's own documented rule for `children`, and
 * without it the Cookbook alone would unroll every recipe at all times.
 */
function renderNavTree(): void {
  const nav = el<HTMLElement>('nav');
  nav.textContent = '';
  for (const section of index.nav) {
    const heading = document.createElement('p');
    heading.className = 'nav-section';
    heading.textContent = section.title;
    if (section.version) {
      const version = document.createElement('span');
      version.className = 'nav-version';
      version.textContent = section.version;
      heading.appendChild(version);
    }
    nav.appendChild(heading);

    for (const group of section.groups) {
      const groupHeading = document.createElement('p');
      groupHeading.className = 'nav-group';
      groupHeading.textContent = group.title;
      nav.appendChild(groupHeading);

      for (const item of group.items) {
        nav.appendChild(navLink(item.href, item.title, 'nav-link'));
        const children = item.children ?? [];
        const onBranch = current === item.href || children.some((c) => c.href === current);
        if (!onBranch) continue;
        for (const child of children) {
          nav.appendChild(navLink(child.href, child.title, 'nav-link nav-child'));
        }
      }
    }
  }
}

/**
 * Search results, deliberately flat. Filtering is a view ACROSS the structure,
 * not a reordering of it, so matches are listed rather than folded back into a
 * hierarchy most of whose branches have nothing in them.
 */
function renderNavMatches(pages: DocPage[]): void {
  const nav = el<HTMLElement>('nav');
  nav.textContent = '';
  if (pages.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'nav-empty';
    empty.textContent = 'No pages match.';
    nav.appendChild(empty);
    return;
  }
  let section = '';
  for (const page of pages) {
    if (page.section !== section) {
      section = page.section;
      const heading = document.createElement('p');
      heading.className = 'nav-section';
      heading.textContent = section;
      nav.appendChild(heading);
    }
    nav.appendChild(navLink(page.href, page.navTitle, 'nav-link'));
  }
}

/** The rail shows the site's structure when browsing, matches when searching. */
function renderNav(): void {
  const query = el<HTMLInputElement>('search').value.trim();
  if (query === '') renderNavTree();
  else renderNavMatches(filtered());
}

/** Prev/next within the current page's section. Absent at either end. */
function renderPager(page: DocPage): void {
  const steps = stepsBySection.get(page.section) ?? [];
  const at = steps.findIndex((s) => s.href === page.href);
  if (at === -1) return;

  const pager = document.createElement('nav');
  pager.className = 'pager';
  const prev = steps[at - 1];
  const next = steps[at + 1];

  if (prev) {
    const link = navLink(prev.href, prev.label, 'pager-link pager-prev');
    link.dataset.rel = 'prev';
    pager.appendChild(link);
  }
  if (next) {
    const link = navLink(next.href, next.label, 'pager-link pager-next');
    link.dataset.rel = 'next';
    pager.appendChild(link);
  }
  if (pager.childElementCount > 0) el<HTMLElement>('content').appendChild(pager);
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
  // The crumb needs no change here: it is nav-derived at build time now.
  content.innerHTML =
    `<p class="crumb">${page.crumb}</p><h1 class="page-title">${page.title}</h1>` + html;
  renderPager(page);
  content.scrollTop = 0;
  renderNav();
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
  stepsBySection = buildSteps(index.nav);
  el<HTMLElement>('version').textContent = `Chord ${index.chordLanguageVersion}`;
  el<HTMLInputElement>('search').addEventListener('input', () => renderNav());
  document.addEventListener('click', handleClick);

  window.__sharpeeDocs = { setToolchainVersion, showPage: (href) => void showPage(href) };

  // The nav's own first page, rather than a hardcoded one. The tab used to open
  // on `/chord/getting-started/first-story`, which is no longer bundled at all:
  // Chord's command-line Getting Started group is excluded in favour of the
  // Chord Writer section (GH #238). Following the nav means this cannot go
  // stale again the next time the first page changes.
  await showPage(index.pages[0]?.href ?? '');
  host({ type: 'ready' });
}

void boot();
