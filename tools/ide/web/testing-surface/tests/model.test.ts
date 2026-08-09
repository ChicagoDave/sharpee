/**
 * model.test.ts — pins the segment/naming semantics of the testing play
 * surface's SessionModel (ADR-306 Phase 3, design §2–§4). Every assertion
 * checks model state after the mutation, not return values alone.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { SessionModel, slugify } from '../src/model';

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

describe('turns and the opening', () => {
  it('seats the opening as ordinal 0 when the first turn arrives', () => {
    const m = new SessionModel();
    m.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
    expect(m.hasOpening).toBe(true);
    expect(m.turns.map(t => t.ordinal)).toEqual([0, 1]);
    expect(m.turns[0].command).toBe('');
  });

  it('fence clears turns, segments, and skips — dead lineage', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    m.fence();
    expect(m.turns).toHaveLength(0);
    expect(m.segments).toHaveLength(0);
    expect(m.hasOpening).toBe(false);
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
    expect(m.openSegment()).toEqual({ start: 2, end: null, collapsed: false });
    expect(m.tick(4)).toBe('closed');
    expect(m.openSegment()).toBeUndefined();
    expect(m.segmentOf(3)).toEqual({ start: 2, end: 4, collapsed: false });
  });

  it('a tick below the open start extends the range downward', () => {
    m.tick(3);
    expect(m.tick(1)).toBe('extended');
    expect(m.openSegment()).toEqual({ start: 1, end: null, collapsed: false });
  });

  it('the opening (ordinal 0) starts a segment at the true beginning', () => {
    expect(m.tick(0)).toBe('started');
    m.tick(2);
    expect(m.segmentOf(0)).toEqual({ start: 0, end: 2, collapsed: false });
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
    expect(m.openSegment()).toEqual({ start: 3, end: null, collapsed: false });
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
    expect(m.openSegment()).toEqual({ start: 1, end: null, collapsed: false });
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
    expect(m.openSegment()).toEqual({ start: 2, end: null, collapsed: false });
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
    expect(m.segmentOf(3)).toEqual({ start: 1, end: 5, collapsed: false });
    expect(m.isSkipped(3)).toBe(true);
    expect(m.isSkipped(2)).toBe(false);
  });

  it('merging an open segment leaves the merged range open', () => {
    m.tick(1);
    m.tick(2);   // parent 1–2
    m.tick(4);   // open child at 4
    const child = m.segmentOf(4)!;
    expect(m.mergeUp(child)).toBe(true);
    expect(m.openSegment()).toEqual({ start: 1, end: null, collapsed: false });
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
    expect(head).toEqual({ start: 1, end: 2, collapsed: false });
    expect(tail).toEqual({ start: 3, end: 4, collapsed: false });
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
    expect(m.segmentOf(2)).toEqual({ start: 1, end: 4, collapsed: false });
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

describe('authoring claims (design §5)', () => {
  let m: SessionModel;
  beforeEach(() => { m = playedSession(); });

  it('authoring on an unincluded turn includes it', () => {
    expect(m.addContains(2, 'gravel')).toBe(true);
    expect(m.openSegment()).toEqual({ start: 2, end: null, collapsed: false });
    expect(m.claimsOf(2).contains).toEqual(['gravel']);
  });

  it('authoring joins the open segment instead of starting a second', () => {
    m.tick(1);
    m.addState(3, 'kettle.location = hall');
    expect(m.segments).toHaveLength(1);
    expect(m.segmentOf(3)).toEqual({ start: 1, end: 3, collapsed: false });
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

describe('snapshot and restore (ADR-306 D8)', () => {
  it('round-trips segments, the open range, and skips', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(2);
    m.tick(4);            // open child, gap at 3
    m.mergeUp(m.segmentOf(4)!); // 1–open, 3 skipped
    const snap = m.snapshot();

    const back = playedSession();
    back.restore(snap);
    expect(back.openSegment()).toEqual({ start: 1, end: null, collapsed: false });
    expect(back.isSkipped(3)).toBe(true);
  });

  it('restores the collapsed flag on closed ranges', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    m.setCollapsed(m.segmentOf(2)!, true);
    const back = playedSession();
    back.restore(m.snapshot());
    expect(back.segmentOf(2)).toEqual({ start: 2, end: 3, collapsed: true });
  });

  it('drops entries the replayed session cannot seat — never an error', () => {
    const back = playedSession();
    back.restore({
      segments: [
        { start: 2, end: 9, collapsed: false },   // unknown end ordinal
        { start: 7, end: null, collapsed: false }, // unknown start
        { start: 2, end: 3, collapsed: false },   // valid
        { start: 3, end: 4, collapsed: false },   // overlaps the valid one
        { start: 4, end: null, collapsed: false }, // valid open
        { start: 1, end: null, collapsed: true },  // second open — dropped
      ],
      skipped: [3, 9],
    });
    expect(back.segments).toEqual([
      { start: 2, end: 3, collapsed: false },
      { start: 4, end: null, collapsed: false },
    ]);
    expect(back.isSkipped(3)).toBe(true);
    expect(back.isSkipped(9)).toBe(false);
  });

  it('restores nothing from a malformed snapshot — degraded, not thrown', () => {
    const back = playedSession();
    back.restore({ segments: [{ start: 'x' } as never], skipped: ['y' as never] });
    expect(back.segments).toHaveLength(0);
  });
});
