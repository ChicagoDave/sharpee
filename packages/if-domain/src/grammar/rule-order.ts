/**
 * @file Grammar rank comparator — the one ordering of grammar matches
 * @description Orders grammar matches, and the failures the parser classifies,
 * by literal specificity (more first), then tier (story before standard),
 * then definition order (earlier first). Every reader that ranks rules calls
 * this; no other ordering of grammar rules exists.
 *
 * Public interface: GrammarRank, compareGrammarRank.
 * Owner context: if-domain grammar contract (the English grammar engine and
 * the parser's failure classifier are the callers).
 *
 * References: ADR-384 D2 (supersedes ADR-268 D2), ADR-231 D2b (literal
 * specificity).
 */

import type { GrammarTier } from './grammar-builder.js';

/**
 * What a rule is ranked by.
 */
export interface GrammarRank {
  /** Input words consumed by the rule's literal and alternate elements */
  literalSpecificity: number;
  /** The registration layer: story outranks standard at equal specificity */
  tier: GrammarTier;
  /** The rule's position in registration (definition) order */
  definitionIndex: number;
}

/**
 * Compare two ranks for sorting, best first.
 * @param a The first rank
 * @param b The second rank
 * @returns Negative when `a` ranks first, positive when `b` does, zero only
 *   for the same specificity, tier and definition index
 */
export function compareGrammarRank(a: GrammarRank, b: GrammarRank): number {
  if (a.literalSpecificity !== b.literalSpecificity) {
    return b.literalSpecificity - a.literalSpecificity;
  }
  if (a.tier !== b.tier) {
    return a.tier === 'story' ? -1 : 1;
  }
  return a.definitionIndex - b.definitionIndex;
}
