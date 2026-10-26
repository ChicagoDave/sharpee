/**
 * The one conversion of a Chord direction word (alignment finding D15):
 * every IR compass word maps to its Direction constant, a passage key
 * passes through as written, anything else names nothing. Chord's own
 * direction words are pinned against it, so the parser's closed set and
 * the loader's conversion cannot drift apart.
 */
import { describe, expect, it } from 'vitest';
import { Direction } from '@sharpee/world-model';
import { directionOfWord, exitKeyOfWord } from '../src/direction-words';

describe('directionOfWord / exitKeyOfWord (D15)', () => {
  it('maps each compass word Chord writes to its constant', () => {
    for (const constant of Object.values(Direction)) {
      expect(directionOfWord(constant.toLowerCase())).toBe(constant);
      expect(exitKeyOfWord(constant.toLowerCase())).toBe(constant);
    }
  });

  it('passes a passage key through as written, and names nothing for another word', () => {
    expect(exitKeyOfWord('passage:climb-the-rope')).toBe('passage:climb-the-rope');
    expect(directionOfWord('passage:climb-the-rope')).toBeUndefined();
    expect(directionOfWord('sideways')).toBeUndefined();
    expect(exitKeyOfWord('sideways')).toBeUndefined();
  });
});
