/**
 * Melee Combat State Keys
 *
 * Shared attribute key names used by:
 * - melee-interceptor.ts (combat resolution)
 * - combat-disengagement-handler.ts (leaving room with villain)
 * - cure-daemon.ts (wound healing)
 * - diagnose-action.ts (health reporting)
 *
 * All MELEE_STATE keys are stored in entity.attributes and survive serialization.
 * CURE_STATE keys use world.getStateValue()/setStateValue().
 */

import { IFEntity, IdentityTrait, TraitType } from '@sharpee/world-model';
import { VILLAIN_OSTRENGTH } from './melee';

/** Attribute keys for melee combat state on entities */
export const MELEE_STATE = {
  // Player state (on player entity attributes)
  WOUND_ADJUST: 'meleeWoundAdjust',        // ASTRENGTH equivalent (0 = healthy, negative = wounded)
  STAGGERED: 'meleeStaggered',              // Hero misses next attack
  // Villain state (on villain entity attributes)
  VILLAIN_STAGGERED: 'meleeVillainStaggered',
  VILLAIN_UNCONSCIOUS: 'meleeVillainUnconscious',
  VILLAIN_OSTRENGTH: 'meleeOstrength',       // Current effective strength (can decrease from wounds)
} as const;

/** World state keys for the cure daemon */
export const CURE_STATE = {
  TICKS: 'dungeo.cure.ticks',  // Turns since last heal (0..CURE_WAIT)
} as const;

/**
 * Get the canonical base OSTRENGTH for a villain based on its identity name.
 */
export function getBaseOstrength(villain: IFEntity): number {
  const identity = villain.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  const name = identity?.name?.toLowerCase() ?? '';
  if (name.includes('troll')) return VILLAIN_OSTRENGTH.TROLL;
  if (name.includes('thief')) return VILLAIN_OSTRENGTH.THIEF;
  if (name.includes('cyclops')) return VILLAIN_OSTRENGTH.CYCLOPS;
  return 3; // Default for unknown combatants
}
