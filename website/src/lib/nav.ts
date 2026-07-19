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
      {
        title: 'Author guide',
        open: true,
        items: [
          { title: 'Reading a .story file', href: '/chord/guide/reading' },
          { title: 'Building your world', href: '/chord/guide/world' },
          { title: 'Giving things behavior', href: '/chord/guide/behavior' },
          { title: 'Branching & progression', href: '/chord/guide/flow' },
          { title: 'Vocabulary & text', href: '/chord/guide/vocabulary' },
          { title: 'Tooling', href: '/chord/guide/tooling' },
        ],
      },
      {
        title: 'Phrasebook',
        open: false,
        items: [
          { title: 'Overview', href: '/chord/phrasebook' },
          { title: 'Manipulation', href: '/chord/phrasebook/manipulation' },
          { title: 'Movement', href: '/chord/phrasebook/movement' },
          { title: 'Containers & locks', href: '/chord/phrasebook/containers-and-locks' },
          { title: 'Wearing', href: '/chord/phrasebook/wearing' },
          { title: 'Senses', href: '/chord/phrasebook/senses' },
          { title: 'Devices & tools', href: '/chord/phrasebook/devices-and-tools' },
          { title: 'Social', href: '/chord/phrasebook/social' },
          { title: 'Meta', href: '/chord/phrasebook/meta' },
        ],
      },
      {
        title: 'Reference',
        open: true,
        items: [{ title: 'Grammar reference', href: '/chord/reference/grammar' }],
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
    groups: [
      {
        title: 'Fernhill tutorial',
        open: true,
        items: [
          { title: 'Overview', href: '/learn/fernhill' },
          { title: 'The world', href: '/learn/fernhill/world' },
          { title: 'Things', href: '/learn/fernhill/things' },
          { title: 'People', href: '/learn/fernhill/people' },
          { title: 'The long night', href: '/learn/fernhill/time' },
          { title: 'State & verbs', href: '/learn/fernhill/state' },
          { title: 'Endings & text', href: '/learn/fernhill/endings' },
          { title: 'The browser', href: '/learn/fernhill/browser' },
        ],
      },
    ],
    items: [{ title: 'Play', href: '/play' }],
  },
];

/**
 * Prev/next links for a path, derived from the nav model. Reading order is
 * flattened WITHIN a section only — the pager never jumps a section
 * boundary (Chord → Sharpee crosses audiences, not chapters). A generic
 * "Overview" item is labeled with its group's title so the pager link
 * says where it goes.
 */
export function pagerFor(pathname: string): { prev?: NavItem; next?: NavItem } {
  for (const section of NAV) {
    const flat = section.groups.flatMap((g) =>
      g.items.map((item) => (item.title === 'Overview' ? { ...item, title: g.title } : item)),
    );
    flat.push(...(section.items ?? []));
    const i = flat.findIndex((item) => item.href === pathname);
    if (i !== -1) return { prev: flat[i - 1], next: flat[i + 1] };
  }
  return {};
}

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
