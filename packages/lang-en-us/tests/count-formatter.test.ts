// packages/lang-en-us/tests/count-formatter.test.ts
//
// ADR-190 / GH #166: the count formatter renders a count word plus the real
// (pluralized) noun, spelling out 1-10 and using numerals for 11+.

import { describe, it, expect } from 'vitest';
import { countFormatter } from '../src/formatters/list';
import type { FormatterContext } from '../src/formatters/types';

const ctx = {} as FormatterContext;

describe('countFormatter (ADR-190, GH #166)', () => {
  it('AC-14: count > 1 renders the real pluralized noun', () => {
    expect(countFormatter(['coin', 'coin', 'coin'], ctx)).toBe('three coins');
  });

  it('renders "one <noun>" for a single item', () => {
    expect(countFormatter(['coin'], ctx)).toBe('one coin');
  });

  it('renders "nothing" for an empty array', () => {
    expect(countFormatter([], ctx)).toBe('nothing');
  });

  it('spells out 2-10 and uses numerals for 11+', () => {
    expect(countFormatter(Array(10).fill('goat'), ctx)).toBe('ten goats');
    expect(countFormatter(Array(11).fill('goat'), ctx)).toBe('11 goats');
  });

  it('uses the EntityInfo.plural override for irregulars', () => {
    const geese = [
      { name: 'goose', plural: 'geese' },
      { name: 'goose', plural: 'geese' },
    ];
    expect(countFormatter(geese, ctx)).toBe('two geese');
  });

  it('pluralizes regular nouns via the heuristic when no override is given', () => {
    expect(countFormatter(['box', 'box'], ctx)).toBe('two boxes');
  });
});
