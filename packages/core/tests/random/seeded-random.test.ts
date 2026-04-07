/**
 * Seeded Random Number Generator Tests
 *
 * Tests deterministic randomness for reproducible game behavior.
 * Critical for save/load consistency and combat testing.
 */

import { describe, it, expect } from 'vitest';
import { createSeededRandom } from '../../src/random/seeded-random';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('should produce same sequence from same seed', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('should produce different sequences from different seeds', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(99);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).not.toEqual(seq2);
    });

    it('should reset sequence via setSeed', () => {
      const rng = createSeededRandom(42);
      const first = [rng.next(), rng.next(), rng.next()];

      rng.setSeed(42);
      const second = [rng.next(), rng.next(), rng.next()];

      expect(first).toEqual(second);
    });
  });

  describe('next()', () => {
    it('should return values in [0, 1)', () => {
      const rng = createSeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('int()', () => {
    it('should return values within inclusive range', () => {
      const rng = createSeededRandom(42);

      for (let i = 0; i < 100; i++) {
        const val = rng.int(1, 6);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(6);
      }
    });

    it('should return exact value when min equals max', () => {
      const rng = createSeededRandom(42);
      expect(rng.int(5, 5)).toBe(5);
    });
  });

  describe('chance()', () => {
    it('should always return true for probability 1', () => {
      const rng = createSeededRandom(42);

      for (let i = 0; i < 50; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('should always return false for probability 0', () => {
      const rng = createSeededRandom(42);

      for (let i = 0; i < 50; i++) {
        expect(rng.chance(0)).toBe(false);
      }
    });

    it('should be deterministic for same seed', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);

      const results1 = Array.from({ length: 20 }, () => rng1.chance(0.5));
      const results2 = Array.from({ length: 20 }, () => rng2.chance(0.5));

      expect(results1).toEqual(results2);
    });
  });

  describe('pick()', () => {
    it('should return an element from the array', () => {
      const rng = createSeededRandom(42);
      const items = ['sword', 'shield', 'potion', 'scroll'];

      for (let i = 0; i < 20; i++) {
        expect(items).toContain(rng.pick(items));
      }
    });

    it('should throw on empty array', () => {
      const rng = createSeededRandom(42);
      expect(() => rng.pick([])).toThrow('Cannot pick from empty array');
    });

    it('should be deterministic for same seed', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);
      const items = ['a', 'b', 'c', 'd'];

      const picks1 = Array.from({ length: 10 }, () => rng1.pick(items));
      const picks2 = Array.from({ length: 10 }, () => rng2.pick(items));

      expect(picks1).toEqual(picks2);
    });
  });

  describe('shuffle()', () => {
    it('should return array with same elements', () => {
      const rng = createSeededRandom(42);
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(original);

      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should not mutate the original array', () => {
      const rng = createSeededRandom(42);
      const original = [1, 2, 3, 4, 5];
      const copy = [...original];
      rng.shuffle(original);

      expect(original).toEqual(copy);
    });

    it('should produce deterministic permutation for same seed', () => {
      const rng1 = createSeededRandom(42);
      const rng2 = createSeededRandom(42);

      const shuffled1 = rng1.shuffle([1, 2, 3, 4, 5]);
      const shuffled2 = rng2.shuffle([1, 2, 3, 4, 5]);

      expect(shuffled1).toEqual(shuffled2);
    });
  });

  describe('getSeed()', () => {
    it('should return current seed state (advances after operations)', () => {
      const rng = createSeededRandom(42);
      const initialSeed = rng.getSeed();
      expect(initialSeed).toBe(42);

      rng.next();
      const advancedSeed = rng.getSeed();
      expect(advancedSeed).not.toBe(42);
    });
  });
});
