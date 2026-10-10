/**
 * tree-document.test.ts — the test tree's model and at-rest format.
 *
 * ADR-355: the tree is a directory of segments cut at fork points plus a
 * manifest. AC-1 one run changed → one file changed; AC-2 the cut falls on
 * fork points only; AC-3 nothing duplicated; AC-4 an upstream edit moves no
 * id; AC-5 equal labels never share an identity; AC-6 every file
 * round-trips byte-identically; AC-7 a dangling parent and AC-8 an absent
 * manifest are MALFORMED, never repaired, never thrown. A newer manifest
 * version is refused with a named message.
 */
import { describe, expect, it } from 'vitest';
import {
  TREE_DOCUMENT_VERSION,
  TREE_MANIFEST_FILE_NAME,
  assembleTree,
  branchLineLabelOf,
  checkCanonicalTree,
  channelIdsReferencedBy,
  createSegmentId,
  diffTreeFiles,
  emptyTreeDocument,
  endingIdsDeclaredBy,
  ensureSegmentIds,
  mainLineLabelOf,
  roomSlugOf,
  segmentTree,
  splitChannelClaimId,
  treeDirectoryNameFor,
  type TreeCard,
  type TreeDocument,
  type TreeFiles,
} from '../src/tree-document.js';
import { flattenTreeLines } from '../src/tree-walker.js';

/** A deterministic id source: `seq00001`, `seq00002`, … */
function sequentialIds(): () => string {
  let next = 0;
  return () => `seq${String(++next).padStart(5, '0')}`;
}

/**
 * Give every card without one a deterministic id (`card0001`, …) in
 * depth-first order, the way a surface mints one when it creates a card
 * (ADR-355 D7). Mutates and returns the document.
 */
function withCardIds(document: TreeDocument): TreeDocument {
  let next = 0;
  const walk = (cards: TreeCard[]): void => {
    for (const card of cards) {
      if (card.id === undefined) card.id = `card${String(++next).padStart(4, '0')}`;
      for (const branch of card.branches ?? []) walk(branch.cards);
    }
  };
  walk(document.cards);
  return document;
}

const turn = (command: string, extra: Partial<TreeCard> = {}): TreeCard => ({
  type: 'turn',
  command,
  ...extra,
});

/**
 * A hand-built multi-level tree exercising every card type and family.
 * Forks: `north`(skip) on the main line [two branches, cards after it],
 * `east` inside branch one [one branch, cards after it]. Segments: root,
 * main continuation, branch one, branch one's continuation, its sub-branch,
 * branch two — six, holding all ten cards once.
 */
function multiLevelTree(): TreeDocument {
  return withCardIds({
    version: TREE_DOCUMENT_VERSION,
    story: 'fernhill',
    seed: 42,
    id: 'root0000',
    cards: [
      { type: 'opening', assertions: { contains: ['The Folly at Fernhill'] } },
      { type: 'boot', assertions: { contains: ['Iron Gates'] } },
      turn('north', {
        assertions: {
          contains: ['The drive curves'],
          notContains: ['You can’t go that way'],
          states: ['player.location = gravel-drive'],
          channels: [{ id: 'banner', contains: ['Fernhill'] }],
        },
      }),
      turn('north', {
        skip: true,
        continuation: 'maincont',
        branches: [
          {
            id: 'branch01',
            cards: [
              turn('east', {
                assertions: { exact: ['A narrow path.', 'It winds east.'] },
                continuation: 'b1cont00',
                branches: [{ id: 'branch11', cards: [turn('wait', { skip: true })] }],
              }),
              turn('south'),
            ],
          },
          {
            id: 'branch02',
            cards: [
              turn('west', {
                assertions: {
                  events: ['if.event.room-entered'],
                  channels: [{ id: 'status', is: 'Gravel Drive' }],
                },
              }),
            ],
          },
        ],
      }),
      turn('look'),
      turn('inventory', { ending: 'gave-up' }),
    ],
  });
}

/** Every card in a tree, depth-first — for counting and comparing. */
function allCards(document: TreeDocument): TreeCard[] {
  const out: TreeCard[] = [];
  const walk = (cards: TreeCard[]): void => {
    for (const card of cards) {
      out.push(card);
      for (const branch of card.branches ?? []) walk(branch.cards);
    }
  };
  walk(document.cards);
  return out;
}

function segmentFiles(files: TreeFiles): Record<string, { id: string; parent?: string; ordinal?: number; cards: unknown[] }> {
  const out: Record<string, { id: string; parent?: string; ordinal?: number; cards: unknown[] }> = {};
  for (const [name, text] of Object.entries(files)) {
    if (name !== TREE_MANIFEST_FILE_NAME) out[name] = JSON.parse(text);
  }
  return out;
}

function assembled(files: TreeFiles): TreeDocument {
  const read = assembleTree(files);
  if (read.status !== 'ok') throw new Error(`expected ok, got ${read.status}: ${read.message}`);
  return read.document;
}

describe('segmentTree — the cut (ADR-355 D2, D4)', () => {
  it('writes a manifest holding version, story and seed and nothing else', () => {
    const files = segmentTree(multiLevelTree());
    expect(JSON.parse(files[TREE_MANIFEST_FILE_NAME])).toEqual({
      version: TREE_DOCUMENT_VERSION,
      story: 'fernhill',
      seed: 42,
    });
  });

  it('AC-2: cuts at each fork card and nowhere else, naming parent and ordinal', () => {
    const segments = segmentFiles(segmentTree(multiLevelTree()));
    expect(Object.keys(segments).sort()).toEqual(
      ['b1cont00', 'branch01', 'branch02', 'branch11', 'maincont', 'root0000'].map((id) => `${id}.json`),
    );
    const shape = (name: string) => {
      const { id, parent, ordinal, cards } = segments[`${name}.json`];
      return { id, parent, ordinal, commands: cards.map((card) => (card as TreeCard).command ?? (card as TreeCard).type) };
    };
    // The root ends at its fork card, `north`(skip).
    expect(shape('root0000')).toEqual({
      id: 'root0000', parent: undefined, ordinal: undefined,
      commands: ['opening', 'boot', 'north', 'north'],
    });
    // Branches descend at 1..n in sibling order; the continuation at 0.
    expect(shape('branch01')).toEqual({ id: 'branch01', parent: 'root0000', ordinal: 1, commands: ['east'] });
    expect(shape('branch02')).toEqual({ id: 'branch02', parent: 'root0000', ordinal: 2, commands: ['west'] });
    expect(shape('maincont')).toEqual({ id: 'maincont', parent: 'root0000', ordinal: 0, commands: ['look', 'inventory'] });
    // The cut applies inside a branch the same way (D2: the main line is cut like any other run).
    expect(shape('branch11')).toEqual({ id: 'branch11', parent: 'branch01', ordinal: 1, commands: ['wait'] });
    expect(shape('b1cont00')).toEqual({ id: 'b1cont00', parent: 'branch01', ordinal: 0, commands: ['south'] });
  });

  it('AC-2: segment count follows from the fork structure — root, each branch, each fork with cards after it', () => {
    // Counted by hand from the fixture: the root, three branches, and two
    // forks with cards after them — and all ten cards held once.
    const segments = Object.values(segmentFiles(segmentTree(multiLevelTree())));
    expect(segments).toHaveLength(6);
    expect(segments.reduce((sum, segment) => sum + segment.cards.length, 0)).toBe(10);
  });

  it('a fork that ends its line writes no continuation segment', () => {
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { branches: [{ id: 'branch01', cards: [turn('east')] }] })],
    });
    expect(Object.keys(segmentFiles(segmentTree(document))).sort()).toEqual(['branch01.json', 'root0000.json']);
  });

  it('AC-3: nothing is duplicated — segment cards sum to the tree’s cards, and no card carries structure', () => {
    const document = multiLevelTree();
    const segments = Object.values(segmentFiles(segmentTree(document)));
    const persisted = segments.flatMap((segment) => segment.cards) as Record<string, unknown>[];
    expect(persisted).toHaveLength(allCards(document).length);
    for (const card of persisted) {
      expect(card).not.toHaveProperty('branches');
      expect(card).not.toHaveProperty('continuation');
    }
  });

  it('a card with an empty branches array is not a fork', () => {
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { branches: [] }), turn('east')],
    });
    const segments = segmentFiles(segmentTree(document));
    expect(Object.keys(segments)).toEqual(['root0000.json']);
    expect(segments['root0000.json'].cards).toHaveLength(2);
  });

  it('refuses a model that breaks its own invariant — a writer bug, not input', () => {
    const missingContinuation: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { branches: [{ id: 'branch01', cards: [] }] }), turn('east')],
    });
    expect(() => segmentTree(missingContinuation)).toThrow(/no continuation id/);

    const sharedId: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [
        turn('north', {
          branches: [
            { id: 'branch01', cards: [] },
            { id: 'branch01', cards: [] },
          ],
        }),
      ],
    });
    expect(() => segmentTree(sharedId)).toThrow(/used by two segments/);

    // Everything else is valid: only the missing card id is wrong.
    const missingCardId: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { id: 'card0001' }), turn('east')],
    };
    expect(() => segmentTree(missingCardId)).toThrow(/the card at 'root0000'\[1\] has no id/);

    // A copied card that kept its source's id.
    const sharedCardId: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { id: 'card0001' }), turn('north', { id: 'card0001' })],
    };
    expect(() => segmentTree(sharedCardId)).toThrow(/card id 'card0001' is used by two cards/);

    // A branch card copied from the main line with its source's id: two segments.
    const sharedAcrossSegments: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { id: 'card0001', branches: [{ id: 'branch01', cards: [turn('north', { id: 'card0001' })] }] })],
    };
    expect(() => segmentTree(sharedAcrossSegments)).toThrow(/card id 'card0001' is used by two cards/);

    // A card carrying a segment's id: one namespace.
    const cardNamedLikeSegment: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { id: 'card0001', branches: [{ id: 'branch01', cards: [turn('east', { id: 'root0000' })] }] })],
    };
    expect(() => segmentTree(cardNamedLikeSegment)).toThrow(/id 'root0000' is used by both a segment and a card/);
  });
});

describe('ensureSegmentIds — ids are generated once and kept (D5)', () => {
  it('allocates a continuation only for a fork that has cards after it, and returns the count', () => {
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [
        turn('north', { branches: [{ id: 'branch01', cards: [turn('east', { branches: [{ id: 'branch11', cards: [] }] })] }] }),
        turn('look'),
      ],
    });
    expect(ensureSegmentIds(document, sequentialIds())).toBe(1);
    expect(document.cards[0].continuation).toBe('seq00001');
    // `east` forks with nothing after it: no continuation.
    expect(document.cards[0].branches![0].cards[0].continuation).toBeUndefined();
  });

  it('allocates for a fork nested inside a branch, and the write then succeeds', () => {
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [
        turn('north', {
          branches: [
            { id: 'branch01', cards: [turn('east', { branches: [{ id: 'branch11', cards: [turn('dig')] }] }), turn('south')] },
          ],
        }),
      ],
    });
    expect(() => segmentTree(document)).toThrow(/no continuation id/);
    expect(ensureSegmentIds(document, sequentialIds())).toBe(1);
    expect(document.cards[0].branches![0].cards[0].continuation).toBe('seq00001');
    const segments = segmentFiles(segmentTree(document));
    expect(segments['seq00001.json']).toEqual({
      id: 'seq00001',
      parent: 'branch01',
      ordinal: 0,
      // `south` is the fourth card depth-first (north, east, dig, south).
      cards: [{ id: 'card0004', type: 'turn', command: 'south' }],
    });
  });

  it('mints a card id for every card that has none, depth-first, in one namespace with the segments (D7)', () => {
    // Taken before minting: root0000, branch01, branch11. The walk visits a
    // card, then its continuation, then its branches, then the next card:
    // north → seq00001 (it ends its line: no continuation); east → seq00002;
    // east's continuation → seq00003; dig (inside branch11) → seq00004;
    // south → seq00005.
    const document: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [
        turn('north', {
          branches: [
            { id: 'branch01', cards: [turn('east', { branches: [{ id: 'branch11', cards: [turn('dig')] }] }), turn('south')] },
          ],
        }),
      ],
    };
    expect(ensureSegmentIds(document, sequentialIds())).toBe(5);
    const north = document.cards[0];
    const [east, south] = north.branches![0].cards;
    expect(north.id).toBe('seq00001');
    expect(north.continuation).toBeUndefined();
    expect(east.id).toBe('seq00002');
    expect(east.continuation).toBe('seq00003');
    expect(east.branches![0].cards[0].id).toBe('seq00004');
    expect(south.id).toBe('seq00005');
  });

  it('a minted id skips an existing card id and an existing continuation id — one namespace', () => {
    // Existing card id seq00001: north's continuation must skip it → seq00002;
    // `look` (no id) takes the next free → seq00003.
    const cardCollision: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north', { id: 'seq00001', branches: [{ id: 'branch01', cards: [] }] }), turn('look')],
    };
    expect(ensureSegmentIds(cardCollision, sequentialIds())).toBe(2);
    expect(cardCollision.cards[0].continuation).toBe('seq00002');
    expect(cardCollision.cards[1].id).toBe('seq00003');

    // Existing continuation id seq00001: `look` must skip it → seq00002.
    const continuationCollision: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [
        turn('north', { id: 'card0001', continuation: 'seq00001', branches: [{ id: 'branch01', cards: [] }] }),
        turn('look'),
      ],
    };
    expect(ensureSegmentIds(continuationCollision, sequentialIds())).toBe(1);
    expect(continuationCollision.cards[1].id).toBe('seq00002');
  });

  it('two ids minted in one call never repeat, even when the generator does', () => {
    const repeating = ['same0000', 'same0000', 'diff0000'];
    let call = 0;
    const document: TreeDocument = {
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [turn('north'), turn('east')],
    };
    expect(ensureSegmentIds(document, () => repeating[call++])).toBe(2);
    expect(document.cards.map((card) => card.id)).toEqual(['same0000', 'diff0000']);
  });

  it('never replaces an id that exists, and a second call allocates nothing', () => {
    const document = multiLevelTree();
    const before = JSON.stringify(document);
    expect(ensureSegmentIds(document, sequentialIds())).toBe(0);
    expect(JSON.stringify(document)).toBe(before);
  });

  it('skips a generated id that collides with one the tree already carries', () => {
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'seq00001'),
      cards: [turn('north', { branches: [{ id: 'seq00002', cards: [] }] }), turn('look')],
    });
    ensureSegmentIds(document, sequentialIds());
    expect(document.cards[0].continuation).toBe('seq00003');
  });

  it('createSegmentId is eight lowercase letters or digits', () => {
    for (let index = 0; index < 50; index++) expect(createSegmentId()).toMatch(/^[a-z0-9]{8}$/);
    expect(createSegmentId(() => 0)).toBe('aaaaaaaa');
    expect(createSegmentId(() => 0.9999)).toBe('99999999');
  });
});

describe('assembleTree — the inverse (AC-6)', () => {
  it('reassembles the tree exactly, ids included', () => {
    expect(assembled(segmentTree(multiLevelTree()))).toEqual(multiLevelTree());
  });

  it('AC-6: segment → assemble → segment is the identity on every file’s bytes, manifest included', () => {
    const first = segmentTree(multiLevelTree());
    const second = segmentTree(assembled(first));
    expect(second).toEqual(first);
  });

  it('is deterministic: key insertion order never reaches the bytes', () => {
    const scrambled = multiLevelTree();
    const card = scrambled.cards[2];
    // Same fields, id included, in a different insertion order (id last).
    scrambled.cards[2] = { assertions: card.assertions, command: card.command, type: card.type, id: card.id };
    expect(segmentTree(scrambled)).toEqual(segmentTree(multiLevelTree()));
  });

  it('every file ends with exactly one newline', () => {
    for (const text of Object.values(segmentTree(multiLevelTree()))) expect(text).toMatch(/[^\n]\n$/);
  });

  it('the degrade target is a valid empty tree that assembles back', () => {
    const fresh = emptyTreeDocument('fernhill', 42, createSegmentId());
    const document = assembled(segmentTree(fresh));
    expect(document).toEqual(fresh);
    expect(document.cards).toEqual([]);
  });

  it('ignores dotfiles the file system leaves beside the segments', () => {
    const files = { ...segmentTree(multiLevelTree()), '.DS_Store': '\u0000\u0001' };
    expect(assembled(files)).toEqual(multiLevelTree());
  });
});

describe('edits touch only what they change (AC-1, AC-4)', () => {
  it('AC-1: changing one card deep in a branch changes exactly that segment’s bytes', () => {
    const before = segmentTree(multiLevelTree());
    const edited = multiLevelTree();
    edited.cards[3].branches![0].cards[0].branches![0].cards.push(turn('listen', { id: 'newcard0' }));
    const after = segmentTree(edited);
    const { written, removed } = diffTreeFiles(before, after);
    expect(Object.keys(written)).toEqual(['branch11.json']);
    expect(removed).toEqual([]);
    // The manifest never changes when the tree does (D4).
    expect(after[TREE_MANIFEST_FILE_NAME]).toBe(before[TREE_MANIFEST_FILE_NAME]);
  });

  it('AC-4: inserting a card ahead of the first fork moves no id, filename or parent reference', () => {
    const before = segmentFiles(segmentTree(multiLevelTree()));
    const edited = multiLevelTree();
    edited.cards.splice(2, 0, turn('wait', { id: 'newcard0' }));
    const after = segmentFiles(segmentTree(edited));
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());
    for (const name of Object.keys(before)) {
      expect({ id: after[name].id, parent: after[name].parent, ordinal: after[name].ordinal }).toEqual({
        id: before[name].id,
        parent: before[name].parent,
        ordinal: before[name].ordinal,
      });
    }
    const changed = Object.keys(diffTreeFiles(segmentTree(multiLevelTree()), segmentTree(edited)).written);
    expect(changed).toEqual(['root0000.json']);
  });

  it('forking a card mid-run splits its segment: the continuation and the branch are new files, nothing else moves', () => {
    const edited = multiLevelTree();
    // `look` on the main continuation becomes a fork point.
    edited.cards[4].branches = [{ id: 'branch03', cards: [turn('dig')] }];
    ensureSegmentIds(edited, sequentialIds());
    const { written, removed } = diffTreeFiles(segmentTree(multiLevelTree()), segmentTree(edited));
    expect(Object.keys(written)).toEqual(['branch03.json', 'maincont.json', 'seq00001.json']);
    expect(removed).toEqual([]);
  });

  it('removing a fork’s last branch merges its continuation back and removes both files', () => {
    const edited = multiLevelTree();
    const east = edited.cards[3].branches![0].cards[0];
    delete east.branches;
    const { written, removed } = diffTreeFiles(segmentTree(multiLevelTree()), segmentTree(edited));
    expect(Object.keys(written)).toEqual(['branch01.json']);
    expect(removed).toEqual(['b1cont00.json', 'branch11.json']);
    expect(segmentFiles(segmentTree(edited))['branch01.json'].cards).toHaveLength(2);
  });

  it('diffTreeFiles leaves dotfiles on disk alone', () => {
    expect(diffTreeFiles({ '.DS_Store': 'x' }, {})).toEqual({ written: {}, removed: [] });
  });
});

describe('equal labels never share an identity (AC-5, GH #494)', () => {
  it('two branches whose derived labels are equal carry distinct ids, and no lookup crosses', () => {
    // Two forks from the same room, each branch typing the same first command:
    // both derive the label `<room> · east`.
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('s', 1, 'root0000'),
      cards: [
        turn('look', { continuation: 'maincont', branches: [{ id: 'first000', cards: [turn('east')] }] }),
        turn('look', { branches: [{ id: 'second00', cards: [turn('east')] }] }),
      ],
    });
    const reread = assembled(segmentTree(document));
    const { lines } = flattenTreeLines(reread);
    const branches = lines.filter((line) => line.parentId !== undefined);
    expect(branches.map((line) => branchLineLabelOf('den', line.ordinal!, line.firstCommand))).toEqual([
      'den · east',
      'den · east',
    ]);
    expect(branches.map((line) => line.id)).toEqual(['first000', 'second00']);
    const byId = new Map(lines.map((line) => [line.id, line]));
    expect(byId.size).toBe(lines.length);
    expect(byId.get('first000')!.prefix).toEqual(['look']);
    expect(byId.get('second00')!.prefix).toEqual(['look', 'look']);
  });
});

describe('the reader refuses or reports — never repairs, never throws', () => {
  const base = (): TreeFiles => segmentTree(multiLevelTree());
  const rewrite = (files: TreeFiles, name: string, edit: (value: Record<string, unknown>) => void): TreeFiles => {
    const value = JSON.parse(files[name]);
    edit(value);
    return { ...files, [name]: JSON.stringify(value) };
  };
  const without = (files: TreeFiles, name: string): TreeFiles => {
    const { [name]: _removed, ...rest } = files;
    return rest;
  };

  it('a newer manifest version is refused with a named message', () => {
    const read = assembleTree(rewrite(base(), TREE_MANIFEST_FILE_NAME, (m) => (m['version'] = TREE_DOCUMENT_VERSION + 1)));
    expect(read.status).toBe('refused');
    if (read.status !== 'refused') return;
    expect(read.message).toContain(`version ${TREE_DOCUMENT_VERSION + 1}`);
    expect(read.message).toContain('update Sharpee');
  });

  it('refusal wins over every other complaint — broken segments beside a newer manifest still read as newer', () => {
    const files = rewrite(
      { ...base(), 'zzzzzzzz.json': '{ not json' },
      TREE_MANIFEST_FILE_NAME,
      (m) => {
        m['version'] = TREE_DOCUMENT_VERSION + 1;
        m['somethingNew'] = true;
      },
    );
    const read = assembleTree(files);
    expect(read.status).toBe('refused');
    if (read.status !== 'refused') return;
    expect(read.message).toContain(`version ${TREE_DOCUMENT_VERSION + 1}`);
  });

  it('AC-7: a segment naming a parent no segment carries is malformed, and the subtree is not dropped', () => {
    const read = assembleTree(rewrite(base(), 'branch11.json', (s) => (s['parent'] = 'gone0000')));
    expect(read).toEqual({
      status: 'malformed',
      message: `segment 'branch11' names parent 'gone0000', which no segment in the tree carries`,
    });
  });

  it('AC-8: a directory of valid segments with no manifest is malformed, not given a default seed', () => {
    const read = assembleTree(without(base(), TREE_MANIFEST_FILE_NAME));
    expect(read).toEqual({ status: 'malformed', message: `the tree has no ${TREE_MANIFEST_FILE_NAME}` });
  });

  const malformedCases: Array<[name: string, files: () => TreeFiles, message: RegExp]> = [
    ['an older manifest version', () => rewrite(base(), TREE_MANIFEST_FILE_NAME, (m) => (m['version'] = 2)), /unknown test tree version 2/],
    ['a manifest that is not JSON', () => ({ ...base(), [TREE_MANIFEST_FILE_NAME]: '{ nope' }), /manifest\.json is not valid JSON/],
    ['a manifest missing its seed', () => rewrite(base(), TREE_MANIFEST_FILE_NAME, (m) => delete m['seed']), /'seed' must be an integer/],
    ['a manifest holding the tree shape', () => rewrite(base(), TREE_MANIFEST_FILE_NAME, (m) => (m['segments'] = [])), /unknown key 'segments' in manifest\.json/],
    ['a file that is neither manifest nor segment', () => ({ ...base(), 'notes.txt': 'hi' }), /'notes\.txt' is neither/],
    ['a segment that is not JSON', () => ({ ...base(), 'branch11.json': '{' }), /'branch11\.json' is not valid JSON/],
    ['a segment whose id is not its file name', () => rewrite(base(), 'branch11.json', (s) => (s['id'] = 'other000')), /named by its id/],
    ['a segment with a parent and no ordinal', () => rewrite(base(), 'branch11.json', (s) => delete s['ordinal']), /both 'parent' and 'ordinal', or neither/],
    ['a negative ordinal', () => rewrite(base(), 'branch11.json', (s) => (s['ordinal'] = -1)), /non-negative integer/],
    ['an unknown segment key', () => rewrite(base(), 'branch11.json', (s) => (s['label'] = 'x')), /unknown key 'label' in 'branch11\.json'/],
    [
      'a persisted card carrying branches — forks are segments at rest',
      () => rewrite(base(), 'branch11.json', (s) => ((s['cards'] as Record<string, unknown>[])[0]['branches'] = [])),
      /unknown key 'branches' in 'branch11\.cards\[0\]'/,
    ],
    [
      'a persisted card carrying the model-only continuation',
      () => rewrite(base(), 'root0000.json', (s) => ((s['cards'] as Record<string, unknown>[])[3]['continuation'] = 'maincont')),
      /unknown key 'continuation' in 'root0000\.cards\[3\]'/,
    ],
    [
      'a turn card without a command',
      // The card keeps its id: the missing command is the only defect.
      () => rewrite(base(), 'branch11.json', (s) => {
        const cards = s['cards'] as Record<string, unknown>[];
        cards[0] = { id: cards[0]['id'], type: 'turn' };
      }),
      /'branch11\.cards\[0\]' is a turn and must carry a non-empty 'command'/,
    ],
    [
      'a card without an id',
      () => rewrite(base(), 'branch11.json', (s) => delete (s['cards'] as Record<string, unknown>[])[0]['id']),
      /'branch11\.cards\[0\]' must carry an 'id' of 8 lowercase letters or digits/,
    ],
    [
      'a card id outside the alphabet',
      () => rewrite(base(), 'branch11.json', (s) => ((s['cards'] as Record<string, unknown>[])[0]['id'] = 'Card-006')),
      /'branch11\.cards\[0\]' must carry an 'id' of 8 lowercase letters or digits/,
    ],
    [
      // branch02's `west` takes branch11's `wait` id. Segments are read in
      // file-name order, so branch02 claims it first.
      'one card id in two segments',
      () => rewrite(base(), 'branch02.json', (s) => ((s['cards'] as Record<string, unknown>[])[0]['id'] = 'card0006')),
      /card id 'card0006' appears in both 'branch02' and 'branch11'/,
    ],
    [
      // root0000's second card (boot, card0002) takes the first's id.
      'one card id twice in one segment',
      () => rewrite(base(), 'root0000.json', (s) => ((s['cards'] as Record<string, unknown>[])[1]['id'] = 'card0001')),
      /card id 'card0001' appears twice in 'root0000'/,
    ],
    [
      // branch11's `wait` takes the id of segment branch02.
      'a card id that is also a segment id',
      () => rewrite(base(), 'branch11.json', (s) => ((s['cards'] as Record<string, unknown>[])[0]['id'] = 'branch02')),
      /card id 'branch02' in 'branch11' is also a segment's id/,
    ],
    ['no root segment', () => rewrite(base(), 'root0000.json', (s) => { s['parent'] = 'branch01'; s['ordinal'] = 5; }), /no root segment/],
    ['two root segments', () => rewrite(base(), 'branch11.json', (s) => { delete s['parent']; delete s['ordinal']; }), /2 root segments/],
    ['two segments at one ordinal', () => rewrite(base(), 'branch02.json', (s) => (s['ordinal'] = 1)), /both descend from 'root0000' at ordinal 1/],
    ['a continuation beside no branch', () => rewrite(without(base(), 'branch11.json'), 'b1cont00.json', () => {}), /last card is not a fork/],
    ['an empty continuation', () => rewrite(base(), 'maincont.json', (s) => (s['cards'] = [])), /continuation segment 'maincont' has no cards/],
    [
      'segments whose parents form a cycle',
      () => ({
        ...base(),
        // Valid cards with ids: the cycle is the only defect.
        'cyclea00.json': JSON.stringify({ id: 'cyclea00', parent: 'cycleb00', ordinal: 1, cards: [turn('a', { id: 'cardcya0' })] }),
        'cycleb00.json': JSON.stringify({ id: 'cycleb00', parent: 'cyclea00', ordinal: 1, cards: [turn('b', { id: 'cardcyb0' })] }),
      }),
      /2 segments cannot be reached from the root/,
    ],
  ];

  it.each(malformedCases)('%s reads as malformed, never a throw', (_name, files, message) => {
    const read = assembleTree(files());
    expect(read.status).toBe('malformed');
    if (read.status !== 'malformed') return;
    expect(read.message).toMatch(message);
  });
});

describe('checkCanonicalTree — the gate against a second writer', () => {
  const canonical = (): TreeFiles => segmentTree(multiLevelTree());

  it('a tree exactly as segmentTree writes it is canonical', () => {
    expect(checkCanonicalTree(canonical())).toEqual({ status: 'canonical' });
  });

  it('names a file re-indented to one space — the measured churn', () => {
    const files = canonical();
    files['branch11.json'] = `${JSON.stringify(JSON.parse(files['branch11.json']), null, 1)}\n`;
    expect(checkCanonicalTree(files)).toEqual({ status: 'non-canonical', files: ['branch11.json'] });
  });

  it('names a file whose keys are in insertion order, not sorted', () => {
    const files = canonical();
    files[TREE_MANIFEST_FILE_NAME] = `${JSON.stringify({ version: TREE_DOCUMENT_VERSION, story: 'fernhill', seed: 42 }, null, 2)}\n`;
    expect(checkCanonicalTree(files)).toEqual({ status: 'non-canonical', files: [TREE_MANIFEST_FILE_NAME] });
  });

  it('names a file missing its trailing newline, and lists several files sorted', () => {
    const files = canonical();
    files['root0000.json'] = files['root0000.json'].trimEnd();
    files['branch02.json'] = files['branch02.json'].trimEnd();
    expect(checkCanonicalTree(files)).toEqual({ status: 'non-canonical', files: ['branch02.json', 'root0000.json'] });
  });

  it('passes an unreadable tree through as the reader reported it, never as non-canonical', () => {
    const { [TREE_MANIFEST_FILE_NAME]: _manifest, ...noManifest } = canonical();
    expect(checkCanonicalTree(noManifest)).toEqual({
      status: 'malformed',
      message: `the tree has no ${TREE_MANIFEST_FILE_NAME}`,
    });
    const newer = canonical();
    newer[TREE_MANIFEST_FILE_NAME] = JSON.stringify({ version: TREE_DOCUMENT_VERSION + 1, story: 'fernhill', seed: 42 });
    const read = checkCanonicalTree(newer);
    expect(read.status).toBe('refused');
    if (read.status !== 'refused') return;
    expect(read.message).toContain(`version ${TREE_DOCUMENT_VERSION + 1}`);
  });

  it('ignores dotfiles beside the segments', () => {
    expect(checkCanonicalTree({ ...canonical(), '.DS_Store': 'x' })).toEqual({ status: 'canonical' });
  });
});

describe('card ids survive every edit but their own deletion (ADR-355 D7, AC-10)', () => {
  it('an insertion above, an assertion edit, and a round trip leave a card’s id where it was', () => {
    const edited = multiLevelTree();
    // The main line's first `north` is card0003, at index 2.
    expect(edited.cards[2].id).toBe('card0003');
    edited.cards.splice(2, 0, turn('wait', { id: 'newcard0' }));
    edited.cards[3].assertions!.contains!.push('Gravel crunches underfoot.');

    const reread = assembled(segmentTree(edited));
    expect(reread.cards[3].id).toBe('card0003');
    expect(reread.cards[3].assertions!.contains).toContain('Gravel crunches underfoot.');
    // Persisted in the card itself, in its own segment's file.
    const root = segmentFiles(segmentTree(edited))['root0000.json'];
    expect((root.cards[3] as TreeCard).id).toBe('card0003');
    // Every other card kept its id too.
    expect(allCards(reread).map((card) => card.id)).toEqual([
      'card0001', 'card0002', 'newcard0', 'card0003', 'card0004',
      'card0005', 'card0006', 'card0007', 'card0008', 'card0009', 'card0010',
    ]);
  });

  it('a newly created card gets an id no other card or segment carries', () => {
    const edited = multiLevelTree();
    edited.cards.push(turn('sleep'));
    expect(ensureSegmentIds(edited, sequentialIds())).toBe(1);
    const minted = edited.cards[edited.cards.length - 1].id;
    expect(minted).toBe('seq00001');
    const others = allCards(edited).slice(0, -1).map((card) => card.id);
    expect(others).not.toContain(minted);
  });
});

describe('the directory name', () => {
  it('is <story-id>.tests, beside the .story file (D3)', () => {
    expect(treeDirectoryNameFor('fernhill')).toBe('fernhill.tests');
  });
});

describe('channelIdsReferencedBy — the capture set both consumers derive', () => {
  it('collects each claimed channel once, in first-use order, branches included', () => {
    const document: TreeDocument = {
      version: 3,
      story: 's',
      seed: 1,
      id: 'root0000',
      cards: [
        { type: 'boot', assertions: { channels: [{ id: 'status', contains: ['x'] }] } },
        {
          type: 'turn',
          command: 'north',
          // No channel claims — contributes nothing.
          assertions: { contains: ['y'] },
          branches: [
            {
              id: 'branch01',
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
                      id: 'branch02',
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
    expect(channelIdsReferencedBy(emptyTreeDocument('s', 1, 'root0000'))).toEqual([]);
  });

  it('a dotted claim id goes out WHOLE — the assembler resolves the base (GH #369)', () => {
    const document: TreeDocument = {
      version: 3,
      story: 's',
      seed: 1,
      id: 'root0000',
      cards: [
        {
          type: 'turn',
          command: 'look',
          assertions: {
            channels: [
              { id: 'info.title', is: 'Mini' },
              { id: 'info.description', is: 'A test.' },
              { id: 'banner.title', is: 'Mini' },
              // A channel whose own id carries a dot: splitting on the first
              // dot named `story`, a channel that does not exist.
              { id: 'story.chapter.title', contains: ['Chapter VI'] },
            ],
          },
        },
      ],
    };
    expect(channelIdsReferencedBy(document)).toEqual([
      'info.title',
      'info.description',
      'banner.title',
      'story.chapter.title',
    ]);
  });
});

describe('splitChannelClaimId — the longest captured channel that prefixes the claim', () => {
  it('splits a single-segment channel and its path', () => {
    expect(splitChannelClaimId('info.title', ['info', 'banner'])).toEqual({
      channelId: 'info',
      channelPath: ['title'],
    });
    expect(splitChannelClaimId('prologue', ['prologue'])).toEqual({
      channelId: 'prologue',
      channelPath: [],
    });
  });

  it('reads a dotted channel id as the channel, not as a path into its first segment (GH #369)', () => {
    expect(splitChannelClaimId('story.chapter.title', ['story.chapter', 'info'])).toEqual({
      channelId: 'story.chapter',
      channelPath: ['title'],
    });
    expect(splitChannelClaimId('story.chapter', ['story.chapter'])).toEqual({
      channelId: 'story.chapter',
      channelPath: [],
    });
  });

  it('prefers the longest prefix when a shorter channel id also matches', () => {
    expect(splitChannelClaimId('story.chapter.title', ['story', 'story.chapter'])).toEqual({
      channelId: 'story.chapter',
      channelPath: ['title'],
    });
  });

  it('a prefix must be dot-bounded — `storyline` is not `story`', () => {
    expect(splitChannelClaimId('storyline.title', ['story'])).toEqual({
      channelId: 'storyline',
      channelPath: ['title'],
    });
  });

  it('falls back to the first segment when nothing captured prefixes the claim', () => {
    expect(splitChannelClaimId('banner.title', [])).toEqual({
      channelId: 'banner',
      channelPath: ['title'],
    });
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
    // The room-less fallback is the branch's sibling position — display only.
    expect(branchLineLabelOf(undefined, 3, 'east')).toBe('branch-3 · east');
    expect(branchLineLabelOf('den', 1, undefined)).toBe('den · (empty)');
  });
});

describe('END STATE cards (ADR-356 D4) — carried through segmentation unchanged', () => {
  const withEnding = (card: Record<string, unknown>) =>
    assembleTree({
      [TREE_MANIFEST_FILE_NAME]: JSON.stringify({ version: TREE_DOCUMENT_VERSION, story: 'mini', seed: 1 }),
      'root0000.json': JSON.stringify({
        id: 'root0000',
        cards: [{ id: 'card0001', type: 'opening' }, { id: 'card0002', type: 'boot' }, { id: 'card0003', ...card }],
      }),
    });

  it('a turn card declares an ending and it round-trips byte-identically', () => {
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('mini', 1, 'root0000'),
      cards: [
        { type: 'opening' },
        { type: 'boot', assertions: { contains: ['Den'] } },
        { type: 'turn', command: 'open the box', ending: 'box-opened', assertions: { contains: ['You win'] } },
      ],
    });
    const files = segmentTree(document);
    expect(files['root0000.json']).toContain('"ending": "box-opened"');
    const read = assembled(files);
    expect(read.cards[2].ending).toBe('box-opened');
    expect(segmentTree(read)).toEqual(files);
  });

  it('only a typed turn can be an END STATE card', () => {
    expect(withEnding({ type: 'boot', ending: 'nope' })).toEqual({
      status: 'malformed',
      message: `'root0000.cards[2]' is type 'boot' and cannot be an END STATE card`,
    });
  });

  it('the ending id is a non-empty string', () => {
    expect(withEnding({ type: 'turn', command: 'wait', ending: '' })).toEqual({
      status: 'malformed',
      message: `'root0000.cards[2].ending' must be a non-empty ending id`,
    });
    expect(withEnding({ type: 'turn', command: 'wait', ending: 7 })).toEqual({
      status: 'malformed',
      message: `'root0000.cards[2].ending' must be a non-empty ending id`,
    });
  });

  it('endingIdsDeclaredBy lists each declared ending once, branches included, in declaration order', () => {
    const document: TreeDocument = withCardIds({
      ...emptyTreeDocument('mini', 1, 'root0000'),
      cards: [
        { type: 'opening' },
        { type: 'boot' },
        {
          type: 'turn',
          command: 'north',
          continuation: 'maincont',
          branches: [
            { id: 'branch01', cards: [{ type: 'turn', command: 'wait', ending: 'dawn-comes' }] },
            { id: 'branch02', cards: [{ type: 'turn', command: 'dig', ending: 'dawn-comes' }] },
          ],
        },
        { type: 'turn', command: 'save the manor', ending: 'fernhill-saved' },
      ],
    });
    expect(endingIdsDeclaredBy(document)).toEqual(['dawn-comes', 'fernhill-saved']);
    expect(endingIdsDeclaredBy(emptyTreeDocument('mini', 1, 'root0000'))).toEqual([]);
  });
});

describe('the manifest\'s `claims` path (ADR-365 D7) — the one optional key beyond ADR-355 D4\'s three', () => {
  const withClaims = (): TreeDocument => ({ ...multiLevelTree(), claims: 'fernhill.claims.chord' });

  it('is written only when the document carries it, and read back where it was', () => {
    const files = segmentTree(withClaims());
    expect(JSON.parse(files[TREE_MANIFEST_FILE_NAME])).toEqual({
      claims: 'fernhill.claims.chord',
      seed: 42,
      story: 'fernhill',
      version: TREE_DOCUMENT_VERSION,
    });
    expect(assembled(files).claims).toBe('fernhill.claims.chord');
    expect(assembled(segmentTree(multiLevelTree())).claims).toBeUndefined();
  });

  it('round-trips byte for byte, and the segments do not change when the claims path does', () => {
    const files = segmentTree(withClaims());
    expect(segmentTree(assembled(files))).toEqual(files);
    const { [TREE_MANIFEST_FILE_NAME]: _manifest, ...segments } = files;
    const { [TREE_MANIFEST_FILE_NAME]: _plain, ...plainSegments } = segmentTree(multiLevelTree());
    expect(segments).toEqual(plainSegments);
  });

  it('must be a non-empty string when present', () => {
    for (const bad of [42, '', null]) {
      const files = segmentTree(multiLevelTree());
      const manifest = JSON.parse(files[TREE_MANIFEST_FILE_NAME]) as Record<string, unknown>;
      manifest['claims'] = bad;
      files[TREE_MANIFEST_FILE_NAME] = JSON.stringify(manifest);
      const read = assembleTree(files);
      expect(read.status).toBe('malformed');
      if (read.status === 'malformed') expect(read.message).toMatch(/'claims' must be a non-empty path when present/);
    }
  });
});
