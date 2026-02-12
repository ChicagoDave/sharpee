/**
 * Thief NPC Module
 *
 * Exports the Thief entity creation, behavior, and messages.
 * Use registerThief() in story setup to wire everything together.
 */

// Re-export types and constants
export { ThiefMessages, type ThiefMessageId } from './thief-messages';
export {
  createThief,
  type ThiefState,
  type ThiefCustomProperties,
  createThiefCustomProperties
} from './thief-entity';
export { thiefBehavior } from './thief-behavior';
export {
  isTreasure,
  getTreasureValue,
  findTreasuresIn,
  findPlayerTreasures,
  findRoomTreasures,
  isCarryingEgg,
  getThiefProps,
  setThiefState,
  isAtLair,
  isThiefDisabled,
  setThiefDisabled
} from './thief-helpers';

import { WorldModel, IFEntity, IdentityTrait } from '@sharpee/world-model';
import { INpcService } from '@sharpee/stdlib';
import { thiefBehavior } from './thief-behavior';
import { createThief } from './thief-entity';

/**
 * Register the Thief NPC with the game
 *
 * @param npcService The NPC service to register behavior with
 * @param world The world model
 * @param lairRoomId The Treasure Room entity ID
 * @param forbiddenRooms Room IDs the thief cannot enter (surface)
 * @returns The created thief entity
 */
export function registerThief(
  npcService: INpcService,
  world: WorldModel,
  lairRoomId: string,
  forbiddenRooms: string[] = []
): IFEntity {
  // Register the thief behavior
  npcService.registerBehavior(thiefBehavior);

  // Create the thief entity
  const thief = createThief(world, lairRoomId, forbiddenRooms);

  // Move the chalice from the lair room into the thief's inventory.
  // Canon MDL: thief holds the chalice; it drops when he dies (dropsInventory: true).
  const lairContents = world.getContents(lairRoomId);
  const chalice = lairContents.find(e => {
    const identity = e.get(IdentityTrait);
    return identity?.name === 'silver chalice';
  });
  if (chalice) {
    world.moveEntity(chalice.id, thief.id);
  }

  return thief;
}
