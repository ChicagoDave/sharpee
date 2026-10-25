/**
 * @file Grammar rank comparator (ADR-384 D2)
 * @description One comparator orders grammar matches and failures: literal
 * specificity (more first), then tier (story before standard), then
 * definition order (earlier first). Each key is pinned with a pair that
 * differs in that key alone, and with a pair where an earlier key overrides
 * a later one.
 */

import { describe, it, expect } from 'vitest';
import { compareGrammarRank, type GrammarRank } from '../../src/grammar/rule-order';

const rank = (literalSpecificity: number, tier: 'story' | 'standard', definitionIndex: number): GrammarRank => ({
  literalSpecificity,
  tier,
  definitionIndex
});

const order = (...ranks: GrammarRank[]) => [...ranks].sort(compareGrammarRank);

describe('compareGrammarRank', () => {
  it('ranks the more specific first', () => {
    const broad = rank(1, 'standard', 0);
    const specific = rank(2, 'standard', 1);
    expect(order(broad, specific)).toEqual([specific, broad]);
  });

  it('at equal specificity, ranks the story tier first', () => {
    const standard = rank(1, 'standard', 0);
    const story = rank(1, 'story', 1);
    expect(order(standard, story)).toEqual([story, standard]);
  });

  it('at equal specificity and tier, ranks the earlier definition first', () => {
    const later = rank(1, 'story', 7);
    const earlier = rank(1, 'story', 3);
    expect(order(later, earlier)).toEqual([earlier, later]);
  });

  it('specificity outranks tier', () => {
    const storyBroad = rank(1, 'story', 0);
    const standardSpecific = rank(2, 'standard', 1);
    expect(order(storyBroad, standardSpecific)).toEqual([standardSpecific, storyBroad]);
  });

  it('tier outranks definition order', () => {
    const standardEarly = rank(1, 'standard', 0);
    const storyLate = rank(1, 'story', 9);
    expect(order(standardEarly, storyLate)).toEqual([storyLate, standardEarly]);
  });

  it('answers zero only for the same rank', () => {
    expect(compareGrammarRank(rank(2, 'story', 4), rank(2, 'story', 4))).toBe(0);
  });
});
