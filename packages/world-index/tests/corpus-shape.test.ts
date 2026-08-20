/**
 * corpus-shape.test.ts — what the real Chord stories are actually shaped like.
 *
 * These figures are the ground truth AC-8's synthetic corpus is derived from, so
 * they are recorded here rather than described in prose: a generator tuned to
 * proportions nobody measured would produce a timing table about a story that
 * does not exist. The snapshots are the record. If a corpus story is edited, one
 * of them fails, and the generated corpus is re-derived rather than left to
 * drift silently away from the stories it claims to resemble.
 *
 * Each story is compiled from source every run, never read from a committed
 * `.ir.json` — the same rule the rest of this package's fixtures follow.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 AC-8: synthetic corpus and scale timing
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { profileStory, ratiosOf, type StoryShape } from './corpus-shape.js';
import { CORPUS, compileStory } from './corpus.js';

let fernhill: StoryIR;
let alderman: StoryIR;
let idesOfMarch: StoryIR;

beforeAll(() => {
  fernhill = compileStory(CORPUS.fernhill);
  alderman = compileStory(CORPUS.alderman);
  idesOfMarch = compileStory(CORPUS.idesOfMarch);
});

/** The pooled corpus, in the order the snapshots read. */
function pool(): StoryShape[] {
  return [profileStory(fernhill), profileStory(alderman), profileStory(idesOfMarch)];
}

/** Ratios rounded to two places — the corpus is small, so the tail is noise. */
function rounded(): Record<string, number> {
  return Object.fromEntries(
    Object.entries(ratiosOf(pool())).map(([name, value]) => [name, Math.round(value * 100) / 100]),
  );
}

describe('the real corpus, measured', () => {
  it('profiles The Folly at Fernhill', () => {
    expect(profileStory(fernhill)).toMatchInlineSnapshot(`
      {
        "connections": 12,
        "deadEnds": 6,
        "describedRooms": 13,
        "describedThings": 46,
        "doors": 3,
        "entities": 65,
        "exits": 21,
        "gates": 3,
        "lockedDoors": 1,
        "proseWords": 1252,
        "regions": 2,
        "rooms": 13,
        "things": 46,
      }
    `);
  });

  it('profiles The Alderman', () => {
    expect(profileStory(alderman)).toMatchInlineSnapshot(`
      {
        "connections": 7,
        "deadEnds": 5,
        "describedRooms": 8,
        "describedThings": 11,
        "doors": 0,
        "entities": 20,
        "exits": 14,
        "gates": 0,
        "lockedDoors": 0,
        "proseWords": 460,
        "regions": 0,
        "rooms": 8,
        "things": 11,
      }
    `);
  });

  // IDES OF MARCH IS A LIVE STORY. Its author accepts the World tab's offers on it —

  // `aka door, oak, stout` on 2026-08-19, `create the pen` on 2026-08-20 — and every

  // accepted offer moves these numbers. A diff here means the story grew, not that the

  // profiler drifted; check `git diff branch-stories/ides-of-march` before hunting.

  it('profiles Ides of March', () => {
    expect(profileStory(idesOfMarch)).toMatchInlineSnapshot(`
      {
        "connections": 4,
        "deadEnds": 2,
        "describedRooms": 5,
        "describedThings": 13,
        "doors": 1,
        "entities": 20,
        "exits": 8,
        "gates": 0,
        "lockedDoors": 0,
        "proseWords": 487,
        "regions": 0,
        "rooms": 5,
        "things": 13,
      }
    `);
  });

  it('pools the three into the per-room ratios a generated story must reproduce', () => {
    expect(rounded()).toMatchInlineSnapshot(`
      {
        "cyclesPerRoom": 0,
        "deadEndShare": 0.5,
        "exitsPerRoom": 1.65,
        "lockShare": 0.25,
        "obstaclesPerRoom": 0.15,
        "roomsPerRegion": 6.5,
        "thingsPerRoom": 2.69,
        "wordsPerDescription": 22.91,
      }
    `);
  });
});

describe('the pooled corpus is worth deriving from', () => {
  it('carries both obstacle classes, so a derived story can carry both', () => {
    const shapes = pool();
    expect(shapes.reduce((total, shape) => total + shape.lockedDoors, 0)).toBeGreaterThan(0);
    expect(shapes.reduce((total, shape) => total + shape.gates, 0)).toBeGreaterThan(0);
  });

  it('describes every room it declares, so prose volume scales with rooms', () => {
    for (const shape of pool()) expect(shape.describedRooms).toBe(shape.rooms);
  });

  it('refuses per-room ratios for a pool with no rooms', () => {
    expect(() => ratiosOf([])).toThrow(RangeError);
  });
});
