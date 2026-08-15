/**
 * Influence duration handling (ADR-146 layer 3, relocated per ADR-310 D17)
 *
 * Trait-based functions that record and expire influence effects:
 * 'while present' clears when the influencer leaves the room,
 * 'momentary' clears after one turn,
 * 'lingering' clears after authored turns or when a condition is met.
 *
 * The InfluenceTracker service class is retired — effects in force ride
 * the trait (`trait.influencesInForce`) so they serialize with the world.
 * All turn arithmetic goes through the character-clock seam.
 *
 * Public interface: trackInfluence, isUnderInfluence,
 *   expireInfluencesForTurn, expireInfluencesOnDeparture.
 * Owner context: @sharpee/character / influence
 */

import { CharacterModelTrait, InfluenceInForce } from '@sharpee/world-model';
import { expiryTurn, hasExpired, isMomentaryExpired } from '../character-clock.js';
import { InfluenceEffect, InfluenceDuration } from './influence-types.js';

/**
 * Record a new influence effect on the trait that homes it (the target's
 * trait normally; the exerter's trait with an explicit `target` for
 * targets with no character model). Skips duplicates: the same influence
 * from the same source on the same target is never double-tracked.
 *
 * @param homeTrait - The trait the record rides
 * @param influenceName - The influence name
 * @param influencerId - The influencer entity ID
 * @param effect - The applied effect mutations
 * @param options - Duration, timing, clear condition, and explicit target
 * @returns True if tracked, false if it was already in force
 */
export function trackInfluence(
  homeTrait: CharacterModelTrait,
  influenceName: string,
  influencerId: string,
  effect: InfluenceEffect,
  options: {
    duration: InfluenceDuration;
    turn: number;
    lingeringTurns?: number;
    clearCondition?: string;
    /** Set only when the record rides the exerter's trait (player target). */
    target?: string;
  },
): boolean {
  const { duration, turn, lingeringTurns, clearCondition, target } = options;

  const exists = homeTrait.influencesInForce.some(
    e =>
      e.influenceName === influenceName &&
      e.influencerId === influencerId &&
      e.target === target,
  );
  if (exists) return false;

  homeTrait.addInfluenceInForce({
    influenceName,
    influencerId,
    ...(target !== undefined ? { target } : {}),
    effect: { ...effect } as Record<string, string>,
    duration,
    appliedAtTurn: turn,
    ...(lingeringTurns != null ? { expiresAtTurn: expiryTurn(turn, lingeringTurns) } : {}),
    ...(clearCondition !== undefined ? { clearCondition } : {}),
  });
  return true;
}

/**
 * Check if a trait's owner is under a specific influence.
 *
 * @param trait - The trait to check (effects homed here)
 * @param influenceName - The influence name
 * @returns True if an effect with this name is in force
 */
export function isUnderInfluence(
  trait: CharacterModelTrait,
  influenceName: string,
): boolean {
  return trait.influencesInForce.some(e => e.influenceName === influenceName);
}

/**
 * Expire 'momentary' and 'lingering' effects homed on a trait.
 * Call once per turn per trait.
 *
 * @param trait - The trait whose effects to expire
 * @param currentTurn - The current turn number
 * @param evaluateClearCondition - Evaluates a lingering clear condition
 *   against the effect's TARGET (the trait owner unless `target` is set)
 * @returns Effects that were removed
 */
export function expireInfluencesForTurn(
  trait: CharacterModelTrait,
  currentTurn: number,
  evaluateClearCondition?: (effect: InfluenceInForce, predicate: string) => boolean,
): InfluenceInForce[] {
  const expired: InfluenceInForce[] = [];

  trait.influencesInForce = trait.influencesInForce.filter(e => {
    if (e.duration === 'momentary' && isMomentaryExpired(currentTurn, e.appliedAtTurn)) {
      expired.push(e);
      return false;
    }

    if (e.duration === 'lingering' && hasExpired(currentTurn, e.expiresAtTurn)) {
      expired.push(e);
      return false;
    }

    if (
      e.duration === 'lingering' &&
      e.clearCondition &&
      evaluateClearCondition?.(e, e.clearCondition)
    ) {
      expired.push(e);
      return false;
    }

    return true;
  });

  return expired;
}

/**
 * Expire 'while present' effects from a specific influencer, homed on a
 * trait. Call when the influencer leaves the trait owner's room.
 *
 * @param trait - The trait whose effects to expire
 * @param influencerId - The influencer who left
 * @returns Effects that were removed
 */
export function expireInfluencesOnDeparture(
  trait: CharacterModelTrait,
  influencerId: string,
): InfluenceInForce[] {
  const expired: InfluenceInForce[] = [];
  trait.influencesInForce = trait.influencesInForce.filter(e => {
    if (e.influencerId === influencerId && e.duration === 'while present') {
      expired.push(e);
      return false;
    }
    return true;
  });
  return expired;
}
