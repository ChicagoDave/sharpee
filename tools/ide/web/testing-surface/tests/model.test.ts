/**
 * model.test.ts — the tree-session model's contract (ADR-307: the tree IS
 * the model).
 *
 * Pins: always-recording (every delivered turn is a card, D3), the tree's
 * round-trip through the shared segmenter and reader (ADR-355 AC-6), one
 * edit changing one segment file (AC-1), persisted line ids (D5), assertion authoring with
 * narrowing semantics, branching as pure structure (D2/D5), tail-cut and
 * branch-delete (D4/Q-4), the splice model operations (D4), binding replay
 * (restore-by-replay re-derives the board without duplicating the
 * document), derived labels (Q-8), and the authoring undo unit. Every
 * assertion checks model/document state after the mutation, not return
 * values alone.
 */
import { describe, expect, it } from 'vitest';
import {
  assembleTree,
  diffTreeFiles,
  segmentTree,
  TREE_DOCUMENT_VERSION,
  type TreeDocument,
} from '@sharpee/branch-tester/tree-document';
import { TreeSessionModel } from '../src/model';
import { explainGroups } from '../src/character';
import { affordanceGroupsOf, sceneExplainGroups } from '../src/scene';

/** Read the model's files back through the shared reader (the round trip). */
function readBack(model: TreeSessionModel) {
  return assembleTree(model.files());
}

/** Every tree file's bytes together — for "the tree says / never says" checks. */
function treeText(model: TreeSessionModel): string {
  return Object.values(model.files()).join('\n');
}

/** A fresh model with the standard opening: boot look in the Den. */
function bootedModel(): TreeSessionModel {
  const model = new TreeSessionModel('mini', 42);
  model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den' });
  return model;
}

/** Play a typed turn and return its ordinal. */
let nextOrdinal = 100;
function play(model: TreeSessionModel, command: string, room = 'Den'): number {
  nextOrdinal += 1;
  model.addTurn({ ordinal: nextOrdinal, command, boot: false, room });
  return nextOrdinal;
}

describe('always recording (D3) — every turn is a card, the document is live', () => {
  it('the first record seats the opening and the boot look', () => {
    const model = bootedModel();
    expect(model.hasOpening).toBe(true);
    expect(model.document.cards.map(c => c.type)).toEqual(['opening', 'boot']);
    expect(model.cardAt(0)?.type).toBe('opening');
    expect(model.cardAt(1)?.type).toBe('boot');
  });

  it('typed turns append turn cards with their commands', () => {
    const model = bootedModel();
    play(model, 'take lamp');
    play(model, 'north', 'Garden');
    expect(model.document.cards.map(c => [c.type, c.command])).toEqual([
      ['opening', undefined],
      ['boot', undefined],
      ['turn', 'take lamp'],
      ['turn', 'north'],
    ]);
  });

  it('the produced tree round-trips byte-identically through the shared reader (AC-6)', () => {
    const model = bootedModel();
    const ordinal = play(model, 'take lamp');
    model.addContains(ordinal, 'Taken');
    const files = model.files();
    const read = assembleTree(files);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(segmentTree(read.document)).toEqual(files);
  });

  it('files() mints each new card an id once and keeps it — the next call names the same files', () => {
    const model = bootedModel();
    play(model, 'take lamp');
    const first = model.files();
    expect(model.document.cards.every((card) => typeof card.id === 'string')).toBe(true);
    const ids = model.document.cards.map((card) => card.id);
    expect(model.files()).toEqual(first);
    expect(model.document.cards.map((card) => card.id)).toEqual(ids);
  });
});

describe('segment files (ADR-355) — an edit writes only what changed', () => {
  it('an authored claim on one branch changes that branch segment alone (AC-1)', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const east = model.branch(took, 'east')!;
    const alt = play(model, 'east', 'Shed');
    model.activateLine(model.mainLine);
    const west = model.branch(took, 'west')!;
    play(model, 'west', 'Yard');
    const before = model.files();

    model.addContains(alt, 'A shed.');
    const { written, removed } = diffTreeFiles(before, model.files());

    expect(Object.keys(written)).toEqual([`${east}.json`]);
    expect(removed).toEqual([]);
    expect(written[`${east}.json`]).toContain('A shed.');
    expect(model.files()[`${west}.json`]).toBe(before[`${west}.json`]);
  });

  it('deleting a branch removes its segment file and leaves the manifest alone', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const east = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');
    const before = model.files();

    model.deleteBranch(east);
    const { written, removed } = diffTreeFiles(before, model.files());

    expect(removed).toContain(`${east}.json`);
    expect(Object.keys(written)).not.toContain('manifest.json');
    expect(model.files()[`${east}.json`]).toBeUndefined();
  });
});

describe('assertion authoring — claims live in the card', () => {
  it('families author into the card and delete individually', () => {
    const model = bootedModel();
    const n = play(model, 'take lamp');
    model.addContains(n, 'Taken');
    model.addNotContains(n, 'dropped');
    model.addState(n, 'lamp.location = player');
    model.addEvent(n, 'if.event.taken');
    model.addChannel(n, { id: 'room-name', contains: ['Den'] });
    expect(model.claimsOf(n)).toEqual({
      contains: ['Taken'],
      notContains: ['dropped'],
      states: ['lamp.location = player'],
      events: ['if.event.taken'],
      channels: [{ id: 'room-name', contains: ['Den'] }],
    });

    model.removeNotContains(n, 0);
    model.removeState(n, 0);
    model.removeEvent(n, 0);
    model.removeChannel(n, 0);
    expect(model.claimsOf(n)).toEqual({ contains: ['Taken'] });
  });

  it('deleting the last contains leaves the card honestly bare (JSON = source of truth)', () => {
    const model = bootedModel();
    const n = play(model, 'take lamp');
    model.addContains(n, 'Taken');
    model.removeContains(n, 0);
    expect(model.claimsOf(n)).toBeUndefined();
    expect(model.claimsNothing(n)).toBe(false);
  });

  it('recorded assertions persist onto an APPENDED card via the delivery (David 2026-08-10)', () => {
    const model = bootedModel();
    model.addTurn({
      ordinal: 77,
      command: 'north',
      boot: false,
      room: 'Garden',
      assertions: { contains: ['Garden', 'Roses everywhere.'] },
    });
    expect(model.claimsOf(77)).toEqual({ contains: ['Garden', 'Roses everywhere.'] });
    // Deleting one is plain removal — no narrowing machinery, no defaults.
    model.removeContains(77, 0);
    expect(model.claimsOf(77)).toEqual({ contains: ['Roses everywhere.'] });
  });

  it('click-to-assert character fragments persist through the document round trip (ADR-318 D11)', () => {
    const model = bootedModel();
    const n = play(model, 'ask viola about the killer');
    // The exact rows the panel derives fragments from (main.ts assert delegate
    // passes them to addChannel verbatim as `{ id: 'character', contains }`).
    const [group] = explainGroups([{
      turn: 3,
      kind: 'character.author.ledger_mint',
      npcId: 'a05',
      data: { audience: 'a02', factId: 'killer', claimedValue: 'nobody', heldValue: 'viola-wainright' },
    }], () => 'Viola Wainright');
    const fragments = group.lines[0].fragments;
    expect(model.addChannel(n, { id: 'character', contains: [...fragments] })).toBe(true);

    const files = model.files();
    const read = assembleTree(files);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    const card = read.document.cards.find((c) => c.command === 'ask viola about the killer');
    expect(card?.assertions?.channels).toEqual([{
      id: 'character',
      contains: [
        '"kind":"character.author.ledger_mint"',
        '"npcId":"a05"',
        '"factId":"killer"',
        '"claimedValue":"nobody"',
      ],
    }]);
    expect(segmentTree(read.document)).toEqual(files);
  });

  it('click-to-assert scene and affordance lines claim on their OWN channels through the round trip (ADR-320 D12)', () => {
    const model = bootedModel();
    const n = play(model, 'ask nell about the tour');
    // The exact lines the panel derives — the assert delegate passes each
    // line's fragments to addChannel under the line's claimChannel, so a
    // scene line and an affordance line land as two claims on two ids.
    const [sceneGroup] = sceneExplainGroups([{
      turn: 4,
      kind: 'character.exchange.opened',
      data: { exchangeId: 'nell.the-offer', word: 'asks' },
    }], () => undefined);
    const [affordanceGroup] = affordanceGroupsOf({
      'exchange-affordances': [[{
        sceneId: 'scene-1',
        exchangeId: 'nell.the-offer',
        responses: [{ kind: 'verbal', rowId: 'nell.the-offer#0', topic: { kind: 'text', primary: 'yes', aliases: [] } }],
      }]],
    }, () => undefined);
    for (const line of [sceneGroup.lines[0], affordanceGroup.lines[0]]) {
      expect(model.addChannel(n, { id: line.claimChannel, contains: [...line.fragments] })).toBe(true);
    }

    const read = readBack(model);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    const card = read.document.cards.find((c) => c.command === 'ask nell about the tour');
    expect(card?.assertions?.channels).toEqual([
      {
        id: 'scene',
        contains: [
          '"kind":"character.exchange.opened"',
          '"exchangeId":"nell.the-offer"',
          '"word":"asks"',
        ],
      },
      {
        id: 'exchange-affordances',
        contains: [
          '"exchangeId":"nell.the-offer"',
          '"kind":"verbal"',
          '"primary":"yes"',
        ],
      },
    ]);
  });

  it('a recorded skip persists as the explicit [SKIP] demotion', () => {
    const model = bootedModel();
    model.addTurn({ ordinal: 78, command: 'wait', boot: false, skip: true });
    expect(model.claimsNothing(78)).toBe(true);
    expect(treeText(model)).toContain('"skip": true');
  });

  it('a claim-less OPENING fills from the boot delivery on a binding replay (pre-pivot documents heal)', () => {
    const model = bootedModel();
    const n = play(model, 'north', 'Garden');
    model.addContains(n, 'Roses everywhere.');
    // The opening is bare (this harness records without persistence) — the
    // regression: reopening such a document lost the opening claims forever.
    expect(model.claimsOf(0)).toBeUndefined();

    model.beginRebindAll();
    model.addTurn({
      ordinal: 80,
      command: '',
      boot: true,
      openingAssertions: { channels: [{ id: 'info.title', is: 'Mini' }] },
    });
    model.addTurn({ ordinal: 81, command: 'north', boot: false, room: 'Garden' });

    expect(model.claimsOf(0)).toEqual({ channels: [{ id: 'info.title', is: 'Mini' }] });
    // An opening that already speaks is never rewritten.
    model.beginRebindAll();
    model.addTurn({
      ordinal: 85,
      command: '',
      boot: true,
      openingAssertions: { channels: [{ id: 'info.title', is: 'Other' }] },
    });
    expect(model.claimsOf(0)).toEqual({ channels: [{ id: 'info.title', is: 'Mini' }] });
  });

  it('a BINDING delivery never overwrites claims, but FILLS a claim-less card (splice repair)', () => {
    const model = bootedModel();
    const n = play(model, 'north', 'Garden');
    model.addContains(n, 'Roses everywhere.');
    // A spliced-in card: never played, no truth yet.
    const spliced = model.cardAt(n);
    expect(spliced).toBeDefined();
    expect(model.spliceIn(n, 'wait')).toBe(true);
    const before = treeText(model);

    model.beginRebindAll();
    model.addTurn({ ordinal: 90, command: '', boot: true, assertions: { contains: ['boot noise'] } });
    model.addTurn({
      ordinal: 91,
      command: 'north',
      boot: false,
      room: 'Garden',
      assertions: { contains: ['replay noise'] },
    });
    model.addTurn({
      ordinal: 92,
      command: 'wait',
      boot: false,
      assertions: { contains: ['Time passes.'] },
    });

    // The played cards kept their truth; only the spliced void filled. The
    // boot card was recorded bare (this harness plays without persistence),
    // so it fills too — a hand-edited or unrecorded void completes the same
    // way.
    expect(model.claimsOf(91)).toEqual({ contains: ['Roses everywhere.'] });
    expect(model.claimsOf(92)).toEqual({ contains: ['Time passes.'] });
    expect(treeText(model)).not.toBe(before);
    expect(model.claimsOf(90)).toEqual({ contains: ['boot noise'] });
  });

  it('exact captures the literal block and clears back to bare', () => {
    const model = bootedModel();
    const n = play(model, 'look');
    model.setExact(n, ['Den', 'A small square den.']);
    expect(model.claimsOf(n)).toEqual({ exact: ['Den', 'A small square den.'] });
    model.setExact(n, null);
    expect(model.claimsOf(n)).toBeUndefined();
  });

  it('an untouched card stays bare — no empty assertions object survives', () => {
    const model = bootedModel();
    const n = play(model, 'look');
    model.addNotContains(n, 'x');
    model.removeNotContains(n, 0);
    expect(model.claimsOf(n)).toBeUndefined();
    expect(treeText(model)).not.toContain('assertions');
  });
});

describe('branching (D2/D5) — the fork lives ON the card', () => {
  it('refuses the opening, the tip, and unbound cards', () => {
    const model = bootedModel();
    const n = play(model, 'take lamp');
    expect(model.canBranch(0)).toBe(false);      // opening
    expect(model.canBranch(n)).toBe(false);      // the tip — typing continues
    expect(model.canBranch(999)).toBe(false);    // unbound
    expect(model.canBranch(1)).toBe(true);       // the boot look — alternate turn 1
  });

  it('forks on a mid-path card; the alternative records into its own line', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    expect(id).toMatch(/^[a-z0-9]{8}$/);
    expect(id).not.toBe(model.mainLine);
    expect(model.activeLine).toBe(id);
    expect(model.isPending(id)).toBe(true);

    const alt = play(model, 'east', 'Shed');
    expect(model.isPending(id)).toBe(false);
    const forkCard = model.cardAt(took)!;
    expect(forkCard.branches).toHaveLength(1);
    expect(forkCard.branches![0].id).toBe(id);
    expect(forkCard.branches![0].cards).toEqual([{ type: 'turn', command: 'east' }]);
    expect(model.isTurnVisible(alt)).toBe(true);
  });

  it('the lineage cut: the main continuation hides while the branch is viewed, and returns', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    const north = play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    const alt = play(model, 'east', 'Shed');

    expect(model.isTurnVisible(north)).toBe(false);
    expect(model.visibleOrdinals()).toEqual([0, 1, took, alt]);

    model.activateLine(model.mainLine);
    expect(model.isTurnVisible(north)).toBe(true);
    expect(model.isTurnVisible(alt)).toBe(false);
    expect(model.branchPointsOnPath()).toEqual([
      { ordinal: took, lineId: model.mainLine, siblings: [id] },
    ]);
  });

  it('replay scripts: prefix through the fork card, own commands after', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');
    play(model, 'up', 'Loft');

    expect(model.prefixCommandsOf(id)).toEqual(['take lamp']);
    expect(model.ownCommandsOf(id)).toEqual(['east', 'up']);
    expect(model.fullPathCommandsOf(id)).toEqual(['take lamp', 'east', 'up']);
    expect(model.pathStepsOf(id)).toEqual([
      { command: 'take lamp', lineId: model.mainLine, index: 0 },
      { command: 'east', lineId: id, index: 0 },
      { command: 'up', lineId: id, index: 1 },
    ]);
  });
});

describe('derived labels (Q-8) — computed, never persisted', () => {
  it('labels the main line from its opening room and a branch from fork room + first command', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    expect(model.labelOf(id)).toBe('den · east');   // pending command names it
    play(model, 'east', 'Shed');
    expect(model.labelOf(model.mainLine)).toBe('opening-den');
    expect(model.labelOf(id)).toBe('den · east');
    expect(treeText(model)).not.toContain('opening-den');
  });

  it('two lines sharing a derived label keep distinct ids (GH #494)', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const first = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');
    model.activateLine(model.mainLine);
    const second = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');

    expect(model.labelOf(first)).toBe(model.labelOf(second));
    expect(first).not.toBe(second);
    expect(model.lineIds()).toEqual([model.mainLine, first, second]);
  });

  it('a room-less branch label falls back to its sibling position, not its id', () => {
    // No delivery carries a room, so no fork room is known.
    const model = new TreeSessionModel('mini', 42);
    model.addTurn({ ordinal: 1, command: '', boot: true });
    model.addTurn({ ordinal: 2, command: 'take lamp', boot: false });
    model.addTurn({ ordinal: 3, command: 'north', boot: false });
    model.branch(2, 'east');
    model.addTurn({ ordinal: 4, command: 'east', boot: false });
    model.activateLine(model.mainLine);
    const second = model.branch(2, 'west')!;

    expect(model.labelOf(second)).toBe('branch-2 · west');
  });

  it('re-visiting a line rebinds its own cards instead of appending a second copy (GH #541)', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    const first = play(model, 'east', 'Shed');
    play(model, 'up', 'Loft');
    const before = model.files();

    // A second visit: the driver replays the prefix suppressed (nothing is
    // delivered for it) and types the line's own commands live again.
    model.activateLine(model.mainLine);
    model.activateLine(id);
    model.beginRebind(id);
    const again = play(model, 'east', 'Shed');
    const up = play(model, 'up', 'Loft');

    // The document holds each command once — byte for byte what it held.
    expect(model.ownCommandsOf(id)).toEqual(['east', 'up']);
    expect(model.files()).toEqual(before);
    // The new turns are the ones on the board; the first visit's are gone.
    expect(model.isTurnVisible(again)).toBe(true);
    expect(model.isTurnVisible(first)).toBe(false);
    // The prefix line kept its bindings — its cards were never redelivered.
    expect(model.visibleOrdinals()).toEqual([0, 1, took, again, up]);
  });

  it('beginRebind on an unknown line changes nothing', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    model.beginRebind('nosuchid');
    expect(model.visibleOrdinals()).toEqual([0, 1, took]);
  });
});

describe('branch delete and tail-cut (D4/Q-4)', () => {
  it('chip delete removes the branch and every descendant; the viewed parent survives', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const outer = model.branch(took, 'east')!;
    const altEast = play(model, 'east', 'Shed');
    const inner = model.branch(altEast, 'down')!;
    play(model, 'down', 'Cellar');

    const result = model.deleteBranch(outer)!;
    expect(result).toEqual({ parentLine: model.mainLine, wasActive: true });
    expect(model.activeLine).toBe(model.mainLine);
    expect(model.lineIds()).toEqual([model.mainLine]);
    expect(model.cardAt(took)!.branches).toBeUndefined();
    expect(model.lineIds().includes(inner)).toBe(false);
    expect(treeText(model)).not.toContain('east');
  });

  it('the main line never deletes', () => {
    const model = bootedModel();
    expect(model.deleteBranch(model.mainLine)).toBeNull();
  });

  it('tail-cut discards the card and everything after it, branches included', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    const north = play(model, 'north', 'Garden');
    model.branch(north, 'east');
    play(model, 'east', 'Shed');
    model.activateLine(model.mainLine);
    const south = play(model, 'south', 'Den');

    const result = model.tailCut(north)!;
    expect(result).toEqual({ lineId: model.mainLine, activeSurvived: true });
    expect(model.document.cards.map(c => [c.type, c.command])).toEqual([
      ['opening', undefined],
      ['boot', undefined],
      ['turn', 'take lamp'],
    ]);
    expect(model.cardAt(north)).toBeUndefined();
    expect(model.cardAt(south)).toBeUndefined();
    expect(model.lineIds()).toEqual([model.mainLine]);
    expect(model.cardAt(took)).toBeDefined();
  });

  it('cutting under a VIEWED branch falls the view back to the cut line', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');
    expect(model.activeLine).toBe(id);

    // Cut the fork card itself from the main line: the branch rides it.
    const result = model.tailCut(took)!;
    expect(result.activeSurvived).toBe(false);
    expect(model.activeLine).toBe(model.mainLine);
    expect(model.lineIds()).toEqual([model.mainLine]);
  });

  it('the opening and the boot look never tail-cut', () => {
    const model = bootedModel();
    play(model, 'take lamp');
    expect(model.tailCut(0)).toBeNull();
    expect(model.tailCut(1)).toBeNull();
  });
});

describe('splice (D4) — repairs validated by whole-path replay', () => {
  it('splice-in inserts an unbound turn; the rebind replay binds it in order', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    const north = play(model, 'north', 'Garden');
    model.addContains(north, 'Roses everywhere');

    expect(model.spliceIn(took, 'open door')).toBe(true);
    expect(model.document.cards.map(c => c.command)).toEqual(
      [undefined, undefined, 'take lamp', 'open door', 'north'],
    );

    // The whole-path replay re-derives every downstream card (D4): rebind
    // and deliver the repaired command stream fresh.
    model.beginRebindAll();
    model.addTurn({ ordinal: 11, command: '', boot: true, room: 'Den' });
    model.addTurn({ ordinal: 12, command: 'take lamp', boot: false, room: 'Den' });
    model.addTurn({ ordinal: 13, command: 'open door', boot: false, room: 'Den' });
    model.addTurn({ ordinal: 14, command: 'north', boot: false, room: 'Garden' });
    expect(model.cardAt(13)).toBe(model.document.cards[3]);
    // The downstream card kept its authored claim through the repair.
    expect(model.claimsOf(14)).toEqual({ contains: ['Roses everywhere'] });
  });

  it('splice-out removes one card; its branches go with it', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    play(model, 'east', 'Shed');
    model.activateLine(model.mainLine);

    expect(model.spliceOut(took)).toBe(true);
    expect(model.document.cards.map(c => c.command)).toEqual(
      [undefined, undefined, 'north'],
    );
    expect(model.lineIds().includes(id)).toBe(false);
  });
});

describe('opening self-heal — a claim-less opening gains the boot claims (GH #280)', () => {
  // The fixture below uses `assertions: {}` deliberately: that is what EVERY
  // recorded tree writes for an unclaimed opening. The suite's other fixtures
  // use `{ type: 'opening' }` with assertions UNDEFINED, which is why the
  // self-heal looked covered while the three shipped trees never once healed —
  // the guard tested `=== undefined` and `{}` is not undefined.
  const RECORDED: TreeDocument = {
    version: TREE_DOCUMENT_VERSION,
    story: 'mini',
    seed: 42,
    id: 'root0000',
    cards: [
      { type: 'opening', assertions: {} },
      { type: 'boot' },
    ],
  };

  it('fills an opening recorded as `assertions: {}` on first replay', () => {
    const model = new TreeSessionModel('mini', 42);
    model.load(structuredClone(RECORDED));
    model.addTurn({
      ordinal: 1, command: '', boot: true, room: 'Den',
      openingAssertions: { channels: [{ id: 'info.title', is: 'The Ides of March' }] },
    });
    expect(model.document.cards[0].assertions).toEqual({
      channels: [{ id: 'info.title', is: 'The Ides of March' }],
    });
  });

  it('never overwrites an opening that already carries claims', () => {
    const model = new TreeSessionModel('mini', 42);
    model.load(structuredClone({
      ...RECORDED,
      cards: [
        { type: 'opening', assertions: { channels: [{ id: 'info.title', is: 'Authored' }] } },
        { type: 'boot' },
      ],
    } as TreeDocument));
    model.addTurn({
      ordinal: 1, command: '', boot: true, room: 'Den',
      openingAssertions: { channels: [{ id: 'info.title', is: 'Recorded' }] },
    });
    expect(model.document.cards[0].assertions).toEqual({
      channels: [{ id: 'info.title', is: 'Authored' }],
    });
  });
});

describe('binding replay — restore re-derives the board from the document', () => {
  const PERSISTED: TreeDocument = {
    version: TREE_DOCUMENT_VERSION,
    story: 'mini',
    seed: 42,
    id: 'root0000',
    cards: [
      { type: 'opening' },
      { type: 'boot' },
      { type: 'turn', command: 'take lamp', assertions: { contains: ['Taken'] } },
      {
        type: 'turn',
        command: 'north',
        branches: [
          { id: 'branch01', cards: [{ type: 'turn', command: 'east' }] },
        ],
      },
    ],
  };

  it('delivered turns bind to the document cards instead of appending', () => {
    const model = new TreeSessionModel('mini', 42);
    model.load(structuredClone(PERSISTED));
    model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den' });
    model.addTurn({ ordinal: 2, command: 'take lamp', boot: false, room: 'Den' });
    model.addTurn({ ordinal: 3, command: 'north', boot: false, room: 'Garden' });
    expect(model.document.cards).toHaveLength(4);
    expect(model.hasOpening).toBe(true);
    expect(model.claimsOf(2)).toEqual({ contains: ['Taken'] });

    // The branch line binds its own cards when it becomes active.
    model.activateLine('branch01');
    model.addTurn({ ordinal: 7, command: 'east', boot: false, room: 'Shed' });
    expect(model.cardAt(7)?.command).toBe('east');
    expect(model.document.cards[3].branches![0].cards).toHaveLength(1);

    // Fully bound: the next delivered turn appends — play continues.
    model.activateLine(model.mainLine);
    model.addTurn({ ordinal: 9, command: 'south', boot: false, room: 'Den' });
    expect(model.document.cards).toHaveLength(5);
    expect(model.labelOf('branch01')).toBe('garden · east');
  });

  it('a loaded tree keeps its persisted ids: the root is the main line, each branch its own line', () => {
    const model = new TreeSessionModel('mini', 42);
    model.load(structuredClone(PERSISTED));

    expect(model.mainLine).toBe('root0000');
    expect(model.activeLine).toBe('root0000');
    expect(model.lineIds()).toEqual(['root0000', 'branch01']);
    expect(model.lineParentOf('branch01')).toBe('root0000');
    expect(Object.keys(model.files())).toContain('branch01.json');
  });
});

describe('undo — authoring gestures only', () => {
  it('captures and restores card assertions across the whole tree', () => {
    const model = bootedModel();
    const took = play(model, 'take lamp');
    play(model, 'north', 'Garden');
    const id = model.branch(took, 'east')!;
    const alt = play(model, 'east', 'Shed');

    const before = model.captureAuthoring();
    model.addContains(took, 'Taken');
    model.addContains(alt, 'A shed.');
    expect(model.claimsOf(took)).toBeDefined();

    model.restoreAuthoring(before);
    expect(model.claimsOf(took)).toBeUndefined();
    expect(model.claimsOf(alt)).toBeUndefined();
    expect(model.lineIds().includes(id)).toBe(true);
  });
});

describe('END STATE cards (ADR-356 D4) — the story ended on this turn', () => {
  it('a delivery carrying the ending id stamps the appended card, and the card cannot fork', () => {
    const model = bootedModel();
    play(model, 'north', 'Garden');
    const last = ++nextOrdinal;
    model.addTurn({ ordinal: last, command: 'open the box', boot: false, room: 'Garden', ending: 'box-opened' });
    expect(model.cardAt(last)?.ending).toBe('box-opened');
    expect(model.canBranch(last)).toBe(false);
    expect(model.canBranch(last - 1)).toBe(true);
    expect(model.document.cards.at(-1)).toEqual({ type: 'turn', command: 'open the box', ending: 'box-opened' });
  });

  it('a binding replay fills a missing ending and never overwrites a declared one', () => {
    const document: TreeDocument = {
      version: TREE_DOCUMENT_VERSION,
      story: 'mini',
      seed: 42,
      id: 'root0000',
      cards: [
        { type: 'opening' },
        { type: 'boot' },
        { type: 'turn', command: 'north' },
        { type: 'turn', command: 'open the box' },
        { type: 'turn', command: 'dig', ending: 'authored' },
      ],
    };
    const model = new TreeSessionModel('mini', 42);
    model.load(document);
    model.beginRebindAll();
    model.activateLine(model.mainLine);
    model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den' });
    model.addTurn({ ordinal: 2, command: 'north', boot: false, room: 'Garden' });
    model.addTurn({ ordinal: 3, command: 'open the box', boot: false, room: 'Garden', ending: 'box-opened' });
    model.addTurn({ ordinal: 4, command: 'dig', boot: false, room: 'Garden', ending: 'replayed' });
    expect(model.document.cards[3]).toEqual({ type: 'turn', command: 'open the box', ending: 'box-opened' });
    expect(model.document.cards[4]).toEqual({ type: 'turn', command: 'dig', ending: 'authored' });
  });

  it('the ending survives the document round trip through the shared reader', () => {
    const model = bootedModel();
    const last = ++nextOrdinal;
    model.addTurn({ ordinal: last, command: 'open the box', boot: false, ending: 'box-opened' });
    const read = readBack(model);
    expect(read.status).toBe('ok');
    if (read.status !== 'ok') return;
    expect(read.document.cards.at(-1)?.ending).toBe('box-opened');
  });

  it('a boot delivery never becomes an END STATE card', () => {
    const model = new TreeSessionModel('mini', 42);
    model.addTurn({ ordinal: 1, command: '', boot: true, room: 'Den', ending: 'instant-death' });
    expect(model.cardAt(1)).toEqual({ type: 'boot' });
  });
});
