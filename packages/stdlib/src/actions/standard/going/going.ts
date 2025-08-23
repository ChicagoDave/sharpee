/**
 * Going action - movement through exits
 * 
 * This action handles movement in cardinal directions and through named exits.
 * It validates all conditions and returns appropriate events.
 * 
 * Uses three-phase pattern:
 * 1. validate: Check exit exists, door state, destination availability
 * 2. execute: Move the actor and mark room visited
 * 3. report: Generate events with before/after room snapshots
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
import { captureRoomSnapshot, captureEntitySnapshot } from '../../base/snapshot-utils';

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
  
  execute(context: ActionContext): void {
    // Only perform the movement mutation
    const actor = context.player;
    const currentRoom = context.currentLocation;
    
    // Get and normalize direction
    const direction = context.command.parsed.extras?.direction as string || 
                     context.command.directObject?.entity?.name;
    const normalizedDirection = normalizeDirection(direction!);
    
    // Get exit info and destination using behaviors
    const exitConfig = RoomBehavior.getExit(currentRoom, normalizedDirection)!;
    const destination = context.world.getEntity(exitConfig.destination)!
    
    // Check if this is the first time entering the destination
    const isFirstVisit = !RoomBehavior.hasBeenVisited(destination);
    
    // Actually move the player!
    context.world.moveEntity(actor.id, destination.id);
    
    // Mark the destination room as visited
    if (isFirstVisit) {
      RoomBehavior.markVisited(destination, actor);
    }
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    const actor = context.player;
    
    // Get and normalize direction
    const direction = context.command.parsed.extras?.direction as string || 
                     context.command.directObject?.entity?.name;
    const normalizedDirection = normalizeDirection(direction!);
    
    // Get the source room (where we came from)
    // We need to get this from the exit config since we've already moved
    const currentRoom = context.currentLocation; // This is now the destination
    const allEntities = context.world.getAllEntities();
    const allRooms = allEntities.filter(e => e.has(TraitType.ROOM));
    
    // Find the room that has an exit leading to our current location
    let sourceRoom: IFEntity | null = null;
    const oppositeDir = getOppositeDirection(normalizedDirection);
    
    for (const room of allRooms) {
      const exitConfig = RoomBehavior.getExit(room, normalizedDirection);
      if (exitConfig && exitConfig.destination === currentRoom.id) {
        sourceRoom = room;
        break;
      }
    }
    
    // If we can't find source room, use the current room as a fallback
    if (!sourceRoom) {
      sourceRoom = currentRoom;
    }
    
    // Capture room snapshots for atomic events
    const sourceSnapshot = captureRoomSnapshot(sourceRoom, context.world, false);
    const destinationSnapshot = captureRoomSnapshot(currentRoom, context.world, false);
    const actorSnapshot = captureEntitySnapshot(actor, context.world, false);
    
    // Build typed event data with both new and backward-compatible fields
    const movedData: ActorMovedEventData = {
      // New atomic structure
      actor: actorSnapshot,
      sourceRoom: sourceSnapshot,
      destinationRoom: destinationSnapshot,
      // Backward compatibility
      direction: normalizedDirection,
      fromRoom: sourceRoom.id,
      toRoom: currentRoom.id,
      oppositeDirection: oppositeDir
    };
    
    // Check if this was the first visit
    const roomTrait = currentRoom.get(TraitType.ROOM) as any;
    if (roomTrait?.visited) {
      movedData.firstVisit = false;
    } else {
      movedData.firstVisit = true;
    }
    
    // Create typed exit event
    const exitedData: ActorExitedEventData = {
      actorId: actor.id,
      direction: normalizedDirection,
      toRoom: currentRoom.id
    };
    
    // Create typed entrance event
    const enteredData: ActorEnteredEventData = {
      actorId: actor.id,
      direction: oppositeDir,
      fromRoom: sourceRoom.id
    };
    
    // Success message parameters
    const messageParams = {
      direction: normalizedDirection,
      destination: currentRoom.name
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
