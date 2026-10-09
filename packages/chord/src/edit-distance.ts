/**
 * edit-distance.ts — the edit distance behind every "did you mean" fix-it.
 *
 * Purpose: one Levenshtein implementation shared by the parser and the
 * analyzer, so a near-spelling suggestion means the same thing in both.
 *
 * Public interface: levenshtein().
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */

/**
 * Levenshtein distance between two strings: the fewest single-character
 * insertions, deletions and substitutions that turn `a` into `b`.
 * Case-sensitive; callers lowercase when they mean to ignore case.
 * @param a first string
 * @param b second string
 * @returns the distance, 0 when the strings are equal
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) {
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    }
    prev = row;
  }
  return prev[n];
}
