/**
 * Troll Axe Behaviors
 *
 * Capability behaviors for the troll's axe (ADR-090 universal dispatch).
 * These handle the taking action for the axe, blocking it while the troll
 * is alive with a "white-hot" message.
 *
 * From MDL source (act1.254:176-180):
 * "The troll's axe seems white-hot. You can't hold on to it."
 */

import {
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilityEffect,
  CapabilitySharedData,
  createEffect,
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
 * Behavior for taking the troll's axe
 *
 * When the troll is alive, the axe appears "white-hot" and cannot be taken.
 * When the troll is dead, the axe can be picked up normally.
 */
export const TrollAxeTakingBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    const trait = entity.get(TrollAxeTrait);
    if (!trait) {
      // Shouldn't happen - trait declares capability
      return { valid: true };
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

    // Troll is dead or doesn't exist - axe can be taken
    // Store info for report phase
    sharedData.entityName = entity.name;
    return { valid: true };
  },

  execute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): void {
    // Move the axe to the player's inventory
    world.moveEntity(entity.id, actorId);
  },

  report(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];

    // Report the taking success
    effects.push(
      createEffect('if.event.taken', {
        messageId: TrollAxeMessages.TAKEN,
        targetId: entity.id,
        targetName: entity.name
      })
    );

    // Emit action.success for language rendering
    effects.push(
      createEffect('action.success', {
        actionId: 'if.action.taking',
        messageId: TrollAxeMessages.TAKEN,
        params: { target: entity.name }
      })
    );

    return effects;
  },

  blocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        actionId: 'if.action.taking',
        messageId: error,
        params: { target: entity.name }
      })
    ];
  }
};

/**
 * Behavior for visibility of the troll's axe
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
