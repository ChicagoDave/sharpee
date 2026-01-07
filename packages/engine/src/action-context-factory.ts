/**
 * Action Context Factory - Creates ActionContext for action execution
 */

import { ActionContext, Action, ScopeResolver, ValidatedCommand, ScopeLevel } from '@sharpee/stdlib';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { ISemanticEvent, createSemanticEventSource } from '@sharpee/core';
import { GameContext } from './types';

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
    sharedData: {},

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
      return level !== ScopeLevel.OUT_OF_SCOPE;
    },
    
    getVisible: () => {
      return scopeResolver.getVisible(player);
    },
    
    getInScope: () => {
      // Get all entities and filter by scope
      const allEntities = world.getAllEntities();
      return allEntities.filter(entity => {
        const level = scopeResolver.getScope(player, entity);
        return level !== ScopeLevel.OUT_OF_SCOPE;
      });
    },

    // Event creation
    event
  };
}