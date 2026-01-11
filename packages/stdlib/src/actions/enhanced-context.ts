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
  MessageNamespaces,
  ScopeCheckResult,
  ScopeErrors,
  ImplicitTakeResult
} from './enhanced-types';
import { ScopeResolver, ScopeLevel } from '../scope/types';
import { StandardScopeResolver } from '../scope/scope-resolver';
import { ValidatedCommand } from '../validation/types';

// Import taking action for implicit takes
// This is safe from circular dependencies because:
// - taking.ts imports from enhanced-types.ts (not enhanced-context.ts)
// - enhanced-context.ts imports from taking.ts
import { takingAction } from './standard/taking/taking';

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
    // An entity is in scope if we can perceive it in any way (AWARE or higher)
    return this.scopeResolver.getScope(this.player, entity) >= ScopeLevel.AWARE;
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

  // =========================================================================
  // Scope validation methods (Phase 4 parser refactor)
  // =========================================================================

  getEntityScope(entity: IFEntity): ScopeLevel {
    return this.scopeResolver.getScope(this.player, entity);
  }

  getSlotScope(slot: string): ScopeLevel {
    const entity = this.getEntityFromSlot(slot);
    if (!entity) {
      return ScopeLevel.UNAWARE;
    }
    return this.getEntityScope(entity);
  }

  requireScope(entity: IFEntity, required: ScopeLevel): ScopeCheckResult {
    const actualScope = this.getEntityScope(entity);

    if (actualScope >= required) {
      return { ok: true, actualScope };
    }

    // Determine the appropriate error based on what scope level failed
    const error = this.getScopeError(required, actualScope, entity);
    return {
      ok: false,
      error,
      actualScope
    };
  }

  requireSlotScope(slot: string, required: ScopeLevel): ScopeCheckResult {
    const entity = this.getEntityFromSlot(slot);
    if (!entity) {
      return {
        ok: false,
        error: {
          valid: false,
          error: 'no_target',
          params: { slot }
        }
      };
    }
    return this.requireScope(entity, required);
  }

  requireCarriedOrImplicitTake(entity: IFEntity): ImplicitTakeResult {
    const actualScope = this.getEntityScope(entity);

    // Case 1: Already carried - success, no implicit take needed
    if (actualScope >= ScopeLevel.CARRIED) {
      return { ok: true };
    }

    // Case 2: Not reachable - can't take it, return scope error
    if (actualScope < ScopeLevel.REACHABLE) {
      const error = this.getScopeError(ScopeLevel.REACHABLE, actualScope, entity);
      return { ok: false, error };
    }

    // Case 3: Reachable but not carried - attempt implicit take
    // Check if entity can be taken (not scenery, room, etc.)
    if (!this.canTake(entity)) {
      return {
        ok: false,
        error: {
          valid: false,
          error: 'fixed_in_place',
          params: { item: entity.name }
        }
      };
    }

    // Create a synthetic command for the taking action
    const takeCommand: ValidatedCommand = {
      parsed: {
        rawInput: `take ${entity.name}`,
        action: takingAction.id,
        tokens: [],
        structure: { verb: { tokens: [0], text: 'take', head: 'take' } },
        pattern: 'VERB_NOUN',
        confidence: 1.0
      },
      actionId: takingAction.id,
      directObject: {
        entity,
        parsed: {
          text: entity.name,
          candidates: [entity.name]
        }
      }
    };

    // Create a sub-context for the taking action
    const takeContext = new InternalActionContext(
      this.world,
      this.player,
      this.currentLocation,
      takingAction,
      takeCommand,
      this.scopeResolver
    );

    // Run the taking action's validate phase
    const validation = takingAction.validate(takeContext);
    if (!validation.valid) {
      // Take validation failed - return the error
      return {
        ok: false,
        error: {
          valid: false,
          error: validation.error || 'cannot_take',
          params: validation.params
        }
      };
    }

    // Execute the taking action
    takingAction.execute(takeContext);

    // Get the report events from the taking action
    const takeEvents = takingAction.report ? takingAction.report(takeContext) : [];

    // Create the implicit take event (for "(first taking the X)" message)
    const implicitTakeEvent = this.event('if.event.implicit_take', {
      item: entity.id,
      itemName: entity.name
    });

    // Combine: implicit take notification + actual take events
    const implicitTakeEvents = [implicitTakeEvent, ...takeEvents];

    // Store in sharedData for the report phase to access
    if (!this.sharedData.implicitTakeEvents) {
      this.sharedData.implicitTakeEvents = [];
    }
    this.sharedData.implicitTakeEvents.push(...implicitTakeEvents);

    return {
      ok: true,
      implicitTakeEvents
    };
  }

  /**
   * Get the entity from a command slot.
   */
  private getEntityFromSlot(slot: string): IFEntity | null {
    switch (slot) {
      case 'target':
      case 'directObject':
        return this.command.directObject?.entity ?? null;
      case 'item':
        // 'item' typically refers to the direct object in most contexts
        return this.command.directObject?.entity ?? null;
      case 'container':
      case 'recipient':
      case 'instrument':
      case 'indirectObject':
        return this.command.indirectObject?.entity ?? null;
      default:
        // Try direct object as fallback
        return this.command.directObject?.entity ?? null;
    }
  }

  /**
   * Generate the appropriate scope error based on requirement and actual scope.
   */
  private getScopeError(
    required: ScopeLevel,
    actual: ScopeLevel,
    entity: IFEntity
  ): { valid: false; error: string; params?: Record<string, any> } {
    const params = { item: entity.name };

    // If they don't know about it at all
    if (actual === ScopeLevel.UNAWARE) {
      return { valid: false, error: ScopeErrors.NOT_KNOWN, params };
    }

    // They know about it but can't see it
    if (required >= ScopeLevel.VISIBLE && actual < ScopeLevel.VISIBLE) {
      return { valid: false, error: ScopeErrors.NOT_VISIBLE, params };
    }

    // They can see it but can't reach it
    if (required >= ScopeLevel.REACHABLE && actual < ScopeLevel.REACHABLE) {
      return { valid: false, error: ScopeErrors.NOT_REACHABLE, params };
    }

    // They need to be carrying it but aren't
    if (required >= ScopeLevel.CARRIED && actual < ScopeLevel.CARRIED) {
      return { valid: false, error: ScopeErrors.NOT_CARRIED, params };
    }

    // Generic fallback
    return { valid: false, error: ScopeErrors.OUT_OF_SCOPE, params };
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
    // Special handling for action status events
    // These should NOT be double-wrapped
    if (type === 'action.error' || type === 'action.success' || type === 'action.blocked') {
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
