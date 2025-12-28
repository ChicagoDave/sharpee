/**
 * Seeded Random Number Generator Interface
 *
 * Provides deterministic randomness for reproducible game behavior.
 */

/**
 * Seeded random number generator interface
 */
export interface SeededRandom {
  /** Get a random number between 0 and 1 */
  next(): number;

  /** Get a random integer between min and max (inclusive) */
  int(min: number, max: number): number;

  /** Return true with given probability (0-1) */
  chance(probability: number): boolean;

  /** Pick a random element from an array */
  pick<T>(array: T[]): T;

  /** Shuffle an array */
  shuffle<T>(array: T[]): T[];

  /** Get the current seed */
  getSeed(): number;

  /** Set a new seed */
  setSeed(seed: number): void;
}

/**
 * Create a seeded random number generator
 *
 * Uses a Linear Congruential Generator (LCG) for deterministic randomness.
 * This ensures reproducible behavior for testing and save/load.
 */
export function createSeededRandom(seed?: number): SeededRandom {
  // Use current time as default seed
  let currentSeed = seed ?? Date.now();

  // LCG constants (same as glibc)
  const a = 1103515245;
  const c = 12345;
  const m = 2 ** 31;

  function next(): number {
    currentSeed = (a * currentSeed + c) % m;
    return currentSeed / m;
  }

  function int(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function chance(probability: number): boolean {
    return next() < probability;
  }

  function pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[int(0, array.length - 1)];
  }

  function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = int(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getSeed(): number {
    return currentSeed;
  }

  function setSeed(newSeed: number): void {
    currentSeed = newSeed;
  }

  return {
    next,
    int,
    chance,
    pick,
    shuffle,
    getSeed,
    setSeed,
  };
}
