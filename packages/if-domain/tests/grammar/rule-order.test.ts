/**
 * @file Grammar rank comparator (ADR-384 D2, ADR-386 D5)
 * @description One comparator orders grammar matches and failures: items
 * naming nothing (fewer first), then literal specificity (more first), then
 * tier (story before standard), then definition order (earlier first), then
 * names (more first) and exact names (more first). Each key is pinned with a
 * pair that differs in that key alone, and with a pair where an earlier key
 * overrides a later one.
 */

import { describe, it, expect } from 'vitest';
import { compareGrammarRank, type GrammarRank, type NounRank } from '../../src/grammar/rule-order';

const nouns = (unnamed: number, named: number, exact: number): NounRank => ({ unnamed, named, exact });

const rank = (
  literalSpecificity: number,
  tier: 'story' | 'standard',
  definitionIndex: number,
  nounRank: NounRank = nouns(0, 0, 0)
): GrammarRank => ({
  nounRank,
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
    expect(compareGrammarRank(rank(2, 'story', 4, nouns(0, 2, 1)), rank(2, 'story', 4, nouns(0, 2, 0)))).not.toBe(0);
  });
});

describe('compareGrammarRank: the noun rank (ADR-386 D4, D5)', () => {
  it('fewer items naming nothing ranks first, before specificity', () => {
    const specificButUnnamed = rank(2, 'story', 0, nouns(1, 1, 1));
    const broadAndNamed = rank(1, 'standard', 9, nouns(0, 1, 1));
    expect(order(specificButUnnamed, broadAndNamed)).toEqual([broadAndNamed, specificButUnnamed]);
  });

  it('a rule with no items has nothing unnamed, so a literal line beats a slot reading naming something (AC9)', () => {
    const passage = rank(2, 'story', 0, nouns(0, 0, 0));
    const slotReading = rank(1, 'standard', 1, nouns(0, 1, 1));
    expect(order(slotReading, passage)).toEqual([passage, slotReading]);
  });

  it('more names ranks first only after specificity, tier and definition order', () => {
    const sameRuleFewerNames = rank(1, 'standard', 3, nouns(0, 1, 1));
    const sameRuleMoreNames = rank(1, 'standard', 3, nouns(0, 2, 2));
    expect(order(sameRuleFewerNames, sameRuleMoreNames)).toEqual([sameRuleMoreNames, sameRuleFewerNames]);

    const earlierRuleFewerNames = rank(1, 'standard', 2, nouns(0, 1, 1));
    expect(order(sameRuleMoreNames, earlierRuleFewerNames)).toEqual([earlierRuleFewerNames, sameRuleMoreNames]);

    const moreSpecificFewerNames = rank(2, 'standard', 5, nouns(0, 1, 1));
    expect(order(sameRuleMoreNames, moreSpecificFewerNames)).toEqual([moreSpecificFewerNames, sameRuleMoreNames]);
  });

  it('more exact names ranks first after names', () => {
    const words = rank(1, 'standard', 3, nouns(0, 2, 0));
    const exact = rank(1, 'standard', 3, nouns(0, 2, 2));
    expect(order(words, exact)).toEqual([exact, words]);

    const fewerButExact = rank(1, 'standard', 3, nouns(0, 1, 1));
    expect(order(fewerButExact, words)).toEqual([words, fewerButExact]);
  });
});
