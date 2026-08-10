/**
 * model.test.ts — pins the segment/lineage/naming semantics of the testing
 * play surface's SessionModel (ADR-306 Phases 3–5, design §2–§6). Every
 * assertion checks model state after the mutation, not return values alone.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { SessionModel, slugify, type SessionSnapshot } from '../src/model';

/** Plays the mock's Fernhill walk: boot look + three norths. */
function playedSession(): SessionModel {
  const m = new SessionModel();
  m.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
  m.addTurn({ ordinal: 2, command: 'north', room: 'Gravel Drive', boot: false });
  m.addTurn({ ordinal: 3, command: 'north', room: 'Fountain Court', boot: false });
  m.addTurn({ ordinal: 4, command: 'north', room: 'Entrance Hall', boot: false });
  m.addTurn({ ordinal: 5, command: 'north', room: 'Cold Passage', boot: false });
  return m;
}

/**
 * A session with one landed branch (design §6): turns 1–5 ticked closed,
 * forked at 3 with `east`, whose replayed turn landed as ordinal 13
 * (replay consumed 9–12 — the model never sees suppressed ordinals).
 */
function forkedSession(): SessionModel {
  const m = playedSession();
  m.tick(1);
  m.tick(5);
  expect(m.fork(3, 'east')).toBe(2);
  m.addTurn({ ordinal: 13, command: 'east', room: 'Boiler Shed', boot: false, lineage: 2 });
  return m;
}

describe('turns and the opening', () => {
  it('seats the opening as ordinal 0 when the first turn arrives', () => {
    const m = new SessionModel();
    m.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
    expect(m.hasOpening).toBe(true);
    expect(m.turns.map(t => t.ordinal)).toEqual([0, 1]);
    expect(m.turns[0].command).toBe('');
  });

  it('fence clears turns, segments, skips, and the whole fork tree', () => {
    const m = forkedSession();
    m.fence();
    expect(m.turns).toHaveLength(0);
    expect(m.segments).toHaveLength(0);
    expect(m.hasOpening).toBe(false);
    expect(m.lineages).toEqual([{ id: 1 }]);
    expect(m.activeLineage).toBe(1);
  });

  it('reseats the opening for the lineage after a fence', () => {
    const m = playedSession();
    m.fence();
    m.addTurn({ ordinal: 5, command: 'look', room: 'Iron Gates', boot: true });
    expect(m.turns.map(t => t.ordinal)).toEqual([0, 5]);
  });
});

describe('ticking ranges (design §3)', () => {
  let m: SessionModel;
  beforeEach(() => { m = playedSession(); });

  it('start tick opens a segment; end tick closes it; between is implied', () => {
    expect(m.tick(2)).toBe('started');
    expect(m.openSegment()).toEqual({ start: 2, end: null, collapsed: false, lineage: 1 });
    expect(m.tick(4)).toBe('closed');
    expect(m.openSegment()).toBeUndefined();
    expect(m.segmentOf(3)).toEqual({ start: 2, end: 4, collapsed: false, lineage: 1 });
  });

  it('a tick below the open start extends the range downward', () => {
    m.tick(3);
    expect(m.tick(1)).toBe('extended');
    expect(m.openSegment()).toEqual({ start: 1, end: null, collapsed: false, lineage: 1 });
  });

  it('the opening (ordinal 0) starts a segment at the true beginning', () => {
    expect(m.tick(0)).toBe('started');
    m.tick(2);
    expect(m.segmentOf(0)).toEqual({ start: 0, end: 2, collapsed: false, lineage: 1 });
  });

  it('ticking an assigned ordinal is a noop', () => {
    m.tick(2);
    m.tick(4);
    expect(m.tick(3)).toBe('noop');
    expect(m.segments).toHaveLength(1);
  });

  it('ticking an unknown ordinal is a noop', () => {
    expect(m.tick(9)).toBe('noop');
    expect(m.segments).toHaveLength(0);
  });

  it('the next tick after a close starts the next segment', () => {
    m.tick(1);
    m.tick(2);
    expect(m.tick(3)).toBe('started');
    expect(m.openSegment()).toEqual({ start: 3, end: null, collapsed: false, lineage: 1 });
  });

  it('an extension that would swallow a neighbouring segment is refused', () => {
    m.tick(1);
    m.tick(2);   // closed 1–2
    m.tick(4);   // open at 4
    expect(m.tick(3)).toBe('extended'); // 3 is free — fine
    m.untick(3); // drop that segment again
    m.tick(4);
    expect(m.openSegment()?.start).toBe(4);
  });

  it('closing over a later segment is refused', () => {
    m.tick(3);
    m.tick(4);   // closed 3–4
    m.tick(1);   // open at 1
    expect(m.tick(4)).toBe('noop'); // would swallow 3–4
    expect(m.openSegment()).toEqual({ start: 1, end: null, collapsed: false, lineage: 1 });
  });
});

describe('unticking', () => {
  let m: SessionModel;
  beforeEach(() => { m = playedSession(); });

  it('a lone start untick drops the open segment', () => {
    m.tick(2);
    m.untick(2);
    expect(m.segments).toHaveLength(0);
  });

  it('an end untick reopens the range', () => {
    m.tick(2);
    m.tick(3);
    m.untick(3);
    expect(m.openSegment()).toEqual({ start: 2, end: null, collapsed: false, lineage: 1 });
  });

  it('a closed start untick drops the segment whole', () => {
    m.tick(2);
    m.tick(3);
    m.untick(2);
    expect(m.segments).toHaveLength(0);
  });
});

describe('collapse, merge, split (design §3)', () => {
  let m: SessionModel;
  beforeEach(() => { m = playedSession(); });

  it('only a closed range collapses', () => {
    m.tick(2);
    const open = m.openSegment()!;
    m.setCollapsed(open, true);
    expect(open.collapsed).toBe(false);
    m.tick(3);
    m.setCollapsed(open, true);
    expect(open.collapsed).toBe(true);
  });

  it('merge-up folds into the parent and marks gap turns [SKIP]', () => {
    m.tick(1);
    m.tick(2);   // parent 1–2
    m.tick(4);
    m.tick(5);   // child 4–5, gap at 3
    const child = m.segmentOf(4)!;
    expect(m.mergeUp(child)).toBe(true);
    expect(m.segments).toHaveLength(1);
    expect(m.segmentOf(3)).toEqual({ start: 1, end: 5, collapsed: false, lineage: 1 });
    expect(m.isSkipped(3)).toBe(true);
    expect(m.isSkipped(2)).toBe(false);
  });

  it('merging an open segment leaves the merged range open', () => {
    m.tick(1);
    m.tick(2);   // parent 1–2
    m.tick(4);   // open child at 4
    const child = m.segmentOf(4)!;
    expect(m.mergeUp(child)).toBe(true);
    expect(m.openSegment()).toEqual({ start: 1, end: null, collapsed: false, lineage: 1 });
    expect(m.isSkipped(3)).toBe(true);
  });

  it('a root with nothing earlier cannot merge', () => {
    m.tick(2);
    m.tick(3);
    expect(m.mergeUp(m.segmentOf(2)!)).toBe(false);
    expect(m.segments).toHaveLength(1);
  });

  it('split-here cuts before the ordinal; the tail continues from the head', () => {
    m.tick(1);
    m.tick(4);
    expect(m.splitAt(3)).toBe(true);
    const head = m.segmentOf(1)!;
    const tail = m.segmentOf(3)!;
    expect(head).toEqual({ start: 1, end: 2, collapsed: false, lineage: 1 });
    expect(tail).toEqual({ start: 3, end: 4, collapsed: false, lineage: 1 });
    expect(m.parentOf(tail)).toBe(head);
  });

  it('split refuses an open range and the first command', () => {
    m.tick(1);
    expect(m.splitAt(2)).toBe(false); // open
    m.tick(4);
    expect(m.splitAt(1)).toBe(false); // nothing before it to keep
    expect(m.segments).toHaveLength(1);
  });

  it('split and merge round-trip', () => {
    m.tick(1);
    m.tick(4);
    m.splitAt(3);
    const tail = m.segmentOf(3)!;
    m.mergeUp(tail);
    expect(m.segments).toHaveLength(1);
    expect(m.segmentOf(2)).toEqual({ start: 1, end: 4, collapsed: false, lineage: 1 });
    // No gap existed, so nothing gained a [SKIP] on the way back.
    expect([1, 2, 3, 4].filter(n => m.isSkipped(n))).toEqual([]);
  });
});

describe('auto-naming (design §4)', () => {
  let m: SessionModel;
  beforeEach(() => { m = playedSession(); });

  it('routes name as start-to-end with the turn count', () => {
    m.tick(2);
    m.tick(3);
    // Player stood at Iron Gates (turn 1's room) when turn 2 began.
    expect(m.titleOf(m.segmentOf(2)!)).toBe('iron-gates-to-fountain-court-2');
  });

  it('a range from the beginning starts at the boot room', () => {
    m.tick(0);
    m.tick(3);
    expect(m.titleOf(m.segmentOf(0)!)).toBe('iron-gates-to-fountain-court-3');
  });

  it('a same-room loop collapses to one location', () => {
    const loop = new SessionModel();
    loop.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
    loop.addTurn({ ordinal: 2, command: 'north', room: 'Gravel Drive', boot: false });
    loop.addTurn({ ordinal: 3, command: 'south', room: 'Iron Gates', boot: false });
    loop.tick(2);
    loop.tick(3);
    expect(loop.titleOf(loop.segmentOf(2)!)).toBe('iron-gates-2');
  });

  it('duplicate routes suffix -2, earlier segment keeping the base name', () => {
    const back = new SessionModel();
    back.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
    back.addTurn({ ordinal: 2, command: 'north', room: 'Gravel Drive', boot: false });
    back.addTurn({ ordinal: 3, command: 'south', room: 'Iron Gates', boot: false });
    back.addTurn({ ordinal: 4, command: 'north', room: 'Gravel Drive', boot: false });
    back.tick(2);
    back.tick(3);   // closed 2–3
    back.splitAt(3); // → 2–2 (iron-gates-to-gravel-drive-1) and 3–3
    back.tick(4);    // open at 4 — same route as 2–2: gates → drive, 1 turn
    expect(back.titleOf(back.segmentOf(2)!)).toBe('iron-gates-to-gravel-drive-1');
    expect(back.titleOf(back.segmentOf(3)!)).toBe('gravel-drive-to-iron-gates-1');
    expect(back.titleOf(back.segmentOf(4)!)).toBe('iron-gates-to-gravel-drive-1-2');
  });

  it('slugify collapses punctuation and case', () => {
    expect(slugify("Mrs Kettle's Kitchen")).toBe('mrs-kettle-s-kitchen');
    expect(slugify('Boiler Shed')).toBe('boiler-shed');
  });
});

describe('lineages and branching (design §6)', () => {
  it('fork mid-segment auto-splits: prefix parent collapses, main continues', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(5);
    expect(m.fork(3, 'east')).toBe(2);
    const parent = m.segmentOf(1)!;
    const main = m.segmentOf(3)!;
    expect(parent).toEqual({ start: 1, end: 2, collapsed: true, lineage: 1 });
    expect(main).toEqual({ start: 3, end: 5, collapsed: false, lineage: 1 });
    expect(m.lineageInfo(2)).toEqual({
      id: 2, parentId: 1, forkAt: 3, pendingCommand: 'east',
    });
    expect(m.activeLineage).toBe(2);
  });

  it('the pending branch names itself from the typed command', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(5);
    m.fork(3, 'east');
    expect(m.pendingTitleOf(2)).toBe('gravel-drive-east-1');
  });

  it('the landed alternate becomes the branch\'s closed single-turn segment', () => {
    const m = forkedSession();
    const branch = m.segmentOf(13)!;
    expect(branch).toEqual({ start: 13, end: 13, collapsed: false, lineage: 2 });
    expect(m.lineageInfo(2)?.pendingCommand).toBeUndefined();
    // Route-derived sibling name, exactly the design §4 example.
    expect(m.titleOf(branch)).toBe('gravel-drive-to-boiler-shed-1');
    // It continues from the auto-split prefix, across lineages.
    expect(m.parentOf(branch)).toBe(m.segmentOf(1));
  });

  it('a later fork at the same point adds a sibling without re-splitting', () => {
    const m = forkedSession();
    expect(m.fork(3, 'west')).toBe(3);
    expect(m.segments.filter(s => s.lineage === 1)).toHaveLength(2); // no new split
    expect(m.branchPoints()).toEqual([{ parentId: 1, at: 3, siblings: [2, 3] }]);
  });

  it('forking a branch at its own first turn joins the original point', () => {
    const m = forkedSession();
    m.tick(13); // noop — already its own segment; keep gestures honest
    expect(m.fork(13, 'west')).toBe(3);
    expect(m.branchPoints()).toEqual([{ parentId: 1, at: 3, siblings: [2, 3] }]);
  });

  it('a turn with nothing shared before it cannot fork', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(5);
    expect(m.fork(1, 'east')).toBeNull();
    expect(m.lineages).toHaveLength(1);
    expect(m.segments).toEqual([
      { start: 1, end: 5, collapsed: false, lineage: 1 },
    ]);
  });

  it('an open segment cannot fork', () => {
    const m = playedSession();
    m.tick(2);
    expect(m.fork(2, 'east')).toBeNull();
    expect(m.lineages).toHaveLength(1);
  });

  it('lineage stickiness: main turns past the fork hide while a branch is active', () => {
    const m = forkedSession();
    expect(m.activeLineage).toBe(2);
    expect([0, 1, 2].every(n => m.isTurnVisible(n))).toBe(true);  // shared prefix
    expect([3, 4, 5].some(n => m.isTurnVisible(n))).toBe(false);  // sticky to main
    expect(m.isTurnVisible(13)).toBe(true);
  });

  it('switching back restores the other lineage — nothing deleted by viewing', () => {
    const m = forkedSession();
    expect(m.activateLineage(1)).toBe(true);
    expect([1, 2, 3, 4, 5].every(n => m.isTurnVisible(n))).toBe(true);
    expect(m.isTurnVisible(13)).toBe(false);
    expect(m.segmentOf(13)).toBeDefined(); // branch structure intact
  });

  it('replay scripts: ancestry commands exclude boot looks', () => {
    const m = forkedSession();
    expect(m.ancestryCommandsBefore(3)).toEqual(['north']); // turn 1 is the boot look
    expect(m.pathCommandsOf(2)).toEqual(['north', 'east']);
    expect(m.pathCommandsOf(1)).toEqual(['north', 'north', 'north', 'north']);
  });

  it('ticks never cross lineages', () => {
    const m = forkedSession();
    m.addTurn({ ordinal: 14, command: 'south', room: 'Fountain Court', boot: false, lineage: 2 });
    m.activateLineage(1);
    m.untick(1); // drop the prefix parent so lineage 1 has free turns
    m.untick(3); // drop main — frees 3–5
    m.tick(4);   // open in lineage 1
    expect(m.tick(14)).toBe('noop'); // close in lineage 2 refused
    expect(m.openSegment()).toEqual({ start: 4, end: null, collapsed: false, lineage: 1 });
  });

  it('merge-up refuses a cross-lineage parent', () => {
    const m = forkedSession();
    const branch = m.segmentOf(13)!;
    expect(m.parentOf(branch)?.lineage).toBe(1);
    expect(m.mergeUp(branch)).toBe(false);
    expect(m.segmentOf(13)).toEqual({ start: 13, end: 13, collapsed: false, lineage: 2 });
  });

  it('gapped lineage ordinals: counts and splits use the lineage\'s own turns', () => {
    const m = forkedSession();
    m.activateLineage(1);
    // Main continues after a switch-replay: fresh ordinal far past the gap.
    m.addTurn({ ordinal: 25, command: 'north', room: 'Long Gallery', boot: false, lineage: 1 });
    m.untick(3); // drop main 3–5 so the range can re-form across the gap
    m.tick(3);
    m.tick(25);  // closed 3–25: turns 3, 4, 5, 25 — four turns, not twenty-three
    expect(m.titleOf(m.segmentOf(3)!)).toBe('gravel-drive-to-long-gallery-4');
    expect(m.splitAt(25)).toBe(true);
    expect(m.segmentOf(3)).toEqual({ start: 3, end: 5, collapsed: false, lineage: 1 });
    expect(m.segmentOf(25)).toEqual({ start: 25, end: 25, collapsed: false, lineage: 1 });
    expect(m.titleOf(m.segmentOf(25)!)).toBe('cold-passage-to-long-gallery-1');
  });

  it('turnsForCompose walks the path between parent and segment end', () => {
    const m = forkedSession();
    const branch = m.segmentOf(13)!;
    expect(m.turnsForCompose(branch).map(t => t.ordinal)).toEqual([13]);
    m.activateLineage(1);
    const main = m.segmentOf(3)!;
    expect(m.turnsForCompose(main).map(t => t.ordinal)).toEqual([3, 4, 5]);
  });

  it('registerLineage refuses duplicates; activateLineage refuses unknowns', () => {
    const m = playedSession();
    expect(m.registerLineage({ id: 2, parentId: 1, forkAt: 3 })).toBe(true);
    expect(m.registerLineage({ id: 2, parentId: 1, forkAt: 4 })).toBe(false);
    expect(m.activateLineage(9)).toBe(false);
    expect(m.activateLineage(2)).toBe(true);
    expect(m.activeLineage).toBe(2);
  });
});

describe('authoring claims (design §5)', () => {
  let m: SessionModel;
  beforeEach(() => { m = playedSession(); });

  it('authoring on an unincluded turn includes it', () => {
    expect(m.addContains(2, 'gravel')).toBe(true);
    expect(m.openSegment()).toEqual({ start: 2, end: null, collapsed: false, lineage: 1 });
    expect(m.claimsOf(2).contains).toEqual(['gravel']);
  });

  it('authoring joins the open segment instead of starting a second', () => {
    m.tick(1);
    m.addState(3, 'kettle.location = hall');
    expect(m.segments).toHaveLength(1);
    expect(m.segmentOf(3)).toEqual({ start: 1, end: 3, collapsed: false, lineage: 1 });
    expect(m.claimsOf(3).states).toEqual(['kettle.location = hall']);
  });

  it('authoring un-demotes a [SKIP] turn', () => {
    m.tick(1);
    m.tick(2);
    m.tick(4);
    m.mergeUp(m.segmentOf(4)!); // gap 3 → [SKIP]
    expect(m.isSkipped(3)).toBe(true);
    m.addEvent(3, 'if.event.actor_moved');
    expect(m.isSkipped(3)).toBe(false);
    expect(m.claimsOf(3).events).toEqual(['if.event.actor_moved']);
  });

  it('adds on unknown ordinals refuse with no state change', () => {
    expect(m.addContains(9, 'x')).toBe(false);
    expect(m.addChannel(9, { id: 'score', is: 0 })).toBe(false);
    expect(m.segments).toHaveLength(0);
  });

  it('deleting one policy default keeps the other as authored contains', () => {
    m.tick(2);
    m.removeDefault(2, 0, ['Gravel Drive', 'The drive curves…']);
    const claims = m.claimsOf(2);
    expect(claims.contains).toEqual(['The drive curves…']);
    expect(claims.noDefaults).toBe(true);
    expect(m.isSkipped(2)).toBe(false);
  });

  it('a turn pruned to nothing demotes to [SKIP] in place', () => {
    m.tick(2);
    m.addContains(2, 'gravel');
    m.removeContains(2, 0);   // last authored claim, noDefaults now true
    expect(m.isSkipped(2)).toBe(true);
    expect(m.segmentOf(2)).toBeDefined(); // still in range — demoted, not dropped
  });

  it('the opening pruned to nothing claims nothing — never [SKIP]', () => {
    m.tick(0);
    m.addContains(0, 'auction notice');
    m.removeContains(0, 0);
    expect(m.isSkipped(0)).toBe(false);
    expect(m.claimsOf(0).noDefaults).toBe(true);
  });

  it('clearing Exact demotes only when nothing else claims', () => {
    m.tick(2);
    m.setExact(2, true);
    m.removeDefault(2, 0, []); // noDefaults, no contains left
    m.setExact(2, false);
    expect(m.isSkipped(2)).toBe(true);
  });

  it('leaving a segment drops authored claims', () => {
    m.tick(2);
    m.addContains(2, 'gravel');
    m.untick(2); // lone start — segment gone
    expect(m.claimsOf(2).contains).toEqual([]);
  });

  it('a fence clears claims with the lineage', () => {
    m.addContains(2, 'gravel');
    m.fence();
    expect(m.claimsOf(2).contains).toEqual([]);
  });
});

describe('snapshot and restore (ADR-306 D8, position-keyed)', () => {
  /** Driver-style identity map for a linear root session (ordinals 1..k). */
  const identity = (lineage: number, pos: number): number | undefined =>
    lineage === 1 ? pos : undefined;

  it('round-trips segments, the open range, and skips', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(2);
    m.tick(4);            // open child, gap at 3
    m.mergeUp(m.segmentOf(4)!); // 1–open, 3 skipped
    const snap = m.snapshot();

    const back = playedSession();
    back.restore(snap, identity);
    expect(back.openSegment()).toEqual({ start: 1, end: null, collapsed: false, lineage: 1 });
    expect(back.isSkipped(3)).toBe(true);
  });

  it('restores the collapsed flag on closed ranges', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    m.setCollapsed(m.segmentOf(2)!, true);
    const back = playedSession();
    back.restore(m.snapshot(), identity);
    expect(back.segmentOf(2)).toEqual({ start: 2, end: 3, collapsed: true, lineage: 1 });
  });

  it('carries the fork tree with per-lineage commands and positions', () => {
    const m = forkedSession();
    const snap = m.snapshot();
    expect(snap.active).toBe(2);
    expect(snap.lineages).toEqual([
      {
        id: 1,
        turns: [
          { command: 'look', boot: true },
          { command: 'north', boot: false },
          { command: 'north', boot: false },
          { command: 'north', boot: false },
          { command: 'north', boot: false },
        ],
      },
      {
        id: 2, parentId: 1, forkAtPos: 3,
        turns: [{ command: 'east', boot: false }],
      },
    ]);
    expect(snap.segments).toEqual([
      { lineage: 1, startPos: 1, endPos: 2, collapsed: true },
      { lineage: 1, startPos: 3, endPos: 5, collapsed: false },
      { lineage: 2, startPos: 1, endPos: 1, collapsed: false },
    ]);
  });

  it('restores a forked session across fresh replay ordinals', () => {
    const snap = forkedSession().snapshot();

    // The reopened page replays: root lands on 1..5 again, but the branch's
    // replay consumed different ordinals — its own turn landed as 9.
    const back = playedSession();
    back.registerLineage({ id: 2, parentId: 1, forkAt: 3 });
    back.addTurn({ ordinal: 9, command: 'east', room: 'Boiler Shed', boot: false, lineage: 2 });
    back.restore(snap, (lineage, pos) =>
      lineage === 1 ? pos : lineage === 2 && pos === 1 ? 9 : undefined);

    expect(back.segmentOf(1)).toEqual({ start: 1, end: 2, collapsed: true, lineage: 1 });
    expect(back.segmentOf(3)).toEqual({ start: 3, end: 5, collapsed: false, lineage: 1 });
    expect(back.segmentOf(9)).toEqual({ start: 9, end: 9, collapsed: false, lineage: 2 });
    expect(back.activeLineage).toBe(2);
    expect(back.titleOf(back.segmentOf(9)!)).toBe('gravel-drive-to-boiler-shed-1');
  });

  it('drops entries the replayed session cannot seat — never an error', () => {
    const back = playedSession();
    back.restore({
      lineages: [],
      active: 1,
      segments: [
        { lineage: 1, startPos: 2, endPos: 9, collapsed: false },   // unknown end
        { lineage: 1, startPos: 7, endPos: null, collapsed: false }, // unknown start
        { lineage: 1, startPos: 2, endPos: 3, collapsed: false },   // valid
        { lineage: 1, startPos: 3, endPos: 4, collapsed: false },   // overlaps valid
        { lineage: 1, startPos: 4, endPos: null, collapsed: false }, // valid open
        { lineage: 1, startPos: 1, endPos: null, collapsed: true },  // second open
        { lineage: 5, startPos: 1, endPos: 1, collapsed: false },   // unknown lineage
      ],
      skipped: [{ lineage: 1, pos: 3 }, { lineage: 1, pos: 9 }],
    }, identity);
    expect(back.segments).toEqual([
      { start: 2, end: 3, collapsed: false, lineage: 1 },
      { start: 4, end: null, collapsed: false, lineage: 1 },
    ]);
    expect(back.isSkipped(3)).toBe(true);
    expect(back.isSkipped(9)).toBe(false);
  });

  it('restores nothing from a malformed snapshot — degraded, not thrown', () => {
    const back = playedSession();
    back.restore({
      segments: [{ startPos: 'x' } as never],
      skipped: ['y' as never],
    } as unknown as SessionSnapshot, identity);
    expect(back.segments).toHaveLength(0);
  });
});

describe('deleteLineage (David 2026-08-09: branches are deletable)', () => {
  it('removes the branch, its turns, and its segment; the fork point empties and the auto-split merges back', () => {
    const m = forkedSession();
    // Fork auto-split 1–5 into 1–2 (collapsed parent) + 3–5.
    expect(m.segments.map(s => [s.start, s.end])).toEqual([[1, 2], [3, 5], [13, 13]]);

    const result = m.deleteLineage(2);

    expect(result).toEqual({ parentId: 1, wasActive: true });
    expect(m.turns.some(t => t.ordinal === 13)).toBe(false);
    expect(m.lineages.map(l => l.id)).toEqual([1]);
    expect(m.activeLineage).toBe(1);
    // Last sibling gone → the fork-made boundary folds back to one segment.
    expect(m.segments.map(s => [s.start, s.end])).toEqual([[1, 5]]);
    expect(m.branchPoints()).toEqual([]);
  });

  it('keeps the split while a sibling still forks at the point', () => {
    const m = forkedSession();
    m.activateLineage(1);
    expect(m.fork(3, 'west')).toBe(3);
    m.addTurn({ ordinal: 21, command: 'west', room: 'Ha-Ha', boot: false, lineage: 3 });

    expect(m.deleteLineage(3)).toEqual({ parentId: 1, wasActive: true });

    // Lineage 2 still forks at 3 — the auto-split boundary must survive.
    expect(m.segments.map(s => [s.start, s.end])).toEqual([[1, 2], [3, 5], [13, 13]]);
    expect(m.branchPoints().map(p => p.siblings)).toEqual([[2]]);
  });

  it('deletes descendants with the branch, and their claims', () => {
    const m = forkedSession();
    m.addContains(13, 'boiler');
    // A branch off the branch: lineage 3 forks lineage 2 at its own turn —
    // same-point normalization joins the ORIGINAL point as a sibling, so
    // fork DEEPER instead: extend 2 first.
    m.addTurn({ ordinal: 14, command: 'north', room: 'Coal Store', boot: false, lineage: 2 });
    m.untick(13); m.tick(13); m.tick(14);   // re-range the branch as [13,14]
    expect(m.fork(14, 'down')).toBe(3);
    m.addTurn({ ordinal: 30, command: 'down', room: 'Cellar', boot: false, lineage: 3 });

    expect(m.deleteLineage(2)).toEqual({ parentId: 1, wasActive: true });

    expect(m.lineages.map(l => l.id)).toEqual([1]);
    expect(m.turns.every(t => t.ordinal < 13)).toBe(true);
    expect(m.claimsOf(13).contains).toEqual([]);
  });

  it('refuses the root lineage and unknown ids, mutating nothing', () => {
    const m = forkedSession();
    const segments = m.segments.map(s => ({ ...s }));
    expect(m.deleteLineage(1)).toBeNull();
    expect(m.deleteLineage(99)).toBeNull();
    expect(m.segments.map(s => [s.start, s.end]))
      .toEqual(segments.map(s => [s.start, s.end]));
  });

  it('deleting a non-active branch never touches the active lineage', () => {
    const m = forkedSession();
    m.activateLineage(1);
    expect(m.deleteLineage(2)).toEqual({ parentId: 1, wasActive: false });
    expect(m.activeLineage).toBe(1);
  });
});

describe('authoring mementos (David 2026-08-09: undo for testing state)', () => {
  it('round-trips segments, skips, claims, and the lineage table', () => {
    const m = playedSession();
    m.tick(1); m.tick(5);
    m.addContains(2, 'gravel');
    const before = m.captureAuthoring();

    m.setExact(3, true);
    m.untick(1);
    expect(m.segments).toHaveLength(0);

    m.restoreAuthoring(before);
    expect(m.segments.map(s => [s.start, s.end])).toEqual([[1, 5]]);
    expect(m.claimsOf(2).contains).toEqual(['gravel']);
    expect(m.claimsOf(3).exact).toBe(false);
  });

  it('a memento is a deep copy — later mutations never leak into it', () => {
    const m = playedSession();
    m.tick(1); m.tick(5);
    m.addContains(2, 'gravel');
    const memento = m.captureAuthoring();

    m.addContains(2, 'drive');
    m.restoreAuthoring(memento);

    expect(m.claimsOf(2).contains).toEqual(['gravel']);
  });
});
