/**
 * Going action - movement through exits
 * 
 * This action handles movement in cardinal directions and through named exits.
 * It validates all conditions and returns appropriate events.
 */

import { ActionExecutor, ActionContext, createEvent, SemanticEvent, ValidatedCommand } from '../core';
import { IFActions } from '../core/constants';
import { IFEvents, TraitType, RoomTrait, OpenableTrait, LockableTrait, IFEntity } from '@sharpee/world-model';

export const goingAction: ActionExecutor = {
  id: IFActions.GOING,
  aliases: ['go', 'walk', 'move'],
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const actor = context.player;
    
    // Get the direction from the parsed command
    const direction = command.parsed.extras?.direction as string || command.parsed.directObject?.text;
    
    if (!direction) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.GOING,
        reason: 'no_direction'
      }, {
        actor: actor.id
      })];
    }
    
    // Normalize direction
    const normalizedDirection = normalizeDirection(direction);
    
    // Get current room's exits
    const currentRoom = context.currentLocation;
    if (!currentRoom.has(TraitType.ROOM)) {
      // Actor is not in a room (maybe in a container?)
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.GOING,
        reason: 'not_in_room'
      }, {
        actor: actor.id,
        location: currentRoom.id
      })];
    }
    
    // Get the room trait to access exits
    const roomTrait = currentRoom.get(TraitType.ROOM) as { exits?: Record<string, any> };
    if (!roomTrait || !roomTrait.exits) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.GOING,
        reason: 'no_exits'
      }, {
        actor: actor.id,
        location: currentRoom.id
      })];
    }
    
    // Find the exit in the requested direction
    const exitConfig = roomTrait.exits[normalizedDirection];
    if (!exitConfig) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.GOING,
        reason: 'no_exit_that_way',
        direction: normalizedDirection
      }, {
        actor: actor.id,
        location: currentRoom.id
      })];
    }
    
    // Check if exit is visible
    if (exitConfig.hidden) {
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.GOING,
        reason: 'no_exit_that_way',
        direction: normalizedDirection
      }, {
        actor: actor.id,
        location: currentRoom.id
      })];
    }
    
    // Check if exit is blocked
    if (exitConfig.blocked) {
      return [createEvent(IFEvents.MOVEMENT_BLOCKED, {
        direction: normalizedDirection,
        reason: exitConfig.blockedReason || 'blocked'
      }, {
        actor: actor.id,
        location: currentRoom.id
      })];
    }
    
    // Check if there's a door
    if (exitConfig.door) {
      const door = context.world.getEntity(exitConfig.door);
      if (door) {
        // Check if door is open
        if (door.has(TraitType.OPENABLE)) {
          const openableTrait = door.get(TraitType.OPENABLE) as OpenableTrait;
          if (openableTrait && !openableTrait.isOpen) {
            return [createEvent(IFEvents.ACTION_FAILED, {
              action: IFActions.GOING,
              reason: 'door_closed',
              direction: normalizedDirection,
              door: door.id
            }, {
              actor: actor.id,
              location: currentRoom.id
            })];
          }
        }
        
        // Check if door is locked
        if (door.has(TraitType.LOCKABLE)) {
          const lockableTrait = door.get(TraitType.LOCKABLE) as LockableTrait;
          if (lockableTrait && lockableTrait.isLocked) {
            return [createEvent(IFEvents.ACTION_FAILED, {
              action: IFActions.GOING,
              reason: 'door_locked',
              direction: normalizedDirection,
              door: door.id
            }, {
              actor: actor.id,
              location: currentRoom.id
            })];
          }
        }
      }
    }
    
    // Get destination
    const destinationId = exitConfig.to;
    const destination = context.world.getEntity(destinationId);
    
    if (!destination) {
      // Destination doesn't exist
      return [createEvent(IFEvents.ACTION_FAILED, {
        action: IFActions.GOING,
        reason: 'destination_not_found',
        direction: normalizedDirection
      }, {
        actor: actor.id,
        location: currentRoom.id
      })];
    }
    
    // Check if destination is dark (this would be better as a behavior method)
    // For now, check if room has a darkness/light property
    // TODO: Implement proper darkness checking via RoomBehavior
    
    // Build event data
    const eventData: Record<string, unknown> = {
      direction: normalizedDirection,
      fromRoom: currentRoom.id,
      toRoom: destination.id
    };
    
    // Check if this is the first time entering the destination
    const destRoomTrait = destination.get(TraitType.ROOM) as { visited?: boolean };
    if (destRoomTrait && !destRoomTrait.visited) {
      eventData.firstVisit = true;
    }
    
    // Create movement events
    const events: SemanticEvent[] = [];
    
    // Actor exits current room
    events.push(createEvent(IFEvents.ACTOR_EXITED, {
      direction: normalizedDirection,
      toRoom: destination.id
    }, {
      actor: actor.id,
      location: currentRoom.id
    }));
    
    // Actor moves
    events.push(createEvent(IFEvents.ACTOR_MOVED, eventData, {
      actor: actor.id,
      location: destination.id
    }));
    
    // Actor enters new room
    events.push(createEvent(IFEvents.ACTOR_ENTERED, {
      direction: getOppositeDirection(normalizedDirection),
      fromRoom: currentRoom.id
    }, {
      actor: actor.id,
      location: destination.id
    }));
    
    return events;
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
 * Check if actor has a light source
 */
function checkForLight(actor: IFEntity, context: ActionContext): boolean {
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
