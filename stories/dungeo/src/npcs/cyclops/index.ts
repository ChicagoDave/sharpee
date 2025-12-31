/**
 * Cyclops NPC Module
 *
 * Exports the Cyclops entity creation, behavior, and messages.
 * Use registerCyclops() in story setup to wire everything together.
 */

// Re-export types and constants
export { CyclopsMessages, type CyclopsMessageId } from './cyclops-messages';
export {
  createCyclops,
  makeCyclopsFlee,
  type CyclopsState,
  type CyclopsCustomProperties,
  createCyclopsCustomProperties
} from './cyclops-entity';
export { cyclopsBehavior } from './cyclops-behavior';

import { WorldModel, IFEntity, RoomBehavior, Direction } from '@sharpee/world-model';
import { INpcService } from '@sharpee/stdlib';
import { cyclopsBehavior } from './cyclops-behavior';
import { createCyclops } from './cyclops-entity';

/**
 * Register the Cyclops NPC with the game
 *
 * @param npcService The NPC service to register behavior with
 * @param world The world model
 * @param roomId The Cyclops Room entity ID
 * @returns The created cyclops entity
 */
export function registerCyclops(
  npcService: INpcService,
  world: WorldModel,
  roomId: string
): IFEntity {
  // Register the cyclops behavior
  npcService.registerBehavior(cyclopsBehavior);

  // Block the north exit initially (to Living Room via Strange Passage)
  const cyclopsRoom = world.getEntity(roomId);
  if (cyclopsRoom) {
    RoomBehavior.blockExit(
      cyclopsRoom,
      Direction.NORTH,
      'The cyclops blocks your way north!'
    );
  }

  // Create the cyclops entity
  const cyclops = createCyclops(world, roomId);

  return cyclops;
}
