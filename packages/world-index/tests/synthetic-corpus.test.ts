/**
 * synthetic-corpus.test.ts — is the generated corpus actually the corpus's shape?
 *
 * A generator can emit anything and its timing table will look just as
 * convincing either way, so the load-bearing test here is the round trip:
 * generate a story from the ratios measured off Fernhill, The Alderman, and Ides
 * of March, compile it, profile it with the *same* profiler that measured them,
 * and require the result to land back on those ratios. Nothing else in this file
 * can substitute for that — the rest establishes that the stories compile, that
 * their obstacles govern the walk, and that the two shapes differ in the one way
 * they are supposed to.
 *
 * `dense-chain` is checked as a bound, never as a representative case: it is
 * required to be denser than the corpus, not faithful to it.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 AC-8: synthetic corpus and scale timing
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { profileStory, ratiosOf, type StoryRatios } from './corpus-shape.js';
import { CORPUS, compileStory } from './corpus.js';
import { generateStory, planStory, type CorpusShape } from './synthetic-corpus.js';
import { deriveReach } from '../src/reach.js';
import { roomsOf } from '../src/story.js';

/** The room counts AC-8 names. */
const SIZES = [20, 40, 60, 80, 100] as const;

/**
 * How far a generated story may sit from the measured ratio, as a share of it.
 *
 * The corpus is 26 rooms across three stories, so its ratios are coarse and a
 * generated story cannot land on them exactly — a story cannot hold 2.65 things
 * in a room. This is the rounding room that granularity costs, and it is a
 * ceiling on the generator, not a dial: a shape that misses by more is fixed in
 * the generator rather than admitted here.
 */
const TOLERANCE = 0.15;

let corpusRatios: StoryRatios;

beforeAll(() => {
  corpusRatios = ratiosOf([
    profileStory(compileStory(CORPUS.fernhill)),
    profileStory(compileStory(CORPUS.alderman)),
    profileStory(compileStory(CORPUS.idesOfMarch)),
  ]);
});

/**
 * Compile a generated story, failing loudly on any diagnostic.
 *
 * @param rooms the room count
 * @param shape the shape to generate
 * @returns the compiled IR
 * @throws when the generator emitted source the compiler rejects
 */
function generated(rooms: number, shape: CorpusShape = 'derived'): StoryIR {
  const result = compile(generateStory(rooms, corpusRatios, shape));
  if (!result.ok) {
    throw new Error(
      `synthetic story (${shape}, ${rooms} rooms) did not compile:\n` +
        result.diagnostics.map((d) => `  ${d.span?.line ?? '?'}: ${d.message}`).join('\n'),
    );
  }
  return result.ir;
}

describe('the generated corpus compiles at every size AC-8 names', () => {
  for (const shape of ['derived', 'dense-chain'] as const) {
    for (const rooms of SIZES) {
      it(`${shape}, ${rooms} rooms: compiles and declares exactly ${rooms} rooms`, () => {
        expect(deriveReach(generated(rooms, shape)).rooms.total).toBe(rooms);
      });
    }
  }
});

describe('the generated corpus keeps the real corpus proportions', () => {
  for (const rooms of SIZES) {
    it(`${rooms} rooms: lands back on the measured ratios within ${TOLERANCE * 100}%`, () => {
      const derived = ratiosOf([profileStory(generated(rooms))]);
      for (const key of ['exitsPerRoom', 'thingsPerRoom', 'obstaclesPerRoom', 'wordsPerDescription', 'deadEndShare'] as const) {
        expect(Math.abs(derived[key] - corpusRatios[key])).toBeLessThanOrEqual(corpusRatios[key] * TOLERANCE);
      }
    });
  }

  it('wires a tree at every size, because not one story in the corpus has a cycle', () => {
    expect(corpusRatios.cyclesPerRoom).toBe(0);
    for (const rooms of SIZES) {
      const shape = profileStory(generated(rooms));
      expect(shape.connections).toBe(shape.rooms - 1);
    }
  });

  it('describes every room, the way all three real stories do', () => {
    for (const rooms of SIZES) {
      const shape = profileStory(generated(rooms));
      expect(shape.describedRooms).toBe(shape.rooms);
    }
  });

  it('carries both obstacle classes at the measured lock share', () => {
    const { obstacles } = planStory(100, corpusRatios, 'derived');
    const locks = obstacles.filter((obstacle) => obstacle.kind === 'lock').length;
    expect(locks).toBeGreaterThan(0);
    expect(obstacles.length - locks).toBeGreaterThan(0);
    expect(Math.abs(locks / obstacles.length - corpusRatios.lockShare)).toBeLessThanOrEqual(TOLERANCE);
  });
});

describe('the two shapes differ in the one way they are meant to', () => {
  it('makes dense-chain denser in obstacles than the corpus, and says so by being a bound', () => {
    const derived = planStory(100, corpusRatios, 'derived').obstacles.length;
    const dense = planStory(100, corpusRatios, 'dense-chain').obstacles.length;
    expect(dense).toBeGreaterThan(derived * 2);
  });

  it('seals every dense-chain opener off the spine, and leaves every derived opener on it', () => {
    const dense = planStory(100, corpusRatios, 'dense-chain');
    const branchRooms = new Set(dense.branches.map((branch) => branch.index));
    expect(dense.obstacles.every((obstacle) => branchRooms.has(obstacle.opener))).toBe(true);

    const derived = planStory(100, corpusRatios, 'derived');
    const spineRooms = new Set(derived.spine);
    for (const obstacle of derived.obstacles) {
      expect(spineRooms.has(obstacle.opener)).toBe(true);
      expect(obstacle.opener).toBeLessThan(obstacle.from);
    }
  });

  it('leaves both shapes fully solvable, so timing covers a completed analysis', () => {
    for (const shape of ['derived', 'dense-chain'] as const) {
      for (const rooms of SIZES) {
        const reach = deriveReach(generated(rooms, shape));
        expect(reach.rooms.unreached).toEqual([]);
        expect(reach.blocked).toEqual([]);
      }
    }
  });
});

describe('the obstacles govern the walk', () => {
  /**
   * Seal one opener behind the obstacle it opens.
   *
   * Moving the opener rather than unplacing it is the fault the analyzer exists
   * to name (AC-2, the key inside the room it opens), and it proves the obstacle
   * is load-bearing: a generator that quietly emitted an open corridor would
   * survive this untouched.
   *
   * @param kind which obstacle class to seal
   * @returns the reach result for the faulted story
   */
  function sealed(kind: 'lock' | 'gate') {
    const ir = structuredClone(generated(100));
    const obstacle = planStory(100, corpusRatios, 'derived').obstacles.find((candidate) => candidate.kind === kind);
    if (obstacle === undefined) throw new Error(`plan has no ${kind}`);

    const openerName = String(obstacle.key ?? obstacle.lever).replace(/^the /, '').toLowerCase();
    const opener = ir.entities.find((candidate) => candidate.name.toLowerCase() === openerName);
    if (opener === undefined) throw new Error(`fixture has no opener \`${openerName}\``);

    const behind = roomsOf(ir)[obstacle.to];
    if (behind === undefined) throw new Error(`fixture has no room at index ${obstacle.to}`);
    opener.placement = { relation: 'in', place: behind.id, span: opener.placement?.span };

    return deriveReach(ir);
  }

  it('strands rooms once a key is sealed behind its own door', () => {
    const reach = sealed('lock');
    expect(reach.blocked.some((block) => block.obstacle === 'lock')).toBe(true);
    expect(reach.rooms.unreached.length).toBeGreaterThan(0);
  });

  it('strands rooms once a lever is sealed behind its own gate', () => {
    const reach = sealed('gate');
    expect(reach.blocked.some((block) => block.obstacle === 'gate')).toBe(true);
    expect(reach.rooms.unreached.length).toBeGreaterThan(0);
  });
});

describe('the generator refuses sizes it cannot name', () => {
  it('rejects a story below the minimum', () => {
    expect(() => planStory(3, corpusRatios, 'derived')).toThrow(RangeError);
  });

  it('rejects a story past the distinct room names it has', () => {
    expect(() => planStory(101, corpusRatios, 'derived')).toThrow(RangeError);
  });
});
