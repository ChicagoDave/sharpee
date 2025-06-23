/**
 * Example: Service-Based Action Implementation
 * 
 * This example shows how to implement an action using the service layer
 * instead of direct world/behavior manipulation.
 */

import { BaseActionExecutor } from '../actions/types/base-action-executor';
import { ParsedCommand } from '../actions/types/command-types';
import { ActionContext } from '../actions/types/enhanced-action-context';
import { SemanticEvent, createEvent } from '@sharpee/core';
import { ActionFailureReason } from '../constants/action-failure-reason';
import { IFEvents } from '../constants/if-events';
import { TraitType, Direction } from '@sharpee/world-model';

/**
 * Example: Going Action using services
 * 
 * This shows the difference between the old approach (direct behavior calls)
 * and the new approach (using services for orchestration)
 */
export class GoingActionExecutor extends BaseActionExecutor {
  id = 'GOING';
  
  protected validate(command: ParsedCommand, context: ActionContext): true | ActionFailureReason {
    const { noun } = command;
    
    // Must have a direction
    if (!noun) {
      return ActionFailureReason.INVALID_TARGET;
    }
    
    // Parse direction
    const direction = this.parseDirection(noun);
    if (!direction) {
      return ActionFailureReason.UNKNOWN_VERB;
    }
    
    // Use movement service to check if we can move
    const currentLocation = context.world.getLocation(context.player.id);
    if (!currentLocation) {
      return ActionFailureReason.CANT_DO_THAT;
    }
    
    const currentRoom = context.world.getEntity(currentLocation);
    if (!currentRoom) {
      return ActionFailureReason.CANT_DO_THAT;
    }
    
    // Service handles all the complex checks (doors, locks, etc.)
    const canMove = context.services.movement.canMove(context.player, direction);
    if (canMove !== true) {
      // canMove returns a string reason if not possible
      return ActionFailureReason.CANT_GO_THAT_WAY;
    }
    
    return true;
  }
  
  protected doExecute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const direction = this.parseDirection(command.noun!);
    const events: SemanticEvent[] = [];
    
    // Get current and destination rooms
    const currentLocationId = context.world.getLocation(context.player.id);
    const currentRoom = context.world.getEntity(currentLocationId!);
    
    // Use movement service to get destination
    const destination = context.services.movement.getDestination(currentRoom!, direction!);
    if (!destination) {
      return [context.fail(ActionFailureReason.CANT_GO_THAT_WAY)];
    }
    
    // Use movement service to actually move
    const moved = context.services.movement.moveEntity(context.player, destination);
    if (!moved) {
      return [context.fail(ActionFailureReason.CANT_DO_THAT)];
    }
    
    // Create movement event
    events.push(createEvent(
      IFEvents.ENTITY_MOVED,
      {
        from: currentLocationId,
        to: destination.id,
        direction: direction
      },
      { actor: context.player.id }
    ));
    
    // Use room service to get new room description
    if (destination.has(TraitType.ROOM)) {
      const description = context.services.room.getFullDescription(destination, context.player);
      
      events.push(createEvent(
        IFEvents.ROOM_DESCRIBED,
        { description },
        { actor: context.player.id, target: destination.id }
      ));
    }
    
    return events;
  }
  
  private parseDirection(input: string): Direction | null {
    // Simple direction parsing
    const directionMap: Record<string, Direction> = {
      'north': 'north',
      'n': 'north',
      'south': 'south',
      's': 'south',
      'east': 'east',
      'e': 'east',
      'west': 'west',
      'w': 'west',
      'up': 'up',
      'u': 'up',
      'down': 'down',
      'd': 'down',
      'northeast': 'northeast',
      'ne': 'northeast',
      'northwest': 'northwest',
      'nw': 'northwest',
      'southeast': 'southeast',
      'se': 'southeast',
      'southwest': 'southwest',
      'sw': 'southwest'
    };
    
    return directionMap[input.toLowerCase()] || null;
  }
}

/**
 * Benefits of the service-based approach:
 * 
 * 1. **Separation of Concerns**: Actions focus on high-level flow,
 *    services handle the complex logic
 * 
 * 2. **Reusability**: Services can be used by multiple actions
 *    (e.g., MovementService used by GO, ENTER, EXIT, FOLLOW)
 * 
 * 3. **Testability**: Services can be tested independently
 * 
 * 4. **Consistency**: All movement logic in one place
 * 
 * 5. **Extensibility**: Easy to add new features to services
 *    without changing all actions
 */
