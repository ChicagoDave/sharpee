/**
 * Event processor implementation
 *
 * Applies semantic events to the world model through registered handlers.
 * ADR-075: Entity handlers receive WorldQuery and return Effect[].
 */

import { ISemanticEvent } from '@sharpee/core';
import {
  WorldModel,
  IGameEvent,
  EntityEventHandler,
  LegacyEntityEventHandler,
  AnyEventHandler,
  Effect,
  EffectProcessor,
  createWorldQuery,
  WorldQuery,
  StoryEventHandler
} from '@sharpee/world-model';
import { WorldChange, ProcessedEvents, ProcessorOptions } from '@sharpee/if-domain';
import { registerStandardHandlers } from './handlers';

// Re-export StoryEventHandler for convenience
export type { StoryEventHandler } from '@sharpee/world-model';

export class EventProcessor {
  private world: WorldModel;
  private options: Required<ProcessorOptions>;
  private effectProcessor: EffectProcessor;
  private worldQuery: WorldQuery;

  // Story-level handlers: multiple handlers per event type
  private storyHandlers: Map<string, StoryEventHandler[]> = new Map();

  constructor(world: WorldModel, options: ProcessorOptions = {}) {
    this.world = world;
    this.options = {
      validate: options.validate ?? true,
      preview: options.preview ?? false,
      maxReactionDepth: options.maxReactionDepth ?? 10
    };

    // Create WorldQuery and EffectProcessor
    this.worldQuery = createWorldQuery(world);
    this.effectProcessor = new EffectProcessor(world, (events) => {
      // Recursively process emitted events
      this.processEvents(events);
    });

    // Register standard handlers on creation
    registerStandardHandlers(world);
  }

  /**
   * Register a story-level event handler
   * Multiple handlers can be registered for the same event type
   */
  registerHandler(eventType: string, handler: StoryEventHandler): void {
    const handlers = this.storyHandlers.get(eventType) || [];
    handlers.push(handler);
    this.storyHandlers.set(eventType, handlers);
  }

  /**
   * Unregister a story-level event handler
   */
  unregisterHandler(eventType: string, handler: StoryEventHandler): void {
    const handlers = this.storyHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.storyHandlers.delete(eventType);
      }
    }
  }
  
  /**
   * Process a batch of events
   */
  processEvents(events: ISemanticEvent[]): ProcessedEvents {
    const results: ProcessedEvents = {
      applied: [],
      failed: [],
      changes: [],
      reactions: []
    };
    
    // Process each event
    for (const event of events) {
      const processed = this.processSingleEvent(event);
      
      if (processed.success) {
        results.applied.push(event);
        results.changes.push(...processed.changes);
        
        // Process any reactions
        if (processed.reactions && processed.reactions.length > 0) {
          const reactionResults = this.processReactions(
            processed.reactions, 
            0
          );
          results.reactions.push(...reactionResults.reactions);
          results.applied.push(...reactionResults.applied);
          results.failed.push(...reactionResults.failed);
          results.changes.push(...reactionResults.changes);
        }
      } else {
        results.failed.push({
          event,
          reason: processed.reason || 'Unknown failure'
        });
      }
    }
    
    return results;
  }
  
  /**
   * Process a single event
   */
  private processSingleEvent(event: ISemanticEvent): {
    success: boolean;
    reason?: string;
    changes: WorldChange[];
    reactions?: ISemanticEvent[];
  } {
    // Validate if required
    if (this.options.validate) {
      if (!this.world.canApplyEvent(event)) {
        return {
          success: false,
          reason: 'Event validation failed',
          changes: []
        };
      }
    }
    
    // Preview changes if required
    let changes: WorldChange[] = [];
    if (this.options.preview) {
      changes = this.world.previewEvent(event);
    }
    
    // Apply the event
    try {
      this.world.applyEvent(event);

      // Invoke entity handlers (ADR-052)
      const reactions = this.invokeEntityHandlers(event);

      return {
        success: true,
        changes,
        reactions
      };
    } catch (error) {
      return {
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
        changes: []
      };
    }
  }
  
  /**
   * Process reaction events with depth limiting
   */
  private processReactions(
    reactions: ISemanticEvent[], 
    depth: number
  ): ProcessedEvents {
    const results: ProcessedEvents = {
      applied: [],
      failed: [],
      changes: [],
      reactions: []
    };
    
    // Check depth limit
    if (depth >= this.options.maxReactionDepth) {
      console.warn('Maximum reaction depth reached, stopping processing');
      return results;
    }
    
    // Process each reaction
    for (const reaction of reactions) {
      const processed = this.processSingleEvent(reaction);
      
      if (processed.success) {
        results.applied.push(reaction);
        results.changes.push(...processed.changes);
        
        // Recursively process nested reactions
        if (processed.reactions && processed.reactions.length > 0) {
          const nestedResults = this.processReactions(
            processed.reactions,
            depth + 1
          );
          results.reactions.push(...nestedResults.reactions);
          results.applied.push(...nestedResults.applied);
          results.failed.push(...nestedResults.failed);
          results.changes.push(...nestedResults.changes);
        }
      } else {
        results.failed.push({
          event: reaction,
          reason: processed.reason || 'Unknown failure'
        });
      }
    }
    
    results.reactions.push(...reactions);
    return results;
  }

  /**
   * Check if a result is an array of Effects (ADR-075 pattern)
   */
  private isEffectArray(result: unknown): result is Effect[] {
    if (!Array.isArray(result) || result.length === 0) return false;
    // Check first element for Effect signature (has 'type' that's one of our effect types)
    const first = result[0];
    if (typeof first !== 'object' || first === null) return false;
    const effectTypes = ['score', 'flag', 'message', 'emit', 'schedule', 'unblock', 'block', 'move_entity', 'update_entity', 'set_state', 'update_exits'];
    return 'type' in first && effectTypes.includes((first as { type: string }).type);
  }

  /**
   * Invoke entity and story handlers for an event (ADR-075)
   *
   * Collects effects from all handlers and processes them through EffectProcessor.
   * Supports multiple handlers per event type.
   * Also supports legacy handlers that return ISemanticEvent[] during migration.
   */
  private invokeEntityHandlers(event: ISemanticEvent): ISemanticEvent[] {
    const allEffects: Effect[] = [];
    const legacyReactions: ISemanticEvent[] = [];

    // Convert to IGameEvent for handlers
    const gameEvent: IGameEvent = {
      ...event,
      data: (event.data as Record<string, unknown>) || {}
    };

    // 1. Invoke entity handlers on the target entity
    if (event.entities?.target) {
      const target = this.world.getEntity(event.entities.target);
      if (target?.on?.[event.type]) {
        const handlerOrHandlers = target.on[event.type];
        const handlers = Array.isArray(handlerOrHandlers)
          ? handlerOrHandlers
          : [handlerOrHandlers];

        for (const handler of handlers) {
          try {
            // Try calling with WorldQuery first (ADR-075 pattern)
            const result = handler(gameEvent, this.worldQuery);

            if (result && Array.isArray(result)) {
              if (this.isEffectArray(result)) {
                // ADR-075 Effect-returning handler
                allEffects.push(...result);
              } else {
                // Legacy handler returning ISemanticEvent[]
                legacyReactions.push(...(result as ISemanticEvent[]));
              }
            }
          } catch (error) {
            console.error(
              `Entity handler error for ${event.type} on ${target.id}:`,
              error instanceof Error ? error.message : error
            );
          }
        }
      }
    }

    // 2. Invoke story-level handlers (ADR-075 only - use registerHandler)
    const storyHandlers = this.storyHandlers.get(event.type);
    if (storyHandlers) {
      for (const handler of storyHandlers) {
        try {
          const effects = handler(gameEvent, this.worldQuery);
          if (effects && Array.isArray(effects)) {
            allEffects.push(...effects);
          }
        } catch (error) {
          console.error(
            `Story handler error for ${event.type}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    // 3. Process all collected effects through EffectProcessor
    if (allEffects.length > 0) {
      const result = this.effectProcessor.process(allEffects);
      if (!result.success) {
        console.error('Effect processing failed:', result.errors);
      }
    }

    // Return legacy reactions for backward compatibility
    return legacyReactions;
  }

  /**
   * Get the world model
   */
  getWorld(): WorldModel {
    return this.world;
  }
  
  /**
   * Update processor options
   */
  setOptions(options: Partial<ProcessorOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
}