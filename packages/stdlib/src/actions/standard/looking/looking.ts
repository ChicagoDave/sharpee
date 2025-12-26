/**
 * Looking action - Provides description of current location and visible items
 * 
 * Uses three-phase pattern:
 * 1. validate: Always valid (basic sensory action)
 * 2. execute: Mark room as visited (only mutation)
 * 3. report: Generate events with complete state snapshots
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { captureRoomSnapshot } from '../../base/snapshot-utils';
import { handleReportErrors } from '../../base/report-helpers';
import { buildEventData } from '../../data-builder-types';
import { 
  lookingEventDataConfig, 
  roomDescriptionDataConfig, 
  listContentsDataConfig,
  determineLookingMessage
} from './looking-data';

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
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation and execution errors using shared helper
    // (though looking should never fail validation)
    const errorEvents = handleReportErrors(context, validationResult, executionError, {
      includeTargetSnapshot: false,  // Looking is about rooms, not objects
      includeIndirectSnapshot: false
    });
    if (errorEvents) return errorEvents;

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
    
    return events;
  },
  
  group: "observation",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
