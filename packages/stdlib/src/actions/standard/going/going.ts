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
  IdentityTrait,
  RoomTrait,
  RoomBehavior,
  OpenableBehavior,
  LockableBehavior,
  VisibilityBehavior,
  Direction,
  DirectionType,
  canActorWalkInVehicle,
  RegionCrossings,
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot, captureRoomSnapshot, captureEntitySnapshots } from '../../base/snapshot-utils';
import { buildEventData } from '../../data-builder-types';
import { GoingMessages } from './going-messages';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked
} from '../../lifecycle';

// Import our data builders
import {
  actorMovedDataConfig,
  actorExitedDataConfig,
  actorEnteredDataConfig,
} from './going-data';

// Note: Room description is now built directly in report() using sharedData.currentLocation

/**
 * Shared data passed between execute and report phases.
 */
export interface GoingSharedData {
  isFirstVisit?: boolean;
  previousLocation?: string;  // Room we came from
  currentLocation?: string;   // Room we're now in
  direction?: DirectionType;
  vehicleId?: string;         // If player is in a walkable vehicle, the vehicle ID
  /** Region boundary crossings computed during execute (ADR-149) */
  regionCrossings?: RegionCrossings;
}

export function getGoingSharedData(context: ActionContext): GoingSharedData {
  return context.sharedData as GoingSharedData;
}

// ============================================================================
// Implicit-entity resolvers (ADR-228 D3) — going has no parsed object
// slots; its consultable entities are derived from the command + world.
// Resolution is read-only and returns undefined when the entity does not
// apply (no exit, blocked-only direction, not in a room).
// ============================================================================

/** The direction of travel, from extras or a direction-named direct object. */
function resolveDirection(context: ActionContext): DirectionType | undefined {
  let direction = context.command.parsed.extras?.direction as DirectionType;
  if (!direction && context.command.directObject?.entity) {
    const entityName = context.command.directObject.entity.name ||
      context.command.directObject.entity.attributes?.name;
    if (entityName) {
      direction = entityName as DirectionType;
    }
  }
  return direction || undefined;
}

/** The room movement starts from (the containing room when in a walkable vehicle). */
function resolveSourceRoom(context: ActionContext): IFEntity | undefined {
  const walkCheck = canActorWalkInVehicle(context.world, context.player.id);
  let currentRoom = context.currentLocation;
  if (walkCheck.vehicle && walkCheck.canWalk) {
    const containingRoom = context.world.getContainingRoom(context.player.id);
    if (containingRoom) {
      currentRoom = containingRoom;
    }
  }
  return currentRoom?.has(TraitType.ROOM) ? currentRoom : undefined;
}

/** The exit's door (via) and destination room, when the exit exists. */
function resolveExitEntities(context: ActionContext): { door?: IFEntity; destination?: IFEntity } {
  const sourceRoom = resolveSourceRoom(context);
  const direction = resolveDirection(context);
  if (!sourceRoom || !direction) return {};
  // A blocked-only direction has no traversable exit (Chord `north is blocked:`)
  if (RoomBehavior.isExitBlocked(sourceRoom, direction)) return {};
  const exitConfig = RoomBehavior.getExit(sourceRoom, direction);
  if (!exitConfig) return {};
  const door = exitConfig.via ? (context.world.getEntity(exitConfig.via) ?? undefined) : undefined;
  const destination = context.world.getEntity(exitConfig.destination) ?? undefined;
  return { door, destination };
}

/**
 * Interceptor surface (ADR-228): all three implicit entities of a GO
 * command are consulted, in this published order — source room
 * (if.action.going), destination room (if.action.entering_room, ADR-126),
 * door (if.action.going; the previously-dead surface the audit found).
 * First veto wins across the chain.
 */
export const goingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.GOING,
  slots: [
    {
      id: 'source',
      actionIds: [IFActions.GOING],
      resolve: resolveSourceRoom,
      seedData: (ctx) => ({ direction: resolveDirection(ctx) })
    },
    {
      id: 'destination',
      actionIds: [IFActions.ENTERING_ROOM],
      resolve: (ctx) => resolveExitEntities(ctx).destination,
      seedData: (ctx, entity) => ({
        direction: resolveDirection(ctx),
        sourceRoomId: resolveSourceRoom(ctx)?.id,
        destinationRoomId: entity.id
      })
    },
    {
      id: 'door',
      actionIds: [IFActions.GOING],
      resolve: (ctx) => resolveExitEntities(ctx).door,
      seedData: (ctx) => ({
        direction: resolveDirection(ctx),
        sourceRoomId: resolveSourceRoom(ctx)?.id,
        destinationRoomId: resolveExitEntities(ctx).destination?.id
      })
    }
  ]
};

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
          params: { vehicle: walkCheck.vehicle ? nounPhraseFor(walkCheck.vehicle) : undefined }
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

    // Resolve the interceptor surface (ADR-228): source room, destination
    // room, and door — the engine owns hook order and veto semantics.
    const state = resolveLifecycle(context, goingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check if the direction is blocked BEFORE requiring an exit config:
    // a blockedExits entry means "this direction is deliberately refused
    // with this message" whether or not an exit exists (a blocked-only
    // direction has no destination — e.g. Chord's `north is blocked:`,
    // ADR-210).
    if (RoomBehavior.isExitBlocked(currentRoom, direction)) {
      const blockedMessage = RoomBehavior.getBlockedMessage(currentRoom, direction) || "You can't go that way.";
      return {
        valid: false,
        error: GoingMessages.MOVEMENT_BLOCKED,
        params: { direction: direction, message: blockedMessage }
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
              door: nounPhraseFor(door),
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
            params: { door: nounPhraseFor(door), direction: direction }
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

    // Canonical placement (ADR-228): postValidate runs after ALL standard
    // validation, for every consultation (source → destination → door),
    // first veto wins.
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

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

    // Compute region boundary crossings (ADR-149)
    sharedData.regionCrossings = context.world.getRegionCrossings(sourceRoom.id, destination.id);

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
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

    // Emit region boundary crossing events (ADR-149)
    const crossings = sharedData.regionCrossings;
    if (crossings) {
      // Exit events — innermost first
      for (const regionId of crossings.exited) {
        events.push(context.event('if.event.region_exited', {
          actorId: context.player.id,
          regionId,
          toRegionId: crossings.entered[0],
        }));
      }
      // Entry events — outermost first
      for (const regionId of crossings.entered) {
        events.push(context.event('if.event.region_entered', {
          actorId: context.player.id,
          regionId,
          fromRegionId: crossings.exited[0],
        }));
      }
    }

    // Check if destination is dark (no usable light source)
    const isDark = VisibilityBehavior.isDark(destinationRoom, context.world);

    if (isDark) {
      // Dark room with no light - emit went event with darkness messageId.
      // No early return: postReport hooks still run below (ADR-228 D7.1 —
      // the old early return skipped hooks on exactly the path that emits
      // if.event.went).
      events.push(context.event('if.event.went', {
        messageId: `${context.action.id}.too_dark`,
        params: {},
        actorId: context.player.id,
        destinationId: destinationRoom.id,
        isDark: true
      }));

      const state = getLifecycleState(context);
      if (state) runPostReport(context, state, events, 'if.event.went');
      return events;
    }

    // Room has light - build and emit room description
    const roomSnapshot = captureRoomSnapshot(destinationRoom, context.world, false);

    // Get visible contents in the destination room (filter concealed items)
    const destinationContents = context.world.getContents(destinationRoom.id)
      .filter(e => e.id !== context.player.id)
      .filter(e => {
        const identity = e.getTrait(IdentityTrait);
        return !(identity && identity.concealed === true);
      });
    const visibleSnapshots = captureEntitySnapshots(destinationContents, context.world);

    const destinationSnippets = destinationRoom.getTrait(RoomTrait)?.snippets;
    const roomDescData = {
      room: roomSnapshot,
      visibleItems: visibleSnapshots,
      roomId: destinationRoom.id,
      roomName: destinationRoom.name,
      roomDescription: destinationRoom.description,
      // ADR-209: presence of the snippet map triggers the engine handler's
      // splice pass over the description text.
      ...(destinationSnippets ? { roomSnippets: destinationSnippets } : {}),
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

    // Emit contents list if there are visible items. Scenery is excluded, as
    // in the looking action: fixed furnishings belong to the room's
    // description prose, not the "You can see …" enumeration.
    const listableContents = destinationContents.filter(
      e => !e.hasTrait(TraitType.SCENERY)
    );
    if (listableContents.length > 0) {
      // PhraseList of NounPhrases (ADR-192): the Assembler's list authority renders
      // articles + conjunction in the lang layer. Use looking's messageId namespace
      // since this is auto-look.
      events.push(context.event('if.event.list.contents', {
        messageId: 'if.action.looking.contents_list',
        params: {
          items: {
            kind: 'list' as const,
            conj: 'and' as const,
            items: listableContents.map(e => nounPhraseFor(e)),
          },
          count: listableContents.length
        },
        locationId: destinationRoom.id,
        itemIds: listableContents.map(e => e.id),
        itemNames: listableContents.map(e => e.name)
      }));
    }

    // Note: if.event.went is only emitted on dark/blocked; override is a no-op
    // on success non-dark transitions. Use emit for narration after success.
    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.went');

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Standard blocked event — always emitted (ADR-228 D2)
    const events: ISemanticEvent[] = [context.event('if.event.went', {
      blocked: true,
      reason: result.error,
      messageId: `${context.action.id}.${result.error}`,
      params: result.params || {},
      actorId: context.player.id
    })];

    // All resolved consultations (source, destination, door) are notified;
    // single-override arbitration replaces the old blockedBy precedence
    // split (ADR-228 D2/D3).
    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.went', result.error);
    }

    return events;
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
