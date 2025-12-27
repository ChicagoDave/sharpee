/**
 * Data builder for looking action
 * 
 * Centralizes all room snapshot and visibility logic for the looking action.
 * This separates data structure concerns from business logic.
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel, TraitType } from '@sharpee/world-model';
import { SwitchableBehavior } from '@sharpee/world-model';
import { captureRoomSnapshot, captureEntitySnapshots } from '../../base/snapshot-utils';

/**
 * Check if a location is dark (needs light but has none)
 */
function checkIfDark(context: ActionContext): boolean {
  const player = context.player;
  const room = context.world.getContainingRoom(player.id);
  
  if (!room || !room.hasTrait(TraitType.ROOM)) {
    return false;
  }
  
  const roomTrait = room.getTrait(TraitType.ROOM) as any;
  if (!roomTrait.isDark) {
    return false;
  }
  
  // Check for light sources in the room
  const hasRoomLight = context.world.getContents(room.id).some(item => {
    if (item.hasTrait(TraitType.LIGHT_SOURCE)) {
      const lightTrait = item.getTrait(TraitType.LIGHT_SOURCE) as any;
      if (lightTrait.isLit !== undefined) {
        return lightTrait.isLit;
      }
      if (item.hasTrait(TraitType.SWITCHABLE)) {
        return SwitchableBehavior.isOn(item);
      }
      return true; // Default to true for light sources without explicit state
    }
    return false;
  });
  
  // Check if player is carrying a light
  const hasPlayerLight = context.world.getContents(player.id).some(item => {
    if (item.hasTrait(TraitType.LIGHT_SOURCE)) {
      const lightTrait = item.getTrait(TraitType.LIGHT_SOURCE) as any;
      if (lightTrait.isLit !== undefined) {
        return lightTrait.isLit;
      }
      if (item.hasTrait(TraitType.SWITCHABLE)) {
        return SwitchableBehavior.isOn(item);
      }
      return true; // Default to true for light sources without explicit state
    }
    return false;
  });
  
  return !hasRoomLight && !hasPlayerLight;
}

/**
 * Build looking action data for the looked event
 */
export const buildLookingEventData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const player = context.player;
  const location = context.currentLocation;
  
  // Get visible items (excluding the room itself and the player)
  const visible = context.getVisible().filter(
    e => e.id !== location.id && e.id !== player.id
  );
  
  // Check if dark
  const isDark = checkIfDark(context);
  
  // Create atomic looked event with complete room snapshot
  const roomSnapshot = captureRoomSnapshot(location, context.world, false);
  const visibleSnapshots = captureEntitySnapshots(visible, context.world);
  
  return {
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
};

/**
 * Build room description event data
 */
export const buildRoomDescriptionData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const location = context.currentLocation;
  
  // Get visible items (excluding the room itself and the player)
  const visible = context.getVisible().filter(
    e => e.id !== location.id && e.id !== context.player.id
  );
  
  // Create snapshots
  const roomSnapshot = captureRoomSnapshot(location, context.world, false);
  const visibleSnapshots = captureEntitySnapshots(visible, context.world);
  
  // Determine if verbose mode
  const verboseMode = (context as any).verboseMode ?? true;
  const firstVisit = !(context as any).visitedLocations?.includes(location.id);
  const isVerbose = verboseMode || firstVisit;
  
  return {
    // New atomic structure
    room: roomSnapshot,
    visibleItems: visibleSnapshots,
    // Backward compatibility fields
    roomId: location.id,
    roomName: location.name,
    roomDescription: location.description,
    includeContents: true,
    verbose: isVerbose,
    contents: visible.map(entity => ({
      id: entity.id,
      name: entity.name,
      description: entity.description
    })),
    timestamp: Date.now()
  };
};

/**
 * Build list contents event data
 */
export const buildListContentsData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  const location = context.currentLocation;
  
  // Get visible items (excluding the room itself and the player)
  const visible = context.getVisible().filter(
    e => e.id !== location.id && e.id !== context.player.id
  );
  
  if (visible.length === 0) {
    return {}; // No list event needed if nothing visible
  }
  
  // Create snapshots
  const roomSnapshot = captureRoomSnapshot(location, context.world, false);
  const visibleSnapshots = captureEntitySnapshots(visible, context.world);
  
  // Group visible items by type
  const npcs = visible.filter(e => e.hasTrait(TraitType.ACTOR));
  const containers = visible.filter(e => e.hasTrait(TraitType.CONTAINER) && !e.hasTrait(TraitType.ACTOR));
  const supporters = visible.filter(e => e.hasTrait(TraitType.SUPPORTER) && !e.hasTrait(TraitType.CONTAINER));
  const otherItems = visible.filter(e => 
    !e.hasTrait(TraitType.ACTOR) && 
    !e.hasTrait(TraitType.CONTAINER) && 
    !e.hasTrait(TraitType.SUPPORTER)
  );
  
  return {
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
};

/**
 * Determine the appropriate message ID and parameters for looking
 */
export function determineLookingMessage(
  context: ActionContext,
  isDark: boolean
): { messageId: string; params: Record<string, any> } {
  const location = context.currentLocation;
  const params: Record<string, any> = {};
  
  if (isDark) {
    return {
      messageId: 'room_dark',
      params: { location: location.name }
    };
  }
  
  // Always include location name initially
  params.location = location.name;
  
  // Check if we're in a special location
  if (location.hasTrait(TraitType.CONTAINER)) {
    return {
      messageId: 'in_container',
      params: { 
        container: location.name,
        location: location.name  // Keep location for backward compatibility
      }
    };
  } else if (location.hasTrait(TraitType.SUPPORTER)) {
    return {
      messageId: 'on_supporter',
      params: { 
        supporter: location.name,
        location: location.name  // Keep location for backward compatibility
      }
    };
  }
  
  // Check for brief/verbose mode
  const verboseMode = (context as any).verboseMode ?? true;
  const firstVisit = !(context as any).visitedLocations?.includes(location.id);
  
  let messageId = (!verboseMode && !firstVisit) ? 'room_description_brief' : 'room_description';
  
  // Check for visible items
  const visible = context.getVisible().filter(
    e => e.id !== location.id && e.id !== context.player.id
  );
  
  // Check command verb for variations
  const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'look';
  const hasDirectObject = (context.command.directObject !== undefined && context.command.directObject !== null) ||
                        (context.command.parsed.structure.directObject !== undefined && context.command.parsed.structure.directObject !== null);
  
  // Special handling for examine without object
  const isExamineSurroundings = verb === 'examine' && !hasDirectObject;
  
  if (isExamineSurroundings) {
    return { messageId: 'examine_surroundings', params };
  }
  
  // If there are visible items and not a special location, use contents_list
  if (visible.length > 0 && !location.hasTrait(TraitType.CONTAINER) && !location.hasTrait(TraitType.SUPPORTER)) {
    const itemList = visible.map(e => e.name).join(', ');
    return {
      messageId: 'contents_list',
      params: {
        items: itemList,
        count: visible.length
      }
    };
  }
  
  return { messageId, params };
}

/**
 * Configuration for looking data builders
 */
export const lookingEventDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildLookingEventData,
  protectedFields: ['actorId', 'locationId', 'timestamp']
};

export const roomDescriptionDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildRoomDescriptionData,
  protectedFields: ['roomId', 'timestamp']
};

export const listContentsDataConfig: ActionDataConfig<Record<string, unknown>> = {
  builder: buildListContentsData,
  protectedFields: ['locationName', 'timestamp']
};