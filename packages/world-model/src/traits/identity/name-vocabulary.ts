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
 * Public interface: `deriveNameVocabulary(name)`, `NAME_VOCABULARY_STOPWORDS`.
 * Owner context: world-model identity area (naming/identity utilities).
 */

/**
 * Stopwords dropped from name vocabulary (PIN 2's content-word definition).
 * "bag of holding" → {bag, holding}; "the crystal skull" → {crystal, skull}.
 */
export const NAME_VOCABULARY_STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'a',
  'an',
  'of'
]);

/**
 * Derive the content-word vocabulary of an entity name.
 *
 * Pure function of the input string — no storage, no side effects
 * (invariant: vocabulary is always a derivation of the CURRENT name).
 *
 * @param name The entity's display name (any casing/whitespace).
 * @returns Lowercased content words in order of appearance, deduplicated:
 *   whitespace-tokenized, stopwords ({the, a, an, of}) removed. Hyphenated
 *   tokens stay single words ("jack-in-the-box" → ["jack-in-the-box"]).
 *   Empty or stopword-only names yield [].
 */
export function deriveNameVocabulary(name: string): string[] {
  if (!name) {
    return [];
  }

  const seen = new Set<string>();
  const words: string[] = [];

  for (const token of name.toLowerCase().split(/\s+/)) {
    if (!token || NAME_VOCABULARY_STOPWORDS.has(token)) {
      continue;
    }
    if (!seen.has(token)) {
      seen.add(token);
      words.push(token);
    }
  }

  return words;
}
