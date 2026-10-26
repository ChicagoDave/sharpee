/**
 * The one conversion of a Chord direction word into the platform's value
 * (alignment finding D15). Chord's IR carries a compass direction as the
 * author wrote it (`north`); the world model keys exits, headings and edges
 * by the `Direction` constant (`NORTH`). Every loader reader converts here,
 * once, at the IR boundary — none re-spells a word inline.
 *
 * Public interface: directionOfWord, exitKeyOfWord.
 * Owner context: story-loader (the IR → world boundary).
 */
import { Direction, type DirectionType, type ExitKey, isPassageKey } from '@sharpee/world-model';

/** Each direction constant under the word Chord writes for it. */
const DIRECTION_BY_WORD: ReadonlyMap<string, DirectionType> = new Map(
  Object.values(Direction).map((direction) => [direction.toLowerCase(), direction]),
);

/**
 * The direction constant a Chord compass word names.
 *
 * @param word A direction word from the IR (`north`, `up`, `in`)
 * @returns The constant, or undefined when the word names no direction
 */
export function directionOfWord(word: string): DirectionType | undefined {
  return DIRECTION_BY_WORD.get(word.toLowerCase());
}

/**
 * An IR exit word as the world keys it: a passage key as written
 * (ADR-378 D1a), a compass word as its constant.
 *
 * @param word An exit word from the IR
 * @returns The exit key, or undefined when the word is neither
 */
export function exitKeyOfWord(word: string): ExitKey | undefined {
  return isPassageKey(word) ? word : directionOfWord(word);
}
