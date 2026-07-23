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
  /** Sub-pages rendered indented under the item; shown only while the reader is on this branch. */
  children?: NavItem[];
}

export interface NavGroup {
  title: string;
  /** Legacy default-open flag — the rail now opens exactly the group the reader is in (accordion). */
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
        title: 'Getting Started',
        open: true,
        items: [
          { title: 'Install', href: '/chord/getting-started/install' },
          { title: 'Your first story', href: '/chord/getting-started/first-story' },
          { title: 'Compose & run', href: '/chord/getting-started/compose-and-run' },
        ],
      },
      {
        title: 'The World',
        items: [
          { title: 'Overview', href: '/chord/guide/world' },
          { title: 'The story header', href: '/chord/guide/world/the-story-header' },
          { title: 'Creating things', href: '/chord/guide/world/creating-things' },
          { title: 'Kinds, traits, and settings', href: '/chord/guide/world/kinds-traits-and-settings' },
          { title: 'Placing and wearing', href: '/chord/guide/world/placing-and-wearing' },
          { title: 'Exits and blocked exits', href: '/chord/guide/world/exits-and-blocked-exits' },
          { title: 'Prose, paragraphs, and markers', href: '/chord/guide/world/prose-paragraphs-and-markers' },
          { title: 'States', href: '/chord/guide/world/states' },
          { title: 'Scores live on owners', href: '/chord/guide/world/scores-live-on-owners' },
          { title: 'The first-visit description', href: '/chord/guide/world/the-first-visit-description' },
          { title: 'Per-entity phrase overrides', href: '/chord/guide/world/per-entity-phrase-overrides' },
          { title: 'Starting state', href: '/chord/guide/world/starting-state' },
          { title: 'Doors', href: '/chord/guide/world/doors' },
          { title: 'Regions', href: '/chord/guide/world/regions' },
          { title: 'People', href: '/chord/guide/world/people' },
        ],
      },
      {
        title: 'Behavior',
        items: [
          { title: 'Overview', href: '/chord/guide/behavior' },
          { title: 'on and after', href: '/chord/guide/behavior/on-and-after' },
          { title: 'What a clause can bind', href: '/chord/guide/behavior/what-a-clause-can-bind' },
          { title: 'while, once, before, after', href: '/chord/guide/behavior/while-once-before-after' },
          { title: 'Conditions', href: '/chord/guide/behavior/conditions' },
          { title: 'Requirements', href: '/chord/guide/behavior/requirements' },
          { title: 'Refusals', href: '/chord/guide/behavior/refusals' },
          { title: 'The statements', href: '/chord/guide/behavior/the-statements' },
          { title: 'The when suffix', href: '/chord/guide/behavior/the-when-suffix' },
          { title: 'Topic tables', href: '/chord/guide/behavior/topic-tables' },
        ],
      },
      {
        title: 'Flow & Progression',
        items: [
          { title: 'Overview', href: '/chord/guide/flow' },
          { title: 'select on a value', href: '/chord/guide/flow/select-on-a-value' },
          { title: 'select with a strategy', href: '/chord/guide/flow/select-with-a-strategy' },
          { title: 'Ordinal blocks', href: '/chord/guide/flow/ordinal-blocks' },
          { title: 'each blocks', href: '/chord/guide/flow/each-blocks' },
          { title: 'Scoring', href: '/chord/guide/flow/scoring' },
          { title: 'Endings', href: '/chord/guide/flow/endings' },
          { title: 'Death', href: '/chord/guide/flow/death' },
          { title: 'Sequences', href: '/chord/guide/flow/sequences' },
        ],
      },
      {
        title: 'Vocabulary & Text',
        items: [
          { title: 'Overview', href: '/chord/guide/vocabulary' },
          { title: 'define condition', href: '/chord/guide/vocabulary/define-condition' },
          { title: 'define phrase', href: '/chord/guide/vocabulary/define-phrase' },
          { title: 'define phrases', href: '/chord/guide/vocabulary/define-phrases' },
          { title: 'define verb', href: '/chord/guide/vocabulary/define-verb' },
          { title: 'define text', href: '/chord/guide/vocabulary/define-text' },
          { title: 'define action hatches', href: '/chord/guide/vocabulary/define-action-hatches' },
          { title: 'define trait', href: '/chord/guide/vocabulary/define-trait' },
          { title: 'define action', href: '/chord/guide/vocabulary/define-action' },
          { title: 'define pronouns', href: '/chord/guide/vocabulary/define-pronouns' },
          { title: 'use', href: '/chord/guide/vocabulary/use' },
          { title: 'define phrasebook', href: '/chord/guide/vocabulary/define-phrasebook' },
          { title: '## comments', href: '/chord/guide/vocabulary/comments' },
        ],
      },
      {
        title: 'Project & Files',
        items: [
          { title: 'Reading a .story file', href: '/chord/guide/reading' },
          { title: 'Multi-file stories', href: '/chord/guide/project/multi-file-stories' },
          {
            title: 'Tooling',
            href: '/chord/guide/tooling',
            children: [
              { title: 'sharpee compose', href: '/chord/guide/tooling/sharpee-compose' },
              { title: 'Reading diagnostics', href: '/chord/guide/tooling/reading-diagnostics' },
              { title: 'Migrating from removed constructs', href: '/chord/guide/tooling/migrating-from-removed-constructs' },
            ],
          },
        ],
      },
      {
        title: 'Cookbook',
        open: false,
        items: [
          { title: 'Overview', href: '/chord/cookbook' },
          {
            title: 'Manipulation',
            href: '/chord/cookbook/manipulation',
            children: [
              { title: 'taking and dropping', href: '/chord/cookbook/manipulation/taking-and-dropping' },
              { title: 'putting and inserting', href: '/chord/cookbook/manipulation/putting-and-inserting' },
            ],
          },
          { title: 'Movement', href: '/chord/cookbook/movement' },
          {
            title: 'Containers & Locks',
            href: '/chord/cookbook/containers-and-locks',
            children: [
              { title: 'opening with a tool', href: '/chord/cookbook/containers-and-locks/opening-with-a-tool-in-the-command' },
              { title: 'locking and unlocking', href: '/chord/cookbook/containers-and-locks/locking-and-unlocking-with-a-key' },
            ],
          },
          { title: 'Wearing', href: '/chord/cookbook/wearing' },
          {
            title: 'Senses',
            href: '/chord/cookbook/senses',
            children: [
              { title: 'examining and searching', href: '/chord/cookbook/senses/examining-and-searching' },
              { title: 'listening and smelling', href: '/chord/cookbook/senses/listening-and-smelling' },
            ],
          },
          {
            title: 'Devices & Tools',
            href: '/chord/cookbook/devices-and-tools',
            children: [
              { title: 'switching on and off', href: '/chord/cookbook/devices-and-tools/switching-on-and-off' },
              { title: 'cutting', href: '/chord/cookbook/devices-and-tools/cutting' },
              { title: 'digging', href: '/chord/cookbook/devices-and-tools/digging' },
              { title: 'turning', href: '/chord/cookbook/devices-and-tools/turning' },
            ],
          },
          {
            title: 'Social',
            href: '/chord/cookbook/social',
            children: [
              { title: 'giving and showing', href: '/chord/cookbook/social/giving-and-showing' },
              { title: 'asking and telling', href: '/chord/cookbook/social/asking-and-telling' },
              { title: 'attacking', href: '/chord/cookbook/social/attacking' },
              { title: 'throwing', href: '/chord/cookbook/social/throwing' },
            ],
          },
          { title: 'Meta', href: '/chord/cookbook/meta' },
        ],
      },
      {
        title: 'Standard Library',
        open: false,
        items: [
          { title: 'Overview', href: '/chord/stdlib' },
          {
            title: 'Manipulation',
            href: '/chord/stdlib/manipulation',
            children: [
              { title: 'taking and dropping', href: '/chord/stdlib/manipulation/taking-and-dropping' },
              { title: 'putting and inserting', href: '/chord/stdlib/manipulation/putting-and-inserting' },
              { title: 'removing (taking from)', href: '/chord/stdlib/manipulation/removing' },
              { title: 'giving and showing', href: '/chord/stdlib/manipulation/giving-and-showing' },
              { title: 'throwing', href: '/chord/stdlib/manipulation/throwing' },
              { title: 'pushing, pulling, touching', href: '/chord/stdlib/manipulation/pushing-pulling-touching' },
              { title: 'lowering and raising', href: '/chord/stdlib/manipulation/lowering-and-raising' },
              { title: 'cutting and digging', href: '/chord/stdlib/manipulation/cutting-and-digging' },
              { title: 'Manipulation traits', href: '/chord/stdlib/manipulation/traits' },
            ],
          },
          {
            title: 'Movement',
            href: '/chord/stdlib/movement',
            children: [
              { title: 'going', href: '/chord/stdlib/movement/going' },
              { title: 'entering and exiting', href: '/chord/stdlib/movement/entering-and-exiting' },
              { title: 'climbing', href: '/chord/stdlib/movement/climbing' },
              { title: 'Movement traits', href: '/chord/stdlib/movement/traits' },
            ],
          },
          {
            title: 'Containers & Openables',
            href: '/chord/stdlib/containers',
            children: [
              { title: 'opening and closing', href: '/chord/stdlib/containers/opening-and-closing' },
              { title: 'locking and unlocking', href: '/chord/stdlib/containers/locking-and-unlocking' },
              { title: 'Openable, lockable, door', href: '/chord/stdlib/containers/openable-lockable-door' },
            ],
          },
          {
            title: 'Wearing',
            href: '/chord/stdlib/wearing',
            children: [
              { title: 'wearing and taking_off', href: '/chord/stdlib/wearing/wearing-and-taking-off' },
              { title: 'Wearing traits', href: '/chord/stdlib/wearing/traits' },
            ],
          },
          {
            title: 'Senses & Examination',
            href: '/chord/stdlib/senses',
            children: [
              { title: 'looking and examining', href: '/chord/stdlib/senses/looking-and-examining' },
              { title: 'searching and reading', href: '/chord/stdlib/senses/searching-and-reading' },
              { title: 'listening and smelling', href: '/chord/stdlib/senses/listening-and-smelling' },
              { title: 'Senses traits', href: '/chord/stdlib/senses/traits' },
            ],
          },
          {
            title: 'Devices',
            href: '/chord/stdlib/devices',
            children: [
              { title: 'switching_on and switching_off', href: '/chord/stdlib/devices/switching-on-and-off' },
              { title: 'Device traits', href: '/chord/stdlib/devices/traits' },
            ],
          },
          {
            title: 'NPCs & Conversation',
            href: '/chord/stdlib/npcs',
            children: [
              { title: 'talking, asking, telling', href: '/chord/stdlib/npcs/talking-asking-telling' },
              { title: 'attacking and combat', href: '/chord/stdlib/npcs/attacking-and-combat' },
              { title: 'eating and drinking', href: '/chord/stdlib/npcs/eating-and-drinking' },
              { title: 'hiding', href: '/chord/stdlib/npcs/hiding' },
              { title: 'NPC & combat traits', href: '/chord/stdlib/npcs/traits' },
            ],
          },
          {
            title: 'Death',
            href: '/chord/stdlib/death',
            children: [
              { title: 'kill the player', href: '/chord/stdlib/death/kill-the-player' },
              { title: 'Deadly exits and rooms', href: '/chord/stdlib/death/deadly-exits-and-rooms' },
              { title: 'Death traits', href: '/chord/stdlib/death/traits' },
            ],
          },
          {
            title: 'Meta & System',
            href: '/chord/stdlib/meta',
            children: [
              { title: 'Information', href: '/chord/stdlib/meta/information' },
              { title: 'Saving state', href: '/chord/stdlib/meta/saving-state' },
              { title: 'Turns and undo', href: '/chord/stdlib/meta/turns-and-undo' },
            ],
          },
          {
            title: 'Traits Catalog',
            href: '/chord/stdlib/traits',
            children: [{ title: 'Structural traits', href: '/chord/stdlib/traits/structural-traits' }],
          },
          {
            title: 'Plugins & Daemons',
            href: '/chord/stdlib/plugins',
            children: [
              { title: 'Turn plugins and priority', href: '/chord/stdlib/plugins/turn-plugins-and-priority' },
              { title: 'The scheduler', href: '/chord/stdlib/plugins/scheduler' },
              { title: 'NPC & state machines', href: '/chord/stdlib/plugins/npc-and-state-machine-plugins' },
              { title: 'Extensions: combat', href: '/chord/stdlib/plugins/extensions' },
            ],
          },
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
      { title: 'Actions & Traits', items: [{ title: 'Overview', href: '/sharpee/actions-and-traits' }] },
    ],
  },
  {
    title: 'Tutorial',
    groups: [
      {
        title: 'Fernhill Tutorial',
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
    items: [
      { title: 'Play', href: '/play' },
      { title: 'Playground', href: '/playground' },
    ],
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
      g.items.flatMap((item) => [
        item.title === 'Overview' ? { ...item, title: g.title } : item,
        ...(item.children ?? []),
      ]),
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
      for (const item of group.items) {
        if (item.href === pathname) return [section.title, group.title, item.title];
        const child = item.children?.find((c) => c.href === pathname);
        if (child) return [section.title, group.title, item.title, child.title];
      }
    }
    const hit = section.items?.find((i) => i.href === pathname);
    if (hit) return [section.title, hit.title];
  }
  return [];
}
