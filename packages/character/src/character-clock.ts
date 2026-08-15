/**
 * Character clock seam (ADR-310 implementation plan, temporal amendment
 * 2026-08-15)
 *
 * The ONE place @sharpee/character does turn arithmetic. Every duration,
 * expiry, and elapsed-time comparison in this package goes through these
 * helpers rather than raw `turn` math, so that ADR-316's elapsed-time
 * semantics — when un-deferred — changes exactly one seam.
 *
 * Public interface: expiryTurn, hasExpired, isMomentaryExpired, turnsSince.
 * Owner context: @sharpee/character
 */

/**
 * Compute the turn on which a lingering effect expires.
 *
 * @param appliedAtTurn - The turn the effect was applied
 * @param lingeringTurns - How many turns it lasts
 * @returns The expiry turn
 */
export function expiryTurn(appliedAtTurn: number, lingeringTurns: number): number {
  return appliedAtTurn + lingeringTurns;
}

/**
 * Check whether an expiry turn has been reached.
 *
 * @param currentTurn - The current turn number
 * @param expiresAtTurn - The expiry turn, if any
 * @returns True if set and reached
 */
export function hasExpired(currentTurn: number, expiresAtTurn: number | undefined): boolean {
  return expiresAtTurn !== undefined && currentTurn >= expiresAtTurn;
}

/**
 * Check whether a momentary effect (one-turn lifetime) has expired.
 * Applied on turn N, gone on turn N+1.
 *
 * @param currentTurn - The current turn number
 * @param appliedAtTurn - The turn the effect was applied
 * @returns True if at least one turn has passed
 */
export function isMomentaryExpired(currentTurn: number, appliedAtTurn: number): boolean {
  return currentTurn > appliedAtTurn;
}

/**
 * Turns elapsed since a recorded turn.
 *
 * @param currentTurn - The current turn number
 * @param sinceTurn - The earlier turn
 * @returns Elapsed turns (never negative)
 */
export function turnsSince(currentTurn: number, sinceTurn: number): number {
  return Math.max(0, currentTurn - sinceTurn);
}
