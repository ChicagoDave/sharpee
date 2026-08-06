/**
 * Event processor implementation
 *
 * Applies semantic events to the world model through registered handlers.
 * ADR-075: Entity handlers receive WorldQuery and return Effect[].
 */

import { type ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { type WorldChange, type ProcessedEvents, type ProcessorOptions } from '@sharpee/if-domain';
import { registerStandardHandlers } from './handlers/index.js';
import {
  Effect,
  EffectProcessor,
  createWorldQuery,
  WorldQuery
} from './effects/index.js';
import type { IGameEvent, StoryEventHandler } from './handler-types.js';

// Re-export for convenience
export type { StoryEventHandler, IGameEvent } from './handler-types.js';
export type { Effect, WorldQuery } from './effects/index.js';

// Simple ID generator for error events
let eventCounter = 0;
function generateEventId(): string {
  return `evt_${Date.now()}_${(++eventCounter).toString(36)}`;
}

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
   * Invoke story handlers for an event (ADR-075)
   *
   * Collects effects from all story-level handlers and processes them
   * through EffectProcessor. Entity `on` handlers were removed in ISSUE-068.
   */
  private invokeEntityHandlers(event: ISemanticEvent): ISemanticEvent[] {
    const allEffects: Effect[] = [];
    const legacyReactions: ISemanticEvent[] = [];

    // Convert to IGameEvent for handlers
    const gameEvent: IGameEvent = {
      ...event,
      data: (event.data as Record<string, unknown>) || {}
    };

    // Invoke story-level handlers (ADR-075 — use registerHandler)
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
      // Add emitted events to reactions so they appear in turn events
      if (result.emittedEvents && result.emittedEvents.length > 0) {
        legacyReactions.push(...result.emittedEvents);
      }
    }

    // 4. Partition game.message reactions (ADR-296 D4, narrowing ADR-106):
    // overrides require something to override.
    //   - Trigger has NO messageId → phrase emission: promoted to a standalone
    //     event, slot-placed by the prose sort (you cannot override a message
    //     that does not exist).
    //   - Trigger HAS a messageId → ADR-106 override, unchanged: the message
    //     replaces the trigger's messageId/text/params and is consumed.
    //   - _chainedFrom present → always a phrase emission, regardless of the
    //     trigger's messageId (chains are reactions with placement; replacement
    //     semantics live on the lifecycle engine's explicit override surface).
    const triggerHasMessageId =
      (event.data as Record<string, unknown> | undefined)?.messageId !== undefined;

    const overrides: ISemanticEvent[] = [];
    for (const reaction of legacyReactions) {
      if (reaction.type !== 'game.message') continue;
      const reactionData = (reaction.data ?? {}) as Record<string, unknown>;
      const isChained = reactionData._chainedFrom !== undefined;
      if (isChained || !triggerHasMessageId) {
        // Phrase emission: stays in the reaction stream as its own event.
        // Chain dispatch already stamped _narrativeSlot on chain-produced
        // phrases; handler-produced (registerHandler) phrases get the
        // default stamp here.
        if (reactionData._narrativeSlot === undefined) {
          reaction.data = { ...reactionData, _narrativeSlot: 'afterRoomDescription' };
        }
      } else {
        overrides.push(reaction);
      }
    }

    // The multiple-message error branch counts only the override partition —
    // phrase emissions left the consumption set above (ADR-296 D4).
    let filteredReactions = legacyReactions;

    if (overrides.length > 1) {
      // Error: multiple override messages for one trigger - this should never happen
      console.error(
        `Multiple game.message overrides for ${event.type} on ${event.entities?.target}:`,
        overrides.map(m => (m.data as Record<string, unknown>)?.messageId)
      );
      filteredReactions.push({
        id: generateEventId(),
        type: 'if.event.error',
        entities: event.entities,
        data: {
          message: `Multiple game.message overrides returned for ${event.type}`,
          sourceEvent: event.type,
          targetId: event.entities?.target,
          count: overrides.length,
          messageIds: overrides.map(m => (m.data as Record<string, unknown>)?.messageId)
        },
        timestamp: Date.now()
      });
    }

    if (overrides.length >= 1) {
      // Apply the (first) override to the trigger's message (ADR-106).
      const override = overrides[0];
      const overrideData = override.data as { messageId?: string; text?: string; params?: Record<string, unknown> };
      const eventData = event.data as Record<string, unknown>;

      if (overrideData.messageId) {
        eventData.messageId = overrideData.messageId;
      }
      if (overrideData.text) {
        eventData.text = overrideData.text;
      }
      if (overrideData.params) {
        eventData.params = overrideData.params;
      }

      // Consume the override messages; phrase emissions remain.
      filteredReactions = filteredReactions.filter(r => !overrides.includes(r));
    }

    // Return reactions (overrides consumed; phrase emissions kept as events)
    return filteredReactions;
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