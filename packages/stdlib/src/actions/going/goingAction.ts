/**
 * Going action executor
 * 
 * Handles movement between rooms
 */

import { ActionExecutor, ParsedCommand } from '../types/command-types';
import { ActionContext } from '../types/action-context';
import { IFActions } from '../../constants/if-actions';
import { IFEvents } from '../../constants/if-events';
import { ActionFailureReason } from '../../constants/action-failure-reason';
import { createEvent, SemanticEvent } from '../../core-imports';
import { TraitType, RoomBehavior, OpenableBehavior, LockableBehavior, DoorBehavior } from '@sharpee/world-model';

/**
 * Direction type for movement
 */
type Direction = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 
                 'southeast' | 'southwest' | 'up' | 'down' | 'in' | 'out';

/**
 * Map short directions to full names
 */
const DIRECTION_MAP: Record<string, Direction> = {
  'n': 'north', 's': 'south', 'e': 'east', 'w': 'west',
  'ne': 'northeast', 'nw': 'northwest', 'se': 'southeast', 'sw': 'southwest',
  'u': 'up', 'd': 'down',
  // Full names map to themselves
  'north': 'north', 'south': 'south', 'east': 'east', 'west': 'west',
  'northeast': 'northeast', 'northwest': 'northwest', 
  'southeast': 'southeast', 'southwest': 'southwest',
  'up': 'up', 'down': 'down', 'in': 'in', 'out': 'out'
};

/**
 * Get the opposite direction
 */
function getOppositeDirection(direction: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    'north': 'south', 'south': 'north',
    'east': 'west', 'west': 'east',
    'northeast': 'southwest', 'southwest': 'northeast',
    'northwest': 'southeast', 'southeast': 'northwest',
    'up': 'down', 'down': 'up',
    'in': 'out', 'out': 'in'
  };
  return opposites[direction];
}

/**
 * Executor for the going action
 */
export const goingAction: ActionExecutor = {
  id: IFActions.GOING,
  
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[] {
    const { actor, parseContext } = command;
    
    // Get current location
    const currentLocation = context.world.getLocation(actor.id);
    if (!currentLocation) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.GOING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: 'Actor has no location'
        },
        { actor: actor.id }
      )];
    }
    
    const currentRoom = context.world.getEntity(currentLocation);
    if (!currentRoom || !currentRoom.has(TraitType.ROOM)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.GOING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: 'Not in a valid room'
        },
        { actor: actor.id }
      )];
    }
    

    
    // Determine what direction/destination was specified
    let destination = command.noun;
    let direction: Direction | undefined;
    let throughDoor: typeof destination | undefined;
    
    // Check if we have a direction word
    const directionText = parseContext.noun || parseContext.rawInput;
    if (directionText && DIRECTION_MAP[directionText.toLowerCase()]) {
      direction = DIRECTION_MAP[directionText.toLowerCase()];
      
      // Find the exit in that direction
      const exitId = RoomBehavior.getExit(currentRoom, direction);
      if (!exitId) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.GOING,
            reason: ActionFailureReason.NO_EXIT_THAT_WAY,
            direction
          },
          { actor: actor.id, location: currentLocation }
        )];
      }
      
      // Check if exit is a door or a room
      const exitEntity = context.world.getEntity(exitId);
      if (!exitEntity) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.GOING,
            reason: ActionFailureReason.CANT_GO_THAT_WAY,
            direction
          },
          { actor: actor.id, location: currentLocation }
        )];
      }
      
      if (exitEntity.has(TraitType.DOOR)) {
        throughDoor = exitEntity;
        // Get the room on the other side of the door
        const otherRoom = DoorBehavior.getOtherRoom(exitEntity, currentLocation);
        if (!otherRoom) {
          return [createEvent(
            IFEvents.ACTION_FAILED,
            {
              action: IFActions.GOING,
              reason: ActionFailureReason.CANT_GO_THAT_WAY,
              direction
            },
            { actor: actor.id, location: currentLocation }
          )];
        }
        const otherRoomEntity = context.world.getEntity(otherRoom);
        if (!otherRoomEntity) {
          return [createEvent(
            IFEvents.ACTION_FAILED,
            {
              action: IFActions.GOING,
              reason: ActionFailureReason.CANT_GO_THAT_WAY,
              direction
            },
            { actor: actor.id, location: currentLocation }
          )];
        }
        destination = otherRoomEntity;
      } else {
        destination = exitEntity;
      }
    } else if (destination) {
      // Direct room/door reference
      if (destination.has(TraitType.DOOR)) {
        throughDoor = destination;
        // Get the room on the other side of the door
        const otherRoom = DoorBehavior.getOtherRoom(destination, currentLocation);
        if (!otherRoom) {
          return [createEvent(
            IFEvents.ACTION_FAILED,
            {
              action: IFActions.GOING,
              reason: ActionFailureReason.CANT_GO_THAT_WAY
            },
            { actor: actor.id, location: currentLocation }
          )];
        }
        const otherRoomEntity = context.world.getEntity(otherRoom);
        if (!otherRoomEntity) {
          return [createEvent(
            IFEvents.ACTION_FAILED,
            {
              action: IFActions.GOING,
              reason: ActionFailureReason.CANT_GO_THAT_WAY
            },
            { actor: actor.id, location: currentLocation }
          )];
        }
        destination = otherRoomEntity;
      }
    }
    
    // Validate destination
    if (!destination) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.GOING,
          reason: ActionFailureReason.CANT_GO_THAT_WAY
        },
        { actor: actor.id, location: currentLocation }
      )];
    }
    
    if (!destination.has(TraitType.ROOM)) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.GOING,
          reason: ActionFailureReason.CANT_GO_THAT_WAY
        },
        { actor: actor.id, target: destination.id, location: currentLocation }
      )];
    }
    
    // Check door state if going through one
    if (throughDoor) {
      if (throughDoor.has(TraitType.OPENABLE)) {
        if (!OpenableBehavior.isOpen(throughDoor)) {
          // Check if locked
          if (throughDoor.has(TraitType.LOCKABLE)) {
            if (LockableBehavior.isLocked(throughDoor)) {
              return [createEvent(
                IFEvents.ACTION_FAILED,
                {
                  action: IFActions.GOING,
                  reason: ActionFailureReason.DOOR_LOCKED,
                  door: throughDoor.id
                },
                { actor: actor.id, target: throughDoor.id, location: currentLocation }
              )];
            }
          }
          return [createEvent(
            IFEvents.ACTION_FAILED,
            {
              action: IFActions.GOING,
              reason: ActionFailureReason.DOOR_CLOSED,
              door: throughDoor.id
            },
            { actor: actor.id, target: throughDoor.id, location: currentLocation }
          )];
        }
      }
      
      // Check if door is visible
      if (!context.canSee(throughDoor)) {
        return [createEvent(
          IFEvents.ACTION_FAILED,
          {
            action: IFActions.GOING,
            reason: ActionFailureReason.NOT_VISIBLE
          },
          { actor: actor.id, target: throughDoor.id, location: currentLocation }
        )];
      }
    }
    
    // Perform the movement
    try {
      context.world.moveEntity(actor.id, destination.id);
      
      // Create movement event with semantic data
      const eventData: Record<string, unknown> = {
        direction
      };
      
      if (throughDoor) {
        eventData.throughDoor = throughDoor.id;
        
        // Record door usage
        DoorBehavior.recordPassage(throughDoor, currentLocation);
      }
      
      // Return success events
      const events: SemanticEvent[] = [];
      
      // Exit event for current room
      events.push(createEvent(
        IFEvents.PLAYER_EXITED,
        {
          toRoom: destination.id,
          direction
        },
        { actor: actor.id, location: currentLocation }
      ));
      
      // Movement event
      events.push(createEvent(
        IFEvents.PLAYER_MOVED,
        eventData,
        { actor: actor.id, location: destination.id }
      ));
      
      // Enter event for new room
      events.push(createEvent(
        IFEvents.PLAYER_ENTERED,
        {
          fromRoom: currentLocation,
          fromDirection: direction ? getOppositeDirection(direction) : undefined
        },
        { actor: actor.id, location: destination.id }
      ));
      
      // Trigger room description
      events.push(createEvent(
        IFEvents.ROOM_DESCRIBED,
        {
          brief: RoomBehavior.hasVisited(destination, actor.id)
        },
        { location: destination.id }
      ));
      
      return events;
      
    } catch (error) {
      return [createEvent(
        IFEvents.ACTION_FAILED,
        {
          action: IFActions.GOING,
          reason: ActionFailureReason.CANT_DO_THAT,
          error: error instanceof Error ? error.message : 'Failed to move'
        },
        { actor: actor.id, location: currentLocation }
      )];
    }
  }
};