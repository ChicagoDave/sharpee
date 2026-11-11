/**
 * is-word-readers.ts — which reader answers a one-word `is <word>` test, so no accepted word falls through to false.
 *
 * Purpose: the dispatch table the evaluator's `is <word>` read goes through.
 * A word the compiler accepts after `is` names a declared state (read from
 * the entity's Chord state first, whatever the word), darkness, a live
 * state adjective (`open`, `lit`), a composed trait adjective (`scenery`),
 * or a character-model word (a mood, a threat, a pressure band). Every
 * platform word belongs to exactly one reader, and `unreadIsWords` names
 * any word that belongs to none, which is what the conformance test pins.
 *
 * Public interface: IsWordReader, isWordReader, unreadIsWords, STATE_ADJECTIVE_READS.
 * Owner context: @sharpee/story-loader (runtime reading of the Story IR).
 *
 * References:
 * - ADR-394 D3 — a trait adjective after `is` reads the composition; every accepted word has a reader.
 * - ratchet D1 — state adjectives read live world trait state.
 * - ADR-310 D16, ADR-318 D8 — interior words read the character model.
 */
import { TRAIT_ADJECTIVES } from '@sharpee/chord';
import { PRESSURE_BANDS, THREAT_LEVELS } from '@sharpee/world-model';

/** The reader that answers a one-word `is` test. */
export type IsWordReader = 'darkness' | 'state-adjective' | 'composition' | 'character-model';

/**
 * The state adjectives the evaluator reads from live world trait state. The
 * evaluator's state-adjective switch has one case per word here.
 */
export const STATE_ADJECTIVE_READS: ReadonlySet<string> = new Set([
  'open',
  'closed',
  'locked',
  'unlocked',
  'on',
  'off',
  'worn',
  'lit',
  'broken',
  'attached',
]);

/**
 * The reader for a word after `is`, or null when none reads it.
 *
 * A word that is both a state adjective and a trait adjective (`attached`)
 * reads the live state, as it always has. `dark` is darkness, whatever the
 * catalog also calls it.
 *
 * @param word the word after `is`
 * @param moodWords the mood words in force: the platform's and the story's own
 * @returns the reader, or null when the word has none
 */
export function isWordReader(word: string, moodWords: ReadonlySet<string>): IsWordReader | null {
  if (word === 'dark') return 'darkness';
  if (STATE_ADJECTIVE_READS.has(word)) return 'state-adjective';
  if (TRAIT_ADJECTIVES.has(word)) return 'composition';
  if (moodWords.has(word)) return 'character-model';
  if ((THREAT_LEVELS as readonly string[]).includes(word)) return 'character-model';
  if ((PRESSURE_BANDS as readonly string[]).includes(word)) return 'character-model';
  return null;
}

/**
 * The words in a list that no reader answers.
 *
 * @param words the words to check (the compiler's accepted platform words)
 * @param moodWords the mood words in force
 * @returns the unread words, in the order given; empty when every word has a reader
 */
export function unreadIsWords(words: Iterable<string>, moodWords: ReadonlySet<string>): string[] {
  return [...words].filter((word) => isWordReader(word, moodWords) === null);
}
