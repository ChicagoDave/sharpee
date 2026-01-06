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
  createEffect,
  IFEntity,
  WorldModel,
  ContainerTrait
} from '@sharpee/world-model';

import { BasketElevatorTrait } from './basket-elevator-trait';

/**
 * Message IDs for basket elevator
 */
export const BasketElevatorMessages = {
  // Lowering messages
  LOWERED: 'dungeo.basket.lowered',
  ALREADY_DOWN: 'dungeo.basket.already_down',

  // Raising messages
  RAISED: 'dungeo.basket.raised',
  ALREADY_UP: 'dungeo.basket.already_up',

  // Common messages
  PLAYER_TRANSPORTED: 'dungeo.basket.player_transported'
} as const;

/**
 * Move the basket and all its contents to a new room.
 * If the player is in the basket, they move too.
 */
function moveBasketToRoom(
  basket: IFEntity,
  world: WorldModel,
  destinationRoomId: string
): boolean {
  // Move the basket itself
  world.moveEntity(basket.id, destinationRoomId);

  // Get contents of the basket
  const container = basket.get(ContainerTrait);
  if (container) {
    const contents = world.getContents(basket.id);
    for (const item of contents) {
      // Items stay in basket (their location is already basket.id)
      // But if player is "in" the basket, they should be moved too
    }
  }

  // Check if player is in the basket (location is basket.id)
  const player = world.getPlayer();
  if (player) {
    const playerLocation = world.getLocation(player.id);
    if (playerLocation === basket.id) {
      // Player is inside basket - they move with it
      // Actually, since player's location IS the basket, and basket moved,
      // the player automatically moves with it. Just need to trigger look.
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
    actorId: string
  ): CapabilityValidationResult {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) {
      return {
        valid: false,
        error: 'if.lower.cant_lower_that'
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

  execute(entity: IFEntity, world: WorldModel, actorId: string): void {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) return;

    // Update position
    trait.position = 'bottom';

    // Move basket to bottom room
    const playerTransported = moveBasketToRoom(entity, world, trait.bottomRoomId);

    // Store whether player was transported for reporting
    (entity as any)._lastMoveTransportedPlayer = playerTransported;
  },

  report(
    entity: IFEntity,
    world: WorldModel,
    actorId: string
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];
    const playerTransported = (entity as any)._lastMoveTransportedPlayer;

    // Report the lowering
    effects.push(
      createEffect('if.event.lowered', {
        messageId: BasketElevatorMessages.LOWERED,
        targetId: entity.id
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

    // Clean up temp flag
    delete (entity as any)._lastMoveTransportedPlayer;

    return effects;
  },

  blocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string
  ): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        messageId: error
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
    actorId: string
  ): CapabilityValidationResult {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) {
      return {
        valid: false,
        error: 'if.raise.cant_raise_that'
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

  execute(entity: IFEntity, world: WorldModel, actorId: string): void {
    const trait = entity.get(BasketElevatorTrait);
    if (!trait) return;

    // Update position
    trait.position = 'top';

    // Move basket to top room
    const playerTransported = moveBasketToRoom(entity, world, trait.topRoomId);

    // Store whether player was transported for reporting
    (entity as any)._lastMoveTransportedPlayer = playerTransported;
  },

  report(
    entity: IFEntity,
    world: WorldModel,
    actorId: string
  ): CapabilityEffect[] {
    const effects: CapabilityEffect[] = [];
    const playerTransported = (entity as any)._lastMoveTransportedPlayer;

    // Report the raising
    effects.push(
      createEffect('if.event.raised', {
        messageId: BasketElevatorMessages.RAISED,
        targetId: entity.id
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

    // Clean up temp flag
    delete (entity as any)._lastMoveTransportedPlayer;

    return effects;
  },

  blocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string
  ): CapabilityEffect[] {
    return [
      createEffect('action.blocked', {
        messageId: error
      })
    ];
  }
};
