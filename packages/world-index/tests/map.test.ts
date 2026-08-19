/**
 * map.test.ts — the D7 compass-grid layout.
 *
 * The corpus cases assert the solver places every room and finds no skew; the
 * fault cases assert it resolves a collision by displacement rather than by
 * dropping the room, honours a manual position over its own answer, and reports
 * a room it genuinely cannot place instead of inventing a cell for it.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 D7
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { layoutMap, type Cell } from '../src/map.js';
import { CORPUS, compileStory, entity, faultable } from './corpus.js';

let fernhill: StoryIR;
let alderman: StoryIR;
let idesOfMarch: StoryIR;

beforeAll(() => {
  fernhill = compileStory(CORPUS.fernhill);
  alderman = compileStory(CORPUS.alderman);
  idesOfMarch = compileStory(CORPUS.idesOfMarch);
});

/** Chebyshev distance between two cells, for asserting a displacement stayed near. */
function distance(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

describe('the corpus lays out on a grid', () => {
  it('places every room in all three stories', () => {
    for (const ir of [fernhill, alderman, idesOfMarch]) {
      const map = layoutMap(ir);
      expect(map.unplaced).toEqual([]);
    }
  });

  it('finds no direction skew — no cycle disagrees with itself', () => {
    for (const ir of [fernhill, alderman, idesOfMarch]) {
      expect(layoutMap(ir).skews).toEqual([]);
    }
  });

  it('puts the start room at the origin', () => {
    const map = layoutMap(alderman);
    expect(map.start).toBe('foyer');
    expect(map.positions.get('foyer')).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('steps one cell per compass direction', () => {
    const map = layoutMap(alderman);
    expect(map.positions.get('staircase')).toEqual({ x: 0, y: 1, z: 0 });
    expect(map.positions.get('bar')).toEqual({ x: 1, y: 0, z: 0 });
    expect(map.positions.get('restaurant')).toEqual({ x: -1, y: 0, z: 0 });
    expect(map.positions.get('ballroom')).toEqual({ x: 0, y: -1, z: 0 });
  });

  it('walks the mirror of an authored exit, not only the authored row', () => {
    const faulted = faultable(alderman);
    const foyer = entity(faulted, 'foyer');
    foyer.exits = foyer.exits.filter((exit) => exit.to !== 'bar');
    const map = layoutMap(faulted);

    expect(map.unplaced).toEqual([]);
    expect(map.positions.get('bar')).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('records each connection once, carrying its door', () => {
    const map = layoutMap(idesOfMarch);
    const doored = map.connections.filter((connection) => connection.via !== null);
    expect(doored).toEqual([{ rooms: ['stage', 'tiring-house'], via: 'tiring-house-door' }]);
    expect(map.connections).toHaveLength(4);
  });
});

describe('collision resolution', () => {
  it('pushes Fernhill’s Folly Hill to a free cell instead of stranding it', () => {
    const map = layoutMap(fernhill);

    expect(map.collisions).toHaveLength(1);
    const [collision] = map.collisions;
    expect(collision).toMatchObject({ room: 'folly-hill', heldBy: 'study', from: 'greenhouse', direction: 'north' });
    expect(distance(collision.wanted, collision.placed)).toBe(1);

    expect(map.positions.get('folly-hill')).toEqual(collision.placed);
    expect(map.positions.get('study')).toEqual(collision.wanted);
    expect(map.unplaced).toEqual([]);
  });

  it('keeps the Folly behind it on the map too', () => {
    const map = layoutMap(fernhill);
    const follyHill = map.positions.get('folly-hill');
    const folly = map.positions.get('folly');

    expect(follyHill).toBeDefined();
    expect(folly).toBeDefined();
    expect(distance(follyHill as Cell, folly as Cell)).toBe(1);
  });

  it('gives no two rooms the same cell', () => {
    for (const ir of [fernhill, alderman, idesOfMarch]) {
      const cells = [...layoutMap(ir).positions.values()].map((cell) => `${cell.x},${cell.y},${cell.z}`);
      expect(new Set(cells).size).toBe(cells.length);
    }
  });
});

describe('manual positions', () => {
  it('wins over the solver for the room it names', () => {
    const nudged: Cell = { x: -4, y: 4, z: 0 };
    const map = layoutMap(fernhill, { overrides: new Map([['folly-hill', nudged]]) });

    expect(map.positions.get('folly-hill')).toEqual(nudged);
    expect(map.collisions.some((collision) => collision.room === 'folly-hill')).toBe(false);
    expect(map.unplaced).toEqual([]);
  });

  it('leaves every other room to the solver', () => {
    const map = layoutMap(fernhill, { overrides: new Map([['folly-hill', { x: -4, y: 4, z: 0 }]]) });
    expect(map.positions.get('study')).toEqual(layoutMap(fernhill).positions.get('study'));
  });
});

describe('a room the walk cannot reach', () => {
  it('is reported unplaced rather than given an arbitrary cell', () => {
    const faulted = faultable(fernhill);
    const kitchen = entity(faulted, 'kitchen');
    kitchen.exits = kitchen.exits.filter((exit) => exit.to !== 'pantry');
    const map = layoutMap(faulted);

    expect(map.unplaced).toEqual(['pantry']);
    expect(map.positions.has('pantry')).toBe(false);
  });
});
