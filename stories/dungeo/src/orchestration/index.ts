/**
 * Orchestration Module for Dungeo
 *
 * Aggregates all engine registration functions into a single entry point.
 * This module is called from onEngineReady() to set up:
 * - Command transformers (intercept/modify commands)
 * - Scheduler events (daemons and fuses)
 * - Puzzle handlers (complex multi-room puzzles)
 * - NPC registration (NPC behaviors)
 * - Event handlers (react to game events)
 *
 * This pattern establishes the canonical structure for Sharpee stories.
 */

import type { GameEngine } from '@sharpee/engine';
import type { WorldModel } from '@sharpee/world-model';
import { SchedulerPlugin } from '@sharpee/plugin-scheduler';
import { NpcPlugin } from '@sharpee/plugin-npc';
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import { ScoringEventProcessor } from '@sharpee/stdlib';
import { IdentityTrait } from '@sharpee/world-model';

import { createTrapdoorMachine } from '../state-machines/trapdoor-machine';
import { createDeathPenaltyMachine } from '../state-machines/death-penalty-machine';
import { createRainbowMachine } from '../state-machines/rainbow-machine';
import { createRealityAlteredMachine } from '../state-machines/reality-altered-machine';
import { createVictoryMachine } from '../state-machines/victory-machine';

import { registerCommandTransformers, TransformerConfig } from './command-transformers';
import { registerSchedulerEvents, SchedulerConfig } from './scheduler-setup';
import { registerPuzzleHandlers, PuzzleConfig } from './puzzle-handlers';
import { registerNpcs, NpcConfig } from './npc-setup';
import { registerEventHandlers, EventHandlerConfig } from './event-handlers';
import { MirrorRoomConfig } from '../handlers/mirror-room-handler';
import { DungeoScoringService } from '../scoring';

// Import region types for type compatibility
import { WhiteHouseRoomIds } from '../regions/white-house';
import { HouseInteriorRoomIds } from '../regions/house-interior';
import { ForestRoomIds } from '../regions/forest';
import { UndergroundRoomIds } from '../regions/underground';
import { FrigidRiverRoomIds } from '../regions/frigid-river';
import { RoundRoomIds } from '../regions/round-room';
import { DamRoomIds } from '../regions/dam';
import { BankRoomIds } from '../regions/bank-of-zork';
import { CoalMineRoomIds } from '../regions/coal-mine';
import { TempleRoomIds } from '../regions/temple';
import { MazeRoomIds } from '../regions/maze';
import { EndgameRoomIds } from '../regions/endgame';
import { RoyalPuzzleRoomIds } from '../regions/royal-puzzle';
import { WellRoomIds } from '../regions/well-room';

/**
 * Unified configuration for all orchestration registrations
 *
 * Uses actual region types from the story for full type safety.
 */
export interface OrchestrationConfig {
  // ==========================================================================
  // Room IDs by Region (using actual region types)
  // ==========================================================================

  whiteHouseIds: WhiteHouseRoomIds;
  houseInteriorIds: HouseInteriorRoomIds;
  forestIds: ForestRoomIds;
  undergroundIds: UndergroundRoomIds;
  frigidRiverIds: FrigidRiverRoomIds;
  roundRoomIds: RoundRoomIds;
  damIds: DamRoomIds;
  bankIds: BankRoomIds;
  coalMineIds: CoalMineRoomIds;
  templeIds: TempleRoomIds;
  mazeIds: MazeRoomIds;
  endgameIds: EndgameRoomIds;
  royalPuzzleIds: RoyalPuzzleRoomIds;
  wellRoomIds: WellRoomIds;

  // ==========================================================================
  // Optional Features
  // ==========================================================================

  /** Balloon configuration (optional - only if balloon exists) */
  balloonIds?: {
    balloonId: string;
    receptacleId: string;
  };

  /** Mirror room configuration (optional - only if mirror puzzle exists) */
  mirrorConfig?: MirrorRoomConfig;
}

/**
 * Initialize all engine orchestration
 *
 * This is the main entry point called from onEngineReady().
 * It delegates to specialized registration functions for each subsystem.
 *
 * @param engine - The game engine instance
 * @param world - The world model
 * @param config - Configuration containing all room IDs and feature flags
 * @param scoringProcessor - Event processor for treasure scoring
 * @param scoringService - Scoring service for achievements and penalties
 */
export function initializeOrchestration(
  engine: GameEngine,
  world: WorldModel,
  config: OrchestrationConfig,
  scoringProcessor: ScoringEventProcessor,
  scoringService: DungeoScoringService
): void {
  // 1. Command Transformers
  // Intercept and modify parsed commands before execution
  const transformerConfig: TransformerConfig = {
    aragainFallsId: config.frigidRiverIds.aragainFalls
  };
  registerCommandTransformers(engine, world, transformerConfig);

  // 2. Scheduler Plugin (ADR-120)
  // Register scheduler plugin and set up daemons and fuses
  const schedulerPlugin = new SchedulerPlugin();
  engine.getPluginRegistry().register(schedulerPlugin);
  const schedulerConfig: SchedulerConfig = {
    forestIds: config.forestIds,
    damIds: config.damIds,
    bankIds: config.bankIds,
    balloonIds: config.balloonIds,
    undergroundIds: config.undergroundIds,
    roundRoomIds: config.roundRoomIds,
    coalMineIds: config.coalMineIds,
    templeIds: config.templeIds,
    endgameIds: config.endgameIds,
    mazeIds: config.mazeIds,
    houseInteriorIds: config.houseInteriorIds,
    royalPuzzleIds: config.royalPuzzleIds,
    wellRoomIds: config.wellRoomIds
  };
  registerSchedulerEvents(schedulerPlugin.getScheduler(), world, schedulerConfig);

  // 3. Puzzle Handlers
  // Register complex multi-room puzzle handlers
  const puzzleConfig: PuzzleConfig = {
    endgameIds: {
      smallRoom: config.endgameIds.smallRoom,
      stoneRoom: config.endgameIds.stoneRoom,
      hallway: config.endgameIds.hallway,
      insideMirror: config.endgameIds.insideMirror,
      dungeonEntrance: config.endgameIds.dungeonEntrance
    }
  };
  registerPuzzleHandlers(engine, world, puzzleConfig, schedulerPlugin.getScheduler());

  // 4. NPC Registration (ADR-120 Phase 3)
  // Register NPC plugin and set up behaviors
  const npcPlugin = new NpcPlugin();
  engine.getPluginRegistry().register(npcPlugin);

  // Calculate surface rooms (thief forbidden from surface)
  const surfaceRoomIds = [
    ...Object.values(config.whiteHouseIds),
    ...Object.values(config.houseInteriorIds),
    ...Object.values(config.forestIds)
  ];

  const npcConfig: NpcConfig = {
    surfaceRoomIds,
    treasureRoomId: config.mazeIds.treasureRoom,
    cyclopsRoomId: config.mazeIds.cyclopsRoom,
    dungeonEntranceId: config.endgameIds.dungeonEntrance
  };
  registerNpcs(engine, npcPlugin.getNpcService(), world, npcConfig);

  // 5. State Machine Plugin (ADR-119, ADR-120 Phase 4)
  // Register state machine plugin for declarative puzzle orchestration
  const stateMachinePlugin = new StateMachinePlugin();
  engine.getPluginRegistry().register(stateMachinePlugin);

  // Register state machines
  const smRegistry = stateMachinePlugin.getRegistry();

  // Trapdoor: slams shut when player descends from Living Room to Cellar
  const trapdoorId = findEntityByName(world, 'trap door');
  if (trapdoorId) {
    smRegistry.register(
      createTrapdoorMachine(
        config.houseInteriorIds.livingRoom,
        config.undergroundIds.cellar
      ),
      {
        '$trapdoor': trapdoorId,
        '$cellar': config.undergroundIds.cellar,
      }
    );
  }

  // Death Penalty: tracks deaths, deducts points, game over after 2
  smRegistry.register(
    createDeathPenaltyMachine(scoringService),
  );

  // Rainbow: tracks solid/insubstantial state, manages Aragain Falls east exit
  smRegistry.register(
    createRainbowMachine(),
    {
      '$aragainFalls': config.frigidRiverIds.aragainFalls,
      '$onTheRainbow': config.frigidRiverIds.onTheRainbow,
    }
  );

  // Reality Altered: shows message after thief dies and player checks score (ADR-078)
  smRegistry.register(createRealityAlteredMachine());

  // Victory: triggers when player enters Treasury of Zork during endgame
  smRegistry.register(createVictoryMachine(config.endgameIds.treasury));

  // 6. Event Handlers
  // Register event processor handlers for scoring, achievements, etc.
  const eventConfig: EventHandlerConfig = {
    mirrorConfig: config.mirrorConfig,
    bottomOfShaftId: config.coalMineIds.bottomOfShaft,
    balloonIds: config.balloonIds
  };
  registerEventHandlers(engine, world, eventConfig, scoringProcessor, scoringService);
}

/** Find an entity by its IdentityTrait name */
function findEntityByName(world: WorldModel, name: string): string | null {
  for (const entity of world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === name) return entity.id;
  }
  return null;
}

// Re-export types and functions for direct access if needed
export type { TransformerConfig } from './command-transformers';
export type { SchedulerConfig } from './scheduler-setup';
export type { PuzzleConfig } from './puzzle-handlers';
export type { NpcConfig } from './npc-setup';
export type { EventHandlerConfig } from './event-handlers';
