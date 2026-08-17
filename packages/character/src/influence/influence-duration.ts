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
 *   expireInfluencesForTurn, expireInfluencesBySeparation.
 * Owner context: @sharpee/character / influence
 */

import { CharacterModelTrait, InfluenceInForce } from '@sharpee/world-model';
import { expiryTurn, hasExpired, isMomentaryExpired } from '../character-clock.js';
import { InfluenceEffect, InfluenceDuration } from './influence-types.js';

/**
 * Record an influence exertion outcome on the trait that homes it (the
 * target's trait normally; the exerter's trait with an explicit `target`
 * for targets with no character model). The record set is level-state:
 * an identical outcome already in force is never double-tracked, and the
 * return value is the edge detector callers mint events from (ADR-310
 * D8 — events mark transitions, records mark levels). A record whose
 * status differs (resistance lapsing or re-establishing) is updated in
 * place and reports as a transition.
 *
 * @param homeTrait - The trait the record rides
 * @param influenceName - The influence name
 * @param influencerId - The influencer entity ID
 * @param effect - The applied effect mutations
 * @param options - Status, duration, timing, clear condition, explicit target
 * @returns True when the outcome newly transitioned into force
 */
export function trackInfluence(
  homeTrait: CharacterModelTrait,
  influenceName: string,
  influencerId: string,
  effect: InfluenceEffect,
  options: {
    duration: InfluenceDuration;
    turn: number;
    /** Absent means 'applied' (matching InfluenceInForce deserialization). */
    status?: 'applied' | 'resisted';
    lingeringTurns?: number;
    clearCondition?: string;
    /** Set only when the record rides the exerter's trait (player target). */
    target?: string;
  },
): boolean {
  const { duration, turn, lingeringTurns, clearCondition, target } = options;
  const status = options.status ?? 'applied';

  const existing = homeTrait.influencesInForce.find(
    e =>
      e.influenceName === influenceName &&
      e.influencerId === influencerId &&
      e.target === target,
  );
  if (existing) {
    if ((existing.status ?? 'applied') === status) return false;
    // Applied↔resisted flip: a real transition — refresh the record in place.
    existing.status = status;
    existing.effect = { ...effect } as Record<string, string>;
    existing.appliedAtTurn = turn;
    return true;
  }

  homeTrait.addInfluenceInForce({
    influenceName,
    influencerId,
    ...(target !== undefined ? { target } : {}),
    effect: { ...effect } as Record<string, string>,
    duration,
    appliedAtTurn: turn,
    status,
    ...(lingeringTurns != null ? { expiresAtTurn: expiryTurn(turn, lingeringTurns) } : {}),
    ...(clearCondition !== undefined ? { clearCondition } : {}),
  });
  return true;
}

/**
 * Check if a trait's owner is under a specific influence. Resisted
 * records exist only as flip-transition state and do not count.
 *
 * @param trait - The trait to check (effects homed here)
 * @param influenceName - The influence name
 * @returns True if an applied effect with this name is in force
 */
export function isUnderInfluence(
  trait: CharacterModelTrait,
  influenceName: string,
): boolean {
  return trait.influencesInForce.some(
    e => e.influenceName === influenceName && (e.status ?? 'applied') === 'applied',
  );
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
 * Expire 'while present' effects whose influencer and target no longer
 * share a room, homed on a trait. Run once per turn per trait, BEFORE
 * evaluation, so a re-entry re-transitions (and re-fires its witnessed
 * phrase) the same turn the parties reunite (ADR-310 D8).
 *
 * @param trait - The trait whose effects to expire
 * @param ownerId - The trait owner's entity id (the target unless the
 *   record carries an explicit `target`)
 * @param getLocation - Resolves an entity's current room (undefined = gone)
 * @returns Effects that were removed
 */
export function expireInfluencesBySeparation(
  trait: CharacterModelTrait,
  ownerId: string,
  getLocation: (entityId: string) => string | undefined,
): InfluenceInForce[] {
  const expired: InfluenceInForce[] = [];
  trait.influencesInForce = trait.influencesInForce.filter(e => {
    if (e.duration !== 'while present') return true;
    const influencerRoom = getLocation(e.influencerId);
    const targetRoom = getLocation(e.target ?? ownerId);
    if (influencerRoom === undefined || targetRoom === undefined || influencerRoom !== targetRoom) {
      expired.push(e);
      return false;
    }
    return true;
  });
  return expired;
}
