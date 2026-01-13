/**
 * Looking action - Provides description of current location and visible items
 *
 * Uses four-phase pattern:
 * 1. validate: Always valid (basic sensory action)
 * 2. execute: Mark room as visited (only mutation)
 * 3. report: Generate success events with complete state snapshots
 * 4. blocked: Generate error events (never called since looking always valid)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { captureRoomSnapshot } from '../../base/snapshot-utils';
import { buildEventData } from '../../data-builder-types';
import {
  lookingEventDataConfig,
  roomDescriptionDataConfig,
  listContentsDataConfig,
  determineLookingMessage,
  ContainerContentsInfo
} from './looking-data';
import { LookingMessages } from './looking-messages';

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
    'cant_see_in_dark',
    'look_around',
    'examine_surroundings'
  ],
  
  validate(context: ActionContext): ValidationResult {
    // Looking is always valid - it's a basic sensory action
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // Only mutation: mark room as visited
    const location = context.currentLocation;
    const room = context.world.getContainingRoom(context.player.id);
    
    if (room && room.hasTrait(TraitType.ROOM)) {
      const roomTrait = room.getTrait(TraitType.ROOM) as any;
      if (roomTrait && !roomTrait.visited) {
        roomTrait.visited = true;
      }
    }
    
    // No events returned - they're generated in report()
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - looking always succeeds
    const events: ISemanticEvent[] = [];
    
    // Build and emit looked event
    const lookedEventData = buildEventData(lookingEventDataConfig, context);
    events.push(context.event('if.event.looked', lookedEventData));
    
    // Determine message and params
    const isDark = lookedEventData.isDark as boolean;
    const { messageId, params } = determineLookingMessage(context, isDark);
    
    // If dark, return early with just the dark message
    if (isDark) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params
      }));
      return events;
    }
    
    // Build and emit room description event
    const roomDescData = buildEventData(roomDescriptionDataConfig, context);
    events.push(context.event('if.event.room.description', roomDescData));
    
    // Build and emit list contents event if there are visible items
    const listData = buildEventData(listContentsDataConfig, context);
    if (listData && Object.keys(listData).length > 0) {
      events.push(context.event('if.event.list.contents', listData));
    }
    
    // Add the room description message
    events.push(context.event('action.success', {
      actionId: context.action.id,
      messageId,
      params
    }));

    // Add messages for container/supporter contents
    const openContainerContents = listData.openContainerContents as ContainerContentsInfo[] | undefined;
    if (openContainerContents && openContainerContents.length > 0) {
      for (const containerInfo of openContainerContents) {
        const contentsMessageId = containerInfo.preposition === 'in'
          ? 'container_contents'
          : 'surface_contents';
        const containerKey = containerInfo.preposition === 'in' ? 'container' : 'surface';

        events.push(context.event('action.success', {
          actionId: context.action.id,
          messageId: contentsMessageId,
          params: {
            [containerKey]: containerInfo.containerName,
            items: containerInfo.itemNames.join(', ')
          }
        }));
      }
    }

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    // Looking always succeeds, so this should never be called
    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: result.params
    })];
  },

  group: "observation",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
