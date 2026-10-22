/**
 * compass-bearings-pinned.test.ts — one compass across the zero-dependency
 * boundary (alignment-fixes F17). Chord depends on nothing, so it keeps its
 * own table of the eight compass words' bearings (`COMPASS_BEARINGS`, used to
 * lower `wind: from <direction>` and headings); world-model keeps the
 * headings the vehicle machine and the expanse turn by (`COMPASS_HEADINGS`,
 * `bearingOf`). Two tables are the boundary's price; this test is what keeps
 * them one answer. story-loader depends on both, so the pin lives here.
 *
 * Owner context: story-loader test suite.
 */
import { describe, expect, it } from 'vitest';
import { COMPASS_BEARINGS } from '@sharpee/chord';
import { COMPASS_HEADINGS, bearingOf } from '@sharpee/world-model';

describe('one compass across the boundary (F17)', () => {
  it('Chord and world-model name the same eight directions', () => {
    expect([...COMPASS_BEARINGS.keys()].sort()).toEqual(COMPASS_HEADINGS.map((heading) => heading.toLowerCase()).sort());
  });

  it('each direction has the same bearing on both sides', () => {
    for (const heading of COMPASS_HEADINGS) {
      expect({ heading, bearing: COMPASS_BEARINGS.get(heading.toLowerCase()) }).toEqual({ heading, bearing: bearingOf(heading) });
    }
  });
});
