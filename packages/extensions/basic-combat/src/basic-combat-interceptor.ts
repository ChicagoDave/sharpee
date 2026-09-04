/**
 * Basic Combat Interceptor
 *
 * Wraps CombatService as an ActionInterceptor for attacks in both
 * directions. Registered on CombatantTrait for if.action.attacking, it
 * resolves whoever swings — the player at an NPC, or an NPC acting through
 * the execution entry at the player (ADR-328 D5) — with one rule set.
 */

import { type RandomService, definePoint } from '@sharpee/core';
import {
  type ActionInterceptor,
  type InterceptorSharedData,
  IFEntity,
  WorldModel,
  type CapabilityEffect,
  createEffect,
} from '@sharpee/world-model';
import { findWieldedWeapon } from '@sharpee/stdlib';
import { CombatService, CombatResult, applyCombatResult } from './combat-service.js';

/**
 * PC→NPC blow point (ADR-293 D2/D10). Split from the villain point because
 * the same class carries asymmetric consequences — KILLED here fells an NPC,
 * KILLED on the villain point ends the game.
 */
const HERO_BLOW_POINT = definePoint('basic-combat.blow.hero', {
  classes: ['missed', 'hit', 'knocked_out', 'killed'],
});

/**
 * NPC→target blow point (ADR-293 D2/D10) — drawn when the attacker is not
 * the player.
 */
const VILLAIN_BLOW_POINT = definePoint('basic-combat.blow.villain', {
  classes: ['missed', 'hit', 'knocked_out', 'killed'],
});

/** Outcome class of a CombatService result (shared with the villain point). */
export function combatResultClass(result: CombatResult): 'missed' | 'hit' | 'knocked_out' | 'killed' {
  if (result.targetKilled) return 'killed';
  if (result.targetKnockedOut) return 'knocked_out';
  return result.hit ? 'hit' : 'missed';
}

/**
 * ActionInterceptor that uses CombatService for combat resolution in either
 * direction. The blow draws on the hero point when the player swings and
 * on the villain point otherwise, so the two streams stay independent.
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
    sharedData: InterceptorSharedData,
    random?: RandomService
  ): void {
    const attacker = world.getEntity(actorId);
    if (!attacker) return;
    if (!random) {
      throw new Error(
        'BasicCombatInterceptor: no RandomService was passed to postExecute — combat draws are gated (ADR-293 D6)'
      );
    }

    // Use weapon from sharedData (attacking.ts passes it) or find one
    const weaponId = sharedData.weaponId as string | undefined;
    const weapon = weaponId
      ? world.getEntity(weaponId)
      : findWieldedWeapon(attacker, world);

    const combatService = new CombatService();
    const blowPoint = attacker.id === world.getPlayer()?.id ? HERO_BLOW_POINT : VILLAIN_BLOW_POINT;
    // The skill roll draws on the blow point's own stream; the world
    // mutation (applyCombatResult) stays outside the resolve (D8).
    const { value: combatResult } = random.resolve(
      blowPoint,
      (draw) => {
        const sampled = combatService.resolveAttack({
          attacker,
          target,
          weapon: weapon || undefined,
          world,
          random: draw,
        });
        return { cls: combatResultClass(sampled), value: sampled };
      },
      // Forced path (ADR-293 D8, Phase C): zero draws; applyCombatResult
      // below applies the consequence exactly as for a drawn result.
      (forced) => combatService.materializeAttack(forced, attacker, target, weapon || undefined)
    );

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
