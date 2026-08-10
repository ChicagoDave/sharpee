/**
 * groups.test.ts — region grouping on the active path (David 2026-08-10):
 * derived from each turn's room via the Story IR's regions, chronological
 * (re-entering a region starts a NEW group), nothing persisted.
 */
import { describe, expect, it } from 'vitest';
import { groupByRegion } from '../src/cards';

const ROOMS: Record<number, string | undefined> = {
  0: undefined,          // the opening — no room of its own
  1: 'Iron Gates',
  2: 'Gravel Drive',
  3: 'Entrance Hall',
  4: 'Study',
  5: 'Gravel Drive',
  6: 'Crypt',            // a room in no region
};
const REGIONS: Record<string, string> = {
  'Iron Gates': 'Grounds',
  'Gravel Drive': 'Grounds',
  'Entrance Hall': 'House',
  'Study': 'House',
};

const roomOf = (ordinal: number) => ROOMS[ordinal];
const regionOf = (room: string | undefined) =>
  room !== undefined ? REGIONS[room] : undefined;

describe('groupByRegion', () => {
  it('cuts the path into chronological region runs — re-entry starts a NEW group', () => {
    const groups = groupByRegion([0, 1, 2, 3, 4, 5], roomOf, regionOf);
    expect(groups).toEqual([
      { key: 'Grounds#0', region: 'Grounds', ordinals: [0, 1, 2] },
      { key: 'House#1', region: 'House', ordinals: [3, 4] },
      { key: 'Grounds#2', region: 'Grounds', ordinals: [5] },
    ]);
  });

  it('the opening (no room) inherits the first known region', () => {
    const groups = groupByRegion([0, 1], roomOf, regionOf);
    expect(groups).toEqual([
      { key: 'Grounds#0', region: 'Grounds', ordinals: [0, 1] },
    ]);
  });

  it('a region-less room breaks the run into an ungrouped stretch', () => {
    const groups = groupByRegion([1, 6, 3], roomOf, regionOf);
    expect(groups).toEqual([
      { key: 'Grounds#0', region: 'Grounds', ordinals: [1] },
      { ordinals: [6] },
      { key: 'House#2', region: 'House', ordinals: [3] },
    ]);
  });

  it('a story with no regions yields one ungrouped run — the board renders flat', () => {
    const groups = groupByRegion([0, 1, 2], roomOf, () => undefined);
    expect(groups).toEqual([{ ordinals: [0, 1, 2] }]);
  });

  it('an empty path yields no groups', () => {
    expect(groupByRegion([], roomOf, regionOf)).toEqual([]);
  });
});
