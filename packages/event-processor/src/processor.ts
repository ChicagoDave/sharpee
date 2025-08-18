/**
 * Event processor implementation
 * 
 * Applies semantic events to the world model through registered handlers
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel } from '@sharpee/world-model';
import { WorldChange, ProcessedEvents, ProcessorOptions } from '@sharpee/if-domain';
import { registerStandardHandlers } from './handlers';

export class EventProcessor {
  private world: WorldModel;
  private options: Required<ProcessorOptions>;
  
  constructor(world: WorldModel, options: ProcessorOptions = {}) {
    this.world = world;
    this.options = {
      validate: options.validate ?? true,
      preview: options.preview ?? false,
      maxReactionDepth: options.maxReactionDepth ?? 10
    };
    
    // Register standard handlers on creation
    registerStandardHandlers(world);
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
      
      return {
        success: true,
        changes,
        reactions: [] // TODO: Implement reaction system
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