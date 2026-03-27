/**
 * Turn Event Processor - Processes events during turn execution
 *
 * Extracted from GameEngine as part of Phase 4 remediation.
 * Handles event enrichment, perception filtering, and event emission.
 */

import {
  ISemanticEvent,
  ISemanticEventSource,
  isPlatformRequestEvent,
  IPlatformEvent
} from '@sharpee/core';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { IPerceptionService } from '@sharpee/stdlib';
import { EngineConfig } from './types';

/**
 * Context for event processing pipeline
 */
export interface EventProcessingContext {
  turn?: number;
  playerId?: string;
  locationId?: string;
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Event normalization - ensures consistent event structure
 */
function normalizeEvent(event: ISemanticEvent): ISemanticEvent {
  return {
    ...event,
    id: event.id || generateEventId(),
    type: event.type.toLowerCase(),
    timestamp: event.timestamp || Date.now(),
    entities: event.entities || {},
    data: event.data,
    tags: event.tags,
    priority: event.priority,
    narrate: event.narrate
  };
}

/**
 * Event enrichment - adds turn, actor, and location context
 */
function enrichEvent(
  event: ISemanticEvent,
  context?: EventProcessingContext
): ISemanticEvent {
  const enriched = { ...event };

  if (context) {
    if (context.turn !== undefined && enriched.data && typeof enriched.data === 'object') {
      enriched.data = { ...enriched.data, turn: context.turn };
    }
    if (context.playerId && !enriched.entities.actor) {
      enriched.entities = { ...enriched.entities, actor: context.playerId };
    }
    if (context.locationId && !enriched.entities.location) {
      enriched.entities = { ...enriched.entities, location: context.locationId };
    }
  }

  if (!enriched.tags) {
    enriched.tags = [];
  }
  if (enriched.type.startsWith('action.') && !enriched.tags.includes('action')) {
    enriched.tags = [...enriched.tags, 'action'];
  } else if (enriched.type.startsWith('system.') && !enriched.tags.includes('system')) {
    enriched.tags = [...enriched.tags, 'system'];
  } else if (enriched.type.startsWith('game.') && !enriched.tags.includes('game')) {
    enriched.tags = [...enriched.tags, 'game'];
  }

  return enriched;
}

/**
 * Process an event through normalization and enrichment
 */
export function processEvent(
  event: ISemanticEvent,
  context?: EventProcessingContext
): ISemanticEvent {
  return enrichEvent(normalizeEvent(event), context);
}

/**
 * Context for event enrichment - matches EventProcessingContext
 */
export interface EnrichmentContext {
  turn: number;
  playerId: string;
  locationId: string | undefined;
}

/**
 * Result of processing events for a turn phase
 */
export interface ProcessedEventsResult {
  /** Processed semantic events */
  semanticEvents: ISemanticEvent[];
  /** Platform events that need handling */
  platformEvents: IPlatformEvent[];
}

/**
 * Callback type for emitting events
 */
export type EventEmitCallback = (event: ISemanticEvent) => void;

/**
 * Callback type for dispatching to entity handlers
 */
export type EntityHandlerDispatcher = (event: ISemanticEvent) => void;

/**
 * Service for processing turn events
 */
export class TurnEventProcessor {
  constructor(
    private perceptionService?: IPerceptionService
  ) {}

  /**
   * Process action events from command execution
   *
   * @param events - Raw events from command executor
   * @param enrichmentContext - Context for event enrichment
   * @param player - Player entity for perception filtering
   * @param world - World model for perception filtering
   * @returns Processed events and platform events
   */
  processActionEvents(
    events: ISemanticEvent[],
    enrichmentContext: EnrichmentContext,
    player: IFEntity,
    world: WorldModel
  ): ProcessedEventsResult {
    const context: EventProcessingContext = {
      turn: enrichmentContext.turn,
      playerId: enrichmentContext.playerId,
      locationId: enrichmentContext.locationId
    };

    let semanticEvents = events.map((e) => processEvent(e, context));

    // Apply perception filtering if service is configured
    if (this.perceptionService) {
      semanticEvents = this.perceptionService.filterEvents(
        semanticEvents,
        player,
        world
      );
    }

    // Check for platform request events
    const platformEvents: IPlatformEvent[] = [];
    for (const event of semanticEvents) {
      if (isPlatformRequestEvent(event)) {
        platformEvents.push(event as IPlatformEvent);
      }
    }

    return { semanticEvents, platformEvents };
  }

  /**
   * Process semantic events (e.g., from NPC or scheduler ticks)
   *
   * @param events - Semantic events to process
   * @param enrichmentContext - Context for event enrichment
   * @param player - Player entity for perception filtering
   * @param world - World model for perception filtering
   * @returns Processed events and platform events
   */
  processSemanticEvents(
    events: ISemanticEvent[],
    enrichmentContext: EnrichmentContext,
    player: IFEntity,
    world: WorldModel
  ): ProcessedEventsResult {
    const context: EventProcessingContext = {
      turn: enrichmentContext.turn,
      playerId: enrichmentContext.playerId,
      locationId: enrichmentContext.locationId
    };

    // Process events through the pipeline
    let semanticEvents = events.map((e) => processEvent(e, context));

    // Apply perception filtering if service is configured
    if (this.perceptionService) {
      semanticEvents = this.perceptionService.filterEvents(
        semanticEvents,
        player,
        world
      );
    }

    // Check for platform request events
    const platformEvents: IPlatformEvent[] = [];
    for (const event of semanticEvents) {
      if (isPlatformRequestEvent(event)) {
        platformEvents.push(event as IPlatformEvent);
      }
    }

    return { semanticEvents, platformEvents };
  }

  /**
   * Emit events through all configured channels
   *
   * @param semanticEvents - Events to emit
   * @param eventSource - Event source for tracking
   * @param turnEvents - Turn events map to update
   * @param turn - Current turn number
   * @param config - Engine config with event callback
   * @param eventEmitter - Callback for engine event emission
   * @param entityDispatcher - Optional callback for entity handler dispatch
   */
  emitEvents(
    semanticEvents: ISemanticEvent[],
    eventSource: ISemanticEventSource,
    turnEvents: Map<number, ISemanticEvent[]>,
    turn: number,
    config: EngineConfig,
    eventEmitter: EventEmitCallback,
    entityDispatcher?: EntityHandlerDispatcher
  ): void {
    // Store events for this turn
    const existingEvents = turnEvents.get(turn) || [];
    turnEvents.set(turn, [...existingEvents, ...semanticEvents]);

    // Track in event source for save/restore
    for (const event of semanticEvents) {
      eventSource.emit(event);
    }

    // Emit events if configured
    if (config.onEvent) {
      for (const event of semanticEvents) {
        config.onEvent(event);
      }
    }

    // Emit through engine's event system
    for (const event of semanticEvents) {
      eventEmitter(event);

      // Dispatch to entity handlers if provided
      if (entityDispatcher) {
        entityDispatcher(event);
      }
    }
  }

  /**
   * Check for victory events in the processed events
   *
   * @param events - Events to check
   * @returns Victory details if found, null otherwise
   */
  checkForVictory(
    events: ISemanticEvent[]
  ): { reason: string; score: number } | null {
    for (const event of events) {
      if (event.type === 'story.victory') {
        const data = event.data as { reason?: string; score?: number } | undefined;
        return {
          reason: data?.reason || 'Story completed',
          score: data?.score || 0
        };
      }
    }
    return null;
  }
}

/**
 * Create a turn event processor instance
 */
export function createTurnEventProcessor(
  perceptionService?: IPerceptionService
): TurnEventProcessor {
  return new TurnEventProcessor(perceptionService);
}
