/**
 * Seeded probabilistic-death helper (ADR-224 Decision 3).
 *
 * A thin, intention-revealing wrapper over the scheduler's seeded RNG so a
 * probabilistic hazard (the grue: a move in the dark is lethal only some of the
 * time) is replay-deterministic under a fixed seed. Centralising the roll here is
 * also the enforcement point for the project RNG policy: probabilistic death uses
 * the seeded RNG exclusively — `Math.random()` is never acceptable (a seeded roll
 * is what makes AC-4 reproducible and what save/restore relies on).
 *
 * Public interface: `rollLethal`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */

import type { SeededRandom } from '@sharpee/core';

/**
 * Whether a probabilistic hazard is lethal this time.
 *
 * @param probability chance of death in `[0, 1]` (e.g. `0.75` = the grue's 75% kill)
 * @param rng the engine's seeded RNG — the sole randomness source (never `Math.random()`)
 * @returns `true` with probability `probability`, deterministically for a given seed/sequence
 */
export function rollLethal(probability: number, rng: SeededRandom): boolean {
  return rng.chance(probability);
}
