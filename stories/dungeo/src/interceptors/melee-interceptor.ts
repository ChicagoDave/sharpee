/**
 * Melee Combat Interceptor (Phase 3)
 *
 * Replaces the generic CombatService with the canonical MDL melee engine
 * for all Dungeo villains (thief, troll, cyclops).
 *
 * Registered on CombatantTrait for if.action.attacking.
 *
 * Flow:
 * 1. preValidate: Check if hero is staggered (block attack if so)
 * 2. postExecute: Run melee engine instead of CombatService
 *    - Resolve blow using canonical tables
 *    - Apply wound/stagger/weapon-loss side effects
 *    - Populate sharedData with melee results
 * 3. postReport: Emit melee-specific combat message
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  IFEntity,
  WorldModel,
  IdentityTrait,
  TraitType,
  CombatantTrait,
  createEffect,
  CapabilityEffect,
  StandardCapabilities,
} from '@sharpee/world-model';
import { createSeededRandom } from '@sharpee/core';

import {
  fightStrength,
  villainStrength,
  getBestWeaponPenalty,
  resolveBlow,
  applyVillainBlowToHero,
  isHeroDeadFromWounds,
  MeleeOutcome,
} from '../combat/melee';
import type { BlowResult } from '../combat/melee';
import {
  getHeroAttackMessage,
  getVillainAttackMessage,
  MeleeMessages,
} from '../combat/melee-messages';
import { MELEE_STATE, getBaseOstrength } from '../combat/melee-state';

/**
 * Get the villain key for message lookup.
 */
function getVillainKey(villain: IFEntity): string {
  const identity = villain.get(TraitType.IDENTITY) as IdentityTrait | undefined;
  const name = identity?.name?.toLowerCase() ?? '';
  if (name.includes('troll')) return 'troll';
  if (name.includes('thief')) return 'thief';
  if (name.includes('cyclops')) return 'cyclops';
  return 'troll'; // Default
}

/**
 * Get the villain's display name for messages (e.g., "troll", "thief").
 */
function getVillainDisplayName(villain: IFEntity): string {
  const key = getVillainKey(villain);
  // Use the key directly — matches how MDL uses D placeholder
  return key;
}

/**
 * Get the hero's weapon type for message lookup ('sword' or 'knife').
 */
function getWeaponType(weaponName: string | undefined): string {
  if (!weaponName) return 'sword';
  const lower = weaponName.toLowerCase();
  if (lower.includes('sword')) return 'sword';
  return 'knife'; // knife, stiletto, nasty knife, etc.
}

/**
 * Get current player score from the scoring capability.
 */
function getPlayerScore(world: WorldModel): number {
  const scoring = world.getCapability(StandardCapabilities.SCORING);
  return scoring?.scoreValue ?? 0;
}

/**
 * Get or initialize melee state for a villain.
 */
function getVillainOstrength(villain: IFEntity): number {
  const stored = villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH];
  if (typeof stored === 'number') return stored;
  // Initialize from canonical values
  const base = getBaseOstrength(villain);
  villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH] = base;
  return base;
}

// ============= The Interceptor =============

export const MeleeInterceptor: ActionInterceptor = {
  /**
   * PRE-VALIDATE: Check if the hero is staggered (misses next turn).
   */
  preValidate(
    _entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const player = world.getEntity(actorId);
    if (!player) return null;

    const staggered = player.attributes[MELEE_STATE.STAGGERED];
    if (staggered) {
      // Clear stagger — the missed turn is consumed
      player.attributes[MELEE_STATE.STAGGERED] = false;
      return {
        valid: false,
        error: MeleeMessages.STILL_RECOVERING,
      };
    }

    return null; // Continue with standard validation
  },

  /**
   * POST-EXECUTE: Replace CombatService with canonical melee engine.
   *
   * The attacking action calls this INSTEAD of CombatService when
   * an interceptor is present. We must populate sharedData with:
   * - attackResult: AttackResult compatible object
   * - customMessage: the melee message text
   * - usedCombatService: false
   */
  postExecute(
    villain: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const player = world.getEntity(actorId);
    if (!player) return;

    const random = createSeededRandom();
    const weaponName = sharedData.weaponName as string | undefined;
    const villainKey = getVillainKey(villain);
    const villainDisplay = getVillainDisplayName(villain);

    // --- Compute attacker/defender strengths ---
    const score = getPlayerScore(world);
    const woundAdjust = (player.attributes[MELEE_STATE.WOUND_ADJUST] as number) ?? 0;
    const heroStr = Math.max(1, fightStrength(score, woundAdjust));

    const currentOstrength = getVillainOstrength(villain);
    const isThiefEngrossed = villain.attributes.thiefEngrossed === true;
    const bestWeaponPenalty = getBestWeaponPenalty(villainKey, weaponName ?? '');
    const villainStr = villainStrength(
      currentOstrength,
      isThiefEngrossed,
      bestWeaponPenalty > 0,
      bestWeaponPenalty
    );

    // --- Check if villain is unconscious (auto-kill) ---
    const villainUnconscious = villain.attributes[MELEE_STATE.VILLAIN_UNCONSCIOUS] === true;

    // --- Resolve the hero's blow ---
    // Pass raw currentOstrength when unconscious (negative) so resolveBlow
    // triggers auto-kill (def < 0). villainStrength() clamps to 0 which
    // would cause resolveBlow to return MISSED instead.
    const defForBlow = villainUnconscious ? currentOstrength : villainStr;
    const blowResult = resolveBlow(heroStr, defForBlow, true, villainUnconscious, random);

    // --- Apply side effects ---
    let targetKilled = false;
    let targetKnockedOut = false;
    const droppedItems: string[] = [];

    switch (blowResult.outcome) {
      case MeleeOutcome.KILLED:
      case MeleeOutcome.SITTING_DUCK:
        targetKilled = true;
        villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH] = 0;
        villain.attributes[MELEE_STATE.VILLAIN_UNCONSCIOUS] = false;
        // Mark CombatantTrait as dead
        {
          const combatant = villain.get(TraitType.COMBATANT) as CombatantTrait | undefined;
          if (combatant) {
            combatant.health = 0;
          }
        }
        // Drop villain's inventory
        {
          const villainContents = world.getContents(villain.id);
          const villainRoom = world.getLocation(villain.id) ?? null;
          for (const item of villainContents) {
            world.moveEntity(item.id, villainRoom);
            droppedItems.push(item.id);
          }
        }
        break;

      case MeleeOutcome.UNCONSCIOUS:
        targetKnockedOut = true;
        villain.attributes[MELEE_STATE.VILLAIN_UNCONSCIOUS] = true;
        villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH] = -currentOstrength;
        break;

      case MeleeOutcome.LIGHT_WOUND:
        villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH] = blowResult.newDefenderStrength;
        if (blowResult.defenderKilled) {
          targetKilled = true;
          const combatant = villain.get(TraitType.COMBATANT) as CombatantTrait | undefined;
          if (combatant) combatant.health = 0;
        }
        break;

      case MeleeOutcome.SERIOUS_WOUND:
        villain.attributes[MELEE_STATE.VILLAIN_OSTRENGTH] = blowResult.newDefenderStrength;
        if (blowResult.defenderKilled) {
          targetKilled = true;
          const combatant = villain.get(TraitType.COMBATANT) as CombatantTrait | undefined;
          if (combatant) combatant.health = 0;
        }
        break;

      case MeleeOutcome.STAGGER:
        villain.attributes[MELEE_STATE.VILLAIN_STAGGERED] = true;
        break;

      case MeleeOutcome.LOSE_WEAPON:
        // Drop villain's weapon to the floor
        {
          const villainContents = world.getContents(villain.id);
          const villainRoom = world.getLocation(villain.id) ?? null;
          for (const item of villainContents) {
            if (item.has(TraitType.WEAPON)) {
              world.moveEntity(item.id, villainRoom);
              droppedItems.push(item.id);
              break; // Only drop one weapon
            }
          }
        }
        break;
    }

    // --- Get the combat message ---
    const weaponType = getWeaponType(weaponName);
    const message = getHeroAttackMessage(
      weaponType,
      blowResult.outcome,
      villainDisplay,
      (arr) => random.pick(arr)
    ) ?? 'You attack.';

    // --- Store results for report phase ---
    sharedData.attackResult = {
      success: true,
      type: targetKilled ? 'killed' :
            targetKnockedOut ? 'knocked_out' :
            blowResult.outcome === MeleeOutcome.MISSED ? 'missed' : 'hit',
      damage: 0,
      remainingHitPoints: getVillainOstrength(villain),
      targetDestroyed: false,
      targetKilled,
      targetKnockedOut,
      itemsDropped: droppedItems.length > 0 ? droppedItems : undefined,
    };
    sharedData.customMessage = MeleeMessages.HERO_ATTACK;
    sharedData.usedCombatService = false;

    // Store for postReport
    sharedData.meleeMessage = message;
    sharedData.meleeOutcome = blowResult.outcome;
    sharedData.meleeTargetKilled = targetKilled;
  },

  /**
   * POST-REPORT: Emit the canonical melee message as a game.message event.
   */
  postReport(
    _villain: IFEntity,
    _world: WorldModel,
    _actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] {
    const message = sharedData.meleeMessage as string | undefined;
    if (!message) return [];

    return [
      createEffect('game.message', {
        messageId: MeleeMessages.HERO_ATTACK,
        text: message,
      }),
    ];
  },

  /**
   * ON-BLOCKED: Custom message when hero is staggered.
   */
  onBlocked(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    error: string,
    _sharedData: InterceptorSharedData
  ): CapabilityEffect[] | null {
    if (error === MeleeMessages.STILL_RECOVERING) {
      return [
        createEffect('game.message', {
          messageId: MeleeMessages.STILL_RECOVERING,
          text: 'You are still recovering from a staggering blow.',
        }),
      ];
    }
    return null; // Use standard blocked handling
  },
};
