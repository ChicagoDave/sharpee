/**
 * Crockford Id generator behaviour tests.
 *
 * Behavior Statement — id-generator
 *   DOES: generateId() returns a string matching
 *         `^[0-9A-HJ-KM-NP-TV-Z]{4}-[0-9A-HJ-KM-NP-TV-Z]{4}$`. Each of the
 *         8 symbols is drawn uniformly at random from the 32-symbol
 *         Crockford alphabet (excluding I, L, O, U). isWellFormedId(s)
 *         returns true iff s is a string matching the same regex.
 *   WHEN: registering a new identity or any test that needs a sample Id.
 *   BECAUSE: ADR-161 requires a short human-readable Id; Crockford
 *            excludes confusable characters so a CSV can be eyeballed;
 *            ~1.1 trillion combinations make collision rare.
 *   REJECTS WHEN: isWellFormedId is given a non-string, a string outside
 *                 the alphabet, missing the dash, wrong length, lowercase,
 *                 or padded with whitespace — caller is expected to
 *                 normalize before validation.
 */

import { describe, expect, it } from 'vitest';
import {
  CROCKFORD_ALPHABET,
  ID_PATTERN,
  generateId,
  isWellFormedId,
} from '../../src/identity/id-generator.js';

describe('Crockford Id generator', () => {
  describe('CROCKFORD_ALPHABET constant', () => {
    it('contains exactly 32 unique symbols', () => {
      expect(CROCKFORD_ALPHABET).toHaveLength(32);
      expect(new Set(CROCKFORD_ALPHABET).size).toBe(32);
    });

    it('excludes the four confusable letters I, L, O, U', () => {
      expect(CROCKFORD_ALPHABET).not.toMatch(/[ILOU]/);
    });

    it('includes all digits 0-9', () => {
      for (const d of '0123456789') {
        expect(CROCKFORD_ALPHABET).toContain(d);
      }
    });

    it('includes all letters A-Z except I, L, O, U', () => {
      for (let code = 65; code <= 90; code++) {
        const letter = String.fromCharCode(code);
        if ('ILOU'.includes(letter)) {
          expect(CROCKFORD_ALPHABET).not.toContain(letter);
        } else {
          expect(CROCKFORD_ALPHABET).toContain(letter);
        }
      }
    });
  });

  describe('generateId()', () => {
    it('returns a 9-character string in XXXX-XXXX form', () => {
      const id = generateId();
      expect(id).toHaveLength(9);
      expect(id[4]).toBe('-');
    });

    it('always matches the canonical ID_PATTERN regex', () => {
      for (let i = 0; i < 1000; i++) {
        const id = generateId();
        expect(id).toMatch(ID_PATTERN);
      }
    });

    it('never contains a confusable letter (I, L, O, U)', () => {
      for (let i = 0; i < 1000; i++) {
        const id = generateId();
        expect(id).not.toMatch(/[ILOU]/);
      }
    });

    it('all 32 symbols appear across both positions over a sample of 4000 ids', () => {
      const seenLeft = new Set<string>();
      const seenRight = new Set<string>();
      for (let i = 0; i < 4000; i++) {
        const id = generateId();
        for (const c of id.slice(0, 4)) seenLeft.add(c);
        for (const c of id.slice(5)) seenRight.add(c);
      }
      // Coupon-collector for 32 symbols over 4×4000 = 16000 draws per side
      // is statistically near-certain to cover all 32. If this fails the
      // generator is biased.
      expect(seenLeft.size).toBe(32);
      expect(seenRight.size).toBe(32);
    });

    it('produces different ids on successive calls (collision-free over 1000 samples)', () => {
      const seen = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        seen.add(generateId());
      }
      // 1.1 trillion space, 1000 draws — birthday probability is vanishing.
      expect(seen.size).toBe(1000);
    });
  });

  describe('isWellFormedId()', () => {
    it('returns true for canonical examples', () => {
      expect(isWellFormedId('XYNC-4FJ3')).toBe(true);
      expect(isWellFormedId('ABCD-EFGH')).toBe(true);
      expect(isWellFormedId('0000-0000')).toBe(true);
      expect(isWellFormedId('ZZZZ-ZZZZ')).toBe(true);
    });

    it('returns false for strings missing the dash', () => {
      expect(isWellFormedId('XYNC4FJ3')).toBe(false);
      expect(isWellFormedId('XYNCX4FJ3')).toBe(false);
    });

    it('returns false for strings containing confusable letters', () => {
      expect(isWellFormedId('IBCD-EFGH')).toBe(false);
      expect(isWellFormedId('ABCD-EFLH')).toBe(false);
      expect(isWellFormedId('ABCO-EFGH')).toBe(false);
      expect(isWellFormedId('ABCD-EFGU')).toBe(false);
    });

    it('returns false for lowercase input (caller must normalize)', () => {
      expect(isWellFormedId('xync-4fj3')).toBe(false);
      expect(isWellFormedId('XyNc-4fJ3')).toBe(false);
    });

    it('returns false for whitespace-padded input', () => {
      expect(isWellFormedId(' XYNC-4FJ3')).toBe(false);
      expect(isWellFormedId('XYNC-4FJ3 ')).toBe(false);
      expect(isWellFormedId('XYNC -4FJ3')).toBe(false);
    });

    it('returns false for wrong-length strings', () => {
      expect(isWellFormedId('')).toBe(false);
      expect(isWellFormedId('XYNC-4FJ')).toBe(false);
      expect(isWellFormedId('XYNC-4FJ32')).toBe(false);
      expect(isWellFormedId('XYNCY-4FJ3')).toBe(false);
      expect(isWellFormedId('XYN-4FJ3')).toBe(false);
    });

    it('returns false for non-string inputs', () => {
      expect(isWellFormedId(null)).toBe(false);
      expect(isWellFormedId(undefined)).toBe(false);
      expect(isWellFormedId(42)).toBe(false);
      expect(isWellFormedId({})).toBe(false);
      expect(isWellFormedId(['XYNC-4FJ3'])).toBe(false);
    });

    it('accepts every symbol position from the alphabet (round-trip with generated ids)', () => {
      // Sanity: every id we generate must validate.
      for (let i = 0; i < 200; i++) {
        const id = generateId();
        expect(isWellFormedId(id)).toBe(true);
      }
    });
  });
});
