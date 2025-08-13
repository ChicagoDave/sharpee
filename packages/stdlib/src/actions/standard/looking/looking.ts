/**
 * Looking action - Provides description of current location and visible items
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { 
  TraitType,
  RoomBehavior,
  LightSourceBehavior,
  SwitchableBehavior,
  ContainerBehavior
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { LookingEventMap } from './looking-events';

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
  
  execute(context: ActionContext): SemanticEvent[] {
    const player = context.player;
    const location = context.currentLocation;
    
    // Build event data
    const eventData: LookingEventMap['if.event.looked'] = {
      actorId: player.id,
      locationId: location.id,
      locationName: location.name,
      isDark: false, // Will be determined below
      timestamp: Date.now()
    };
    
    const params: Record<string, any> = {};
    
    // Check if location is dark (no light sources) using behaviors
    let isDark = false;
    const room = context.world.getContainingRoom(player.id);
    if (room && room.hasTrait(TraitType.ROOM)) {
      const roomTrait = room.getTrait(TraitType.ROOM) as any;
      if (roomTrait.requiresLight) {
        // Check for light sources in the room using behaviors
        const hasLight = context.world.getContents(room.id).some(item => {
          if (item.hasTrait(TraitType.LIGHT_SOURCE)) {
            // Check if it's lit - either via isLit property or via SWITCHABLE trait
            const lightTrait = item.getTrait(TraitType.LIGHT_SOURCE) as any;
            if (lightTrait.isLit !== undefined) {
              return lightTrait.isLit;
            }
            // If it has SWITCHABLE trait, check if it's on
            if (item.hasTrait(TraitType.SWITCHABLE)) {
              return SwitchableBehavior.isOn(item);
            }
            // Default to true for light sources without explicit state
            return true;
          }
          return false;
        });
        
        // Also check if player is carrying a light
        const playerHasLight = context.world.getContents(player.id).some(item => {
          if (item.hasTrait(TraitType.LIGHT_SOURCE)) {
            // Check if it's lit - either via isLit property or via SWITCHABLE trait
            const lightTrait = item.getTrait(TraitType.LIGHT_SOURCE) as any;
            if (lightTrait.isLit !== undefined) {
              return lightTrait.isLit;
            }
            // If it has SWITCHABLE trait, check if it's on
            if (item.hasTrait(TraitType.SWITCHABLE)) {
              return SwitchableBehavior.isOn(item);
            }
            // Default to true for light sources without explicit state
            return true;
          }
          return false;
        });
        
        isDark = !hasLight && !playerHasLight;
      }
    }
    
    eventData.isDark = isDark;
    
    const events: SemanticEvent[] = [];
    
    // Create player looked event for world model
    events.push(context.event('if.event.looked', eventData));
    
    if (isDark) {
      // Can't see in the dark
      params.location = location.name;
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'room_dark',
        params
      }));
      return events;
    }
    
    // Determine location type and appropriate message
    let messageId = 'room_description';
    let isSpecialLocation = false;
    
    // Always include location name
    params.location = location.name;
    
    // Check if we're in a special location using trait checks
    if (location.hasTrait(TraitType.CONTAINER)) {
      messageId = 'in_container';
      params.container = location.name;
      isSpecialLocation = true;
    } else if (location.hasTrait(TraitType.SUPPORTER)) {
      messageId = 'on_supporter';
      params.supporter = location.name;
      isSpecialLocation = true;
    } else {
      // Check for brief/verbose mode
      const verboseMode = (context as any).verboseMode ?? true;
      const firstVisit = !(context as any).visitedLocations?.includes(location.id);
      
      if (!verboseMode && !firstVisit) {
        messageId = 'room_description_brief';
      }
    }
    
    // Create room description event
    const roomDescData: LookingEventMap['if.event.room_description'] = {
      roomId: location.id,
      includeContents: true,
      verbose: messageId === 'room_description',
      timestamp: Date.now()
    };
    events.push(context.event('if.event.room_description', roomDescData));
    
    // Get visible items (excluding the room itself and the player)
    const visible = context.getVisible().filter(
      e => e.id !== location.id && e.id !== player.id
    );
    
    // Group visible items by type for better listing
    const npcs = visible.filter(e => e.hasTrait(TraitType.ACTOR));
    const containers = visible.filter(e => e.hasTrait(TraitType.CONTAINER) && !e.hasTrait(TraitType.ACTOR));
    const supporters = visible.filter(e => e.hasTrait(TraitType.SUPPORTER) && !e.hasTrait(TraitType.CONTAINER));
    const otherItems = visible.filter(e => 
      !e.hasTrait(TraitType.ACTOR) && 
      !e.hasTrait(TraitType.CONTAINER) && 
      !e.hasTrait(TraitType.SUPPORTER)
    );
    
    // If there are visible items, create an event to list them
    if (visible.length > 0) {
      const listData: LookingEventMap['if.event.list_contents'] = {
        items: visible.map(e => e.id),
        itemNames: visible.map(e => e.name),
        npcs: npcs.map(e => e.id),
        containers: containers.map(e => e.id),
        supporters: supporters.map(e => e.id),
        other: otherItems.map(e => e.id),
        context: 'room',
        timestamp: Date.now()
      };
      events.push(context.event('if.event.list_contents', listData));
      
      // When there are contents and we're not in a special location, use contents_list message
      if (!isSpecialLocation) {
        const itemList = visible.map(e => e.name).join(', ');
        messageId = 'contents_list';
        // Remove location from params when listing contents
        delete params.location;
        params.items = itemList;
        params.count = visible.length;
      }
    }
    
    // Add the room description message
    events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params
      }));
    
    // Check command verb for variations
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'look';
    if (verb === 'examine' && !context.command.directObject) {
      // "examine" without object means examine surroundings
      // Replace the previous success event with examine_surroundings
      const lastEvent = events[events.length - 1];
      if (lastEvent.type === 'action.success' && lastEvent.payload) {
        lastEvent.payload.messageId = 'examine_surroundings';
      }
    }
    
    return events;
  },
  
  group: "observation",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
