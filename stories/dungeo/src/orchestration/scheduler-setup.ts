/**
 * Scheduler Setup for Dungeo
 *
 * Registers all daemons and fuses with the scheduler (ADR-071).
 * Scheduled events include:
 * - Light source decay (lantern, candles, matches)
 * - Dam flooding sequence
 * - Balloon flight progression
 * - NPC recovery timers
 * - Puzzle state changes
 */

import type { ISchedulerService } from '@sharpee/plugin-scheduler';
import type { WorldModel } from '@sharpee/world-model';

// Core scheduler events
import { registerScheduledEvents } from '../scheduler';
import { setSchedulerForGDT } from '../actions/gdt/commands';
import { setPressButtonScheduler } from '../actions/press-button';

// Handler registrations
import { registerBatHandler } from '../handlers/bat-handler';
import { registerExorcismHandler } from '../handlers/exorcism-handler';
import { registerRoundRoomHandler } from '../handlers/round-room-handler';

import { registerRoyalPuzzleHandler } from '../handlers/royal-puzzle';
import { registerCakeEatingHandler, registerCakeThrowingHandler } from '../handlers/cake-handler';


import { registerEndgameTriggerHandler } from '../handlers/endgame-trigger-handler';

import { registerTrollRecoveryDaemon, registerCagePoisonDaemon } from '../scheduler';

// Import region types to ensure type compatibility
import { ForestRoomIds } from '../regions/forest';
import { DamRoomIds } from '../regions/dam';
import { BankRoomIds } from '../regions/bank-of-zork';
import { RoyalPuzzleRoomIds } from '../regions/royal-puzzle';
import { UndergroundRoomIds } from '../regions/underground';
import { RoundRoomIds } from '../regions/round-room';
import { CoalMineRoomIds } from '../regions/coal-mine';
import { TempleRoomIds } from '../regions/temple';
import { EndgameRoomIds } from '../regions/endgame';
import { MazeRoomIds } from '../regions/maze';
import { HouseInteriorRoomIds } from '../regions/house-interior';
import { WellRoomIds } from '../regions/well-room';

/**
 * Configuration for scheduler event registration
 *
 * Uses actual region types for full type compatibility.
 */
export interface SchedulerConfig {
  /** Forest room IDs for ambient messages */
  forestIds: ForestRoomIds;
  /** Dam region IDs */
  damIds: DamRoomIds;
  /** Bank region IDs */
  bankIds: BankRoomIds;
  /** Balloon IDs (optional) */
  balloonIds?: {
    balloonId: string;
    receptacleId: string;
  };
  /** Underground room IDs */
  undergroundIds: UndergroundRoomIds;
  /** Round Room IDs */
  roundRoomIds: RoundRoomIds;
  /** Coal Mine IDs */
  coalMineIds: CoalMineRoomIds;
  /** Temple IDs */
  templeIds: TempleRoomIds;
  /** Endgame IDs */
  endgameIds: EndgameRoomIds;
  /** Maze IDs */
  mazeIds: MazeRoomIds;
  /** House Interior IDs */
  houseInteriorIds: HouseInteriorRoomIds;
  /** Royal Puzzle room IDs */
  royalPuzzleIds: RoyalPuzzleRoomIds;
  /** Well Room IDs (cage/sphere puzzle) */
  wellRoomIds: WellRoomIds;
}

/**
 * Register all scheduled events with the scheduler
 */
export function registerSchedulerEvents(
  scheduler: ISchedulerService,
  world: WorldModel,
  config: SchedulerConfig
): void {
  // ==========================================================================
  // Core Scheduled Events (lantern, candles, dam, balloon)
  // ==========================================================================

  registerScheduledEvents(
    scheduler,
    world,
    config.forestIds,
    config.damIds,
    config.bankIds,
    config.balloonIds
  );

  // Make scheduler accessible to GDT DC (daemon control) command
  setSchedulerForGDT(world, scheduler);

  // ==========================================================================
  // Bat Handler (Coal Mine)
  // ==========================================================================

  // Valid drop locations for bat: underground rooms excluding dangerous areas
  const batDropLocations = [
    config.undergroundIds.cellar,
    config.undergroundIds.trollRoom,
    config.undergroundIds.eastWestPassage,
    config.roundRoomIds.roundRoom,
    config.undergroundIds.northSouthCrawlway,
    config.undergroundIds.gallery,
    config.undergroundIds.studio,
    config.templeIds.temple,
    config.endgameIds.narrowCorridor,
    config.damIds.damLobby,
    config.damIds.dam,
    // Some maze rooms
    config.mazeIds.maze1,
    config.mazeIds.maze5,
    config.mazeIds.maze11,
  ];
  registerBatHandler(scheduler, config.coalMineIds.squeakyRoom, batDropLocations);

  // ==========================================================================
  // Puzzle Handlers
  // ==========================================================================

  // Exorcism handler (bell/book/candle puzzle)
  registerExorcismHandler(
    scheduler,
    world,
    config.endgameIds.entryToHades,
    config.endgameIds.landOfDead
  );

  // Round Room randomization handler (carousel room)
  registerRoundRoomHandler(scheduler, config.roundRoomIds.roundRoom);

  // Trapdoor: migrated to state machine (ADR-119)

  // Royal Puzzle handler (sliding block puzzle)
  registerRoyalPuzzleHandler(scheduler, config.royalPuzzleIds);

  // Cake handlers (Tea Room / Well Area puzzle)
  registerCakeEatingHandler(world);
  registerCakeThrowingHandler(world);

  // Cage poison daemon (sphere puzzle in Dingy Closet)
  registerCagePoisonDaemon(scheduler, world, config.wellRoomIds.dingyCloset);

  // Ghost Ritual now handled by GhostRitualDroppingInterceptor (ADR-118)

  // Reality Altered: migrated to state machine (ADR-119)

  // Endgame Trigger handler (Tomb darkness ritual)
  registerEndgameTriggerHandler(
    scheduler,
    world,
    config.endgameIds.tomb,
    config.endgameIds.topOfStairs
  );

  // Victory: migrated to state machine (ADR-119)

  // ==========================================================================
  // NPC Recovery Daemons
  // ==========================================================================

  // Troll Recovery daemon (wake up after knockout)
  registerTrollRecoveryDaemon(scheduler, config.undergroundIds.trollRoom);

  // ==========================================================================
  // Action Wiring
  // ==========================================================================

  // Wire press button action to scheduler (flooding sequence)
  setPressButtonScheduler(scheduler, config.damIds.maintenanceRoom);
}
