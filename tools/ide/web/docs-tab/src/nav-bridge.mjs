/**
 * nav-bridge.mjs — turns sharpee.net's navigation model into the Documentation
 * tab's shipped page list and rail tree.
 *
 * Purpose: the website's `src/lib/nav.ts` is the one place the site's hierarchy
 *   lives — its own header says so, and its rail, breadcrumbs and pager all
 *   derive from it. This module applies Chord Writer's two filters to that
 *   model (which sections ship, which groups are superseded) and returns both
 *   the ordered leaf list the bundler emits and the nested tree the tab renders.
 *
 *   Pure and NAV-shaped on purpose: it never touches the filesystem, so the
 *   build owns the question of whether a nav leaf has a page behind it. That
 *   split is what lets this be unit-tested against small fixture trees while
 *   the real corpus is checked by the build itself.
 *
 * What is deliberately NOT taken from NAV: a page's title. NAV's item titles
 *   are RAIL LABELS — `/chord/guide/world` is "Overview" under the group "The
 *   World", while the page's own heading is "Building your world". The bundler
 *   keeps reading the page title from its `<DocPage title="…">` exactly as the
 *   website's search index does, and `navTitle` here is offered alongside it
 *   for the rail, never as a replacement.
 *
 * Public interface: shippedNav(NAV, { sections, excludedGroups, excludedPages }).
 * Owner context: tools/ide — the Documentation tab's web bundle.
 */

/**
 * Filters the site's navigation to what Chord Writer ships.
 *
 * @param {Array} nav The website's `NAV` export.
 * @param {{sections: string[], excludedGroups: Array<{section: string, group: string}>, excludedPages: string[]}} options
 *   `sections` lists section titles to ship, in the order they should appear.
 *   `excludedGroups` names groups to drop from a shipped section.
 *   `excludedPages` names individual page hrefs to drop, for the case a group
 *   is otherwise wanted whole. Dropping an item drops its children with it.
 * @returns {{pages: Array<{href: string, navTitle: string, section: string, crumb: string}>, tree: Array}}
 *   `pages` in NAV traversal order; `tree` as nested sections → groups → items.
 * @throws If a named section, excluded group, or excluded page is not present
 *   in `nav` — a filter that matches nothing is a silent behavior change, not a
 *   no-op.
 */
export function shippedNav(nav, { sections, excludedGroups = [], excludedPages = [] }) {
  const bySectionTitle = new Map(nav.map((section) => [section.title, section]));

  for (const title of sections) {
    if (!bySectionTitle.has(title)) {
      throw new Error(`shippedNav: no section titled "${title}" in nav.ts`);
    }
  }
  for (const { section, group } of excludedGroups) {
    const found = bySectionTitle.get(section);
    if (!found) {
      throw new Error(`shippedNav: excluded group "${section} › ${group}" names no such section`);
    }
    if (!found.groups.some((g) => g.title === group)) {
      throw new Error(`shippedNav: section "${section}" has no group "${group}" to exclude`);
    }
  }

  // Same discipline as the section and group checks above: an href that matches
  // nothing means the page moved or was renamed, and the exclusion silently
  // stopped applying. That must fail the build, not shrug.
  const everyHref = new Set(
    nav.flatMap((section) =>
      (section.groups ?? []).flatMap((group) =>
        (group.items ?? []).flatMap((item) => [item.href, ...(item.children ?? []).map((c) => c.href)]),
      ),
    ),
  );
  for (const href of excludedPages) {
    if (!everyHref.has(href)) {
      throw new Error(`shippedNav: excluded page "${href}" is in no nav group`);
    }
  }

  const isExcluded = (sectionTitle, groupTitle) =>
    excludedGroups.some((e) => e.section === sectionTitle && e.group === groupTitle);
  const isExcludedPage = (href) => excludedPages.includes(href);

  const pages = [];
  const tree = [];

  for (const title of sections) {
    const section = bySectionTitle.get(title);
    const groups = [];

    // Only `section.groups` is walked, never `section.items`. A section's own
    // top-level items are site destinations rather than documentation: on
    // sharpee.net that field holds `/play` and `/playground`, interactive app
    // routes with no `content.mdx` behind them. Walking groups only keeps them
    // out structurally, with no href blocklist to maintain as the site grows.
    for (const group of section.groups ?? []) {
      if (isExcluded(section.title, group.title)) continue;

      const items = [];
      for (const item of group.items ?? []) {
        if (isExcludedPage(item.href)) continue;
        // The crumb is the trail ABOVE the page, not including it: the tab
        // renders the crumb and the page's own title together, and a trail
        // ending in the title the reader is already looking at reads as a
        // stutter. This is the same shape build.mjs emitted from path
        // segments, so the tab's existing crumb rendering needs no change.
        pages.push({
          href: item.href,
          navTitle: item.title,
          section: section.title,
          crumb: `${section.title} › ${group.title}`,
        });

        const children = [];
        for (const child of item.children ?? []) {
          if (isExcludedPage(child.href)) continue;
          pages.push({
            href: child.href,
            navTitle: child.title,
            section: section.title,
            crumb: `${section.title} › ${group.title} › ${item.title}`,
          });
          children.push({ href: child.href, title: child.title });
        }

        const node = { href: item.href, title: item.title };
        if (children.length > 0) node.children = children;
        items.push(node);
      }

      groups.push({ title: group.title, items });
    }

    tree.push({ title: section.title, version: section.version, groups });
  }

  return { pages, tree };
}
