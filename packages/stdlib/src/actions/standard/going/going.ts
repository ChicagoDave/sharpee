/**
 * Going action - movement through exits
 *
 * This action handles movement by a way out of the actor's room: a compass
 * direction, or a passage key (ADR-378 D1) that a gated story rule put in
 * `extras.direction`. Whether the way may be taken is one question with one
 * answer — `TraversalBehavior.wayFor` (ADR-378 D0, ADR-379) — and this
 * action turns that answer into its refusals; it keeps no gate of its own.
 * The computed-exit resolution (ADR-295) and the first-visit, region and
 * arrival narration are this action's.
 *
 * Uses four-phase pattern with interceptor support (ADR-118):
 * 1. validate: preValidate hook → standard checks → postValidate hook
 * 2. execute: standard mutation → postExecute hook
 * 3. blocked: onBlocked hook (if validation failed)
 * 4. report: standard events → postReport hook (additional effects)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  RoomBehavior,
  OpenableBehavior,
  VisibilityBehavior,
  TraversalBehavior,
  type ExitKey,
  type TraversalMover,
  type DirectionType,
  goingFromVehicle,
  isPassageKey,
  type RegionCrossings,
  getOppositeDirection,
  NpcTrait,
  FloatingTrait,
} from '@sharpee/world-model';
import type { ExitResolution, WayRefusal } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { captureEntitySnapshot, captureRoomSnapshot, captureEntitySnapshots } from '../../base/snapshot-utils.js';
import { buildEventData } from '../../data-builder-types.js';
import { GoingMessages } from './going-messages.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { collectContainedListings } from '../looking/looking-data.js';
import { containedListingEvents } from '../looking/looking.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId,
  vetoOf
} from '../../lifecycle/index.js';

// Import our data builders
import {
  actorMovedDataConfig,
  actorExitedDataConfig,
  actorEnteredDataConfig,
} from './going-data.js';

// Note: Room description is now built directly in report() using sharedData.currentLocation

/**
 * Shared data passed between execute and report phases.
 */
export interface GoingSharedData {
  isFirstVisit?: boolean;
  previousLocation?: string;  // Room we came from
  currentLocation?: string;   // Room we're now in
  /** The way taken: a compass direction or a passage key (ADR-378 D1a). */
  direction?: ExitKey;
  vehicleId?: string;         // The vehicle the player steers by GO, if any
  /** Region boundary crossings computed during execute (ADR-149) */
  regionCrossings?: RegionCrossings;
  /**
   * ADR-295 D5: the single traversal resolution for this command, drawn once
   * in execute. Report reads it for narration events and the blocked path;
   * the data builders never re-derive the destination from static topology.
   */
  exitResolution?: ExitResolution;
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

/**
 * The way of travel, from extras or a direction-named direct object. The
 * parser leaves a non-compass value untouched, so a passage key arrives
 * here exactly as the story's gated rule registered it (ADR-378 D1a, D2).
 */
function resolveWay(context: ActionContext): ExitKey | undefined {
  let direction = context.command.parsed.extras?.direction as ExitKey;
  if (!direction && context.command.directObject?.entity) {
    const entityName = context.command.directObject.entity.name ||
      context.command.directObject.entity.attributes?.name;
    if (entityName) {
      direction = entityName as ExitKey;
    }
  }
  return direction || undefined;
}

/**
 * The command extra naming a thing the actor pushes along the way (ADR-378
 * D6, D7): pushing delegates its traversal here and sets it, so traversal
 * admits the pushed thing with its pusher, at validate and at resolution.
 */
export const PUSHED_THING_EXTRA = 'pushedThingId';

/**
 * Who is taking the way: the vehicle the actor steers (ADR-366 D5), or the
 * actor on foot — with the thing they push along it, when a push delegated
 * here, so traversal admits the two as one party.
 */
function resolveMover(context: ActionContext): TraversalMover {
  const pushedId = context.command.parsed.extras?.[PUSHED_THING_EXTRA] as string | undefined;
  const pushed = pushedId !== undefined ? context.world.getEntity(pushedId) : undefined;
  const pushing = pushed ? { pushing: pushed } : {};
  const vehicleGoing = goingFromVehicle(context.world, context.actor.id);
  return vehicleGoing.kind === 'steers'
    ? { kind: 'steered', vehicle: vehicleGoing.vehicle, ...pushing }
    : { kind: 'walker', entity: context.actor, ...pushing };
}

/**
 * Traversal's admittance refusal in going's words — or, for the thing
 * pushed along, pushing's own line, which going speaks on the push's behalf.
 *
 * @param reason - `not_admitted` (the steered vehicle) or `pushing_not_admitted` (the pushed thing)
 * @param mover - The party refused
 * @param direction - The way
 * @returns The message id, whether it is already qualified, and its params
 */
function notAdmittedRefusal(
  reason: 'not_admitted' | 'pushing_not_admitted',
  mover: TraversalMover,
  direction: ExitKey
): { messageId: string; qualified: boolean; params: Record<string, unknown> } {
  if (reason === 'pushing_not_admitted' && mover.kind !== 'npc' && mover.pushing) {
    return {
      messageId: `${IFActions.PUSHING}.cannot_push_that_way`,
      qualified: true,
      params: { target: nounPhraseFor(mover.pushing), direction }
    };
  }
  const vehicle = mover.kind === 'steered' ? mover.vehicle : undefined;
  return {
    messageId: GoingMessages.VEHICLE_CANNOT_GO,
    qualified: false,
    params: { vehicle: vehicle ? nounPhraseFor(vehicle) : undefined, direction }
  };
}

/**
 * A computed way refused at resolution (ADR-295 D5) as a blocked resolution,
 * so report's one blocked path words it and nothing moves.
 *
 * @param context - Going's context
 * @param reason - Traversal's refusal of the destination reached
 * @param mover - Who was refused
 * @param direction - The way
 */
function refusedAtResolution(context: ActionContext, reason: WayRefusal, mover: TraversalMover, direction: ExitKey): ExitResolution {
  if (reason === 'not_admitted' || reason === 'pushing_not_admitted') {
    const refusal = notAdmittedRefusal(reason, mover, direction);
    return {
      kind: 'blocked',
      messageId: refusal.qualified ? refusal.messageId : `${context.action.id}.${refusal.messageId}`,
      params: refusal.params
    };
  }
  const messageId = reason === 'destination_missing' ? GoingMessages.DESTINATION_NOT_FOUND : GoingMessages.NO_EXIT_THAT_WAY;
  return { kind: 'blocked', messageId: `${context.action.id}.${messageId}`, params: { direction } };
}

/** The room movement starts from (the containing room when steering a vehicle). */
function resolveSourceRoom(context: ActionContext): IFEntity | undefined {
  let currentRoom = context.currentLocation;
  if (goingFromVehicle(context.world, context.actor.id).kind === 'steers') {
    const containingRoom = context.world.getContainingRoom(context.actor.id);
    if (containingRoom) {
      currentRoom = containingRoom;
    }
  }
  return currentRoom?.has(TraitType.ROOM) ? currentRoom : undefined;
}

/**
 * The door's authored opening refusal, if any (GH #245 defect 5): runs the
 * door's `if.action.opening` interceptor's preValidate/postValidate hooks
 * with the seed opening's lifecycle gives them and returns the first veto
 * — so `north` at a jammed door reads the story's hint, not "is closed".
 * No hook, no veto → null (the stock refusal stands). Nothing is opened.
 */
function doorOpeningVeto(context: ActionContext, door: IFEntity): ValidationResult | null {
  const interceptor = context.world.getInterceptorForAction(door, IFActions.OPENING)?.interceptor;
  if (!interceptor) return null;
  const data: Record<string, unknown> = { targetId: door.id, targetName: door.name };
  const pre = interceptor.preValidate
    ? vetoOf(interceptor.preValidate(door, context.world, context.actor.id, data, context.random))
    : null;
  if (pre) return pre;
  return interceptor.postValidate
    ? vetoOf(interceptor.postValidate(door, context.world, context.actor.id, data, context.random))
    : null;
}

/**
 * The exit's door (via) and destination room, when the way exists: the
 * interceptor slots are consulted whatever state the door is in, so this
 * reads existence and blocking from the home and stops there.
 */
function resolveExitEntities(context: ActionContext): { door?: IFEntity; destination?: IFEntity } {
  const sourceRoom = resolveSourceRoom(context);
  const direction = resolveWay(context);
  if (!sourceRoom || !direction) return {};
  // A blocked-only direction has no traversable exit (Chord `north is blocked:`)
  if (TraversalBehavior.isExitBlocked(context.world, sourceRoom, direction)) return {};
  const exitConfig = TraversalBehavior.exitOf(context.world, sourceRoom, direction);
  const computedExit = RoomBehavior.getComputedExitDeclaration(sourceRoom, direction);
  if (!exitConfig && !computedExit) return {};
  const door = exitConfig?.via ? (context.world.getEntity(exitConfig.via) ?? undefined) : undefined;
  // ADR-295 D7: a computed direction's true destination is unknown until the
  // execute-phase resolution — the destination slot resolves to no entity, so
  // entering_room interceptors are not consulted for that traversal.
  const destination = computedExit || !exitConfig
    ? undefined
    : context.world.getEntity(exitConfig.destination) ?? undefined;
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
  reportEventType: 'if.event.went',
  blockedEventType: 'if.event.went',
  slots: [
    {
      id: 'source',
      actionIds: [IFActions.GOING],
      resolve: resolveSourceRoom,
      seedData: (ctx) => ({ direction: resolveWay(ctx) })
    },
    {
      id: 'destination',
      actionIds: [IFActions.ENTERING_ROOM],
      resolve: (ctx) => resolveExitEntities(ctx).destination,
      seedData: (ctx, entity) => ({
        direction: resolveWay(ctx),
        sourceRoomId: resolveSourceRoom(ctx)?.id,
        destinationRoomId: entity.id
      })
    },
    {
      id: 'door',
      actionIds: [IFActions.GOING],
      resolve: (ctx) => resolveExitEntities(ctx).door,
      seedData: (ctx) => ({
        direction: resolveWay(ctx),
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
    'vehicle_ride',
    'vehicle_cannot_walk',
    'vehicle_cannot_go',
    'vehicle_under_way',
    'vehicle_arrived',
    'vehicle_stopped',
    'no_exits',
    'no_exit_that_way',
    'movement_blocked',
    'door_closed',
    'door_locked',
    'destination_not_found',
    'moved',
    'too_dark',
    'need_light'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.actor;
    const sharedData = getGoingSharedData(context);

    const direction = resolveWay(context);
    if (!direction) {
      return {
        valid: false,
        error: GoingMessages.NO_DIRECTION
      };
    }

    // From inside a vehicle, its movement model decides what GO means
    // (ADR-366 D5): a line or model-less vehicle refuses, a streets vehicle
    // is steered from the room it stands in.
    const vehicleGoing = goingFromVehicle(context.world, actor.id);
    let currentRoom = context.currentLocation;

    if (vehicleGoing.kind === 'rides' || vehicleGoing.kind === 'stays') {
      return {
        valid: false,
        error: vehicleGoing.kind === 'rides'
          ? GoingMessages.VEHICLE_RIDE
          : GoingMessages.VEHICLE_CANNOT_WALK,
        params: { vehicle: nounPhraseFor(vehicleGoing.vehicle) }
      };
    }
    if (vehicleGoing.kind === 'on-foot' && actor.get(FloatingTrait)?.position && currentRoom.has(TraitType.EXPANSE)) {
      // ADR-376 D9: out of the vehicle in the expanse, the player cannot
      // walk off; they stay in the vehicle's cell to board it again.
      return { valid: false, error: GoingMessages.STAYS_BY_VEHICLE };
    }
    if (vehicleGoing.kind === 'steers') {
      const containingRoom = context.world.getContainingRoom(actor.id);
      if (containingRoom) {
        currentRoom = containingRoom;
        // execute() moves the vehicle, which carries the player (D4)
        sharedData.vehicleId = vehicleGoing.vehicle.id;
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

    // One question, one answer (ADR-378 D0): may this mover take this way
    // now? The home reads existence (a hidden way is absent), blocking,
    // the door and admittance in that order; this action only words the
    // refusal. No gate is re-derived here.
    const way = TraversalBehavior.wayFor(context.world, currentRoom, direction, resolveMover(context));
    if (way.kind === 'refused') {
      switch (way.reason) {
        case 'hidden':
        case 'no_exit': {
          // A room whose every way is hidden has no obvious exits either.
          const anyExit = [...RoomBehavior.getAllExits(currentRoom).keys()]
            .some((key) => !TraversalBehavior.isExitHidden(context.world, currentRoom, key as ExitKey));
          return anyExit
            ? { valid: false, error: GoingMessages.NO_EXIT_THAT_WAY, params: { direction } }
            : { valid: false, error: GoingMessages.NO_EXITS };
        }
        case 'blocked':
          return {
            valid: false,
            error: GoingMessages.MOVEMENT_BLOCKED,
            params: { direction, message: way.message || "You can't go that way." }
          };
        case 'door_locked':
          return {
            valid: false,
            error: GoingMessages.DOOR_LOCKED,
            params: {
              door: nounPhraseFor(way.door!),
              direction,
              isClosed: way.door!.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(way.door!),
              isLocked: true
            }
          };
        case 'door_closed': {
          // GH #245 (5): the natural command surfaces the door's authored
          // opening refusal — the story's `on the player opening … refuse`
          // hint — instead of the stock line, by consulting the door's
          // opening interceptor's validation vetoes (no implicit opening).
          const doorVeto = doorOpeningVeto(context, way.door!);
          if (doorVeto) return doorVeto;
          return {
            valid: false,
            error: GoingMessages.DOOR_CLOSED,
            params: { door: nounPhraseFor(way.door!), direction }
          };
        }
        case 'destination_missing':
          return { valid: false, error: GoingMessages.DESTINATION_NOT_FOUND, params: { direction } };
        case 'not_admitted':
        case 'pushing_not_admitted': {
          const refusal = notAdmittedRefusal(way.reason, resolveMover(context), direction);
          return {
            valid: false,
            error: refusal.messageId,
            ...(refusal.qualified ? { errorQualified: true } : {}),
            params: refusal.params
          };
        }
      }
    }

    // A computed way (ADR-295 D5) draws its destination in execute; whether
    // the room it reaches admits the mover is traversal's answer there.

    // Note: We allow entry to dark rooms - you just can't see.
    // Darkness affects visibility (looking), not movement.
    // This matches traditional IF behavior (e.g., Cloak of Darkness).

    // Canonical placement (ADR-228): postValidate runs after ALL standard
    // validation, for every consultation (source → destination → door),
    // first veto wins.

    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Only perform the movement mutation
    const actor = context.actor;
    const sharedData = getGoingSharedData(context);

    // Get the source room - if in a vehicle, use containing room
    let sourceRoom = context.currentLocation;
    if (sharedData.vehicleId) {
      const containingRoom = context.world.getContainingRoom(actor.id);
      if (containingRoom) {
        sourceRoom = containingRoom;
      }
    }

    const direction = resolveWay(context)!;

    // Resolve the traversal EXACTLY ONCE (ADR-295 D5). The resolver may draw
    // on the session random service, so this call must not repeat; every
    // later consumer (report, data builders) reads sharedData instead.
    // Traversal takes the computed way and refuses a destination that does
    // not admit the mover; a computed way whose resolver defers with no
    // static exit is refused there too (ADR-295 Acceptance 7, never a crash).
    const exitConfig = TraversalBehavior.exitOf(context.world, sourceRoom, direction);
    const mover = resolveMover(context);
    const taken = TraversalBehavior.resolveComputed(context.world, sourceRoom, direction, mover, {
      world: context.world,
      actorId: actor.id,
      random: context.random
    });
    const resolution: ExitResolution = taken?.kind === 'refused'
      ? refusedAtResolution(context, taken.reason, mover, direction)
      : taken;
    sharedData.exitResolution = resolution;
    sharedData.previousLocation = sourceRoom.id;
    sharedData.direction = direction;

    if (resolution?.kind === 'blocked') {
      // The traversal does not happen: the actor stays put (ADR-295 D5;
      // Acceptance 5 asserts on the unchanged location).
      sharedData.currentLocation = sourceRoom.id;
      return;
    }

    const destinationId = resolution?.kind === 'exit'
      ? resolution.destination
      : exitConfig!.destination;
    const destination = context.world.getEntity(destinationId)!;

    // Check if this is the first time entering the destination
    const isFirstVisit = !RoomBehavior.hasBeenVisited(destination);

    // Store locations and state for report phase
    sharedData.isFirstVisit = isFirstVisit;
    sharedData.currentLocation = destination.id;

    // Move to destination - if in a vehicle, move the vehicle (player stays inside)
    if (sharedData.vehicleId) {
      context.world.moveEntity(sharedData.vehicleId, destination.id);
    } else {
      context.world.moveEntity(actor.id, destination.id);
    }

    // Mark the destination room as visited. `visited` is the reader's first
    // look (Chord's `first time` prose lowers to RoomTrait.initialDescription),
    // so only the player's own arrival marks it — an NPC walking through must
    // not spend the player's first-visit description. NPC-visited semantics
    // are open (ADR-328); `after <actor> entering` binds to actor_moved, not
    // to the first_entered event this emits, so nothing on the Chord side
    // depends on it firing for NPCs.
    if (isFirstVisit && actor.id === context.player.id) {
      RoomBehavior.markVisited(destination, actor);
    }

    // Compute region boundary crossings (ADR-149)
    sharedData.regionCrossings = context.world.getRegionCrossings(sourceRoom.id, destination.id);

  },

  /**
   * Report events after successful movement
   * Only called on success path - validation has already passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getGoingSharedData(context);
    const resolution = sharedData.exitResolution;

    // Blocked at resolution time (ADR-295 D5): no movement happened, so no
    // movement events are emitted — mirror the too_dark post-validate shape.
    if (resolution?.kind === 'blocked') {
      const events: ISemanticEvent[] = [
        context.event('if.event.went', {
          messageId: resolution.messageId,
          params: resolution.params ?? {},
          actorId: context.actor.id,
          direction: sharedData.direction,
          blocked: true
        })
      ];
      return events;
    }

    // Get the actual destination room (not the stale context.currentLocation)
    const destinationRoom = context.world.getEntity(sharedData.currentLocation!)!;

    // Build event data using data builders
    const exitedData = buildEventData(actorExitedDataConfig, context);
    const movedData = buildEventData(actorMovedDataConfig, context);
    const enteredData = buildEventData(actorEnteredDataConfig, context);

    // The protagonist's own move is narrated by what they see on arrival
    // (below). Anyone else's move is narrated by what the PLAYER sees of it
    // — but only when the mover announces its movement (`NpcTrait.
    // announcesMovement`, opt-in; Chord's `announces-movement`): the thief
    // slips in and out unremarked. When it does, the departure is located
    // at the origin and the arrival at the destination — presence tagging
    // (ADR-328 D3) renders whichever room the player is in, and actor voice
    // (D4) names the mover. `context.player` survives here on purpose: this
    // asks who holds the role this turn.
    const isProtagonist = context.actor.id === context.player.id;
    const announces = !isProtagonist && (context.actor.get(NpcTrait)?.announcesMovement ?? false);
    // A passage has no bearing to narrate: a witnessed mover by a passage
    // departs and arrives with no direction word (ADR-378 D1).
    const direction = sharedData.direction && !isPassageKey(sharedData.direction)
      ? sharedData.direction as DirectionType
      : undefined;
    const witnessed = (messageId: string, dir: DirectionType | undefined) => announces
      ? { messageId, params: { ...(dir ? { direction: dir } : {}) } }
      : {};

    // Return movement events first. actor_moved carries no messageId — it is
    // for event sourcing/handlers; exited/entered narrate a witnessed mover.
    const events: ISemanticEvent[] = [
      context.event('if.event.actor_exited', { ...exitedData, ...witnessed('if.action.going.departs', direction) }),
      context.event('if.event.actor_moved', movedData),
      context.event('if.event.actor_entered',
        { ...enteredData, ...witnessed('if.action.going.arrives', direction ? getOppositeDirection(direction) : undefined) },
        { location: destinationRoom.id })
    ];

    // Emit region boundary crossing events (ADR-149): at most one region is
    // left and one entered, since a room is in at most one region (ADR-360 D5).
    const crossings = sharedData.regionCrossings;
    if (crossings?.exited) {
      events.push(context.event('if.event.region_exited', {
        actorId: context.actor.id,
        regionId: crossings.exited,
        toRegionId: crossings.entered,
      }));
    }
    if (crossings?.entered) {
      events.push(context.event('if.event.region_entered', {
        actorId: context.actor.id,
        regionId: crossings.entered,
        fromRegionId: crossings.exited,
      }));
    }

    // What follows is the mover's own arrival perception — resolver prose,
    // the darkness line, the room description. Only the protagonist reads
    // it; a witnessed NPC's arrival was narrated above.
    if (!isProtagonist) {
      return events;
    }

    // Resolver narration (ADR-295 D4/D5): forwarded verbatim, ahead of the
    // arrival description. Rendered order is subject to GH #208.
    if (resolution?.kind === 'exit' && resolution.events?.length) {
      events.push(...resolution.events);
    }

    // Check if destination is dark to this actor (no usable light source,
    // and no night vision — ADR-374 D5)
    const isDark = VisibilityBehavior.isDarkFor(context.actor, destinationRoom, context.world);

    if (isDark) {
      // Dark room with no light - emit went event with darkness messageId.
      // No early return: postReport hooks still run below (ADR-228 D7.1 —
      // the old early return skipped hooks on exactly the path that emits
      // if.event.went).
      events.push(context.event('if.event.went', {
        messageId: `${context.action.id}.too_dark`,
        params: {},
        actorId: context.actor.id,
        destinationId: destinationRoom.id,
        isDark: true
      }));

      return events;
    }

    // Room has light - build and emit room description
    const roomSnapshot = captureRoomSnapshot(destinationRoom, context.world, false);

    // First arrival by going shows the room's `first time` prose in place of
    // the standing description (GH #326), exactly as looking-data does for a
    // first `look`: the initial description is mirrored onto the snapshot
    // (the room handler reads `room.description` first) and the top-level
    // field. execute() staged `isFirstVisit` before marking the visit, so
    // this is the one render that sees it (ADR-107 dual-mode: the message id
    // takes precedence over the literal).
    const destinationTrait = destinationRoom.getTrait(RoomTrait);
    const useInitial = sharedData.isFirstVisit === true && destinationTrait !== undefined
      && (destinationTrait.initialDescriptionId !== undefined || destinationTrait.initialDescription !== undefined);
    const arrivalDescription = useInitial
      ? (destinationTrait.initialDescription ?? destinationRoom.description)
      : destinationRoom.description;
    if (useInitial) {
      roomSnapshot.description = arrivalDescription;
      roomSnapshot.descriptionId = destinationTrait.initialDescriptionId ?? roomSnapshot.descriptionId;
    }

    // Get visible contents in the destination room (filter concealed items)
    const destinationContents = context.world.getContents(destinationRoom.id)
      .filter(e => e.id !== context.actor.id)
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
      roomDescription: arrivalDescription,
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

    // GH #338: the same "In/On <holder> you see …" lines the explicit look
    // prints, holders grouped exactly as looking-data groups them — arriving
    // and looking must never disagree about what is in the room.
    const containers = destinationContents.filter(
      e => e.hasTrait(TraitType.CONTAINER) && !e.hasTrait(TraitType.ACTOR)
    );
    const supporters = destinationContents.filter(
      e => e.hasTrait(TraitType.SUPPORTER) && !e.hasTrait(TraitType.CONTAINER)
    );
    events.push(...containedListingEvents(
      context,
      collectContainedListings(context, containers, supporters),
      'if.action.looking'
    ));

    // Note: if.event.went is only emitted on dark/blocked; override is a no-op
    // on success non-dark transitions. Use emit for narration after success.

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
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      actorId: context.actor.id
    })];

    // All resolved consultations (source, destination, door) are notified;
    // single-override arbitration replaces the old blockedBy precedence
    // split (ADR-228 D2/D3).

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
