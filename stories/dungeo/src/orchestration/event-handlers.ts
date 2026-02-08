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
import { ScoringEventProcessor } from '@sharpee/stdlib';

// Handlers
import { createMirrorTouchHandler, MirrorRoomConfig } from '../handlers/mirror-room-handler';
import { registerCombatDisengagementHandler } from '../handlers/combat-disengagement-handler';

// Scoring
import { DungeoScoringService } from '../scoring';

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
}

/**
 * Register all event handlers with the event processor
 */
export function registerEventHandlers(
  engine: GameEngine,
  world: WorldModel,
  config: EventHandlerConfig,
  scoringProcessor: ScoringEventProcessor,
  scoringService: DungeoScoringService
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
  // Scoring Handlers
  // ==========================================================================

  // Initialize scoring event processor handlers
  // Registers handlers for if.event.taken and if.event.put_in to score treasures
  scoringProcessor.initializeHandlers(eventProcessor);

  // LIGHT-SHAFT achievement (10 pts)
  // Awarded when player enters Bottom of Shaft while room is lit
  // From 1981 MDL source (act2.92): <COND (<AND <==? ,HERE "BSHAF"> <LIT? ,HERE>> <SCORE-UPD ,LIGHT-SHAFT>)>
  registerLightShaftAchievement(
    eventProcessor,
    world,
    config.bottomOfShaftId,
    scoringProcessor
  );

  // Note: Death penalty is now handled by state machine (death-penalty-machine.ts)

  // Note: Balloon PUT handling is now done via interceptor (ADR-118)
  // See ReceptaclePuttingInterceptor in stories/dungeo/src/interceptors/

  // ==========================================================================
  // Combat Disengagement Handler (Phase 4a)
  // ==========================================================================

  // Resets villain combat state when player leaves a room with an active combatant
  registerCombatDisengagementHandler(eventProcessor, world);
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
  scoringProcessor: ScoringEventProcessor
): void {
  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    const data = event.data as { actorId?: string; toRoomId?: string } | undefined;
    if (!data?.toRoomId || data.toRoomId !== bottomOfShaftId) return [];

    // Check if player (not NPC)
    const player = world.getPlayer();
    if (!player || data.actorId !== player.id) return [];

    // Check if the room is lit (not dark)
    const room = world.getEntity(bottomOfShaftId);
    if (!room) return [];

    const isLit = !VisibilityBehavior.isDark(room, world);
    if (isLit) {
      scoringProcessor.awardOnce('light-shaft', 10, 'LIGHT-SHAFT achievement');
    }

    return [];
  });
}
