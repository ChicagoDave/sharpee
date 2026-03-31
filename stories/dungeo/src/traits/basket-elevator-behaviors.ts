/**
 * Basket Elevator Behaviors
 *
 * Capability behaviors for the basket elevator (ADR-090).
 * These handle lowering and raising the basket between the
 * Shaft Room and Bottom of Shaft.
 */

import {
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilityEffect,
  CapabilitySharedData,
  createEffect,
  IFEntity,
  WorldModel
} from '@sharpee/world-model';

import { BasketElevatorTrait } from './basket-elevator-trait';

/**
 * Message IDs for basket elevator
 *
 * Short keys are auto-prefixed with the actionId by the capability
 * dispatch factory (e.g., 'lowered' → 'if.action.lowering.lowered').
 * Fully-qualified keys (with dots) pass through unchanged.
 */
export const BasketElevatorMessages = {
  // Lowering messages (short keys, auto-prefixed)
  LOWERED: 'lowered',
  ALREADY_DOWN: 'already_down',

  // Raising messages (short keys, auto-prefixed)
  RAISED: 'raised',
  ALREADY_UP: 'already_up',

  // Story-specific message (fully-qualified, passes through unchanged)
  PLAYER_TRANSPORTED: 'dungeo.basket.player_transported'
} as const;

/**
 * Check if player is in the basket and transport them if so.
 * The basket entity itself stays in the Shaft Room (it's operated by wheel).
 * Only the player (and contents) are transported when they're inside.
 */
function transportPlayerIfInBasket(
  basket: IFEntity,
  world: WorldModel,
  destinationRoomId: string
): boolean {
  // Check if player is in the basket (location is basket.id)
  const player = world.getPlayer();
  if (player) {
    const playerLocation = world.getLocation(player.id);
    if (playerLocation === basket.id) {
      // Player is inside basket - move them to the destination room
      // Move player to destination room (they exit the basket)
      world.moveEntity(player.id, destinationRoomId);
      return true; // Player was transported
    }
  }

  return false; // Player was not in basket
}

/**
 * Behavior for lowering the basket
 */
export const BasketLoweringBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) {
      return {
        valid: false,
        error: 'cant_lower_that'
      };
    }

    // Check if already at bottom
    if (trait.position === 'bottom') {
      return {
        valid: false,
        error: BasketElevatorMessages.ALREADY_DOWN
      };
    }

    return { valid: true };
  },

  execute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): void {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) return;

    // Update position
    trait.position = 'bottom';

    // Transport player if they're in the basket
    const playerTransported = transportPlayerIfInBasket(entity, world, trait.bottomRoomId);

    // Store whether player was transported for reporting
    sharedData.playerTransported = playerTransported;
  },

  report(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];
    const playerTransported = sharedData.playerTransported;

    // Report the lowering
    effects.push(
      createEffect('if.event.lowered', {
        messageId: BasketElevatorMessages.LOWERED,
        targetId: entity.id,
        targetName: entity.name
      })
    );

    // If player was transported, emit additional event
    if (playerTransported) {
      effects.push(
        createEffect('dungeo.basket.transported', {
          messageId: BasketElevatorMessages.PLAYER_TRANSPORTED,
          direction: 'down'
        })
      );

      // Trigger a look at the new location
      effects.push(
        createEffect('if.event.auto_look', {
          reason: 'transported'
        })
      );
    }

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
      createEffect('dungeo.event.basket_lower_blocked', {
        messageId: error,
        params: { target: entity.name }
      })
    ];
  }
};

/**
 * Behavior for raising the basket
 */
export const BasketRaisingBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) {
      return {
        valid: false,
        error: 'cant_raise_that'
      };
    }

    // Check if already at top
    if (trait.position === 'top') {
      return {
        valid: false,
        error: BasketElevatorMessages.ALREADY_UP
      };
    }

    return { valid: true };
  },

  execute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): void {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) return;

    // Update position
    trait.position = 'top';

    // Transport player if they're in the basket
    const playerTransported = transportPlayerIfInBasket(entity, world, trait.topRoomId);

    // Store whether player was transported for reporting
    sharedData.playerTransported = playerTransported;
  },

  report(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];
    const playerTransported = sharedData.playerTransported;

    // Report the raising
    effects.push(
      createEffect('if.event.raised', {
        messageId: BasketElevatorMessages.RAISED,
        targetId: entity.id,
        targetName: entity.name
      })
    );

    // If player was transported, emit additional event
    if (playerTransported) {
      effects.push(
        createEffect('dungeo.basket.transported', {
          messageId: BasketElevatorMessages.PLAYER_TRANSPORTED,
          direction: 'up'
        })
      );

      // Trigger a look at the new location
      effects.push(
        createEffect('if.event.auto_look', {
          reason: 'transported'
        })
      );
    }

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
      createEffect('dungeo.event.basket_raise_blocked', {
        messageId: error,
        params: { target: entity.name }
      })
    ];
  }
};
