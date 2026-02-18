/**
 * Puzzle Handlers for Dungeo
 *
 * Registers complex multi-room puzzle handlers that need
 * access to engine services. These puzzles involve:
 * - Multiple rooms with interconnected state
 * - Scheduler integration for timed events
 * - Command interception for special movement
 */

import type { GameEngine } from '@sharpee/engine';
import type { ISchedulerService } from '@sharpee/plugin-scheduler';
import type { WorldModel } from '@sharpee/world-model';
import { RoomTrait, Direction } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

// Puzzle handlers
import { registerLaserPuzzleHandler } from '../handlers/endgame-laser-handler';
import { registerInsideMirrorHandler } from '../handlers/inside-mirror-handler';

/**
 * Configuration for puzzle handler registration
 */
export interface PuzzleConfig {
  /** Endgame room IDs needed for puzzles */
  endgameIds: {
    /** Small Room - laser puzzle start */
    smallRoom: string;
    /** Stone Room - laser puzzle end */
    stoneRoom: string;
    /** Hallway - Inside Mirror entrance */
    hallway: string;
    /** Inside Mirror - rotating box puzzle */
    insideMirror: string;
    /** Dungeon Entrance - Inside Mirror exit */
    dungeonEntrance: string;
    /** Prison Cell - bronze door puzzle */
    prisonCell: string;
    /** Treasury of Zork - victory room */
    treasury: string;
  };
}

/**
 * Register complex puzzle handlers with the engine
 */
export function registerPuzzleHandlers(
  engine: GameEngine,
  world: WorldModel,
  config: PuzzleConfig,
  scheduler?: ISchedulerService
): void {

  // Laser Puzzle (Small Room / Stone Room)
  // Player must direct laser beam through mirrors to open passage
  registerLaserPuzzleHandler(
    engine,
    world,
    config.endgameIds.smallRoom,
    config.endgameIds.stoneRoom,
    scheduler
  );

  // Inside Mirror (rotating/sliding box puzzle)
  // Player enters mirror, rotates room, exits to different location
  registerInsideMirrorHandler(
    engine,
    world,
    config.endgameIds.hallway,
    config.endgameIds.insideMirror,
    config.endgameIds.dungeonEntrance,
    scheduler
  );

  // Bronze Door → Treasury connection
  // When bronze door is opened in Prison Cell, create SOUTH exit to Treasury
  registerBronzeDoorHandler(
    world,
    config.endgameIds.prisonCell,
    config.endgameIds.treasury
  );
}

/**
 * Register handler that creates Prison Cell → Treasury exit when bronze door opens.
 *
 * The bronze door is in Prison Cell and only visible when dial is set to cell 4.
 * Opening it creates the SOUTH exit to the Treasury of Zork.
 */
function registerBronzeDoorHandler(
  world: WorldModel,
  prisonCellId: string,
  treasuryId: string,
): void {
  world.registerEventHandler('if.event.opened', (event: ISemanticEvent) => {
    const data = event.data as { targetId?: string; targetName?: string } | undefined;
    if (!data?.targetId) return [];

    // Check if the opened entity is the bronze door
    const entity = world.getEntity(data.targetId);
    if (!entity) return [];
    if (!entity.attributes.isTreasuryDoor) return [];

    // Create Prison Cell SOUTH → Treasury
    const prisonCell = world.getEntity(prisonCellId);
    if (prisonCell) {
      const roomTrait = prisonCell.get(RoomTrait);
      if (roomTrait) {
        roomTrait.exits[Direction.SOUTH] = { destination: treasuryId };
      }
    }

    return [];
  });
}
