// packages/lang-en-us/src/number-words.ts
//
// Count-word spelling for list/count rendering (ADR-190): spell out 1–10
// ("one".."ten"), use numerals for 11 and above. Used by the count formatter and
// by list count-grouping.

const SMALL = [
  'zero', 'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
];

/**
 * Render a count as a word for 1–10, or a numeral for 0 and 11+.
 *
 * @param n a non-negative integer count
 * @returns "one".."ten" for 1–10, otherwise the numeral as a string
 */
export function countWord(n: number): string {
  if (n >= 1 && n <= 10) return SMALL[n];
  return String(n);
}
