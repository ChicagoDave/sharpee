/**
 * Going action - movement through exits
 *
 * This action handles movement in cardinal directions and through named exits.
 * It validates all conditions and returns appropriate events.
 *
 * Uses four-phase pattern with interceptor support (ADR-118):
 * 1. validate: preValidate hook → standard checks → postValidate hook
 * 2. execute: standard mutation → postExecute hook
 * 3. blocked: onBlocked hook (if validation failed)
 * 4. report: standard events → postReport hook (additional effects)
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
  DirectionType,
  canActorWalkInVehicle,
  getInterceptorForAction,
  ActionInterceptor,
  InterceptorSharedData
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
 * Shared data passed between execute and report phases.
 * Now includes interceptor data for ADR-118 support.
 */
export interface GoingSharedData {
  isFirstVisit?: boolean;
  previousLocation?: string;  // Room we came from
  currentLocation?: string;   // Room we're now in
  direction?: DirectionType;
  vehicleId?: string;         // If player is in a walkable vehicle, the vehicle ID
  /** Interceptor found during validate, if any */
  interceptor?: ActionInterceptor;
  /** Shared data for interceptor phases */
  interceptorData?: InterceptorSharedData;
  /** Source room entity for interceptor lookups */
  sourceRoom?: IFEntity;
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
    const sharedData = getGoingSharedData(context);

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

    // Check if player is in a vehicle
    const walkCheck = canActorWalkInVehicle(context.world, actor.id);
    let currentRoom = context.currentLocation;

    if (walkCheck.vehicle) {
      // Player is in a vehicle - check if walking is allowed
      if (!walkCheck.canWalk) {
        // In a vehicle that blocks walking (bucket, etc.)
        return {
          valid: false,
          error: GoingMessages.NOT_IN_ROOM,
          params: { vehicle: walkCheck.vehicle?.name }
        };
      }
      // In a vehicle that allows walking (boat, etc.) - get the containing room
      const containingRoom = context.world.getContainingRoom(actor.id);
      if (containingRoom) {
        currentRoom = containingRoom;
        // Store vehicle ID so execute() can move the vehicle instead of the player
        sharedData.vehicleId = context.world.getLocation(actor.id);
      }
    }

    if (!currentRoom.has(TraitType.ROOM)) {
      // Player is in a container that's not in a room
      return {
        valid: false,
        error: GoingMessages.NOT_IN_ROOM
      };
    }

    // Check for interceptor on the source room (ADR-118)
    // Interceptors on rooms can block or modify movement attempts
    const interceptorResult = getInterceptorForAction(currentRoom, IFActions.GOING);
    const interceptor = interceptorResult?.interceptor;
    const interceptorData: InterceptorSharedData = {
      // Pass direction info to interceptor
      direction: direction
    };

    // Store for later phases
    sharedData.interceptor = interceptor;
    sharedData.interceptorData = interceptorData;
    sharedData.sourceRoom = currentRoom;

    // === PRE-VALIDATE HOOK ===
    // Called before standard validation - can block early
    if (interceptor?.preValidate) {
      const result = interceptor.preValidate(currentRoom, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
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
      const blockedMessage = RoomBehavior.getBlockedMessage(currentRoom, direction) || "You can't go that way.";
      return {
        valid: false,
        error: GoingMessages.MOVEMENT_BLOCKED,
        params: { direction: direction, message: blockedMessage }
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

    // === POST-VALIDATE HOOK ===
    // Called after standard validation passes - can add entity-specific conditions
    if (interceptor?.postValidate) {
      const result = interceptor.postValidate(currentRoom, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
    }

    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Only perform the movement mutation
    const actor = context.player;
    const sharedData = getGoingSharedData(context);

    // Get the source room - if in a vehicle, use containing room
    let sourceRoom = context.currentLocation;
    if (sharedData.vehicleId) {
      const containingRoom = context.world.getContainingRoom(actor.id);
      if (containingRoom) {
        sourceRoom = containingRoom;
      }
    }

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

    // Store locations and state for report phase
    sharedData.isFirstVisit = isFirstVisit;
    sharedData.previousLocation = sourceRoom.id;
    sharedData.currentLocation = destination.id;
    sharedData.direction = direction;

    // Move to destination - if in a vehicle, move the vehicle (player stays inside)
    if (sharedData.vehicleId) {
      context.world.moveEntity(sharedData.vehicleId, destination.id);
    } else {
      context.world.moveEntity(actor.id, destination.id);
    }

    // Mark the destination room as visited
    if (isFirstVisit) {
      RoomBehavior.markVisited(destination, actor);
    }

    // === POST-EXECUTE HOOK ===
    // Called after standard execution - can perform additional mutations
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postExecute && sharedData.sourceRoom) {
      interceptor.postExecute(sharedData.sourceRoom, context.world, actor.id, interceptorData);
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

    // Return movement events first (no messageId - these are for event sourcing/handlers)
    const events: ISemanticEvent[] = [
      context.event('if.event.actor_exited', exitedData),
      context.event('if.event.actor_moved', movedData),
      context.event('if.event.actor_entered', enteredData)
    ];

    // Check if destination is dark (no usable light source)
    const isDark = VisibilityBehavior.isDark(destinationRoom, context.world);

    if (isDark) {
      // Dark room with no light - emit went event with darkness messageId
      events.push(context.event('if.event.went', {
        messageId: `${context.action.id}.too_dark`,
        params: {},
        actorId: context.player.id,
        destinationId: destinationRoom.id,
        isDark: true
      }));
      return events;
    }

    // Room has light - build and emit room description
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
      isDark: false,
      contents: destinationContents.map(entity => ({
        id: entity.id,
        name: entity.name,
        description: entity.description
      }))
    };

    // Emit room description (specialized handler renders this)
    events.push(context.event('if.event.room.description', roomDescData));

    // Emit contents list if there are visible items
    if (destinationContents.length > 0) {
      const itemList = destinationContents.map(e => e.name).join(', ');
      // Use looking's messageId namespace since this is auto-look
      events.push(context.event('if.event.list.contents', {
        messageId: 'if.action.looking.contents_list',
        params: {
          items: itemList,
          count: destinationContents.length
        },
        locationId: destinationRoom.id,
        itemIds: destinationContents.map(e => e.id),
        itemNames: destinationContents.map(e => e.name)
      }));
    }

    // === POST-REPORT HOOK ===
    // Called after standard report - can add additional effects
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postReport && sharedData.sourceRoom) {
      const additionalEffects = interceptor.postReport(sharedData.sourceRoom, context.world, context.player.id, interceptorData);
      // Convert CapabilityEffects to ISemanticEvents
      for (const effect of additionalEffects) {
        events.push(context.event(effect.type, effect.payload));
      }
    }

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const sharedData = getGoingSharedData(context);

    // === ON-BLOCKED HOOK ===
    // Called when action is blocked - can provide custom blocked handling
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.onBlocked && sharedData.sourceRoom && result.error) {
      const customEffects = interceptor.onBlocked(sharedData.sourceRoom, context.world, context.player.id, result.error, interceptorData);
      if (customEffects !== null) {
        // Interceptor provided custom blocked effects
        return customEffects.map(effect => context.event(effect.type, effect.payload));
      }
    }

    // Standard blocked handling
    return [context.event('if.event.went', {
      blocked: true,
      reason: result.error,
      messageId: `${context.action.id}.${result.error}`,
      params: result.params || {},
      actorId: context.player.id
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
