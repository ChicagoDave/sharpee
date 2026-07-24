/**
 * scoring-gate.test.ts — ADR-261 D3/D4: scoring is on precisely when the
 * header says so.
 *
 * Gating `score`, `award`, and `ranks` together is what makes "absent
 * `use scoring` means the game has no score" a rule with no exceptions.
 *
 * Covers ADR-261 acceptance #5 (the compile-time half; the loader's rogue-IR
 * LoadError is asserted in story-loader's rank-ladder.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (headerBody: string, body = '') => `story "The Folly" by "T"
  id: folly
  version: 0.0.1
${headerBody}
create the Lawn
  a room
${body}
  A lawn.

create the player
  starts in the Lawn

  You.
`;

const errors = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error');

describe('the `use scoring` gate (ADR-261 D4)', () => {
  it('a bare `score … worth N` → analysis.scoring-needs-use with its span', () => {
    const found = errors(story('  score lamp worth 20\n'));

    expect(found.map((d) => d.code)).toEqual(['analysis.scoring-needs-use']);
    expect(found[0].span.line).toBe(4);
  });

  it('a bare `award` → analysis.scoring-needs-use with its span', () => {
    // The score itself is gated too, so this story reports both — one per
    // construct kind, which is the point of gating them together.
    const found = errors(story(
      '  score lamp worth 20\n',
      '\n  after entering it\n    award lamp\n  end after\n'
    ));

    expect(found.map((d) => d.code).sort()).toEqual([
      'analysis.scoring-needs-use',
      'analysis.scoring-needs-use',
    ]);
  });

  it('reports ONCE per construct kind, not once per line', () => {
    const found = errors(story(
      '  score lamp worth 20\n' +
      '  score urn worth 20\n' +
      '  score deed worth 20\n'
    ));

    expect(found).toHaveLength(1);
  });

  it('a stray `rank` rung is caught earlier, at parse time', () => {
    // The ladder is structurally inside the `use scoring` body, so a rung
    // cannot reach the analyzer without its `use` line — the parse error is
    // both earlier and more precise than the analysis gate would be.
    expect(errors(story('  rank "Stray" at 40\n')).map((d) => d.code))
      .toEqual(['parse.rank-outside-scoring']);
  });

  it('`use scoring` clears the gate for every construct', () => {
    const result = compile(story(
      '  score lamp worth 20\n' +
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n',
      '\n  after entering it\n    award lamp\n  end after\n'
    ));

    expect(result.diagnostics).toEqual([]);
  });

  it('a story that declares no scoring at all compiles clean without the line (D3)', () => {
    // The Chord spelling of "this isn't that kind of game" is the ABSENCE of
    // a line — it costs the author nothing.
    expect(compile(story('  blurb: A quiet garden.\n')).diagnostics).toEqual([]);
  });

  it('`use scoring` with no scores and no ladder is legal', () => {
    expect(compile(story('  use scoring\n')).diagnostics).toEqual([]);
  });
});
