/**
 * gh-709-reversible-and-trait-change.test.ts — three gates around a
 * forward-only `states` set (GH #709). The refusal of a `change` back to
 * the initial state spells the whole corrected line; `reversible` written
 * in a `states` list is refused instead of becoming a state; and a trait
 * body's `change it to <state>` is checked against every thing that
 * composes the trait, by that thing's own set.
 * REAL-PATH: every case drives a Chord source string through `compile`.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/chord analyzer.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string, header = '') => `story
  title: Tower
  authors:
    T
  id: tower
  story-version: 0.0.1${header}

create the Bell Stair
  a room

  A stair.

${body}

create Alex
  a person
  playable
  starts in the Bell Stair

  You.

before the game starts
  change the player to Alex
end before

define phrase done
  Done.
end phrase
`;

const errors = (source: string) => compile(source).diagnostics.filter((d) => d.severity === 'error');
const errorCodes = (source: string) => errors(source).map((d) => d.code);

const bell = (statesLine: string, extra = '') => `create the tower bell
  a thing, singular, scenery${extra}
  in the Bell Stair
  ${statesLine}

  A bell.`;

const hushable = (statement: string, traitStates = '') => `define trait hushable${traitStates}
  on the player touching
    ${statement}
    phrase done
  end on
end trait
`;

describe('the forward-only refusal spells the corrected line (GH #709)', () => {
  const source = story(`${bell('states: silent, tolling')}

  on the player touching
    change the tower bell to silent
    phrase done
  end on`);

  it('quotes `states, reversible:` with the set\'s own states', () => {
    const found = errors(source);
    expect(found.map((d) => d.code)).toEqual(['analysis.irreversible-state']);
    expect(found[0].message).toContain('`states, reversible: silent, tolling`');
  });

  it('no longer says to add `, reversible` to the line, and cites no decision', () => {
    const [refusal] = errors(source);
    expect(refusal.message).not.toContain('Add `, reversible`');
    expect(refusal.message).not.toContain('(D4)');
  });
});

describe('`reversible` is not a state name (GH #709)', () => {
  it('is refused in a thing\'s list, quoting the modifier position with the other states', () => {
    const found = errors(story(bell('states: silent, tolling, reversible')));
    expect(found.map((d) => d.code)).toEqual(['analysis.reversible-state']);
    expect(found[0].message).toContain('`states, reversible: silent, tolling`');
  });

  it('is refused in a trait\'s list', () => {
    const source = story(`${hushable('phrase done', '\n  states: silent, tolling, reversible\n')}
${bell('', ', hushable')}`);
    expect(errorCodes(source)).toEqual(['analysis.reversible-state']);
  });

  it('is refused in the story\'s list', () => {
    expect(errorCodes(story(bell(''), '\n  states: dawn, dusk, reversible'))).toEqual(['analysis.reversible-state']);
  });

  it('is refused when it is the only state, with placeholders for the rest', () => {
    const found = errors(story(bell('states: reversible')));
    expect(found.map((d) => d.code)).toEqual(['analysis.reversible-state']);
    expect(found[0].message).toContain('`states, reversible: <first>, <second>`');
  });

  it('the modifier before the colon still compiles', () => {
    expect(errorCodes(story(bell('states, reversible: silent, tolling')))).toEqual([]);
  });
});

describe('`change the match to` names a state something declares (GH #709)', () => {
  const sweep = (state: string) => story(`define condition hungry-neighbor: it is hungry

create the pygmy goat
  a thing, singular
  in the Bell Stair
  states: hungry, content

  A goat.

${bell('')}

  on the player touching
    each hungry-neighbor
      change the match to ${state}
    end each
    phrase done
  end on`);

  it('compiles when a thing in the story declares the state', () => {
    expect(errorCodes(sweep('content'))).toEqual([]);
  });

  it('is refused when nothing declares it, with the nearest declared state', () => {
    const found = errors(sweep('contnet'));
    expect(found.map((d) => d.code)).toEqual(['analysis.undeclared-state']);
    expect(found[0].message).toContain('`contnet`');
    expect(found[0].message).toContain('`content`');
  });
});

describe('a trait body\'s `change it to` is checked on every composer (GH #709)', () => {
  it('is refused when the state is the initial one of a composer\'s forward-only set', () => {
    const source = story(`${hushable('change it to silent')}
${bell('states: silent, tolling', ', hushable')}`);
    const found = errors(source);
    expect(found.map((d) => d.code)).toEqual(['analysis.irreversible-state']);
    expect(found[0].message).toContain('tower bell');
    expect(found[0].message).toContain('`hushable`');
    expect(found[0].message).toContain('`states, reversible: silent, tolling`');
  });

  it('compiles when the composer\'s set is reversible', () => {
    const source = story(`${hushable('change it to silent')}
${bell('states, reversible: silent, tolling', ', hushable')}`);
    expect(errorCodes(source)).toEqual([]);
  });

  it('compiles for a forward move on a forward-only set', () => {
    const source = story(`${hushable('change it to tolling')}
${bell('states: silent, tolling', ', hushable')}`);
    expect(errorCodes(source)).toEqual([]);
  });

  it('is refused once, not once per composer', () => {
    const source = story(`${hushable('change it to silent')}
${bell('states: silent, tolling', ', hushable')}

create the hand bell
  a thing, singular, hushable
  in the Bell Stair
  states: silent, tolling

  A hand bell.`);
    expect(errorCodes(source)).toEqual(['analysis.irreversible-state']);
  });

  it('is refused when one composer lacks the state though another declares it, naming the one that lacks it', () => {
    const source = story(`${hushable('change it to silent')}
${bell('states, reversible: silent, tolling', ', hushable')}

create the gong
  a thing, singular, hushable
  in the Bell Stair
  states, reversible: quiet, ringing

  A gong.`);
    const found = errors(source);
    expect(found.map((d) => d.code)).toEqual(['analysis.undeclared-state']);
    expect(found[0].message).toContain('gong');
    expect(found[0].message).toContain('`hushable`');
    expect(found[0].message).not.toContain('tower bell');
  });

  it('a forward-only set the trait itself declares is still refused, with composers', () => {
    const source = story(`${hushable('change it to silent', '\n  states: silent, tolling\n')}
${bell('', ', hushable')}`);
    expect(errorCodes(source)).toEqual(['analysis.irreversible-state']);
  });

  it('a forward-only set the trait itself declares is still refused, with no composer', () => {
    const source = story(`${hushable('change it to silent', '\n  states: silent, tolling\n')}
${bell('')}`);
    expect(errorCodes(source)).toEqual(['analysis.irreversible-state']);
  });
});
