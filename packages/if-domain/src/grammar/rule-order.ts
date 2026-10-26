/**
 * @file Grammar rank comparator — the one ordering of grammar readings
 * @description Orders the readings of grammar rules, and the failures the
 * parser classifies, by their nouns and their rule: items naming nothing
 * (fewer first), then literal specificity (more first), then tier (story
 * before standard), then definition order (earlier first), then names (more
 * first) and exact names (more first). Every reader that ranks readings
 * calls this; no other ordering of grammar rules exists.
 *
 * Public interface: NounRank, GrammarRank, compareGrammarRank.
 * Owner context: if-domain grammar contract (the English grammar engine and
 * the parser's failure classifier are the callers).
 *
 * References: ADR-386 D4, D5 (the noun rank), ADR-384 D2 (supersedes
 * ADR-268 D2; the rule keys), ADR-231 D2b (literal specificity).
 */

import type { GrammarTier } from './grammar-builder.js';

/**
 * How a reading's entity items resolve, counted: the parser ranks by it and
 * the validator resolves, so no entity id leaves the rank.
 */
export interface NounRank {
  /** Items naming nothing in the world */
  unnamed: number;
  /** Distinct entities the items name */
  named: number;
  /** Items named at the exact tier */
  exact: number;
}

/**
 * What a reading is ranked by.
 */
export interface GrammarRank {
  /** How the reading's items resolve */
  nounRank: NounRank;
  /** Input words consumed by the rule's literal and alternate elements */
  literalSpecificity: number;
  /** The registration layer: story outranks standard at equal specificity */
  tier: GrammarTier;
  /** The rule's position in registration (definition) order */
  definitionIndex: number;
}

/**
 * Compare two ranks for sorting, best first. Only `unnamed` stands above the
 * rule's own keys, so a literal line still beats a slot reading of the same
 * words; `named` and `exact` decide between the readings of one rule.
 * @param a The first rank
 * @param b The second rank
 * @returns Negative when `a` ranks first, positive when `b` does, zero only
 *   for the same noun rank, specificity, tier and definition index
 */
export function compareGrammarRank(a: GrammarRank, b: GrammarRank): number {
  if (a.nounRank.unnamed !== b.nounRank.unnamed) {
    return a.nounRank.unnamed - b.nounRank.unnamed;
  }
  if (a.literalSpecificity !== b.literalSpecificity) {
    return b.literalSpecificity - a.literalSpecificity;
  }
  if (a.tier !== b.tier) {
    return a.tier === 'story' ? -1 : 1;
  }
  if (a.definitionIndex !== b.definitionIndex) {
    return a.definitionIndex - b.definitionIndex;
  }
  if (a.nounRank.named !== b.nounRank.named) {
    return b.nounRank.named - a.nounRank.named;
  }
  return b.nounRank.exact - a.nounRank.exact;
}
