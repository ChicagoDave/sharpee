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
import { captureRoomSnapshot, captureEntitySnapshots, createEntityReferences } from '../../base/snapshot-utils';

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
    // Handle validation errors (though looking should never fail validation)
    if (validationResult && !validationResult.valid) {
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: validationResult.error || 'validation_failed',
          messageId: validationResult.messageId || validationResult.error || 'action_failed',
          params: validationResult.params || {}
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
    
    const player = context.player;
    const location = context.currentLocation;
    
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
    
    const events: ISemanticEvent[] = [];
    
    // Get visible items (excluding the room itself and the player)
    const visible = context.getVisible().filter(
      e => e.id !== location.id && e.id !== player.id
    );
    
    // Create atomic looked event with complete room snapshot
    const roomSnapshot = captureRoomSnapshot(location, context.world, false);
    const visibleSnapshots = captureEntitySnapshots(visible, context.world);
    
    const lookedEventData = {
      actorId: player.id,
      // New atomic structure
      room: roomSnapshot,
      visibleItems: visibleSnapshots,
      // Backward compatibility fields
      locationId: location.id,
      locationName: location.name,
      locationDescription: location.description,
      isDark: isDark,
      contents: visible.map(entity => ({
        id: entity.id,
        name: entity.name,
        description: entity.description
      })),
      timestamp: Date.now()
    };
    
    events.push(context.event('if.event.looked', lookedEventData));
    
    if (isDark) {
      // Can't see in the dark - embed location name in event
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: 'room_dark',
        params: {
          location: location.name
        }
      }));
      return events;
    }
    
    // Determine location type and appropriate message
    let messageId = 'room_description';
    let isSpecialLocation = false;
    const params: Record<string, any> = {};
    
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
    
    // Create atomic room description event with complete snapshot
    const roomDescData = {
      // New atomic structure
      room: roomSnapshot,
      visibleItems: visibleSnapshots,
      // Backward compatibility fields
      roomId: location.id,
      roomName: location.name,
      roomDescription: location.description,
      includeContents: true,
      verbose: messageId === 'room_description',
      contents: visible.map(entity => ({
        id: entity.id,
        name: entity.name,
        description: entity.description
      })),
      timestamp: Date.now()
    };
    events.push(context.event('if.event.room_description', roomDescData));
    
    // Group visible items by type for better listing
    const npcs = visible.filter(e => e.hasTrait(TraitType.ACTOR));
    const containers = visible.filter(e => e.hasTrait(TraitType.CONTAINER) && !e.hasTrait(TraitType.ACTOR));
    const supporters = visible.filter(e => e.hasTrait(TraitType.SUPPORTER) && !e.hasTrait(TraitType.CONTAINER));
    const otherItems = visible.filter(e => 
      !e.hasTrait(TraitType.ACTOR) && 
      !e.hasTrait(TraitType.CONTAINER) && 
      !e.hasTrait(TraitType.SUPPORTER)
    );
    
    // Check command verb for variations BEFORE modifying messageId
    const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'look';
    // Check both the resolved directObject and the parsed structure
    const hasDirectObject = (context.command.directObject !== undefined && context.command.directObject !== null) ||
                          (context.command.parsed.structure.directObject !== undefined && context.command.parsed.structure.directObject !== null);
    
    // Special handling for examine without object - check this early
    const isExamineSurroundings = verb === 'examine' && !hasDirectObject;
    
    // If there are visible items, create an atomic event to list them with full snapshots
    if (visible.length > 0) {
      const listData = {
        // New atomic structure (full snapshots)
        allItems: visibleSnapshots,
        location: roomSnapshot,
        // Backward compatibility fields (just IDs as before)
        items: visible.map(e => e.id),
        npcs: npcs.map(e => e.id),
        containers: containers.map(e => e.id),
        supporters: supporters.map(e => e.id),
        other: otherItems.map(e => e.id),
        context: 'room',
        locationName: location.name,
        timestamp: Date.now()
      };
      events.push(context.event('if.event.list_contents', listData));
      
      // When there are contents and we're not in a special location, use contents_list message
      // BUT don't override if this is "examine" without object
      if (!isSpecialLocation && !isExamineSurroundings) {
        const itemList = visible.map(e => e.name).join(', ');
        messageId = 'contents_list';
        // Remove location from params when listing contents
        delete params.location;
        params.items = itemList;
        params.count = visible.length;
      }
    }
    
    // Apply examine surroundings override if needed
    if (isExamineSurroundings) {
      messageId = 'examine_surroundings';
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
