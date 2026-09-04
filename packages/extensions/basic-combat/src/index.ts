/**
 * @sharpee/ext-basic-combat
 *
 * Generic skill-based combat extension for Sharpee IF engine.
 *
 * Provides opt-in combat resolution for both attack directions through one
 * interceptor: BasicCombatInterceptor, registered on CombatantTrait for
 * if.action.attacking, resolves the player's blows at an NPC and an NPC's
 * blows at the player — an NPC attacks by running the real attacking action
 * through the engine's execution entry (ADR-328 D5).
 *
 * Stories with custom combat (e.g., Dungeo's melee system) register their
 * own interceptor instead of calling registerBasicCombat().
 *
 * @example
 * ```typescript
 * import { registerBasicCombat } from '@sharpee/ext-basic-combat';
 *
 * // In story's initializeWorld(world):
 * registerBasicCombat(world);
 * ```
 */

import {
  TraitType,
  type IWorldModel,
} from '@sharpee/world-model';
import { BasicCombatInterceptor } from './basic-combat-interceptor.js';

/**
 * Register the basic combat system.
 *
 * Call this in your story's initializeWorld() to enable generic
 * skill-based combat. Do NOT call this if your story registers
 * its own combat interceptor.
 *
 * Registers BasicCombatInterceptor on CombatantTrait + if.action.attacking;
 * whoever attacks a combatant — player or NPC — resolves through it.
 *
 * The interceptor binding is registered on the given world (ADR-208):
 * per-world, idempotent (last-wins), so calling this on every story load
 * is correct — no guard needed.
 *
 * @param world - The world to register the combat interceptor on
 */
export function registerBasicCombat(world: IWorldModel): void {
  world.registerActionInterceptor(
    TraitType.COMBATANT,
    'if.action.attacking',
    BasicCombatInterceptor
  );
}

// Combat service and types
export {
  CombatService,
  createCombatService,
  applyCombatResult,
  type ICombatService,
  type CombatContext,
  type CombatResult,
  type CombatValidation,
  type ApplyCombatResultInfo,
} from './combat-service.js';

// Combat messages
export {
  CombatMessages,
  getHealthStatusMessageId,
  type CombatMessageId,
  type HealthStatus,
} from './combat-messages.js';

// The interceptor itself (for stories that register it on their own terms)
export { BasicCombatInterceptor } from './basic-combat-interceptor.js';
