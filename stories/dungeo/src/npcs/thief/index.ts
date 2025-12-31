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

import { WorldModel, IFEntity } from '@sharpee/world-model';
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

  return thief;
}
