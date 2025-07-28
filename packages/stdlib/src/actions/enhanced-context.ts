/**
 * Enhanced action context implementation
 * 
 * Provides helper methods that make it easy to create properly
 * formatted events while maintaining the event-driven architecture.
 */

import { createEvent as coreCreateEvent, SemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel, ValidatedCommand, TraitType } from '@sharpee/world-model';
import { 
  ActionContext, 
  EnhancedActionContext, 
  Action, 
  EventTypes,
  MessageNamespaces 
} from './enhanced-types';

/**
 * Implementation of enhanced action context
 * 
 * ADR-041: Simplified to only expose event() method
 */
export class EnhancedActionContextImpl implements EnhancedActionContext {
  private sequenceCounter = 0;
  
  constructor(
    private baseContext: ActionContext,
    public readonly action: Action,
    public readonly command: ValidatedCommand
  ) {}
  
  // Delegate base context properties
  get world(): WorldModel { return this.baseContext.world; }
  get player(): IFEntity { return this.baseContext.player; }
  get currentLocation(): IFEntity { return this.baseContext.currentLocation; }
  
  // Delegate base context methods
  canSee(entity: IFEntity): boolean { return this.baseContext.canSee(entity); }
  canReach(entity: IFEntity): boolean { return this.baseContext.canReach(entity); }
  canTake(entity: IFEntity): boolean { return this.baseContext.canTake(entity); }
  isInScope(entity: IFEntity): boolean { return this.baseContext.isInScope(entity); }
  getVisible(): IFEntity[] { return this.baseContext.getVisible(); }
  getInScope(): IFEntity[] { return this.baseContext.getInScope(); }
  
  /**
   * Create an event with automatic entity injection and metadata enrichment
   * 
   * This is the single unified method for creating events (ADR-041)
   */
  event(type: string, data: any): SemanticEvent {
    return this.createEventInternal(type, data);
  }
  
  /**
   * Internal event creation logic
   * This wraps the core createEvent to match our event pattern
   */
  private createEventInternal(
    type: string, 
    eventData: any
  ): SemanticEvent {
    // Special handling for action.error and action.success events
    // These should NOT be double-wrapped
    if (type === 'action.error' || type === 'action.success') {
      // For action status events, the data IS the payload
      const payload = {
        ...eventData,
        timestamp: eventData.timestamp || Date.now()
      };
      
      const entities = this.getEventEntities();
      return coreCreateEvent(type, payload, entities);
    }
    
    // If the data already has our structure, extract it
    if (eventData && typeof eventData === 'object' && 'data' in eventData) {
      const { actionId, reason, data, timestamp } = eventData;
      
      // Build payload following our standard structure
      const payload = {
        actionId: actionId || this.action.id,
        timestamp: timestamp || Date.now(),
        ...(reason && { reason }),
        data: data || {}
      };
      
      // Get entities
      const entities = this.getEventEntities();
      
      return coreCreateEvent(type, payload, entities);
    }
    
    // Legacy format - wrap in our structure
    const payload = {
      actionId: this.action.id,
      timestamp: Date.now(),
      data: eventData
    };
    
    const entities = this.getEventEntities();
    return coreCreateEvent(type, payload, entities);
  }
  
  /**
   * Get entities for event from command context
   */
  private getEventEntities(): Record<string, string> {
    const entities: Record<string, string> = {};
    
    // Add actor (player) if available
    if (this.player?.id) {
      entities.actor = this.player.id;
    }
    
    // Add target from command if present
    if (this.command?.directObject?.entity?.id) {
      entities.target = this.command.directObject.entity.id;
    }
    
    // Add indirect object if present
    if (this.command?.indirectObject?.entity?.id) {
      entities.instrument = this.command.indirectObject.entity.id;
    }
    
    // Add location if available
    if (this.currentLocation?.id) {
      entities.location = this.currentLocation.id;
    }
    
    return entities;
  }
  
  /**
   * Helper to create context for another action (used in composite actions)
   */
  createSubContext(action: Action): EnhancedActionContext {
    return new EnhancedActionContextImpl(this.baseContext, action, this.command);
  }
}

/**
 * Factory function to create enhanced context from base context
 */
export function createEnhancedContext(
  baseContext: ActionContext,
  action: Action,
  command: ValidatedCommand
): EnhancedActionContext {
  return new EnhancedActionContextImpl(baseContext, action, command);
}

/**
 * Helper to create a mock enhanced context for testing
 */
export function createMockEnhancedContext(
  world: WorldModel,
  player: IFEntity,
  action: Action,
  command?: Partial<ValidatedCommand>
): EnhancedActionContext {
  if (!world) {
    throw new Error('createMockEnhancedContext: world is required');
  }
  if (!player) {
    throw new Error('createMockEnhancedContext: player is required');
  }
  if (!action) {
    throw new Error('createMockEnhancedContext: action is required');
  }
  
  const currentLocation = world.getContainingRoom(player.id) || player;
  
  const baseContext: ActionContext = {
    world,
    player,
    currentLocation,
    command: command as ValidatedCommand,
    canSee: (entity) => world.canSee(player.id, entity.id),
    canReach: (entity) => {
      // First must be able to see it
      if (!world.canSee(player.id, entity.id)) return false;
      
      // Can always reach things we're carrying
      if (world.getLocation(entity.id) === player.id) return true;
      
      // Can reach things in the same room
      const playerRoom = world.getContainingRoom(player.id);
      const entityRoom = world.getContainingRoom(entity.id);
      if (playerRoom && entityRoom && playerRoom.id === entityRoom.id) {
        // Check if it's in a closed container
        let current = entity.id;
        while (current) {
          const container = world.getLocation(current);
          if (!container || container === playerRoom.id) break;
          
          const containerEntity = world.getEntity(container);
          if (containerEntity?.has(TraitType.CONTAINER)) {
            const containerTrait = containerEntity.get(TraitType.CONTAINER) as any;
            if (containerEntity.has(TraitType.OPENABLE)) {
              const openable = containerEntity.get(TraitType.OPENABLE) as any;
              if (!openable?.isOpen) return false;
            }
          }
          current = container;
        }
        return true;
      }
      
      return false;
    },
    canTake: (entity) => !entity.has(TraitType.SCENERY) && !entity.has(TraitType.ROOM) && !entity.has(TraitType.DOOR),
    isInScope: (entity) => world.getInScope(player.id).some(e => e.id === entity.id),
    getVisible: () => world.getVisible(player.id),
    getInScope: () => world.getInScope(player.id)
  };
  
  const validatedCommand: ValidatedCommand = {
    parsed: {
      rawInput: 'test',
      action: action.id,
      tokens: [],
      structure: { verb: { tokens: [0], text: 'test', head: 'test' } },
      pattern: 'VERB_ONLY',
      confidence: 1.0
    },
    actionId: action.id,
    ...command
  };
  
  return new EnhancedActionContextImpl(baseContext, action, validatedCommand);
}
