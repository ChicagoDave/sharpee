/**
 * Basket Handler
 *
 * Handles the basket elevator puzzle in the Shaft Room / Bottom of Shaft.
 * Player can LOWER BASKET or RAISE BASKET using the wheel mechanism.
 * If player is in the basket, they travel with it.
 *
 * Commands:
 * - LOWER BASKET (when basket at top)
 * - RAISE BASKET (when basket at bottom)
 * - TURN WHEEL / TURN CRANK (aliases for the same)
 *
 * Mechanics:
 * - Basket position: 'top' (Shaft Room) or 'bottom' (Bottom of Shaft)
 * - Items in basket travel with it
 * - Player in basket travels with it
 */

import { WorldModel, IWorldModel, IdentityTrait, ContainerTrait, VehicleTrait, EntityType, IFEntity, IParsedCommand } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { ActionContext, ValidationResult } from '@sharpee/stdlib';

// Action IDs
const LOWER_ACTION_ID = 'DUNGEO_LOWER';
const LIFT_ACTION_ID = 'DUNGEO_LIFT';
const LOWER_BASKET_ACTION_ID = 'dungeo.action.lower_basket';
const RAISE_BASKET_ACTION_ID = 'dungeo.action.raise_basket';

// Message IDs for basket puzzle
export const BasketMessages = {
  BASKET_LOWERED: 'dungeo.basket.lowered',
  BASKET_RAISED: 'dungeo.basket.raised',
  BASKET_DESCENDS: 'dungeo.basket.descends',
  BASKET_ASCENDS: 'dungeo.basket.ascends',
  BASKET_ALREADY_TOP: 'dungeo.basket.already_top',
  BASKET_ALREADY_BOTTOM: 'dungeo.basket.already_bottom',
  BASKET_NOT_HERE: 'dungeo.basket.not_here',
  WHEEL_TURN: 'dungeo.basket.wheel_turn'
};

// State keys
const BASKET_POSITION_KEY = 'dungeo.basket.position';
const BASKET_ENTITY_ID_KEY = 'dungeo.basket.entityId';

// Basket position type
type BasketPosition = 'top' | 'bottom';

// Cache for room IDs
let shaftRoomId: string | null = null;
let bottomOfShaftId: string | null = null;
let basketEntityId: string | null = null;

/**
 * Get the current basket position
 */
export function getBasketPosition(world: IWorldModel): BasketPosition {
  return (world.getStateValue(BASKET_POSITION_KEY) as BasketPosition) || 'top';
}

/**
 * Set the basket position
 */
function setBasketPosition(world: IWorldModel, position: BasketPosition): void {
  world.setStateValue(BASKET_POSITION_KEY, position);
}

/**
 * Find the basket entity
 */
function findBasket(world: IWorldModel): IFEntity | null {
  if (basketEntityId) {
    const basket = world.getEntity(basketEntityId);
    if (basket) return basket;
  }

  // Search for basket by name
  const allEntities = world.getAllEntities();
  for (const entity of allEntities) {
    const identity = entity.get(IdentityTrait);
    if (identity?.aliases?.includes('basket') && identity.name?.includes('iron')) {
      basketEntityId = entity.id;
      return entity;
    }
  }
  return null;
}

/**
 * Check if player is in the basket
 */
function isPlayerInBasket(world: IWorldModel, playerId: string): boolean {
  const basket = findBasket(world);
  if (!basket) return false;

  const playerLocation = world.getLocation(playerId);
  return playerLocation === basket.id;
}

/**
 * Lower the basket from top to bottom
 */
export function lowerBasket(
  world: IWorldModel,
  playerId: string
): { success: boolean; message: string; playerMoved: boolean } {
  const position = getBasketPosition(world);

  if (position === 'bottom') {
    return {
      success: false,
      message: BasketMessages.BASKET_ALREADY_BOTTOM,
      playerMoved: false
    };
  }

  const basket = findBasket(world);
  if (!basket || !bottomOfShaftId) {
    return {
      success: false,
      message: BasketMessages.BASKET_NOT_HERE,
      playerMoved: false
    };
  }

  // Check if player is in the basket
  const playerInBasket = isPlayerInBasket(world, playerId);

  // Move the basket to Bottom of Shaft
  world.moveEntity(basket.id, bottomOfShaftId);
  setBasketPosition(world, 'bottom');

  // If player was in basket, move them too (they stay inside the basket)
  if (playerInBasket) {
    return {
      success: true,
      message: BasketMessages.BASKET_DESCENDS,
      playerMoved: true
    };
  }

  return {
    success: true,
    message: BasketMessages.BASKET_LOWERED,
    playerMoved: false
  };
}

/**
 * Raise the basket from bottom to top
 */
export function raiseBasket(
  world: IWorldModel,
  playerId: string
): { success: boolean; message: string; playerMoved: boolean } {
  const position = getBasketPosition(world);

  if (position === 'top') {
    return {
      success: false,
      message: BasketMessages.BASKET_ALREADY_TOP,
      playerMoved: false
    };
  }

  const basket = findBasket(world);
  if (!basket || !shaftRoomId) {
    return {
      success: false,
      message: BasketMessages.BASKET_NOT_HERE,
      playerMoved: false
    };
  }

  // Check if player is in the basket
  const playerInBasket = isPlayerInBasket(world, playerId);

  // Move the basket to Shaft Room
  world.moveEntity(basket.id, shaftRoomId);
  setBasketPosition(world, 'top');

  // If player was in basket, they stay inside
  if (playerInBasket) {
    return {
      success: true,
      message: BasketMessages.BASKET_ASCENDS,
      playerMoved: true
    };
  }

  return {
    success: true,
    message: BasketMessages.BASKET_RAISED,
    playerMoved: false
  };
}

/**
 * Initialize the basket handler
 */
export function initializeBasketHandler(
  world: WorldModel,
  shaftRoom: string,
  bottomOfShaft: string
): void {
  shaftRoomId = shaftRoom;
  bottomOfShaftId = bottomOfShaft;

  // Initialize basket position state
  if (!world.getStateValue(BASKET_POSITION_KEY)) {
    setBasketPosition(world, 'top');
  }

  // Find and store basket entity ID
  const basket = findBasket(world);
  if (basket) {
    basketEntityId = basket.id;
    world.setStateValue(BASKET_ENTITY_ID_KEY, basket.id);

    // Add VehicleTrait to make basket enterable
    if (!basket.get(VehicleTrait)) {
      basket.add(new VehicleTrait({
        vehicleType: 'cable',  // Basket is raised/lowered by mechanism
        currentPosition: 'top',
        positionRooms: {
          'top': shaftRoomId,
          'bottom': bottomOfShaftId
        }
      }));
    }
  }
}

/**
 * Check if player can operate the basket from their current location
 */
export function canOperateBasket(world: IWorldModel, playerId: string): boolean {
  const playerLocation = world.getLocation(playerId);
  const basketPosition = getBasketPosition(world);
  const basket = findBasket(world);

  // Can operate if:
  // 1. In Shaft Room and basket is at top
  // 2. In Bottom of Shaft and basket is at bottom
  // 3. Inside the basket itself
  if (!playerLocation) return false;

  if (basket && playerLocation === basket.id) {
    return true; // In the basket
  }

  if (basketPosition === 'top' && playerLocation === shaftRoomId) {
    return true;
  }

  if (basketPosition === 'bottom' && playerLocation === bottomOfShaftId) {
    return true;
  }

  return false;
}

/**
 * Get the room where the basket currently is
 */
export function getBasketRoom(world: IWorldModel): string | null {
  const position = getBasketPosition(world);
  return position === 'top' ? shaftRoomId : bottomOfShaftId;
}
