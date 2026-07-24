/**
 * rank-ladder-parse.test.ts — ADR-261 D2/D7 parse side: the indented
 * `use scoring` body, `rank "<name>" at <n>`, and the `says <key>` suffix.
 *
 * Parse only — no analysis, no lowering. `use scoring` is not yet a known
 * extension name at this layer, so these drive `parse()` rather than
 * `compile()`.
 */
import { describe, expect, it } from 'vitest';
import { parse } from '../src';
import type { StoryHeader } from '../src/ast';

const story = (headerBody: string) => `story "The Folly" by "T"
  id: folly
  version: 0.0.1
${headerBody}
create the Lawn
  a room

  A lawn.

create the player
  starts in the Lawn

  You.
`;

const header = (source: string): StoryHeader => parse(source).ast.header!;

const errorCodes = (source: string) =>
  parse(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

describe('`use scoring` rank ladder (ADR-261 D2)', () => {
  it('parses a three-rung ladder in the indented body', () => {
    const h = header(story(
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '    rank "Attentive Guest" at 40\n' +
      '    rank "Master of the Folly" at 120\n'
    ));

    expect(h.uses.map((u) => u.name)).toEqual(['scoring']);
    expect(h.ranks.map((r) => [r.name, r.threshold])).toEqual([
      ['Curious Visitor', 0],
      ['Attentive Guest', 40],
      ['Master of the Folly', 120],
    ]);
  });

  it('preserves source order at parse time — sorting is the analyzer\'s job', () => {
    const h = header(story(
      '  use scoring\n' +
      '    rank "Top" at 120\n' +
      '    rank "Bottom" at 0\n'
    ));

    expect(h.ranks.map((r) => r.threshold)).toEqual([120, 0]);
  });

  it('`use scoring` with no body is legal — scoring on, no ladder (D3)', () => {
    const source = story('  use scoring\n');

    expect(errorCodes(source)).toEqual([]);
    expect(header(source).ranks).toEqual([]);
  });

  it('the body does not swallow the following header field', () => {
    const h = header(
      'story "The Folly" by "T"\n' +
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '  id: folly\n' +
      '  version: 0.0.1\n' +
      '\n' +
      'create the Lawn\n' +
      '  a room\n' +
      '\n' +
      '  A lawn.\n' +
      '\n' +
      'create the player\n' +
      '  starts in the Lawn\n' +
      '\n' +
      '  You.\n'
    );

    expect(h.ranks).toHaveLength(1);
    expect(h.fields.id).toBe('folly');
    expect(h.fields.version).toBe('0.0.1');
  });

  it('a ladder rides alongside other header content', () => {
    const h = header(story(
      '  states: quiet, busy\n' +
      '  score lamp worth 20\n' +
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '  use combat\n'
    ));

    expect(h.ranks).toHaveLength(1);
    expect(h.uses.map((u) => u.name)).toEqual(['scoring', 'combat']);
    expect(h.scores.map((s) => s.name)).toEqual(['lamp']);
    expect(h.states.map((s) => s.name)).toEqual(['quiet', 'busy']);
  });
});

describe('`says <key>` promotion phrases (ADR-261 D7)', () => {
  it('captures the phrase key as an optional suffix', () => {
    const h = header(story(
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0\n' +
      '    rank "Attentive Guest" at 40 says settled-in\n'
    ));

    expect(h.ranks[0].phraseKey).toBeUndefined();
    expect(h.ranks[1].phraseKey).toBe('settled-in');
  });

  it('`says` with no key → parse.rank-says', () => {
    expect(errorCodes(story(
      '  use scoring\n' +
      '    rank "Attentive Guest" at 40 says\n'
    ))).toEqual(['parse.rank-says']);
  });
});

describe('rung placement and shape errors', () => {
  it('a rung outside the body → parse.rank-outside-scoring', () => {
    expect(errorCodes(story('  rank "Stray" at 40\n'))).toEqual(['parse.rank-outside-scoring']);
  });

  it('a rung at the top level → parse.rank-outside-scoring with a header fix-it', () => {
    const codes = errorCodes(
      'story "The Folly" by "T"\n' +
      '  id: folly\n' +
      '\n' +
      'rank "Stray" at 40\n'
    );

    expect(codes).toContain('parse.rank-outside-scoring');
  });

  it('a body under any other `use` name → parse.use-body', () => {
    expect(errorCodes(story(
      '  use combat\n' +
      '    rank "Bruiser" at 40\n'
    ))).toEqual(['parse.use-body']);
  });

  it('an unquoted rank name → parse.rank-name (prose, not a key)', () => {
    expect(errorCodes(story(
      '  use scoring\n' +
      '    rank curious-visitor at 0\n'
    ))).toEqual(['parse.rank-name']);
  });

  it('a missing `at` → parse.rank-threshold', () => {
    expect(errorCodes(story(
      '  use scoring\n' +
      '    rank "Curious Visitor" 0\n'
    ))).toEqual(['parse.rank-threshold']);
  });

  it('a non-numeric threshold → parse.rank-threshold', () => {
    expect(errorCodes(story(
      '  use scoring\n' +
      '    rank "Curious Visitor" at "lots"\n'
    ))).toEqual(['parse.rank-threshold']);
  });

  it('trailing junk after a rung → parse.rank-extra', () => {
    expect(errorCodes(story(
      '  use scoring\n' +
      '    rank "Curious Visitor" at 0 loudly\n'
    ))).toEqual(['parse.rank-extra']);
  });

  it('a non-rank line in the body → parse.use-scoring-body', () => {
    expect(errorCodes(story(
      '  use scoring\n' +
      '    tier "Curious Visitor" at 0\n'
    ))).toEqual(['parse.use-scoring-body']);
  });
});
