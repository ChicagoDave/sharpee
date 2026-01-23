/**
 * Puzzle Handlers for Dungeo
 *
 * Registers complex multi-room puzzle handlers that need
 * access to engine services. These puzzles involve:
 * - Multiple rooms with interconnected state
 * - Scheduler integration for timed events
 * - Command interception for special movement
 */

import type { GameEngine, ISchedulerService } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';

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
  };
}

/**
 * Register complex puzzle handlers with the engine
 */
export function registerPuzzleHandlers(
  engine: GameEngine,
  world: WorldModel,
  config: PuzzleConfig
): void {
  const scheduler = engine.getScheduler();

  // Laser Puzzle (Small Room / Stone Room)
  // Player must direct laser beam through mirrors to open passage
  registerLaserPuzzleHandler(
    engine,
    world,
    config.endgameIds.smallRoom,
    config.endgameIds.stoneRoom,
    scheduler || undefined
  );

  // Inside Mirror (rotating/sliding box puzzle)
  // Player enters mirror, rotates room, exits to different location
  registerInsideMirrorHandler(
    engine,
    world,
    config.endgameIds.hallway,
    config.endgameIds.insideMirror,
    config.endgameIds.dungeonEntrance,
    scheduler || undefined
  );
}
