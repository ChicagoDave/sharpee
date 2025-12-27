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
  IFEntity,
  RoomBehavior,
  OpenableBehavior,
  LockableBehavior,
  VisibilityBehavior,
  Direction,
  DirectionType
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot, captureRoomSnapshot, captureEntitySnapshots } from '../../base/snapshot-utils';
import { buildEventData } from '../../data-builder-types';
import { GoingMessages } from './going-messages';

// Import our data builders
import {
  actorMovedDataConfig,
  actorExitedDataConfig,
  actorEnteredDataConfig,
  determineGoingMessage
} from './going-data';

// Note: Room description is now built directly in report() using sharedData.currentLocation

/**
 * Shared data passed between execute and report phases
 */
export interface GoingSharedData {
  isFirstVisit?: boolean;
  previousLocation?: string;  // Room we came from
  currentLocation?: string;   // Room we're now in
  direction?: DirectionType;
}

export function getGoingSharedData(context: ActionContext): GoingSharedData {
  return context.sharedData as GoingSharedData;
}

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
    // Direction can come from extras or from directObject name
    let direction = context.command.parsed.extras?.direction as DirectionType;

    // If no direction in extras, check if directObject has a name that could be a direction
    if (!direction && context.command.directObject?.entity) {
      const entityName = context.command.directObject.entity.name ||
                        context.command.directObject.entity.attributes?.name;
      if (entityName) {
        direction = entityName as DirectionType;
      }
    }

    if (!direction) {
      return {
        valid: false,
        error: GoingMessages.NO_DIRECTION
      };
    }

    // Check if player is contained (can't move through exits while contained)
    const playerDirectLocation = context.world.getLocation(actor.id);
    const currentRoom = context.currentLocation; // This is always the containing room

    if (playerDirectLocation !== currentRoom.id) {
      // Player is inside something (container/supporter) - can't use room exits
      return {
        valid: false,
        error: GoingMessages.NOT_IN_ROOM
      };
    }

    if (!currentRoom.has(TraitType.ROOM)) {
      // Shouldn't happen since currentLocation should always be a room
      return {
        valid: false,
        error: GoingMessages.NOT_IN_ROOM
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
          error: GoingMessages.NO_EXITS
        };
      }
      return {
        valid: false,
        error: GoingMessages.NO_EXIT_THAT_WAY,
        params: { direction: direction }
      };
    }

    // Check if exit is blocked
    if (RoomBehavior.isExitBlocked(currentRoom, direction)) {
      const blockedMessage = RoomBehavior.getBlockedMessage(currentRoom, direction);
      return {
        valid: false,
        error: GoingMessages.MOVEMENT_BLOCKED,
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
            error: GoingMessages.DOOR_LOCKED,
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
            error: GoingMessages.DOOR_CLOSED,
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
        error: GoingMessages.DESTINATION_NOT_FOUND,
        params: { direction: direction }
      };
    }

    // Note: We allow entry to dark rooms - you just can't see.
    // Darkness affects visibility (looking), not movement.
    // This matches traditional IF behavior (e.g., Cloak of Darkness).

    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Only perform the movement mutation
    const actor = context.player;
    const sourceRoom = context.currentLocation;

    // Get direction from parsed command (should already be a Direction constant)
    // Direction can come from extras or from directObject name
    let direction = context.command.parsed.extras?.direction as DirectionType;

    // If no direction in extras, check if directObject has a name that could be a direction
    if (!direction && context.command.directObject?.entity) {
      const entityName = context.command.directObject.entity.name ||
                        context.command.directObject.entity.attributes?.name;
      if (entityName) {
        direction = entityName as DirectionType;
      }
    }

    // Get exit info and destination using behaviors
    const exitConfig = RoomBehavior.getExit(sourceRoom, direction)!;
    const destination = context.world.getEntity(exitConfig.destination)!;

    // Check if this is the first time entering the destination
    const isFirstVisit = !RoomBehavior.hasBeenVisited(destination);

    // Store locations and state for report phase using sharedData
    const sharedData = getGoingSharedData(context);
    sharedData.isFirstVisit = isFirstVisit;
    sharedData.previousLocation = sourceRoom.id;
    sharedData.currentLocation = destination.id;
    sharedData.direction = direction;

    // Actually move the player!
    context.world.moveEntity(actor.id, destination.id);

    // Mark the destination room as visited
    if (isFirstVisit) {
      RoomBehavior.markVisited(destination, actor);
    }
  },
  
  /**
   * Report events after successful movement
   * Only called on success path - validation has already passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getGoingSharedData(context);

    // Get the actual destination room (not the stale context.currentLocation)
    const destinationRoom = context.world.getEntity(sharedData.currentLocation!)!;

    // Build event data using data builders
    const exitedData = buildEventData(actorExitedDataConfig, context);
    const movedData = buildEventData(actorMovedDataConfig, context);
    const enteredData = buildEventData(actorEnteredDataConfig, context);

    // Build room description for the DESTINATION (using actual location, not stale context)
    const roomSnapshot = captureRoomSnapshot(destinationRoom, context.world, false);

    // Get visible contents in the destination room
    const destinationContents = context.world.getContents(destinationRoom.id)
      .filter(e => e.id !== context.player.id);
    const visibleSnapshots = captureEntitySnapshots(destinationContents, context.world);

    const roomDescData = {
      room: roomSnapshot,
      visibleItems: visibleSnapshots,
      roomId: destinationRoom.id,
      roomName: destinationRoom.name,
      roomDescription: destinationRoom.description,
      includeContents: true,
      verbose: true, // Always verbose after movement
      previousLocation: sharedData.previousLocation,
      currentLocation: sharedData.currentLocation,
      contents: destinationContents.map(entity => ({
        id: entity.id,
        name: entity.name,
        description: entity.description
      }))
    };

    // Return all movement events plus room description
    const events: ISemanticEvent[] = [
      context.event('if.event.actor_exited', exitedData),
      context.event('if.event.actor_moved', movedData),
      context.event('if.event.actor_entered', enteredData),
      // Emit room description for the destination
      context.event('if.event.room.description', roomDescData)
    ];

    // Add contents list as action.success event (like looking does)
    if (destinationContents.length > 0) {
      const itemList = destinationContents.map(e => e.name).join(', ');
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'contents_list',
        params: {
          items: itemList,
          count: destinationContents.length,
          previousLocation: sharedData.previousLocation,
          currentLocation: sharedData.currentLocation
        }
      }));
    }

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },
  
  group: "movement",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  }
};

// Note: Darkness checking for rooms should use VisibilityBehavior.isDark()
// which is the single source of truth (see ADR-068)
