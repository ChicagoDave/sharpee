/**
 * parse-cardinal.test.ts — the language owns how number words compose
 * (ADR-386 D8). `parseCardinal` reads digits, one number word, and a
 * tens-and-units compound written as two words or hyphenated, and nothing
 * else.
 */
import { describe, expect, it } from 'vitest';
import { parseCardinal } from '../src/data/words';

describe('parseCardinal (ADR-386 D8)', () => {
  it('reads digits', () => {
    expect(parseCardinal(['25'])).toBe(25);
    expect(parseCardinal(['0'])).toBe(0);
    expect(parseCardinal(['414'])).toBe(414);
  });

  it('reads one number word', () => {
    expect(parseCardinal(['twenty'])).toBe(20);
    expect(parseCardinal(['Seven'])).toBe(7);
    expect(parseCardinal(['hundred'])).toBe(100);
  });

  it('reads a tens-and-units compound, as two words or hyphenated', () => {
    expect(parseCardinal(['twenty', 'five'])).toBe(25);
    expect(parseCardinal(['twenty-five'])).toBe(25);
    expect(parseCardinal(['ninety', 'nine'])).toBe(99);
  });

  it('reads nothing else', () => {
    expect(parseCardinal(['dial'])).toBeNull();
    expect(parseCardinal(['twenty', 'hundred'])).toBeNull();
    expect(parseCardinal(['five', 'twenty'])).toBeNull();
    expect(parseCardinal(['twenty', '5'])).toBeNull();
    expect(parseCardinal(['first'])).toBeNull();
    expect(parseCardinal(['twenty', 'five', 'six'])).toBeNull();
    expect(parseCardinal([])).toBeNull();
  });
});
