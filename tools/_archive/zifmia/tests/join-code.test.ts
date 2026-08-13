import { describe, it, expect } from 'vitest';
import { generateJoinCode, normalizeJoinCode, CROCKFORD_ALPHABET, JOIN_CODE_LENGTH } from '../src/rooms/join-code.js';

describe('generateJoinCode', () => {
  it('returns a string of the default length', () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
  });

  it('uses only Crockford-32 characters (no I/L/O/U)', () => {
    for (let i = 0; i < 100; i += 1) {
      const code = generateJoinCode();
      for (const ch of code) {
        expect(CROCKFORD_ALPHABET).toContain(ch);
        expect(['I', 'L', 'O', 'U']).not.toContain(ch);
      }
    }
  });

  it('produces statistically unique codes across many samples', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i += 1) seen.add(generateJoinCode());
    // 2000 samples from 32^8 keyspace: collisions are astronomically unlikely.
    expect(seen.size).toBe(2000);
  });
});

describe('normalizeJoinCode', () => {
  it('uppercases', () => {
    expect(normalizeJoinCode('abc23')).toBe('ABC23');
  });

  it('maps i/l → 1, o → 0, u → V', () => {
    expect(normalizeJoinCode('i')).toBe('1');
    expect(normalizeJoinCode('L')).toBe('1');
    expect(normalizeJoinCode('o')).toBe('0');
    expect(normalizeJoinCode('U')).toBe('V');
    expect(normalizeJoinCode('LOIU')).toBe('101V');
  });

  it('rejects non-Crockford characters', () => {
    expect(normalizeJoinCode('abc!')).toBeUndefined();
    expect(normalizeJoinCode('abc def')).toBeUndefined();
  });

  it('rejects empty / non-string input', () => {
    expect(normalizeJoinCode('')).toBeUndefined();
    expect(normalizeJoinCode(undefined)).toBeUndefined();
    expect(normalizeJoinCode(null)).toBeUndefined();
    expect(normalizeJoinCode(42)).toBeUndefined();
  });
});
