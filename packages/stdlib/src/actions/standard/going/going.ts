/**
 * Going action - movement through exits
 * 
 * This action handles movement in cardinal directions and through named exits.
 * It validates all conditions and returns appropriate events.
 * 
 * UPDATED: Uses new simplified context.event() method (ADR-041)
 * MIGRATED: To new folder structure with typed events (ADR-042)
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, RoomTrait, OpenableTrait, LockableTrait, IFEntity } from '@sharpee/world-model';
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
  
  execute(context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    
    // Get the direction from the parsed command
    const direction = context.command.parsed.extras?.direction as string || 
                     context.command.directObject?.entity?.name;
    
    if (!direction) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_direction',
        reason: 'no_direction'
      })];
    }
    
    // Normalize direction
    const normalizedDirection = normalizeDirection(direction);
    
    // Check if player is contained (can't move through exits while contained)
    const playerDirectLocation = context.world.getLocation(actor.id);
    const currentRoom = context.currentLocation; // This is always the containing room
    
    if (playerDirectLocation !== currentRoom.id) {
      // Player is inside something (container/supporter) - can't use room exits
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_in_room',
        reason: 'not_in_room'
      })];
    }
    
    if (!currentRoom.has(TraitType.ROOM)) {
      // Shouldn't happen since currentLocation should always be a room
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'not_in_room',
        reason: 'not_in_room'
      })];
    }
    
    // Get the room trait to access exits
    const roomTrait = currentRoom.get(TraitType.ROOM) as RoomTrait;
    if (!roomTrait || !roomTrait.exits) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_exits',
        reason: 'no_exits'
      })];
    }
    
    // Find the exit in the requested direction
    const exitConfig = roomTrait.exits[normalizedDirection];
    if (!exitConfig) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'no_exit_that_way',
        reason: 'no_exit_that_way',
        params: { direction: normalizedDirection }
      })];
    }
    
    // Check if there's a door/portal
    if (exitConfig.via) {
      const door = context.world.getEntity(exitConfig.via);
      if (door) {
        let isClosed = false;
        let isLocked = false;
        
        // Check if door is open
        if (door.has(TraitType.OPENABLE)) {
          const openableTrait = door.get(TraitType.OPENABLE) as OpenableTrait;
          if (openableTrait && !openableTrait.isOpen) {
            isClosed = true;
          }
        }
        
        // Check if door is locked
        if (door.has(TraitType.LOCKABLE)) {
          const lockableTrait = door.get(TraitType.LOCKABLE) as LockableTrait;
          if (lockableTrait && lockableTrait.isLocked) {
            isLocked = true;
          }
        }
        
        // Report the door state - let text service decide how to describe it
        if (isLocked) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'door_locked',
        reason: 'door_locked',
        params: { 
              direction: normalizedDirection,
              door: door.name,
              isClosed,
              isLocked
            }
      })];
        } else if (isClosed) {
          return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'door_closed',
        reason: 'door_closed',
        params: { 
          direction: normalizedDirection,
          door: door.name
        }
      })];
        }
      }
    }
    
    // Get destination
    const destinationId = exitConfig.destination;
    const destination = context.world.getEntity(destinationId);
    
    if (!destination) {
      // Destination doesn't exist
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'destination_not_found',
        reason: 'destination_not_found',
        params: { direction: normalizedDirection }
      })];
    }
    
    // Check if destination is dark and player has no light
    if (isDarkRoom(destination) && !hasLight(actor, context)) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'too_dark',
        reason: 'too_dark',
        params: { direction: normalizedDirection }
      })];
    }
    
    // Build typed event data
    const movedData: ActorMovedEventData = {
      direction: normalizedDirection,
      fromRoom: currentRoom.id,
      toRoom: destination.id,
      oppositeDirection: getOppositeDirection(normalizedDirection)
    };
    
    // Check if this is the first time entering the destination
    const destRoomTrait = destination.get(TraitType.ROOM) as RoomTrait;
    if (destRoomTrait && !destRoomTrait.visited) {
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
    
    // Mark the destination room as visited
    if (destRoomTrait && !destRoomTrait.visited) {
      destRoomTrait.visited = true;
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
 * Check if actor has a light source
 */
function hasLight(actor: IFEntity, context: ActionContext): boolean {
  // Check if actor itself provides light
  if (actor.has(TraitType.LIGHT_SOURCE)) {
    const lightTrait = actor.get(TraitType.LIGHT_SOURCE);
    if (lightTrait && (lightTrait as any).isLit) {
      return true;
    }
  }
  
  // Check carried items
  const carried = context.world.getContents(actor.id);
  for (const item of carried) {
    if (item.has(TraitType.LIGHT_SOURCE)) {
      const lightTrait = item.get(TraitType.LIGHT_SOURCE);
      if (lightTrait && (lightTrait as any).isLit) {
        return true;
      }
    }
  }
  
  return false;
}
