/**
 * EFF passcode generator behaviour tests.
 *
 * Behavior Statement — passcode-generator
 *   DOES: module init parses eff-large-wordlist.txt into a frozen array
 *         of 7,776 lowercase-alpha words; generatePasscode() returns
 *         "<wordA>-<wordB>" with both words drawn uniformly at random
 *         from the loaded wordlist using crypto.randomInt.
 *   WHEN: registering a new identity.
 *   BECAUSE: ADR-161 requires a human-readable passcode that survives
 *            a CSV download; ~60M combinations + per-IP rate limit is
 *            adequate for honest users.
 *   REJECTS WHEN: module load fails with a clear error if the wordlist
 *                 file is missing, malformed, or has the wrong line
 *                 count — the server must not run with a degraded
 *                 wordlist because that would silently shrink the
 *                 passcode space.
 */

import { describe, expect, it } from 'vitest';
import {
  PASSCODE_PATTERN,
  _testGetWordlist,
  generatePasscode,
  getWordlistSize,
  isWellFormedPasscode,
} from '../../src/identity/passcode-generator.js';

describe('EFF passcode generator', () => {
  describe('wordlist load', () => {
    it('contains exactly 7772 entries (EFF\'s 7776 minus 4 hyphenated compounds)', () => {
      expect(getWordlistSize()).toBe(7772);
      expect(_testGetWordlist()).toHaveLength(7772);
    });

    it('every entry is pure lowercase a-z (no digits, no separators, no whitespace)', () => {
      for (const word of _testGetWordlist()) {
        expect(word).toMatch(/^[a-z]+$/);
      }
    });

    it('contains the canonical boundary words from the public release', () => {
      const words = _testGetWordlist();
      // 'abacus' is the first EFF entry (dice roll 11111); 'zoom' is the
      // last (66666). Both are pure-alpha so neither is filtered out.
      expect(words[0]).toBe('abacus');
      expect(words[words.length - 1]).toBe('zoom');
    });

    it('does NOT contain the 4 hyphenated compounds that the parser would mishandle', () => {
      const wordSet = new Set(_testGetWordlist());
      expect(wordSet.has('drop-down')).toBe(false);
      expect(wordSet.has('felt-tip')).toBe(false);
      expect(wordSet.has('t-shirt')).toBe(false);
      expect(wordSet.has('yo-yo')).toBe(false);
    });

    it('has no duplicates', () => {
      const words = _testGetWordlist();
      expect(new Set(words).size).toBe(words.length);
    });
  });

  describe('generatePasscode()', () => {
    it('returns a string matching PASSCODE_PATTERN', () => {
      for (let i = 0; i < 1000; i++) {
        const pc = generatePasscode();
        expect(pc).toMatch(PASSCODE_PATTERN);
      }
    });

    it('both words come from the wordlist', () => {
      const wordSet = new Set(_testGetWordlist());
      for (let i = 0; i < 500; i++) {
        const pc = generatePasscode();
        const [a, b] = pc.split('-');
        expect(wordSet.has(a)).toBe(true);
        expect(wordSet.has(b)).toBe(true);
      }
    });

    it('produces broadly distributed words across the wordlist', () => {
      // Over 10,000 passcodes (= 20,000 word draws), with a 7,772-word
      // pool drawn uniformly, the expected number of unique words seen
      // is ~7,757 (coupon-collector under exponential approximation).
      // The threshold below (>= 6500) is far below the expectation and
      // catches an obvious distribution bias without flaking on RNG noise.
      const seen = new Set<string>();
      for (let i = 0; i < 10000; i++) {
        const pc = generatePasscode();
        const [a, b] = pc.split('-');
        seen.add(a);
        seen.add(b);
      }
      expect(seen.size).toBeGreaterThanOrEqual(6500);
    });

    it('produces different passcodes on successive calls (collision sanity)', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        seen.add(generatePasscode());
      }
      // 60M combination space, 1000 draws — birthday-collision risk
      // ≈ 1 in 100k. A single collision would still pass; only a wholesale
      // fixed output would fail.
      expect(seen.size).toBeGreaterThanOrEqual(990);
    });
  });

  describe('isWellFormedPasscode()', () => {
    it('returns true for canonical examples', () => {
      expect(isWellFormedPasscode('correct-horse')).toBe(true);
      expect(isWellFormedPasscode('apple-zebra')).toBe(true);
      expect(isWellFormedPasscode('a-b')).toBe(true);
    });

    it('returns true for round-tripped generated passcodes', () => {
      for (let i = 0; i < 200; i++) {
        expect(isWellFormedPasscode(generatePasscode())).toBe(true);
      }
    });

    it('returns false for missing dash', () => {
      expect(isWellFormedPasscode('correcthorse')).toBe(false);
      expect(isWellFormedPasscode('correct horse')).toBe(false);
    });

    it('returns false for more than two words', () => {
      expect(isWellFormedPasscode('correct-horse-battery')).toBe(false);
    });

    it('returns false for digits or punctuation', () => {
      expect(isWellFormedPasscode('correct1-horse')).toBe(false);
      expect(isWellFormedPasscode('correct-horse2')).toBe(false);
      expect(isWellFormedPasscode('correct_horse')).toBe(false);
      expect(isWellFormedPasscode('correct.horse')).toBe(false);
    });

    it('returns false for empty / whitespace / uppercase', () => {
      expect(isWellFormedPasscode('')).toBe(false);
      expect(isWellFormedPasscode('-')).toBe(false);
      expect(isWellFormedPasscode(' correct-horse')).toBe(false);
      expect(isWellFormedPasscode('Correct-horse')).toBe(false);
      expect(isWellFormedPasscode('CORRECT-HORSE')).toBe(false);
    });

    it('returns false for non-string inputs', () => {
      expect(isWellFormedPasscode(null)).toBe(false);
      expect(isWellFormedPasscode(undefined)).toBe(false);
      expect(isWellFormedPasscode(42)).toBe(false);
      expect(isWellFormedPasscode({})).toBe(false);
    });
  });
});
