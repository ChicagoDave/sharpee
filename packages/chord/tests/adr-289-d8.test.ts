/**
 * adr-289-d8.test.ts — ADR-289 Phase 6, the analyzer/parser half of D8's
 * shipping list, plus Acceptance 21.
 *
 *   L1 — `recoverToTopLevel` skipped `extend` and `remove`, so one parse error
 *        anywhere above an alteration block swallowed the whole block.
 *   L2 — `lex()`'s doc claimed it diagnoses unterminated strings; it
 *        deliberately does not (a lone quote is prose punctuation). The fix is
 *        the comment, so the test pins the behaviour the comment now describes.
 *   L7 — hunger: duplicate band ids, and a band above `fatal` that can never
 *        narrate.
 *   §3.1 — the prose/statement misparse hint names both remedies (AC21).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const WORLD = `create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  in the Hall

  You.

before the game starts
  change the player to Alex
end before

`;

function errorsOf(source: string) {
  return compile(source).diagnostics.filter((d) => d.severity === 'error');
}

describe('L1 — error recovery stops at `extend` and `remove`', () => {
  const EXTENSION = `extend action taking
  grammar
    snaffle the item

`;

  // A duplicate `story` header recovers to the next top-level keyword. Before
  // the fix `extend`/`remove` were not in that set, so recovery ran past the
  // whole alteration block and its grammar lines vanished — silently, since
  // the story still compiled carrying only the unrelated header error.
  const SECOND_HEADER = 'story\n  title: Second\n  authors:\n    N\n  id: t2\n  story-version: 0.0.1\n\n';

  it('an `extend action` block after a parse error still reaches the IR', () => {
    const result = compile(`${HEADER}${WORLD}\n${SECOND_HEADER}${EXTENSION}`);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.duplicate-story-header');
    expect(result.ir.grammarExtensions?.map((e) => e.action)).toContain('taking');
  });

  it('a `remove from action` block after a parse error survives too', () => {
    // `remove from action` lists its patterns directly — no `grammar` block.
    const result = compile(`${HEADER}${WORLD}\n${SECOND_HEADER}remove from action taking\n  get the item\n`);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('parse.duplicate-story-header');
    expect(result.ir.grammarRemovals?.length ?? 0).toBeGreaterThan(0);
  });

  it('the alteration parses identically with no preceding error — the control', () => {
    const result = compile(`${HEADER}${WORLD}\n${EXTENSION}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.grammarExtensions?.map((e) => e.action)).toContain('taking');
  });
});

describe('L2 — a lone quote is prose punctuation, not an unterminated string', () => {
  it('an unclosed quote inside prose lexes clean, with no diagnostic', () => {
    const source = `${HEADER}${WORLD}\ncreate the placard
  scenery
  in the Hall

  The tannoy crackles: "Mind the gap, and mind it well.
`;
    expect(errorsOf(source)).toEqual([]);
  });
});

describe('L7 — hunger band gates', () => {
  const hunger = (body: string) =>
    `story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n  use hunger\n${body}\n\n${WORLD}`;

  it('two bands sharing an id are an error — the band identity would be ambiguous', () => {
    const errors = errorsOf(hunger('    grows 1 each turn\n    peckish at 10\n    peckish at 40\n    fatal at 100'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.duplicate-hunger-band');
    expect(errors[0].message).toContain('peckish');
  });

  it('a band above `fatal` is an error — it can never narrate', () => {
    const errors = errorsOf(hunger('    grows 1 each turn\n    peckish at 10\n    ravenous at 120\n    fatal at 100'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.hunger-band-above-fatal');
    expect(errors[0].message).toContain('ravenous');
  });

  it('a band exactly AT `fatal` is legal — that is the dying band', () => {
    expect(errorsOf(hunger('    grows 1 each turn\n    peckish at 10\n    starving at 100\n    fatal at 100'))).toEqual([]);
  });

  it('distinct ids below fatal stay clean', () => {
    expect(
      errorsOf(hunger('    grows 1 each turn\n    peckish at 10\n    ravenous at 40\n    fatal at 100')),
    ).toEqual([]);
  });

  it('the threshold gate still fires — two bands on one threshold', () => {
    const errors = errorsOf(hunger('    grows 1 each turn\n    peckish at 10\n    ravenous at 10\n    fatal at 100'));
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('analysis.duplicate-hunger-threshold');
  });
});

describe('Acceptance 21 — the misparse hint names both remedies', () => {
  const PHRASES = 'define phrases en-US\n  sign-text:\n    Placeholder.\n';

  /** A phrase body whose prose paragraph opens with `opener`. */
  const prose = (opener: string) =>
    `${HEADER}${WORLD}\ncreate the sign
  scenery
  in the Hall

  A sign.

  on the player reading
    phrase sign-text
      ${opener} into the wall, the plaque has weathered badly.
  end on

${PHRASES}`;

  // The heuristic is unchanged (D8 §3.1) — these three openers are in
  // STATEMENT_OPENERS, so the paragraph is still read as a statement and
  // still errors. Only the message changes, and each of the three codes the
  // misparse can produce carries both remedies.
  it.each([
    ['at', 'parse.unknown-statement'],
    ['set', 'parse.set-to'],
    ['move', 'parse.move-to'],
  ])('a prose paragraph opening with lowercase `%s` names capitalize AND quote', (opener, code) => {
    const errors = errorsOf(prose(opener));
    const misparse = errors.find((e) => e.code === code);
    expect(misparse, `\`${opener}\` should misparse as a statement (${code})`).toBeTruthy();
    expect(misparse!.message).toContain('capitalize');
    expect(misparse!.message).toContain('quote');
  });

  it('`clear` needs no hint — it is not a statement opener, so the paragraph stays prose', () => {
    // The review named four openers; this one already behaves correctly.
    expect(errorsOf(prose('clear'))).toEqual([]);
  });

  it('a genuine `set` statement error outside prose position keeps its plain message', () => {
    const source = `${HEADER}${WORLD}\ncreate the sign
  scenery
  in the Hall
  states: clean, weathered

  A sign.

  on the player reading
    set the sign
  end on
`;
    const misparse = errorsOf(source).find((e) => e.code === 'parse.set-to');
    expect(misparse, 'a real `set` line still errors').toBeTruthy();
    expect(misparse!.message).not.toContain('capitalize');
  });
});
