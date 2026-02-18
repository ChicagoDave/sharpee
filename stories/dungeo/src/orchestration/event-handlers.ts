/**
 * Event Handlers for Dungeo
 *
 * Registers event processor handlers that react to game events.
 * These handlers implement:
 * - Scoring (treasure collection, trophy case placement)
 * - Achievements (light-shaft, etc.)
 * - Death penalties
 * - Mirror room interaction
 * - Balloon item tracking
 */

import type { GameEngine } from '@sharpee/engine';
import type { EventProcessor } from '@sharpee/event-processor';
import { ISemanticEvent } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
import { VisibilityBehavior } from '@sharpee/world-model';

// Handlers
import { createMirrorTouchHandler, MirrorRoomConfig } from '../handlers/mirror-room-handler';
import { registerCombatDisengagementHandler } from '../handlers/combat-disengagement-handler';
import { registerTreasureRoomHandler } from '../handlers/treasure-room-handler';
import { registerEndgameScoringHandler, EndgameScoringConfig } from '../handlers/endgame-scoring-handler';

/**
 * Configuration for event handler registration
 */
export interface EventHandlerConfig {
  /** Mirror room configuration (optional - only if mirror exists) */
  mirrorConfig?: MirrorRoomConfig;
  /** Bottom of Shaft room ID for light-shaft achievement */
  bottomOfShaftId: string;
  /** Balloon IDs (optional - only if balloon exists) */
  balloonIds?: {
    balloonId: string;
    receptacleId: string;
  };
  /** Treasure Room ID for thief summoning (optional) */
  treasureRoomId?: string;
  /** Room visit scoring map: roomId → points (RVAL from MDL) */
  roomVisitScoring?: Map<string, number>;
  /** Endgame milestone scoring room IDs */
  endgameScoringConfig?: EndgameScoringConfig;
}

/**
 * Register all event handlers with the event processor
 */
export function registerEventHandlers(
  engine: GameEngine,
  world: WorldModel,
  config: EventHandlerConfig,
): void {
  const eventProcessor = engine.getEventProcessor();

  // ==========================================================================
  // Mirror Room Handler (ADR-075)
  // ==========================================================================

  if (config.mirrorConfig) {
    const mirrorHandler = createMirrorTouchHandler(config.mirrorConfig);
    eventProcessor.registerHandler('if.event.touched', mirrorHandler);
  }

  // ==========================================================================
  // Scoring Handlers (ADR-129: take-scoring via stdlib, trophy case via interceptor)
  // ==========================================================================

  // LIGHT-SHAFT achievement (10 pts)
  // Awarded when player enters Bottom of Shaft while room is lit
  // From 1981 MDL source (act2.92): <COND (<AND <==? ,HERE "BSHAF"> <LIT? ,HERE>> <SCORE-UPD ,LIGHT-SHAFT>)>
  registerLightShaftAchievement(
    eventProcessor,
    world,
    config.bottomOfShaftId
  );

  // Room visit scoring (RVAL from MDL) — points for first visiting certain rooms
  if (config.roomVisitScoring) {
    registerRoomVisitScoring(eventProcessor, world, config.roomVisitScoring);
  }

  // Note: Death penalty is now handled by state machine (death-penalty-machine.ts)

  // Note: Balloon PUT handling is now done via interceptor (ADR-118)
  // See ReceptaclePuttingInterceptor in stories/dungeo/src/interceptors/

  // ==========================================================================
  // Combat Disengagement Handler (Phase 4a)
  // ==========================================================================

  // Resets villain combat state when player leaves a room with an active combatant
  registerCombatDisengagementHandler(eventProcessor, world);

  // ==========================================================================
  // Treasure Room Handler (canonical MDL: TREASURE-ROOM room function)
  // ==========================================================================

  // Summons thief to Treasure Room when player enters (thief rushes to defense)
  if (config.treasureRoomId) {
    registerTreasureRoomHandler(eventProcessor, world, config.treasureRoomId);
  }

  // ==========================================================================
  // Endgame Milestone Scoring
  // ==========================================================================

  // Awards endgame points (separate from main score) when player enters
  // milestone rooms: Inside Mirror (15), Dungeon Entrance (15), Narrow Corridor (20)
  if (config.endgameScoringConfig) {
    registerEndgameScoringHandler(eventProcessor, world, config.endgameScoringConfig);
  }
}

/**
 * Register the light-shaft achievement handler
 *
 * Awards 10 points when player enters Bottom of Shaft while the room is lit.
 * This encourages players to bring a light source to the coal mine.
 */
function registerLightShaftAchievement(
  eventProcessor: EventProcessor,
  world: WorldModel,
  bottomOfShaftId: string,
): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    const data = event.data as { actor?: { id: string }; toRoom?: string } | undefined;
    if (!data?.toRoom || data.toRoom !== bottomOfShaftId) return [];

    // Check if player (not NPC) — actor_moved uses actor.id, not actorId
    const player = world.getPlayer();
    if (!player || data.actor?.id !== player.id) return [];

    // Check if the room is lit (not dark)
    const room = world.getEntity(bottomOfShaftId);
    if (!room) return [];

    const isLit = !VisibilityBehavior.isDark(room, world);
    if (isLit) {
      world.awardScore('light-shaft', 10, 'LIGHT-SHAFT achievement');
    }

    return [];
  });
}

/**
 * Register room visit scoring (RVAL from MDL)
 *
 * Awards points the first time the player enters certain rooms.
 * Uses world.awardScore() with 'room:<roomId>' as the dedup key.
 */
function registerRoomVisitScoring(
  eventProcessor: EventProcessor,
  world: WorldModel,
  roomPointsMap: Map<string, number>,
): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    const data = event.data as { actor?: { id: string }; toRoom?: string } | undefined;
    if (!data?.toRoom) return [];

    // Only score player visits, not NPC movement
    const player = world.getPlayer();
    if (!player || data.actor?.id !== player.id) return [];

    const points = roomPointsMap.get(data.toRoom);
    if (points) {
      world.awardScore(`room:${data.toRoom}`, points, `Visited room`);
    }

    return [];
  });
}
