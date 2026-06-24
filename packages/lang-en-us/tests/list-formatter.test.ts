// packages/lang-en-us/tests/list-formatter.test.ts
//
// ADR-190: natural-language list rendering. AC-1..AC-8, AC-11, AC-12, AC-13.
// (AC-9 end-to-end is in Phase 4; AC-10 doc fix in Phase 5; AC-14 in count-formatter.)

import { describe, it, expect } from 'vitest';
import { listFormatter, theListFormatter, namesFormatter } from '../src/formatters/list';
import type { EntityInfo, FormatterContext } from '../src/formatters/types';

const ctx = {} as FormatterContext; // serialComma defaults on
const noOxford = { settings: { serialComma: false } } as FormatterContext;

const e = (name: string, extra: Partial<EntityInfo> = {}): EntityInfo => ({ name, ...extra });

describe('listFormatter (ADR-190)', () => {
  it('AC-1: empty → "nothing"', () => {
    expect(listFormatter([], ctx)).toBe('nothing');
  });

  it('AC-2: one common noun gets its article (a / an)', () => {
    expect(listFormatter([e('goat')], ctx)).toBe('a goat');
    expect(listFormatter([e('apple')], ctx)).toBe('an apple');
  });

  it('AC-3: two items join with "and", no serial comma', () => {
    expect(listFormatter([e('goat'), e('parrot')], ctx)).toBe('a goat and a parrot');
  });

  it('AC-4: three items use the Oxford comma (default on)', () => {
    expect(listFormatter([e('goat'), e('rabbit'), e('parrot')], ctx)).toBe(
      'a goat, a rabbit, and a parrot',
    );
  });

  it('AC-5: identical common nouns group and pluralize', () => {
    expect(listFormatter([e('goat'), e('goat'), e('parrot')], ctx)).toBe(
      'two goats and a parrot',
    );
  });

  it('AC-6: proper names take no article', () => {
    expect(
      listFormatter([e('Alice', { properName: true }), e('Bob', { properName: true })], ctx),
    ).toBe('Alice and Bob');
  });

  it('AC-7: mass nouns use "some" and never count-group', () => {
    expect(
      listFormatter([e('sand', { nounType: 'mass' }), e('lamp'), e('coin'), e('coin')], ctx),
    ).toBe('some sand, a lamp, and two coins');
  });

  it('AC-8: the-list renders the definite variant, no grouping', () => {
    expect(theListFormatter([e('goat'), e('rabbit'), e('parrot')], ctx)).toBe(
      'the goat, the rabbit, and the parrot',
    );
  });

  it('AC-11: serial-comma setting off drops the comma before "and"', () => {
    expect(listFormatter([e('goat'), e('rabbit'), e('parrot')], noOxford)).toBe(
      'a goat, a rabbit and a parrot',
    );
  });

  it('AC-12: count threshold — ten spelled, eleven numeric', () => {
    expect(listFormatter(Array(10).fill(e('goat')), ctx)).toBe('ten goats');
    expect(listFormatter(Array(11).fill(e('goat')), ctx)).toBe('11 goats');
  });

  it('AC-13: plural override beats the heuristic', () => {
    expect(
      listFormatter([e('goose', { plural: 'geese' }), e('goose', { plural: 'geese' })], ctx),
    ).toBe('two geese');
  });

  it('bare strings render as-is (no article), preserving plain lists', () => {
    expect(listFormatter(['north', 'south', 'east'], ctx)).toBe('north, south, and east');
  });

  it('names formatter joins plain names with no articles', () => {
    expect(namesFormatter([e('goat'), e('rabbit')], ctx)).toBe('goat and rabbit');
    expect(namesFormatter([], ctx)).toBe('');
  });
});
