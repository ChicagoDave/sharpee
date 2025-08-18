/**
 * Going action - movement through exits
 * 
 * This action handles movement in cardinal directions and through named exits.
 * It validates all conditions and returns appropriate events.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 * MIGRATED: To new folder structure with typed events (ADR-042)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { 
  TraitType, 
  RoomTrait, 
  IFEntity, 
  RoomBehavior, 
  OpenableBehavior, 
  LockableBehavior,
  VisibilityBehavior,
  LightSourceBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

// Import our typed event data
import { 
  ActorMovedEventData, 
  ActorExitedEventData, 
  ActorEnteredEventData,
  GoingErrorData 
} from './going-events';

export const goingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.GOING,
  requiredMessages: [
    'no_direction',
    'not_in_room',
    'no_exits',
    'no_exit_that_way',
    'movement_blocked',
    'door_closed',
    'door_locked',
    'destination_not_found',
    'moved',
    'moved_to',
    'first_visit',
    'too_dark',
    'need_light'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    
    // Get the direction from the parsed command
    const direction = context.command.parsed.extras?.direction as string || 
                     context.command.directObject?.entity?.name;
    
    if (!direction) {
      return { 
        valid: false, 
        error: 'no_direction'
      };
    }
    
    // Normalize direction
    const normalizedDirection = normalizeDirection(direction);
    
    // Check if player is contained (can't move through exits while contained)
    const playerDirectLocation = context.world.getLocation(actor.id);
    const currentRoom = context.currentLocation; // This is always the containing room
    
    if (playerDirectLocation !== currentRoom.id) {
      // Player is inside something (container/supporter) - can't use room exits
      return { 
        valid: false, 
        error: 'not_in_room'
      };
    }
    
    if (!currentRoom.has(TraitType.ROOM)) {
      // Shouldn't happen since currentLocation should always be a room
      return { 
        valid: false, 
        error: 'not_in_room'
      };
    }
    
    // Use RoomBehavior to get exit information
    const exitConfig = RoomBehavior.getExit(currentRoom, normalizedDirection);
    if (!exitConfig) {
      // Check if we have exits at all
      const allExits = RoomBehavior.getAllExits(currentRoom);
      if (allExits.size === 0) {
        return { 
          valid: false, 
          error: 'no_exits'
        };
      }
      return { 
        valid: false, 
        error: 'no_exit_that_way',
        params: { direction: normalizedDirection }
      };
    }
    
    // Check if exit is blocked
    if (RoomBehavior.isExitBlocked(currentRoom, normalizedDirection)) {
      const blockedMessage = RoomBehavior.getBlockedMessage(currentRoom, normalizedDirection);
      return { 
        valid: false, 
        error: 'movement_blocked',
        params: { direction: normalizedDirection }
      };
    }
    
    // Check if there's a door/portal
    if (exitConfig.via) {
      const door = context.world.getEntity(exitConfig.via);
      if (door) {
        // Use behaviors to check door state
        const isLocked = door.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(door);
        const isClosed = door.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(door);
        
        if (isLocked) {
          return { 
            valid: false, 
            error: 'door_locked',
            params: { 
              door: door.name, 
              direction: normalizedDirection,
              isClosed: isClosed,
              isLocked: true
            }
          };
        }
        
        if (isClosed) {
          return { 
            valid: false, 
            error: 'door_closed',
            params: { door: door.name, direction: normalizedDirection }
          };
        }
      }
    }
    
    // Get destination
    const destinationId = exitConfig.destination;
    const destination = context.world.getEntity(destinationId);
    
    if (!destination) {
      // Destination doesn't exist
      return { 
        valid: false, 
        error: 'destination_not_found',
        params: { direction: normalizedDirection }
      };
    }
    
    // Check if destination is dark and player has no light
    if (isDarkRoom(destination) && !hasLightInRoom(actor, context)) {
      return { 
        valid: false, 
        error: 'too_dark',
        params: { direction: normalizedDirection }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    // Validate first
    const validation = this.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: validation.error!,
        reason: validation.error!,
        params: validation.params || {}
      })];
    }
    
    const actor = context.player;
    const currentRoom = context.currentLocation;
    
    // Get and normalize direction
    const direction = context.command.parsed.extras?.direction as string || 
                     context.command.directObject?.entity?.name;
    const normalizedDirection = normalizeDirection(direction!);
    
    // Get exit info and destination using behaviors
    const exitConfig = RoomBehavior.getExit(currentRoom, normalizedDirection)!;
    const destination = context.world.getEntity(exitConfig.destination)!
    
    // Build typed event data
    const movedData: ActorMovedEventData = {
      direction: normalizedDirection,
      fromRoom: currentRoom.id,
      toRoom: destination.id,
      oppositeDirection: getOppositeDirection(normalizedDirection)
    };
    
    // Check if this is the first time entering the destination using behavior
    const isFirstVisit = !RoomBehavior.hasBeenVisited(destination);
    if (isFirstVisit) {
      movedData.firstVisit = true;
    }
    
    // Create typed exit event
    const exitedData: ActorExitedEventData = {
      actorId: actor.id,
      direction: normalizedDirection,
      toRoom: destination.id
    };
    
    // Create typed entrance event
    const enteredData: ActorEnteredEventData = {
      actorId: actor.id,
      direction: getOppositeDirection(normalizedDirection),
      fromRoom: currentRoom.id
    };
    
    // Actually move the player!
    context.world.moveEntity(actor.id, destination.id);
    
    // Mark the destination room as visited using behavior
    if (isFirstVisit) {
      RoomBehavior.markVisited(destination, actor);
    }
    
    // Success message parameters
    const messageParams = {
      direction: normalizedDirection,
      destination: destination.name
    };
    
    let messageId = 'moved_to';
    if (movedData.firstVisit) {
      messageId = 'first_visit';
    }
    
    // Return all movement events
    return [
      context.event('if.event.actor_exited', exitedData),
      context.event('if.event.actor_moved', movedData),
      context.event('if.event.actor_entered', enteredData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: messageParams
      })
    ];
  },
  
  group: "movement",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  }
};

/**
 * Normalize direction input to standard form
 */
function normalizeDirection(direction: string): string {
  const normalized = direction.toLowerCase().trim();
  
  // Handle abbreviations
  const abbreviations: Record<string, string> = {
    'n': 'north',
    's': 'south',
    'e': 'east',
    'w': 'west',
    'ne': 'northeast',
    'nw': 'northwest',
    'se': 'southeast',
    'sw': 'southwest',
    'u': 'up',
    'd': 'down',
    'in': 'inside',
    'out': 'outside'
  };
  
  return abbreviations[normalized] || normalized;
}

/**
 * Get the opposite direction for arrival messages
 */
function getOppositeDirection(direction: string): string {
  const opposites: Record<string, string> = {
    'north': 'south',
    'south': 'north',
    'east': 'west',
    'west': 'east',
    'northeast': 'southwest',
    'northwest': 'southeast',
    'southeast': 'northwest',
    'southwest': 'northeast',
    'up': 'down',
    'down': 'up',
    'inside': 'outside',
    'outside': 'inside'
  };
  
  return opposites[direction] || direction;
}

/**
 * Check if a room is dark
 */
function isDarkRoom(room: IFEntity): boolean {
  if (!room.has(TraitType.ROOM)) return false;
  
  const roomTrait = room.get(TraitType.ROOM) as RoomTrait;
  return roomTrait.isDark || false;
}

/**
 * Check if actor has light in current room
 */
function hasLightInRoom(actor: IFEntity, context: ActionContext): boolean {
  // Check if actor itself provides light using behavior
  if (actor.has(TraitType.LIGHT_SOURCE) && LightSourceBehavior.isLit(actor)) {
    return true;
  }
  
  // Check carried items for lit light sources
  const carried = context.world.getContents(actor.id);
  for (const item of carried) {
    if (item.has(TraitType.LIGHT_SOURCE) && LightSourceBehavior.isLit(item)) {
      return true;
    }
  }
  
  return false;
}
