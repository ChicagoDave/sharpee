/**
 * nav.ts — the site's one navigation model (WF-B: left rail, hierarchical).
 *
 * Sections group expandable clusters of pages; the rail, breadcrumbs, and
 * pagers all derive from this structure so hierarchy lives in exactly one
 * place. Owner: website (not the platform workspace).
 */

export interface NavItem {
  title: string;
  href: string;
}

export interface NavGroup {
  title: string;
  /** Open by default in the rail. */
  open?: boolean;
  items: NavItem[];
}

export interface NavSection {
  title: string;
  groups: NavGroup[];
  /** Ungrouped items rendered directly under the section label. */
  items?: NavItem[];
}

export const NAV: NavSection[] = [
  {
    title: 'Chord',
    groups: [
      {
        title: 'Getting started',
        open: true,
        items: [
          { title: 'Install', href: '/chord/getting-started/install' },
          { title: 'Your first story', href: '/chord/getting-started/first-story' },
          { title: 'Compose & run', href: '/chord/getting-started/compose-and-run' },
        ],
      },
      {
        title: 'Language',
        open: true,
        items: [
          { title: 'People & pronouns', href: '/chord/language/people' },
          { title: 'Doors & regions', href: '/chord/language/doors-and-regions' },
          { title: 'Topics', href: '/chord/language/topics' },
        ],
      },
    ],
  },
  {
    title: 'Sharpee',
    groups: [
      { title: 'Platform', items: [{ title: 'Overview', href: '/sharpee/platform' }] },
      { title: 'Actions & traits', items: [{ title: 'Overview', href: '/sharpee/actions-and-traits' }] },
    ],
  },
  {
    title: 'Learn',
    groups: [],
    items: [
      { title: 'Fernhill tutorial', href: '/learn/fernhill' },
      { title: 'Play', href: '/play' },
    ],
  },
];

/** Breadcrumb trail for a path, derived from the nav model. */
export function crumbsFor(pathname: string): string[] {
  for (const section of NAV) {
    for (const group of section.groups) {
      const hit = group.items.find((i) => i.href === pathname);
      if (hit) return [section.title, group.title, hit.title];
    }
    const hit = section.items?.find((i) => i.href === pathname);
    if (hit) return [section.title, hit.title];
  }
  return [];
}
