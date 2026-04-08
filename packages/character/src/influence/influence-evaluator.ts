/**
 * Influence evaluation engine (ADR-146 layer 3)
 *
 * Evaluates passive and active influences: checks range, schedule,
 * and resistance, then produces InfluenceResult describing whether
 * the effect was applied or resisted.
 *
 * Pure evaluation — does not mutate state directly. Callers apply
 * the returned effects to CharacterModelTrait state.
 *
 * Public interface: evaluatePassiveInfluences, evaluateActiveInfluence,
 *   checkResistance.
 * Owner context: @sharpee/character / influence
 */

import {
  InfluenceDef,
  ResistanceDef,
  InfluenceResult,
} from './influence-types';

// ---------------------------------------------------------------------------
// Context types for evaluation
// ---------------------------------------------------------------------------

/** An entity in a room with its influence and resistance data. */
export interface InfluenceRoomEntity {
  /** Entity ID. */
  id: string;

  /** Influences this entity exerts (may be empty). */
  influences: InfluenceDef[];

  /** Resistances this entity has (may be empty). */
  resistances: ResistanceDef[];

  /** Evaluate a predicate against this entity's state. Returns true if satisfied. */
  evaluatePredicate: (predicate: string) => boolean;
}

// ---------------------------------------------------------------------------
// Resistance check
// ---------------------------------------------------------------------------

/**
 * Check whether a target resists an influence.
 *
 * @param target - The target entity with its resistances
 * @param influenceName - The influence to check
 * @returns true if the target resists (no effect should be applied)
 */
export function checkResistance(
  target: InfluenceRoomEntity,
  influenceName: string,
): boolean {
  const resistance = target.resistances.find(r => r.influenceName === influenceName);
  if (!resistance) return false; // No resistance — influence succeeds

  // Has resistance — check except conditions
  if (resistance.except && resistance.except.length > 0) {
    // If any except condition is met, resistance fails (target is vulnerable)
    const anyExceptMet = resistance.except.some(cond =>
      target.evaluatePredicate(cond),
    );
    return !anyExceptMet; // Resists unless an except condition is true
  }

  return true; // Resists unconditionally
}

// ---------------------------------------------------------------------------
// Schedule check
// ---------------------------------------------------------------------------

/**
 * Check whether an influence's schedule conditions are met.
 *
 * @param influence - The influence definition
 * @param influencer - The influencing entity (for predicate evaluation)
 * @returns true if the influence should be exerted this turn
 */
function checkSchedule(
  influence: InfluenceDef,
  influencer: InfluenceRoomEntity,
): boolean {
  if (!influence.schedule) return true;
  return influence.schedule.when.every(cond =>
    influencer.evaluatePredicate(cond),
  );
}

// ---------------------------------------------------------------------------
// Passive influence evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate all passive influences for entities in a room.
 *
 * For each entity with passive influences, checks range, schedule,
 * and each potential target's resistance. Returns results describing
 * which effects were applied and which were resisted.
 *
 * @param entities - All entities in the room
 * @returns Array of influence results
 */
export function evaluatePassiveInfluences(
  entities: InfluenceRoomEntity[],
): InfluenceResult[] {
  const results: InfluenceResult[] = [];

  for (const influencer of entities) {
    for (const influence of influencer.influences) {
      if (influence.mode !== 'passive') continue;

      // Check schedule
      if (!checkSchedule(influence, influencer)) {
        results.push({
          status: 'skipped',
          reason: `schedule not met for ${influence.name}`,
        });
        continue;
      }

      // Determine targets based on range
      const targets = getTargets(influence, influencer, entities);

      for (const target of targets) {
        // Check resistance
        if (checkResistance(target, influence.name)) {
          results.push({
            status: 'resisted',
            influenceName: influence.name,
            influencerId: influencer.id,
            targetId: target.id,
            resisted: influence.resisted,
          });
        } else {
          results.push({
            status: 'applied',
            influenceName: influence.name,
            influencerId: influencer.id,
            targetId: target.id,
            effect: { ...influence.effect },
            witnessed: influence.witnessed,
          });
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Active influence evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single active influence against a specific target.
 *
 * @param influencer - The entity exerting the influence
 * @param influenceName - The name of the influence to exert
 * @param target - The target entity
 * @returns The influence result
 */
export function evaluateActiveInfluence(
  influencer: InfluenceRoomEntity,
  influenceName: string,
  target: InfluenceRoomEntity,
): InfluenceResult {
  const influence = influencer.influences.find(i => i.name === influenceName);
  if (!influence) {
    return { status: 'skipped', reason: `${influencer.id} has no influence '${influenceName}'` };
  }

  if (checkResistance(target, influence.name)) {
    return {
      status: 'resisted',
      influenceName: influence.name,
      influencerId: influencer.id,
      targetId: target.id,
      resisted: influence.resisted,
    };
  }

  return {
    status: 'applied',
    influenceName: influence.name,
    influencerId: influencer.id,
    targetId: target.id,
    effect: { ...influence.effect },
    witnessed: influence.witnessed,
  };
}

// ---------------------------------------------------------------------------
// Target selection
// ---------------------------------------------------------------------------

/**
 * Get eligible targets for an influence based on its range.
 *
 * @param influence - The influence definition
 * @param influencer - The influencing entity
 * @param entities - All entities in the room
 * @returns Array of target entities (excludes the influencer)
 */
function getTargets(
  influence: InfluenceDef,
  influencer: InfluenceRoomEntity,
  entities: InfluenceRoomEntity[],
): InfluenceRoomEntity[] {
  const others = entities.filter(e => e.id !== influencer.id);

  switch (influence.range) {
    case 'room':
      // Affects all entities in the room
      return others;
    case 'proximity':
      // Same as room for passive — all entities in the room are in proximity
      return others;
    case 'targeted':
      // Targeted is only meaningful for active influences, not passive
      // For passive evaluation, treat as room-wide
      return others;
  }
}
