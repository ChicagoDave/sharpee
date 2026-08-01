/**
 * Seeded probabilistic-death helper (ADR-224 Decision 3, ADR-293).
 *
 * A thin, intention-revealing wrapper so a probabilistic hazard (the grue: a
 * move in the dark is lethal only some of the time) draws on its own declared
 * choice point (ADR-293 D2/D3) and is replay-deterministic under a fixed
 * master seed. Centralising the roll here is also the enforcement point for
 * the project RNG policy: probabilistic death draws through the point handle
 * exclusively — `Math.random()` is never acceptable.
 *
 * Public interface: `rollLethal`, `PROBABILISTIC_DEATH_POINT`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */

import { RandomService, definePoint } from '@sharpee/core';

/** The probabilistic-death hazard's choice point (single yes/no draw). */
export const PROBABILISTIC_DEATH_POINT = definePoint('stdlib.probabilistic-death.lethal', {
  classes: ['yes', 'no']
});

/**
 * Whether a probabilistic hazard is lethal this time. One draw on the
 * `stdlib.probabilistic-death.lethal` point's own stream.
 *
 * @param probability chance of death in `[0, 1]` (e.g. `0.75` = the grue's 75% kill)
 * @param random the session's per-point stream owner — the sole randomness source
 * @returns `true` with probability `probability`, deterministically for a given master seed
 */
export function rollLethal(probability: number, random: RandomService): boolean {
  return random.chance(PROBABILISTIC_DEATH_POINT, probability);
}
