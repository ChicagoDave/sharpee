/**
 * Going action - movement through exits
 * 
 * This action handles movement in cardinal directions and through named exits.
 * It validates all conditions and returns appropriate events.
 */

import { Action, EnhancedActionContext } from '../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { TraitType, RoomTrait, OpenableTrait, LockableTrait, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../constants';

export const goingAction: Action = {
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
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const actor = context.player;
    
    // Get the direction from the parsed command
    const direction = context.command.parsed.extras?.direction as string || 
                     context.command.directObject?.entity?.name;
    
    if (!direction) {
      return context.emitError('no_direction');
    }
    
    // Normalize direction
    const normalizedDirection = normalizeDirection(direction);
    
    // Get current room's exits
    const currentRoom = context.currentLocation;
    if (!currentRoom.has(TraitType.ROOM)) {
      // Actor is not in a room (maybe in a container?)
      return context.emitError('not_in_room');
    }
    
    // Get the room trait to access exits
    const roomTrait = currentRoom.get(TraitType.ROOM) as RoomTrait;
    if (!roomTrait || !roomTrait.exits) {
      return context.emitError('no_exits');
    }
    
    // Find the exit in the requested direction
    const exitConfig = roomTrait.exits[normalizedDirection];
    if (!exitConfig) {
      return context.emitError('no_exit_that_way', { direction: normalizedDirection });
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
          return context.emitError('door_locked', { 
            direction: normalizedDirection,
            door: door.name,
            isClosed,
            isLocked
          });
        } else if (isClosed) {
          return context.emitError('door_closed', { 
            direction: normalizedDirection,
            door: door.name,
            isClosed,
            isLocked: false
          });
        }
      }
    }
    
    // Get destination
    const destinationId = exitConfig.destination;
    const destination = context.world.getEntity(destinationId);
    
    if (!destination) {
      // Destination doesn't exist
      return context.emitError('destination_not_found', { direction: normalizedDirection });
    }
    
    // Check if destination is dark and player has no light
    if (isDarkRoom(destination) && !hasLight(actor, context)) {
      return context.emitError('too_dark', { direction: normalizedDirection });
    }
    
    // Build event data
    const eventData: Record<string, unknown> = {
      direction: normalizedDirection,
      fromRoom: currentRoom.id,
      toRoom: destination.id,
      oppositeDirection: getOppositeDirection(normalizedDirection)
    };
    
    // Check if this is the first time entering the destination
    const destRoomTrait = destination.get(TraitType.ROOM) as RoomTrait;
    if (destRoomTrait && !destRoomTrait.visited) {
      eventData.firstVisit = true;
    }
    
    // Create movement events
    const events: SemanticEvent[] = [];
    
    // Actor exits current room
    events.push(context.emit('if.event.actor_exited', {
      actorId: actor.id,
      direction: normalizedDirection,
      toRoom: destination.id
    }));
    
    // Actor moves
    events.push(context.emit('if.event.actor_moved', eventData));
    
    // Actor enters new room
    events.push(context.emit('if.event.actor_entered', {
      actorId: actor.id,
      direction: getOppositeDirection(normalizedDirection),
      fromRoom: currentRoom.id
    }));
    
    // Success message
    const messageParams = {
      direction: normalizedDirection,
      destination: destination.name
    };
    
    let messageId = 'moved_to';
    if (eventData.firstVisit) {
      messageId = 'first_visit';
    }
    
    events.push(...context.emitSuccess(messageId, messageParams));
    
    return events;
  },
  
  group: "movement"
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
function hasLight(actor: IFEntity, context: EnhancedActionContext): boolean {
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
