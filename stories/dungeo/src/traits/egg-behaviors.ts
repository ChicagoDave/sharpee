/**
 * Egg Behaviors
 *
 * Capability behaviors for the jewel-encrusted egg (ADR-090 universal dispatch).
 * These handle the opening action for the egg, blocking player attempts
 * with "You have neither the tools nor the expertise."
 *
 * From MDL source (demo.327):
 * The egg can only be opened by the thief, who has the skills to do so
 * without destroying its delicate contents.
 */

import {
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilityEffect,
  CapabilitySharedData,
  createEffect,
  IFEntity,
  WorldModel,
  ActorTrait,
  TraitType
} from '@sharpee/world-model';

import { EggTrait } from './egg-trait';

/**
 * Message IDs for egg interactions
 */
export const EggMessages = {
  /** "You have neither the tools nor the expertise." */
  NO_EXPERTISE: 'dungeo.egg.no_expertise',

  /** Standard opening success message - matches lang-en-us */
  OPENED: 'opened'
} as const;

/**
 * Behavior for opening the jewel-encrusted egg
 *
 * When the player tries to open the egg, they are blocked with
 * "You have neither the tools nor the expertise."
 *
 * Only the thief (or other NPCs) can successfully open the egg.
 */
export const EggOpeningBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    const trait = entity.get(EggTrait);
    if (!trait) {
      // Shouldn't happen - trait declares capability
      return { valid: true };
    }

    // Check if the actor is the player
    const actor = world.getEntity(actorId);
    if (actor) {
      const actorTrait = actor.get<ActorTrait>(TraitType.ACTOR);
      if (actorTrait && actorTrait.isPlayer) {
        // Player cannot open the egg - lacks expertise
        return {
          valid: false,
          error: EggMessages.NO_EXPERTISE
        };
      }
    }

    // NPCs (like the thief) can open the egg
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
    // Open the egg - the OpenableTrait handles the actual state change
    // through the standard opening action's execute phase
    const openable = entity.get(TraitType.OPENABLE);
    if (openable) {
      (openable as any).isOpen = true;
    }

    // Mark that the egg has been opened
    const trait = entity.get(EggTrait);
    if (trait) {
      trait.hasBeenOpened = true;
    }
  },

  report(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];

    // Report the opening success
    effects.push(
      createEffect('if.event.opened', {
        messageId: EggMessages.OPENED,
        targetId: entity.id,
        targetName: entity.name
      })
    );

    // Emit action.success for language rendering
    effects.push(
      createEffect('action.success', {
        actionId: 'if.action.opening',
        messageId: EggMessages.OPENED,
        params: { item: entity.name }
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
        actionId: 'if.action.opening',
        messageId: error,
        params: { target: entity.name }
      })
    ];
  }
};
