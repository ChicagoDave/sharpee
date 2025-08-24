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
  LightSourceBehavior,
  Direction
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { buildEventData } from '../../data-builder-types';

// Import our data builders
import {
  actorMovedDataConfig,
  actorExitedDataConfig,
  actorEnteredDataConfig,
  determineGoingMessage
} from './going-data';

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
    
    // Get the direction from the parsed command (should already be a Direction constant)
    const direction = context.command.parsed.extras?.direction as Direction;
    
    if (!direction) {
      return { 
        valid: false, 
        error: 'no_direction'
      };
    }
    
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
    const exitConfig = RoomBehavior.getExit(currentRoom, direction);
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
        params: { direction: direction }
      };
    }
    
    // Check if exit is blocked
    if (RoomBehavior.isExitBlocked(currentRoom, direction)) {
      const blockedMessage = RoomBehavior.getBlockedMessage(currentRoom, direction);
      return { 
        valid: false, 
        error: 'movement_blocked',
        params: { direction: direction }
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
              direction: direction,
              isClosed: isClosed,
              isLocked: true
            }
          };
        }
        
        if (isClosed) {
          return { 
            valid: false, 
            error: 'door_closed',
            params: { door: door.name, direction: direction }
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
        params: { direction: direction }
      };
    }
    
    // Check if destination is dark and player has no light
    if (isDarkRoom(destination) && !hasLightInRoom(actor, context)) {
      return { 
        valid: false, 
        error: 'too_dark',
        params: { direction: direction }
      };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Only perform the movement mutation
    const actor = context.player;
    const currentRoom = context.currentLocation;
    
    // Get direction from parsed command (should already be a Direction constant)
    const direction = context.command.parsed.extras?.direction as Direction;
    
    // Get exit info and destination using behaviors
    const exitConfig = RoomBehavior.getExit(currentRoom, direction)!;
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
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation errors
    if (validationResult && !validationResult.valid) {
      // Capture entity data for validation errors
      const errorParams = { ...(validationResult.params || {}) };
      
      // Add entity snapshots if entities are available
      if (context.command.directObject?.entity) {
        errorParams.targetSnapshot = captureEntitySnapshot(
          context.command.directObject.entity,
          context.world,
          false
        );
      }
      if (context.command.indirectObject?.entity) {
        errorParams.indirectTargetSnapshot = captureEntitySnapshot(
          context.command.indirectObject.entity,
          context.world,
          false
        );
      }

      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: errorParams
        })
      ];
    }
    
    // Handle execution errors
    if (executionError) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'execution_failed',
          messageId: 'action_failed',
          params: {
            error: executionError.message
          }
        })
      ];
    }
    
    // Build event data using data builders
    const exitedData = buildEventData(actorExitedDataConfig, context);
    const movedData = buildEventData(actorMovedDataConfig, context);
    const enteredData = buildEventData(actorEnteredDataConfig, context);
    
    // Determine success message
    const { messageId, params } = determineGoingMessage(movedData);
    
    // Return all movement events
    return [
      context.event('if.event.actor_exited', exitedData),
      context.event('if.event.actor_moved', movedData),
      context.event('if.event.actor_entered', enteredData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params
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
