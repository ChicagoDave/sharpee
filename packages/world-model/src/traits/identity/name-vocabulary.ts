// packages/world-model/src/traits/identity/name-vocabulary.ts

/**
 * Name-vocabulary derivation (ADR-231 D3, PIN 2).
 *
 * Purpose: derive the matchable content words of an entity name as a PURE
 * on-demand computation from the current name — never stored on the trait.
 * The command validator (stdlib) and any other matcher call this helper at
 * match time, so Chord-loaded and TS-authored entities behave identically
 * by construction, and runtime renames can never leave stale vocabulary.
 *
 * The stopwords are the language's (ADR-387 D2): the caller hands them in,
 * from the world's language words or the compiler's locale facts, and this
 * module holds no English.
 *
 * Public interface: `deriveNameVocabulary(name, stopwords)`.
 * Owner context: world-model identity area (naming/identity utilities).
 */

/**
 * Derive the content-word vocabulary of an entity name.
 *
 * Pure function of the input string — no storage, no side effects
 * (invariant: vocabulary is always a derivation of the CURRENT name).
 *
 * @param name The entity's display name (any casing/whitespace).
 * @param stopwords The language's name stopwords (English: the, a, an, of).
 * @returns Lowercased content words in order of appearance, deduplicated:
 *   whitespace-tokenized, stopwords removed. Hyphenated tokens stay single
 *   words ("jack-in-the-box" → ["jack-in-the-box"]). Empty or stopword-only
 *   names yield [].
 */
export function deriveNameVocabulary(name: string, stopwords: readonly string[]): string[] {
  if (!name) {
    return [];
  }

  const seen = new Set<string>();
  const words: string[] = [];

  for (const token of name.toLowerCase().split(/\s+/)) {
    if (!token || stopwords.includes(token)) {
      continue;
    }
    if (!seen.has(token)) {
      seen.add(token);
      words.push(token);
    }
  }

  return words;
}
