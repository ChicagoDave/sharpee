/**
 * change-state-pairing.test.ts — `change <thing> to <platform state word>`
 * (GH #707). On a thing that declares no state of that name the word writes
 * the paired trait, so the analyzer requires that trait composed: on the
 * named thing, or on every composer of the trait whose body says `it`. A
 * declared state of the same name wins the word and needs no trait.
 * REAL-PATH: every case drives a Chord source string through `compile`.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/chord analyzer.
 */
import { describe, expect, it } from 'vitest';
import { compile, CHANGE_STATE_PAIRINGS, STARTS_STATE_PAIRINGS } from '../src';

const story = (body: string) => `story
  title: Change
  authors:
    T
  id: change
  story-version: 0.0.1

create the Cellar
  a room

  A cellar.

${body}

create Alex
  a person
  playable
  starts in the Cellar

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

const lamp = (compositions: string, statement: string, extra = '') => story(`create the hand lamp
  ${compositions}${extra}
  in the Cellar

  A lamp.

  on the player touching
    ${statement}
    phrase done
  end on`);

describe('change to a platform state word on a named thing (GH #707)', () => {
  it('compiles when the thing composes the paired trait', () => {
    expect(errorCodes(lamp('a thing, light-source, starts unlit', 'change the hand lamp to lit'))).toEqual([]);
  });

  it('is refused, naming the trait, when the thing does not compose it', () => {
    const found = errors(lamp('a thing', 'change the hand lamp to lit'));
    expect(found.map((d) => d.code)).toEqual(['analysis.change-state-pairing']);
    expect(found[0].message).toContain('`light-source`');
    expect(found[0].message).toContain('hand lamp');
  });

  it('`whole` pairs with breakable, though no `starts whole` exists', () => {
    expect(STARTS_STATE_PAIRINGS.has('whole')).toBe(false);
    expect(CHANGE_STATE_PAIRINGS.get('whole')).toBe('breakable');
    expect(errorCodes(lamp('a thing, breakable, starts broken', 'change the hand lamp to whole'))).toEqual([]);
    expect(errorCodes(lamp('a thing', 'change the hand lamp to whole'))).toEqual(['analysis.change-state-pairing']);
  });

  it('a declared state of the same name wins the word and needs no trait', () => {
    expect(errorCodes(lamp('a thing', 'change the hand lamp to lit', '\n  states: cold, lit'))).toEqual([]);
  });

  it('a word that is neither declared nor a platform word is still an undeclared state', () => {
    expect(errorCodes(lamp('a thing, light-source', 'change the hand lamp to glowing', '\n  states: cold, warm'))).toEqual([
      'analysis.undeclared-state',
    ]);
  });
});

describe('change it to a platform state word inside a trait (GH #707)', () => {
  const wick = (lampCompositions: string) => story(`define trait wick
  on the player touching
    refuse when it is lit: done
    change it to lit
    phrase done
  end on
end trait

create the hand lamp
  ${lampCompositions}
  in the Cellar

  A lamp.`);

  it('compiles when every composer carries the paired trait', () => {
    expect(errorCodes(wick('a thing, light-source, wick, starts unlit'))).toEqual([]);
  });

  it('is refused when a composer does not carry it, naming the composer and the trait', () => {
    const found = errors(wick('a thing, wick'));
    expect(found.map((d) => d.code)).toEqual(['analysis.change-state-pairing']);
    expect(found[0].message).toContain('hand lamp');
    expect(found[0].message).toContain('`light-source`');
    expect(found[0].message).toContain('`wick`');
  });

  it('checks each composer by its own states: one that declares the word does not excuse one that does not', () => {
    const source = story(`define trait wick
  on the player touching
    change it to lit
    phrase done
  end on
end trait

create the fuse
  a thing, wick
  states: coiled, lit
  in the Cellar

  A fuse.

create the hand lamp
  a thing, wick
  in the Cellar

  A lamp.`);
    const found = errors(source);
    expect(found.map((d) => d.code)).toEqual(['analysis.change-state-pairing']);
    expect(found[0].message).toContain('hand lamp');
  });

  it('a state the trait itself declares wins the word on every composer', () => {
    const source = story(`define trait wick
  states: cold, lit

  on the player touching
    change it to lit
    phrase done
  end on
end trait

create the hand lamp
  a thing, wick
  in the Cellar

  A lamp.`);
    expect(errorCodes(source)).toEqual([]);
  });
});

describe('change a door to open (GH #707)', () => {
  it('a door is openable by construction, so the word needs no `openable`', () => {
    const source = story(`create the Vault
  a room

  A vault.

create the oak door
  a door

  A door.

create the bell
  a thing
  in the Cellar

  A bell.

  on the player touching
    change the oak door to open
    phrase done
  end on`);
    expect(errorCodes(source)).not.toContain('analysis.change-state-pairing');
    expect(errorCodes(source)).not.toContain('analysis.undeclared-state');
  });
});

describe('a thing may not declare a word of a state trait it carries (GH #707)', () => {
  const box = (compositions: string, states: string) => story(`create the strongbox
  ${compositions}
  states: ${states}
  in the Cellar

  A strongbox.`);

  it('refuses one word of the pair beside the trait, naming the word and the trait', () => {
    const found = errors(box('a container, openable', 'open, ajar'));
    expect(found.map((d) => d.code)).toEqual(['analysis.shadow-state']);
    expect(found[0].message).toContain('`open`');
    expect(found[0].message).toContain('`openable`');
  });

  it('allows the same word on a thing that does not carry the trait', () => {
    expect(errorCodes(box('a container', 'open, ajar'))).toEqual([]);
  });

  it('allows other states beside the trait', () => {
    expect(errorCodes(box('a container, openable', 'dusty, polished'))).toEqual([]);
  });

  it('refuses a word that reaches the thing from a trait it composes', () => {
    const source = story(`define trait banked
  states: cold, lit
end trait

create the hand lamp
  a thing, light-source, banked
  in the Cellar

  A lamp.`);
    expect(errorCodes(source)).toEqual(['analysis.shadow-state']);
  });
});
