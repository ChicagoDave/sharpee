/**
 * @sharpee/ext-basic-combat
 *
 * Generic skill-based combat extension for Sharpee IF engine.
 *
 * Provides opt-in combat resolution for both attack directions:
 * - PC→NPC: BasicCombatInterceptor (registered on CombatantTrait + if.action.attacking)
 * - NPC→PC: basicNpcResolver (registered as NpcCombatResolver)
 *
 * Stories with custom combat (e.g., Dungeo's melee system) register their
 * own interceptor and resolver instead of calling registerBasicCombat().
 *
 * @example
 * ```typescript
 * import { registerBasicCombat } from '@sharpee/ext-basic-combat';
 *
 * // In story's initializeWorld():
 * registerBasicCombat();
 * ```
 */

import {
  TraitType,
  registerActionInterceptor,
} from '@sharpee/world-model';
import { registerNpcCombatResolver } from '@sharpee/stdlib';
import { BasicCombatInterceptor } from './basic-combat-interceptor.js';
import { basicNpcResolver } from './basic-npc-resolver.js';

/**
 * Register the basic combat system for both attack directions.
 *
 * Call this in your story's initializeWorld() to enable generic
 * skill-based combat. Do NOT call this if your story registers
 * its own combat interceptor/resolver.
 *
 * Registers:
 * 1. BasicCombatInterceptor on CombatantTrait + if.action.attacking (PC→NPC)
 * 2. basicNpcResolver as the NPC combat resolver (NPC→PC)
 */
export function registerBasicCombat(): void {
  registerActionInterceptor(
    TraitType.COMBATANT,
    'if.action.attacking',
    BasicCombatInterceptor
  );
  registerNpcCombatResolver(basicNpcResolver);
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

// Individual components (for stories that want to register only one direction)
export { BasicCombatInterceptor } from './basic-combat-interceptor.js';
export { basicNpcResolver } from './basic-npc-resolver.js';
