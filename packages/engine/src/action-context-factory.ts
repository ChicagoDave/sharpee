/**
 * Action Context Factory - Creates ActionContext for action execution
 */

import { ActionContext, Action, ScopeResolver, ValidatedCommand, ScopeLevel, ScopeCheckResult, ScopeErrors, ImplicitTakeResult, takingAction } from '@sharpee/stdlib';
import { WorldModel, IFEntity, TraitType } from '@sharpee/world-model';
import { ISemanticEvent, createSemanticEventSource, createEvent as coreCreateEvent } from '@sharpee/core';
import { GameContext } from './types';

/**
 * Helper to get entity from command slot
 */
function getEntityFromSlot(command: ValidatedCommand, slot: string): IFEntity | null {
  switch (slot) {
    case 'target':
    case 'directObject':
    case 'item':
      return command.directObject?.entity ?? null;
    case 'container':
    case 'recipient':
    case 'instrument':
    case 'indirectObject':
      return command.indirectObject?.entity ?? null;
    default:
      return command.directObject?.entity ?? null;
  }
}

/**
 * Generate appropriate scope error based on requirement and actual scope
 */
function getScopeError(
  required: ScopeLevel,
  actual: ScopeLevel,
  entity: IFEntity
): { valid: false; error: string; params?: Record<string, any> } {
  const params = { item: entity.name };

  if (actual === ScopeLevel.UNAWARE) {
    return { valid: false, error: ScopeErrors.NOT_KNOWN, params };
  }
  if (required >= ScopeLevel.VISIBLE && actual < ScopeLevel.VISIBLE) {
    return { valid: false, error: ScopeErrors.NOT_VISIBLE, params };
  }
  if (required >= ScopeLevel.REACHABLE && actual < ScopeLevel.REACHABLE) {
    return { valid: false, error: ScopeErrors.NOT_REACHABLE, params };
  }
  if (required >= ScopeLevel.CARRIED && actual < ScopeLevel.CARRIED) {
    return { valid: false, error: ScopeErrors.NOT_CARRIED, params };
  }
  return { valid: false, error: ScopeErrors.OUT_OF_SCOPE, params };
}

/**
 * Create an ActionContext for action execution
 */
export function createActionContext(
  world: WorldModel,
  gameContext: GameContext,
  command: ValidatedCommand,
  action: Action,
  scopeResolver: ScopeResolver
): ActionContext {
  const player = gameContext.player;
  const currentLocation = world.getLocation(player.id) 
    ? world.getEntity(world.getLocation(player.id)!) 
    : player;

  // Create event source for this action
  const eventSource = createSemanticEventSource();

  // Create sharedData object separately so it can be referenced in closures
  const sharedData: Record<string, any> = {};

  // Create the event method
  const event = (type: string, data: Record<string, any>): ISemanticEvent => {
    // Add standard entities
    const entities: Record<string, string> = {
      actor: player.id,
      location: currentLocation?.id || player.id
    };

    // Add entities from command
    if (command.directObject?.entity) {
      entities.target = command.directObject.entity.id;
    }
    if (command.indirectObject?.entity) {
      entities.indirect = command.indirectObject.entity.id;
    }

    // Create the event
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data: {
        ...data,
        // Include action context in data instead of metadata
        actionId: action.id,
        turn: gameContext.currentTurn
      },
      entities
    };
  };

  return {
    // World querying
    world,
    player,
    currentLocation: currentLocation!,
    command,
    scopeResolver,
    action,

    // Shared data for passing information between phases
    sharedData,

    // Validation result - set by CommandExecutor after validate() phase
    validationResult: undefined,

    // Scope checking methods (delegate to scopeResolver)
    canSee: (entity: IFEntity) => {
      return scopeResolver.canSee(player, entity);
    },
    
    canReach: (entity: IFEntity) => {
      return scopeResolver.canReach(player, entity);
    },
    
    canTake: (entity: IFEntity) => {
      // Basic implementation - can be enhanced
      return !entity.has('if.trait.scenery') && 
             !entity.has('if.trait.fixed') &&
             entity.type !== 'room' &&
             entity.type !== 'location';
    },
    
    isInScope: (entity: IFEntity) => {
      const level = scopeResolver.getScope(player, entity);
      return level >= ScopeLevel.AWARE;
    },

    getVisible: () => {
      return scopeResolver.getVisible(player);
    },

    getInScope: () => {
      // Get all entities and filter by scope
      const allEntities = world.getAllEntities();
      return allEntities.filter(entity => {
        const level = scopeResolver.getScope(player, entity);
        return level >= ScopeLevel.AWARE;
      });
    },

    // Scope validation methods (Phase 4 parser refactor)
    getEntityScope: (entity: IFEntity): ScopeLevel => {
      return scopeResolver.getScope(player, entity);
    },

    getSlotScope: (slot: string): ScopeLevel => {
      const entity = getEntityFromSlot(command, slot);
      if (!entity) {
        return ScopeLevel.UNAWARE;
      }
      return scopeResolver.getScope(player, entity);
    },

    requireScope: (entity: IFEntity, required: ScopeLevel): ScopeCheckResult => {
      const actualScope = scopeResolver.getScope(player, entity);
      if (actualScope >= required) {
        return { ok: true, actualScope };
      }
      const error = getScopeError(required, actualScope, entity);
      return { ok: false, error, actualScope };
    },

    requireSlotScope: (slot: string, required: ScopeLevel): ScopeCheckResult => {
      const entity = getEntityFromSlot(command, slot);
      if (!entity) {
        return {
          ok: false,
          error: { valid: false, error: 'no_target', params: { slot } }
        };
      }
      const actualScope = scopeResolver.getScope(player, entity);
      if (actualScope >= required) {
        return { ok: true, actualScope };
      }
      const error = getScopeError(required, actualScope, entity);
      return { ok: false, error, actualScope };
    },

    requireCarriedOrImplicitTake: (entity: IFEntity): ImplicitTakeResult => {
      const actualScope = scopeResolver.getScope(player, entity);

      // Case 1: Already carried - success, no implicit take needed
      if (actualScope >= ScopeLevel.CARRIED) {
        return { ok: true };
      }

      // Case 2: Not reachable - can't take it, return scope error
      if (actualScope < ScopeLevel.REACHABLE) {
        const error = getScopeError(ScopeLevel.REACHABLE, actualScope, entity);
        return { ok: false, error };
      }

      // Case 3: Reachable but not carried - attempt implicit take

      // Check if implicit take is disabled at story level (ADR-104)
      if (gameContext.implicitActions?.implicitTake === false) {
        return {
          ok: false,
          error: { valid: false, error: ScopeErrors.NOT_CARRIED, params: { item: entity.name } }
        };
      }

      // Check if implicit take is disabled at action level (ADR-104)
      if (action.allowImplicitTake === false) {
        return {
          ok: false,
          error: { valid: false, error: ScopeErrors.NOT_CARRIED, params: { item: entity.name } }
        };
      }

      // Check if entity can be taken (not scenery, room, door)
      if (entity.has(TraitType.SCENERY) || entity.has(TraitType.ROOM) || entity.has(TraitType.DOOR)) {
        return {
          ok: false,
          error: { valid: false, error: 'fixed_in_place', params: { item: entity.name } }
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
      const takeContext = createActionContext(
        world,
        gameContext,
        takeCommand,
        takingAction,
        scopeResolver
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

      // Filter out action.success events - the implicit_take message replaces them
      // Keep if.event.taken for state tracking
      const filteredTakeEvents = takeEvents.filter(e => e.type !== 'action.success');

      // Create the implicit take event (for "(first taking the X)" message)
      const implicitTakeEvent = coreCreateEvent('if.event.implicit_take', {
        item: entity.id,
        itemName: entity.name
      }, {
        actor: player.id,
        target: entity.id,
        location: currentLocation?.id || player.id
      });

      // Combine: implicit take notification + state change events (no success message)
      const implicitTakeEvents = [implicitTakeEvent, ...filteredTakeEvents];

      // Store in sharedData for the report phase to access
      if (!sharedData.implicitTakeEvents) {
        sharedData.implicitTakeEvents = [];
      }
      sharedData.implicitTakeEvents.push(...implicitTakeEvents);

      return {
        ok: true,
        implicitTakeEvents
      };
    },

    // Event creation
    event
  };
}