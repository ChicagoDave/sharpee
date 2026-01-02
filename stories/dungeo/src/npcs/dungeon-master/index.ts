/**
 * Dungeon Master NPC Module
 *
 * Exports all components of the Dungeon Master NPC.
 * Use registerDungeonMaster() in story setup to wire everything together.
 */

export * from './dungeon-master-entity';
export * from './dungeon-master-behavior';
export * from './dungeon-master-messages';
export * from './dungeon-master-trivia';

import { WorldModel, IFEntity } from '@sharpee/world-model';
import { INpcService } from '@sharpee/stdlib';
import { dungeonMasterBehavior } from './dungeon-master-behavior';
import { createDungeonMaster } from './dungeon-master-entity';

/**
 * Register the Dungeon Master NPC with the game
 *
 * @param npcService The NPC service to register behavior with
 * @param world The world model
 * @param startRoomId The Dungeon Entrance room ID
 * @returns The created Dungeon Master entity
 */
export function registerDungeonMaster(
  npcService: INpcService,
  world: WorldModel,
  startRoomId: string
): IFEntity {
  // Register the Dungeon Master behavior
  npcService.registerBehavior(dungeonMasterBehavior);

  // Create the Dungeon Master entity
  const dm = createDungeonMaster(world, startRoomId);

  return dm;
}
