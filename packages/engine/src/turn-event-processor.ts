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
import { SequencedEvent, EngineConfig } from './types';
import { toSemanticEvent, processEvent, EventProcessingContext } from './event-adapter';

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
export type EventEmitCallback = (event: SequencedEvent) => void;

/**
 * Callback type for dispatching to entity handlers
 */
export type EntityHandlerDispatcher = (event: SequencedEvent) => void;

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
    events: SequencedEvent[],
    enrichmentContext: EnrichmentContext,
    player: IFEntity,
    world: WorldModel
  ): ProcessedEventsResult {
    // Convert to semantic events and process through pipeline
    const context: EventProcessingContext = {
      turn: enrichmentContext.turn,
      playerId: enrichmentContext.playerId,
      locationId: enrichmentContext.locationId
    };

    let semanticEvents = events.map((e) => {
      const semantic = toSemanticEvent(e);
      return processEvent(semantic, context);
    });

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
        config.onEvent(event as unknown as SequencedEvent);
      }
    }

    // Emit through engine's event system
    for (const event of semanticEvents) {
      eventEmitter(event as unknown as SequencedEvent);

      // Dispatch to entity handlers if provided
      if (entityDispatcher) {
        entityDispatcher(event as unknown as SequencedEvent);
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
    events: SequencedEvent[]
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
