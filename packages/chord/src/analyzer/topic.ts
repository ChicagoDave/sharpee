/**
 * topic.ts — the canonical form of a conversation topic.
 *
 * A topic is compared as lowercased words with a leading article dropped, so
 * `the murder` and `Murder` name the same topic wherever a topic is keyed:
 * `knows` lines, `spreads` lists, `burdened by`, and the loader's lookups.
 *
 * Public interface: normalizeTopic().
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */

/**
 * Normalize a topic's text: trim, lowercase, split on whitespace, and drop a
 * leading `the`/`a`/`an` when more words follow it.
 * @param text the topic as written
 * @returns the canonical topic key
 */
export function normalizeTopic(text: string): string {
  const words = text.trim().toLowerCase().split(/\s+/);
  if (words.length > 1 && (words[0] === 'the' || words[0] === 'a' || words[0] === 'an')) words.shift();
  return words.join(' ');
}
