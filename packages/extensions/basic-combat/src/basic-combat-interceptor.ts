/**
 * Basic Combat Interceptor
 *
 * Wraps CombatService as an ActionInterceptor for PC→NPC attacks.
 * Registered on CombatantTrait for if.action.attacking.
 */

import { SeededRandom, createSeededRandom } from '@sharpee/core';
import {
  ActionInterceptor,
  InterceptorSharedData,
  IFEntity,
  WorldModel,
  CapabilityEffect,
  createEffect,
} from '@sharpee/world-model';
import { findWieldedWeapon } from '@sharpee/stdlib';
import { CombatService, CombatResult, applyCombatResult } from './combat-service.js';

/**
 * Module-level random instance for consistent combat rolls.
 */
const combatRandom: SeededRandom = createSeededRandom();

/**
 * ActionInterceptor that uses CombatService for PC→NPC combat resolution.
 *
 * postExecute populates sharedData with:
 *   - attackResult: AttackResult-shaped object
 *   - combatResult: CombatResult from CombatService
 *   - usedCombatService: true
 */
export const BasicCombatInterceptor: ActionInterceptor = {
  postExecute(
    target: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const attacker = world.getEntity(actorId);
    if (!attacker) return;

    // Use weapon from sharedData (attacking.ts passes it) or find one
    const weaponId = sharedData.weaponId as string | undefined;
    const weapon = weaponId
      ? world.getEntity(weaponId)
      : findWieldedWeapon(attacker, world);

    const combatService = new CombatService();
    const combatResult = combatService.resolveAttack({
      attacker,
      target,
      weapon: weapon || undefined,
      world,
      random: combatRandom,
    });

    // Apply combat result to target (handles health, death, inventory dropping)
    const combatApplyResult = applyCombatResult(target, combatResult, world);

    // Populate sharedData for the report phase
    sharedData.attackResult = {
      success: true,
      type: combatResult.targetKilled ? 'killed' :
            combatResult.targetKnockedOut ? 'knocked_out' :
            combatResult.hit ? 'hit' : 'missed',
      damage: combatResult.damage,
      remainingHitPoints: combatResult.targetNewHealth,
      targetDestroyed: false,
      targetKilled: combatResult.targetKilled,
      targetKnockedOut: combatResult.targetKnockedOut,
      itemsDropped: combatApplyResult.droppedItems,
    };
    sharedData.combatResult = combatResult;
    sharedData.usedCombatService = true;
  },
};
