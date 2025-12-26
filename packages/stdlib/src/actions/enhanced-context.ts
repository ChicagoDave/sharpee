/**
 * Enhanced action context implementation
 * 
 * Provides helper methods that make it easy to create properly
 * formatted events while maintaining the event-driven architecture.
 */

import { createEvent as coreCreateEvent, ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel, TraitType } from '@sharpee/world-model';
import { 
  ActionContext, 
  Action, 
  EventTypes,
  MessageNamespaces 
} from './enhanced-types';
import { ScopeResolver } from '../scope/types';
import { StandardScopeResolver } from '../scope/scope-resolver';
import { ValidatedCommand } from '../validation/types';

/**
 * Internal implementation of unified action context
 * 
 * Phase 2: Factory pattern with unified ActionContext interface
 */
class InternalActionContext implements ActionContext {
  private sequenceCounter = 0;
  public readonly scopeResolver: ScopeResolver;
  public sharedData: Record<string, any> = {};
  
  constructor(
    public readonly world: WorldModel,
    public readonly player: IFEntity,
    public readonly currentLocation: IFEntity,
    public readonly action: Action,
    public readonly command: ValidatedCommand,
    scopeResolver?: ScopeResolver
  ) {
    // Use provided scope resolver or create a standard one
    this.scopeResolver = scopeResolver || new StandardScopeResolver(world);
  }
  
  // World querying methods
  canSee(entity: IFEntity): boolean { 
    return this.scopeResolver.canSee(this.player, entity); 
  }
  
  canReach(entity: IFEntity): boolean {
    return this.scopeResolver.canReach(this.player, entity);
  }
  
  canTake(entity: IFEntity): boolean { 
    return !entity.has(TraitType.SCENERY) && !entity.has(TraitType.ROOM) && !entity.has(TraitType.DOOR); 
  }
  
  isInScope(entity: IFEntity): boolean { 
    // An entity is in scope if we can perceive it in any way
    return this.scopeResolver.getScope(this.player, entity) !== 'out_of_scope';
  }
  
  getVisible(): IFEntity[] { 
    return this.scopeResolver.getVisible(this.player); 
  }
  
  getInScope(): IFEntity[] { 
    // Get all entities that are perceivable in any way
    const visible = this.scopeResolver.getVisible(this.player);
    const audible = this.scopeResolver.getAudible(this.player);
    const reachable = this.scopeResolver.getReachable(this.player);
    
    // Combine and deduplicate
    const allInScope = new Map<string, IFEntity>();
    [...visible, ...audible, ...reachable].forEach(entity => {
      allInScope.set(entity.id, entity);
    });
    
    return Array.from(allInScope.values());
  }
  
  /**
   * Create an event with automatic entity injection and metadata enrichment
   * 
   * This is the single unified method for creating events (ADR-041)
   */
  event(type: string, data: any): ISemanticEvent {
    return this.createEventInternal(type, data);
  }
  
  /**
   * Internal event creation logic
   * This wraps the core createEvent to match our event pattern
   */
  private createEventInternal(
    type: string, 
    eventData: any
  ): ISemanticEvent {
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
    
    // For domain events (like if.action.inventory, if.event.examined), 
    // pass the data directly without wrapping
    if (type.startsWith('if.')) {
      const entities = this.getEventEntities();
      return coreCreateEvent(type, eventData, entities);
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
  createSubContext(action: Action): ActionContext {
    const subContext = new InternalActionContext(this.world, this.player, this.currentLocation, action, this.command, this.scopeResolver);
    // Share the same data store with sub-context
    subContext.sharedData = this.sharedData;
    return subContext;
  }
}

/**
 * Factory function to create unified action context
 * 
 * Phase 2: Factory pattern implementation
 */
export function createActionContext(
  world: WorldModel,
  player: IFEntity,
  action: Action,
  command: ValidatedCommand,
  scopeResolver?: ScopeResolver
): ActionContext {
  // Get immediate location (container/supporter/room that player is in)
  const locationId = world.getLocation(player.id);
  const currentLocation = locationId ? world.getEntity(locationId) : null;
  if (!currentLocation) {
    throw new Error('Player has no valid location');
  }
  return new InternalActionContext(world, player, currentLocation, action, command, scopeResolver);
}

/**
 * Helper to create a mock action context for testing
 */
export function createMockActionContext(
  world: WorldModel,
  player: IFEntity,
  action: Action,
  command?: Partial<ValidatedCommand>,
  scopeResolver?: ScopeResolver
): ActionContext {
  if (!world) {
    throw new Error('createMockActionContext: world is required');
  }
  if (!player) {
    throw new Error('createMockActionContext: player is required');
  }
  if (!action) {
    throw new Error('createMockActionContext: action is required');
  }
  
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
  
  return createActionContext(world, player, action, validatedCommand, scopeResolver);
}
