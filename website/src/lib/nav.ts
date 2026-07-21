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
        title: 'Getting started',
        open: true,
        items: [
          { title: 'Install', href: '/chord/getting-started/install' },
          { title: 'Your first story', href: '/chord/getting-started/first-story' },
          { title: 'Compose & run', href: '/chord/getting-started/compose-and-run' },
        ],
      },
      {
        title: 'The world',
        items: [
          { title: 'Overview', href: '/chord/guide/world' },
          { title: '2.1 The story header', href: '/chord/guide/world/the-story-header' },
          { title: '2.2 Creating things', href: '/chord/guide/world/creating-things' },
          { title: '2.3 Kinds, traits, and settings', href: '/chord/guide/world/kinds-traits-and-settings' },
          { title: '2.4 Placing and wearing', href: '/chord/guide/world/placing-and-wearing' },
          { title: '2.5 Exits and blocked exits', href: '/chord/guide/world/exits-and-blocked-exits' },
          { title: '2.6 Prose, paragraphs, and markers', href: '/chord/guide/world/prose-paragraphs-and-markers' },
          { title: '2.7 States', href: '/chord/guide/world/states' },
          { title: '2.8 Scores live on owners', href: '/chord/guide/world/scores-live-on-owners' },
          { title: '2.9 The first-visit description', href: '/chord/guide/world/the-first-visit-description' },
          { title: '2.10 Per-entity phrase overrides', href: '/chord/guide/world/per-entity-phrase-overrides' },
          { title: '2.11 Starting state', href: '/chord/guide/world/starting-state' },
          { title: '2.12 Doors', href: '/chord/guide/world/doors' },
          { title: '2.13 Regions', href: '/chord/guide/world/regions' },
          { title: '2.14 People', href: '/chord/guide/world/people' },
        ],
      },
      {
        title: 'Behavior',
        items: [
          { title: 'Overview', href: '/chord/guide/behavior' },
          { title: '3.1 on and after', href: '/chord/guide/behavior/on-and-after' },
          { title: '3.2 What a clause can bind', href: '/chord/guide/behavior/what-a-clause-can-bind' },
          { title: '3.3 while, once, before, after', href: '/chord/guide/behavior/while-once-before-after' },
          { title: '3.4 Conditions', href: '/chord/guide/behavior/conditions' },
          { title: '3.5 Requirements', href: '/chord/guide/behavior/requirements' },
          { title: '3.6 Refusals', href: '/chord/guide/behavior/refusals' },
          { title: '3.7 The statements', href: '/chord/guide/behavior/the-statements' },
          { title: '3.8 The when suffix', href: '/chord/guide/behavior/the-when-suffix' },
          { title: '3.9 Topic tables', href: '/chord/guide/behavior/topic-tables' },
        ],
      },
      {
        title: 'Flow & progression',
        items: [
          { title: 'Overview', href: '/chord/guide/flow' },
          { title: '4.1 select on a value', href: '/chord/guide/flow/select-on-a-value' },
          { title: '4.2 select with a strategy', href: '/chord/guide/flow/select-with-a-strategy' },
          { title: '4.3 Ordinal blocks', href: '/chord/guide/flow/ordinal-blocks' },
          { title: '4.4 each blocks', href: '/chord/guide/flow/each-blocks' },
          { title: '4.5 Scoring', href: '/chord/guide/flow/scoring' },
          { title: '4.6 Endings', href: '/chord/guide/flow/endings' },
          { title: '4.7 Death', href: '/chord/guide/flow/death' },
          { title: '4.8 Sequences', href: '/chord/guide/flow/sequences' },
        ],
      },
      {
        title: 'Vocabulary & text',
        items: [
          { title: 'Overview', href: '/chord/guide/vocabulary' },
          { title: '5.1 define condition', href: '/chord/guide/vocabulary/define-condition' },
          { title: '5.2 define phrase', href: '/chord/guide/vocabulary/define-phrase' },
          { title: '5.3 define phrases', href: '/chord/guide/vocabulary/define-phrases' },
          { title: '5.4 define verb', href: '/chord/guide/vocabulary/define-verb' },
          { title: '5.5 define text', href: '/chord/guide/vocabulary/define-text' },
          { title: '5.6 define action hatches', href: '/chord/guide/vocabulary/define-action-hatches' },
          { title: '5.7 define trait', href: '/chord/guide/vocabulary/define-trait' },
          { title: '5.8 define action', href: '/chord/guide/vocabulary/define-action' },
          { title: '5.9 define pronouns', href: '/chord/guide/vocabulary/define-pronouns' },
          { title: '5.10 use', href: '/chord/guide/vocabulary/use' },
          { title: '5.11 define phrasebook', href: '/chord/guide/vocabulary/define-phrasebook' },
          { title: '5.12 ## comments', href: '/chord/guide/vocabulary/comments' },
        ],
      },
      {
        title: 'Project & files',
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
            title: 'Containers & locks',
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
            title: 'Devices & tools',
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
        title: 'Standard library',
        open: false,
        items: [
          { title: 'Overview', href: '/chord/stdlib' },
          {
            title: 'Manipulation',
            href: '/chord/stdlib/manipulation',
            children: [
              { title: '2.1 taking and dropping', href: '/chord/stdlib/manipulation/taking-and-dropping' },
              { title: '2.2 putting and inserting', href: '/chord/stdlib/manipulation/putting-and-inserting' },
              { title: '2.3 removing (taking from)', href: '/chord/stdlib/manipulation/removing' },
              { title: '2.4 giving and showing', href: '/chord/stdlib/manipulation/giving-and-showing' },
              { title: '2.5 throwing', href: '/chord/stdlib/manipulation/throwing' },
              { title: '2.6 pushing, pulling, touching', href: '/chord/stdlib/manipulation/pushing-pulling-touching' },
              { title: '2.7 lowering and raising', href: '/chord/stdlib/manipulation/lowering-and-raising' },
              { title: '2.8 cutting and digging', href: '/chord/stdlib/manipulation/cutting-and-digging' },
              { title: '2.9 Manipulation traits', href: '/chord/stdlib/manipulation/traits' },
            ],
          },
          {
            title: 'Movement',
            href: '/chord/stdlib/movement',
            children: [
              { title: '3.1 going', href: '/chord/stdlib/movement/going' },
              { title: '3.2 entering and exiting', href: '/chord/stdlib/movement/entering-and-exiting' },
              { title: '3.3 climbing', href: '/chord/stdlib/movement/climbing' },
              { title: '3.4 Movement traits', href: '/chord/stdlib/movement/traits' },
            ],
          },
          {
            title: 'Containers & openables',
            href: '/chord/stdlib/containers',
            children: [
              { title: '4.1 opening and closing', href: '/chord/stdlib/containers/opening-and-closing' },
              { title: '4.2 locking and unlocking', href: '/chord/stdlib/containers/locking-and-unlocking' },
              { title: '4.3 Openable, lockable, door', href: '/chord/stdlib/containers/openable-lockable-door' },
            ],
          },
          {
            title: 'Wearing',
            href: '/chord/stdlib/wearing',
            children: [
              { title: '5.1 wearing and taking_off', href: '/chord/stdlib/wearing/wearing-and-taking-off' },
              { title: '5.2 Wearing traits', href: '/chord/stdlib/wearing/traits' },
            ],
          },
          {
            title: 'Senses & examination',
            href: '/chord/stdlib/senses',
            children: [
              { title: '6.1 looking and examining', href: '/chord/stdlib/senses/looking-and-examining' },
              { title: '6.2 searching and reading', href: '/chord/stdlib/senses/searching-and-reading' },
              { title: '6.3 listening and smelling', href: '/chord/stdlib/senses/listening-and-smelling' },
              { title: '6.4 Senses traits', href: '/chord/stdlib/senses/traits' },
            ],
          },
          {
            title: 'Devices',
            href: '/chord/stdlib/devices',
            children: [
              { title: '7.1 switching_on and switching_off', href: '/chord/stdlib/devices/switching-on-and-off' },
              { title: '7.2 Device traits', href: '/chord/stdlib/devices/traits' },
            ],
          },
          {
            title: 'NPCs & conversation',
            href: '/chord/stdlib/npcs',
            children: [
              { title: '8.1 talking, asking, telling', href: '/chord/stdlib/npcs/talking-asking-telling' },
              { title: '8.2 attacking and combat', href: '/chord/stdlib/npcs/attacking-and-combat' },
              { title: '8.3 eating and drinking', href: '/chord/stdlib/npcs/eating-and-drinking' },
              { title: '8.4 hiding', href: '/chord/stdlib/npcs/hiding' },
              { title: '8.5 NPC & combat traits', href: '/chord/stdlib/npcs/traits' },
            ],
          },
          {
            title: 'Death',
            href: '/chord/stdlib/death',
            children: [
              { title: '9.1 kill the player', href: '/chord/stdlib/death/kill-the-player' },
              { title: '9.2 Deadly exits and rooms', href: '/chord/stdlib/death/deadly-exits-and-rooms' },
              { title: '9.3 Death traits', href: '/chord/stdlib/death/traits' },
            ],
          },
          {
            title: 'Meta & system',
            href: '/chord/stdlib/meta',
            children: [
              { title: '10.1 Information', href: '/chord/stdlib/meta/information' },
              { title: '10.2 Saving state', href: '/chord/stdlib/meta/saving-state' },
              { title: '10.3 Turns and undo', href: '/chord/stdlib/meta/turns-and-undo' },
            ],
          },
          {
            title: 'Traits catalog',
            href: '/chord/stdlib/traits',
            children: [{ title: '11.1 Structural traits', href: '/chord/stdlib/traits/structural-traits' }],
          },
          {
            title: 'Plugins & daemons',
            href: '/chord/stdlib/plugins',
            children: [
              { title: '12.1 Turn plugins and priority', href: '/chord/stdlib/plugins/turn-plugins-and-priority' },
              { title: '12.2 The scheduler', href: '/chord/stdlib/plugins/scheduler' },
              { title: '12.3 NPC & state machines', href: '/chord/stdlib/plugins/npc-and-state-machine-plugins' },
              { title: '12.4 Extensions: combat', href: '/chord/stdlib/plugins/extensions' },
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
