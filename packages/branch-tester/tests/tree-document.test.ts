/**
 * tree-document.test.ts — the ADR-307 wire format's contract.
 *
 * AC-1: serialize → deserialize → serialize is the identity on the emitted
 * bytes. AC-4: a newer version is refused with a named message; anything
 * malformed reads as `malformed` (the caller degrades to a fresh tree) and
 * never throws.
 */
import { describe, expect, it } from 'vitest';
import {
  TREE_DOCUMENT_VERSION,
  branchLineLabelOf,
  channelIdsReferencedBy,
  deserializeTreeDocument,
  emptyTreeDocument,
  mainLineLabelOf,
  roomSlugOf,
  serializeTreeDocument,
  treeDocumentFileNameFor,
  type TreeDocument,
} from '../src/tree-document.js';

/** A hand-built multi-branch tree exercising every card type and family. */
const MULTI_BRANCH_TREE: TreeDocument = {
  version: 1,
  story: 'fernhill',
  seed: 42,
  cards: [
    {
      type: 'opening',
      assertions: { contains: ['The Folly at Fernhill'] },
    },
    { type: 'boot', assertions: { contains: ['Iron Gates'] } },
    {
      type: 'turn',
      command: 'north',
      assertions: {
        contains: ['The drive curves'],
        notContains: ['You can’t go that way'],
        states: ['player.location = gravel-drive'],
        channels: [{ id: 'banner', contains: ['Fernhill'] }],
      },
    },
    {
      type: 'turn',
      command: 'north',
      skip: true,
      branches: [
        {
          branch: 1,
          cards: [
            {
              type: 'turn',
              command: 'east',
              assertions: { exact: ['A narrow path.', 'It winds east.'] },
              branches: [
                {
                  branch: 1,
                  cards: [{ type: 'turn', command: 'wait', skip: true }],
                },
              ],
            },
          ],
        },
        {
          branch: 2,
          cards: [
            {
              type: 'turn',
              command: 'west',
              assertions: {
                events: ['if.event.room-entered'],
                channels: [{ id: 'status', is: 'Gravel Drive' }],
              },
            },
          ],
        },
      ],
    },
  ],
};

describe('serialization (AC-1)', () => {
  it('serialize → deserialize → serialize is byte-identical on a multi-branch tree', () => {
    const first = serializeTreeDocument(MULTI_BRANCH_TREE);
    const read = deserializeTreeDocument(first);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    const second = serializeTreeDocument(read.document);
    expect(second).toBe(first);
  });

  it('is deterministic: key insertion order never reaches the bytes', () => {
    const scrambled = {
      seed: 42,
      cards: [{ command: 'north', type: 'turn', assertions: { states: ['a = b'], contains: ['x'] } }],
      story: 'fernhill',
      version: 1,
    } as unknown as TreeDocument;
    const sorted: TreeDocument = {
      version: 1,
      story: 'fernhill',
      seed: 42,
      cards: [{ type: 'turn', command: 'north', assertions: { contains: ['x'], states: ['a = b'] } }],
    };
    expect(serializeTreeDocument(scrambled)).toBe(serializeTreeDocument(sorted));
  });

  it('preserves array order — sibling and card order are meaning, not noise', () => {
    const text = serializeTreeDocument(MULTI_BRANCH_TREE);
    expect(text.indexOf('"east"')).toBeLessThan(text.indexOf('"west"'));
    expect(text.indexOf('"opening"')).toBeLessThan(text.indexOf('"boot"'));
  });

  it('ends with exactly one newline', () => {
    expect(serializeTreeDocument(emptyTreeDocument('fernhill', 42))).toMatch(/[^\n]\n$/);
  });
});

describe('version gate (AC-4)', () => {
  it('refuses a newer version with a named message and never calls it malformed', () => {
    const newer = serializeTreeDocument(MULTI_BRANCH_TREE).replace('"version": 1', '"version": 2');
    const read = deserializeTreeDocument(newer);
    expect(read.status).toBe('refused');
    if (read.status !== 'refused') return;
    expect(read.message).toContain('version 2');
    expect(read.message).toContain(`version ${TREE_DOCUMENT_VERSION}`);
  });

  it('refusal wins over shape complaints — a newer document with unknown keys is still refused', () => {
    const read = deserializeTreeDocument('{ "version": 3, "somethingNew": true }');
    expect(read.status).toBe('refused');
  });

  it('an older (unknown) version is malformed, not silently accepted', () => {
    const read = deserializeTreeDocument('{ "version": 0, "story": "s", "seed": 1, "cards": [] }');
    expect(read.status).toBe('malformed');
  });
});

describe('malformed degrade (AC-4)', () => {
  const malformedCases: Array<[name: string, text: string]> = [
    ['unparseable JSON', '{ not json'],
    ['a JSON array', '[]'],
    ['a missing seed', '{ "version": 1, "story": "s", "cards": [] }'],
    ['an unknown top-level key', '{ "version": 1, "story": "s", "seed": 1, "cards": [], "root": {} }'],
    [
      'a command on the opening card',
      '{ "version": 1, "story": "s", "seed": 1, "cards": [{ "type": "opening", "command": "north" }] }',
    ],
    [
      'a turn without a command',
      '{ "version": 1, "story": "s", "seed": 1, "cards": [{ "type": "turn" }] }',
    ],
    [
      'an unknown assertion family',
      '{ "version": 1, "story": "s", "seed": 1, "cards": [{ "type": "turn", "command": "n", "assertions": { "matches": ["x"] } }] }',
    ],
    [
      'a channel claim with neither contains nor is',
      '{ "version": 1, "story": "s", "seed": 1, "cards": [{ "type": "turn", "command": "n", "assertions": { "channels": [{ "id": "banner" }] } }] }',
    ],
    [
      'a channel claim with both contains and is',
      '{ "version": 1, "story": "s", "seed": 1, "cards": [{ "type": "turn", "command": "n", "assertions": { "channels": [{ "id": "banner", "contains": ["x"], "is": "y" }] } }] }',
    ],
    [
      'duplicate sibling branch ids',
      '{ "version": 1, "story": "s", "seed": 1, "cards": [{ "type": "turn", "command": "n", "branches": [{ "branch": 1, "cards": [] }, { "branch": 1, "cards": [] }] }] }',
    ],
  ];

  it.each(malformedCases)('%s reads as malformed, never a throw', (_name, text) => {
    const read = deserializeTreeDocument(text);
    expect(read.status).toBe('malformed');
    if (read.status !== 'malformed') return;
    expect(read.message.length).toBeGreaterThan(0);
  });

  it('the degrade target is a valid, serializable empty tree', () => {
    const fresh = emptyTreeDocument('fernhill', 42);
    const read = deserializeTreeDocument(serializeTreeDocument(fresh));
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(read.document.cards).toEqual([]);
    expect(read.document.story).toBe('fernhill');
    expect(read.document.seed).toBe(42);
  });
});

describe('the document name', () => {
  it('is <story-id>.tests.json', () => {
    expect(treeDocumentFileNameFor('fernhill')).toBe('fernhill.tests.json');
  });
});

describe('channelIdsReferencedBy — the capture set both consumers derive', () => {
  it('collects each claimed channel once, in first-use order, branches included', () => {
    const document: TreeDocument = {
      version: 1,
      story: 's',
      seed: 1,
      cards: [
        { type: 'boot', assertions: { channels: [{ id: 'status', contains: ['x'] }] } },
        {
          type: 'turn',
          command: 'north',
          // No channel claims — contributes nothing.
          assertions: { contains: ['y'] },
          branches: [
            {
              branch: 1,
              cards: [
                {
                  type: 'turn',
                  command: 'east',
                  assertions: {
                    channels: [
                      { id: 'score', is: '5' },
                      // A duplicate of the boot's claim — counted once.
                      { id: 'status', contains: ['z'] },
                    ],
                  },
                  branches: [
                    {
                      branch: 2,
                      cards: [
                        {
                          type: 'turn',
                          command: 'up',
                          assertions: { channels: [{ id: 'banner', contains: ['t'] }] },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(channelIdsReferencedBy(document)).toEqual(['status', 'score', 'banner']);
  });

  it('an unclaimed document derives an empty capture set', () => {
    expect(channelIdsReferencedBy(emptyTreeDocument('s', 1))).toEqual([]);
  });

  it('a dotted claim id maps to its base channel — the capture is the structured value', () => {
    const document: TreeDocument = {
      version: 1,
      story: 's',
      seed: 1,
      cards: [
        {
          type: 'turn',
          command: 'look',
          assertions: {
            channels: [
              { id: 'info.title', is: 'Mini' },
              // Same base as the dotted claim — counted once.
              { id: 'info.description', is: 'A test.' },
              { id: 'banner.title', is: 'Mini' },
            ],
          },
        },
      ],
    };
    expect(channelIdsReferencedBy(document)).toEqual(['info', 'banner']);
  });
});

describe('derived-label helpers — one formatting for both consumers (D2/Q-8)', () => {
  it('slugs a room name the way labels carry it', () => {
    expect(roomSlugOf('Iron Gates')).toBe('iron-gates');
    expect(roomSlugOf("The Butler's Pantry")).toBe('the-butler-s-pantry');
    expect(roomSlugOf('   ')).toBeUndefined();
    expect(roomSlugOf(undefined)).toBeUndefined();
  });

  it('labels the main line from its opening room, with a roomless fallback', () => {
    expect(mainLineLabelOf('den')).toBe('opening-den');
    expect(mainLineLabelOf(undefined)).toBe('opening-start');
  });

  it('labels a branch from fork room and first command, degrading by piece', () => {
    expect(branchLineLabelOf('den', 1, 'look')).toBe('den · look');
    expect(branchLineLabelOf(undefined, 3, 'east')).toBe('branch-3 · east');
    expect(branchLineLabelOf('den', 1, undefined)).toBe('den · (empty)');
  });
});
