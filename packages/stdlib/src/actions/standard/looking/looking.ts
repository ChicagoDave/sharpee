/**
 * Looking action - Provides description of current location and visible items
 *
 * Uses four-phase pattern:
 * 1. validate: Always valid (basic sensory action)
 * 2. execute: Mark room as visited (only mutation)
 * 3. report: Generate success events with complete state snapshots
 * 4. blocked: Generate error events (never called since looking always valid)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { blockedMessageId } from '../../lifecycle/index.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, RoomBehavior } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { captureRoomSnapshot } from '../../base/snapshot-utils.js';
import { emitIllustrations } from '../../helpers/emit-illustrations.js';
import { buildEventData } from '../../data-builder-types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  lookingEventDataConfig,
  roomDescriptionDataConfig,
  listContentsDataConfig,
  determineLookingMessage,
  ContainerContentsInfo
} from './looking-data.js';
import { LookingMessages } from './looking-messages.js';

/**
 * The "In/On <holder> you see …" events for a room's contained listings
 * (GH #338): one `if.event.list.contents` per open container or supporter
 * with visible contents, under `<actionId>.container_contents` /
 * `<actionId>.surface_contents`. Shared by the explicit look and going's
 * arrival description so the two never disagree about a room.
 *
 * @param context action context (entity reads for the noun phrases)
 * @param listings the holders and their visible contents
 * @param actionId the message namespace (`if.action.looking`)
 * @returns the list events, holders in listing order
 */
export function containedListingEvents(
  context: ActionContext,
  listings: ContainerContentsInfo[],
  actionId: string
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  for (const containerInfo of listings) {
    const contentsMessageId = containerInfo.preposition === 'in'
      ? 'container_contents'
      : 'surface_contents';
    const containerKey = containerInfo.preposition === 'in' ? 'container' : 'surface';

    // params carry phrases (ADR-192): the container NounPhrase and a
    // PhraseList of its contents; top-level event fields stay strings for
    // handler consumption.
    const containerEntity = context.world.getEntity(containerInfo.containerId);
    events.push(context.event('if.event.list.contents', {
      messageId: `${actionId}.${contentsMessageId}`,
      params: {
        [containerKey]: containerEntity
          ? nounPhraseFor(containerEntity)
          : { name: containerInfo.containerName },
        items: {
          kind: 'list' as const,
          conj: 'and' as const,
          items: containerInfo.itemIds
            .map(id => context.world.getEntity(id))
            .filter((e): e is NonNullable<typeof e> => Boolean(e))
            .map(e => nounPhraseFor(e)),
        }
      },
      containerId: containerInfo.containerId,
      containerName: containerInfo.containerName,
      preposition: containerInfo.preposition,
      itemIds: containerInfo.itemIds,
      itemNames: containerInfo.itemNames
    }));
  }
  return events;
}

export const lookingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LOOKING,
  requiredMessages: [
    'room_description',
    'room_description_brief',
    'room_dark',
    'contents_list',
    'nothing_special',
    'in_container',
    'on_supporter',
    'examine_surroundings'
  ],
  
  validate(context: ActionContext): ValidationResult {
    // Looking is always valid - it's a basic sensory action
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Only mutation: mark room as visited.
    // Capture first-visit state BEFORE marking, so report() can distinguish the
    // initial description from the standard one (mirrors going.ts:350–368).
    const room = context.world.getContainingRoom(context.actor.id);

    if (room && room.hasTrait(TraitType.ROOM)) {
      const isFirstVisit = !RoomBehavior.hasBeenVisited(room);
      context.sharedData.isFirstVisit = isFirstVisit;
      // `visited` is the reader's first look (Chord's `first time` prose
      // lowers to RoomTrait.initialDescription), so only the player's own
      // look marks it — an NPC looking here must not spend the player's
      // first-visit description. NPC-visited semantics are open (ADR-328).
      if (isFirstVisit && context.actor.id === context.player.id) {
        RoomBehavior.markVisited(room, context.actor);
      }
    }

    // No events returned - they're generated in report()
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - looking always succeeds
    const events: ISemanticEvent[] = [];

    // Build looked event data
    const lookedEventData = buildEventData(lookingEventDataConfig, context);

    // Determine message and params
    const isDark = lookedEventData.isDark as boolean;
    const { messageId, params } = determineLookingMessage(context, isDark);

    // If dark, emit looked event with dark messageId and return early
    if (isDark) {
      events.push(context.event('if.event.looked', {
        messageId: `${context.action.id}.${messageId}`,
        params,
        ...lookedEventData
      }));
      return events;
    }

    // Emit looked event as domain event (no messageId - specialized handler handles room description)
    const lookedEvent = context.event('if.event.looked', lookedEventData);
    events.push(lookedEvent);

    // Build and emit room description event (specialized handler renders this)
    const roomDescData = buildEventData(roomDescriptionDataConfig, context);
    events.push(context.event('if.event.room.description', roomDescData));

    // Emit illustration events for the room (ADR-124)
    const room = context.world.getContainingRoom(context.actor.id);
    if (room) {
      events.push(...emitIllustrations(room, 'on-enter', lookedEvent.id, context));
    }

    // Build list contents data
    const listData = buildEventData(listContentsDataConfig, context);

    // Emit contents_list if there are direct items in the room
    if (params.hasItems) {
      events.push(context.event('if.event.list.contents', {
        messageId: `${context.action.id}.contents_list`,
        params,
        ...listData
      }));
    }

    // Emit messages for container/supporter contents
    const openContainerContents = listData.openContainerContents as ContainerContentsInfo[] | undefined;
    events.push(...containedListingEvents(context, openContainerContents ?? [], context.action.id));

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    // Looking always succeeds, so this should never be called
    return [context.event('if.event.looked', {
      blocked: true,
      reason: result.error,
      messageId: blockedMessageId(context, result),
      params: result.params,
      actorId: context.actor.id
    })];
  },

  group: "observation",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
