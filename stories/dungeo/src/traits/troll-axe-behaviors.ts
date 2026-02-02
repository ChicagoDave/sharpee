/**
 * Troll Axe Behaviors
 *
 * Action interceptor for the troll's axe (ADR-118) + capability behavior
 * for visibility (ADR-090).
 *
 * The axe is a real visible object (not scenery) that blocks taking
 * while the troll is alive with a "white-hot" message.
 *
 * From MDL source (act1.254:176-180):
 * <DEFINE AXE-FUNCTION ()
 *   <COND (<VERB? "TAKE">
 *          <TELL "The troll's axe seems white-hot. You can't hold on to it.">
 *          T)>>
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilitySharedData,
  IFEntity,
  WorldModel,
  CombatantTrait,
  TraitType
} from '@sharpee/world-model';

import { TrollAxeTrait } from './troll-axe-trait';

/**
 * Message IDs for troll axe interactions
 */
export const TrollAxeMessages = {
  /** "The troll's axe seems white-hot. You can't hold on to it." */
  WHITE_HOT: 'dungeo.troll.axe.white_hot',

  /** Standard taking success message - matches lang-en-us */
  TAKEN: 'taken'
} as const;

/**
 * Action interceptor for taking the troll's axe (ADR-118)
 *
 * preValidate blocks taking while the troll is alive.
 * When the troll is dead, returns null to allow stdlib taking to proceed normally.
 */
export const TrollAxeTakingInterceptor: ActionInterceptor = {
  preValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    _sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    const trait = entity.get(TrollAxeTrait);
    if (!trait) {
      return null; // No trait, continue with standard logic
    }

    // Check if guardian (troll) is alive
    const guardian = world.getEntity(trait.guardianId);
    if (guardian) {
      const combatant = guardian.get<CombatantTrait>(TraitType.COMBATANT);
      if (combatant && combatant.isAlive) {
        // Troll is alive - axe appears white-hot
        return {
          valid: false,
          error: TrollAxeMessages.WHITE_HOT
        };
      }
    }

    // Troll is dead or doesn't exist - allow stdlib taking to handle it
    return null;
  }
};

/**
 * Behavior for visibility of the troll's axe (ADR-090 capability dispatch)
 *
 * When the troll is unconscious (knocked out but not dead), the axe is hidden.
 * This matches MDL's <TRZ .A ,OVISON> (hide axe) during OUT! state.
 *
 * States:
 * - Troll alive + conscious: Axe visible (but white-hot, can't take)
 * - Troll alive + unconscious: Axe HIDDEN
 * - Troll dead: Axe visible (can be taken)
 */
export const TrollAxeVisibilityBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    const trait = entity.get(TrollAxeTrait);
    if (!trait) {
      // No trait = visible by default
      return { valid: true };
    }

    // Check guardian (troll) state
    const guardian = world.getEntity(trait.guardianId);
    if (guardian) {
      const combatant = guardian.get<CombatantTrait>(TraitType.COMBATANT);
      if (combatant) {
        // Hidden when troll is unconscious (alive but not conscious)
        if (combatant.isAlive && !combatant.isConscious) {
          return { valid: false }; // Not visible
        }
      }
    }

    // Visible in all other cases (troll alive+conscious, or troll dead)
    return { valid: true };
  },

  // Visibility doesn't need execute/report/blocked phases
  execute() {},
  report() { return []; },
  blocked() { return []; }
};
