/**
 * Data builder for looking action
 *
 * Centralizes all room snapshot and visibility logic for the looking action.
 * This separates data structure concerns from business logic.
 */

import { ActionDataBuilder, ActionDataConfig } from '../../data-builder-types';
import { ActionContext } from '../../enhanced-types';
import { WorldModel, TraitType, VisibilityBehavior } from '@sharpee/world-model';
import { captureRoomSnapshot, captureEntitySnapshots } from '../../base/snapshot-utils';

/**
 * Check if a location is dark (needs light but has none).
 * Delegates to VisibilityBehavior.isDark() as the single source of truth.
 */
function checkIfDark(context: ActionContext): boolean {
  const room = context.world.getContainingRoom(context.player.id);
  if (!room) return false;
  return VisibilityBehavior.isDark(room, context.world);
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
  // Use visibility logic to determine what location to describe
  const { location, immediateContainer } = VisibilityBehavior.getDescribableLocation(
    player,
    context.world
  );

  // Get visible items (excluding the room itself and the player)
  const visible = context.getVisible().filter(
    e => e.id !== location.id && e.id !== player.id
  );

  // Check if dark
  const isDark = checkIfDark(context);

  // Create atomic looked event with complete room snapshot
  const roomSnapshot = captureRoomSnapshot(location, context.world, false);
  const visibleSnapshots = captureEntitySnapshots(visible, context.world);

  // Get identity trait for ID fields (ADR-107 dual-mode)
  const identity = location.get?.('identity') as any;

  return {
    actorId: player.id,
    // New atomic structure
    room: roomSnapshot,
    visibleItems: visibleSnapshots,
    // Backward compatibility fields
    locationId: location.id,
    locationName: location.name,
    locationDescription: location.description,
    // ADR-107: Message IDs for localization (take precedence over literals)
    locationNameId: identity?.nameId,
    locationDescriptionId: identity?.descriptionId,
    isDark: isDark,
    inVehicle: immediateContainer?.name || null,
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
  // Use visibility logic to determine what location to describe
  const { location, immediateContainer } = VisibilityBehavior.getDescribableLocation(
    context.player,
    context.world
  );

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

  // Get identity trait for ID fields (ADR-107 dual-mode)
  const identity = location.get?.('identity') as any;

  return {
    // New atomic structure
    room: roomSnapshot,
    visibleItems: visibleSnapshots,
    // Backward compatibility fields
    roomId: location.id,
    roomName: location.name,
    roomDescription: location.description,
    // ADR-107: Message IDs for localization (take precedence over literals)
    roomNameId: identity?.nameId,
    roomDescriptionId: identity?.descriptionId,
    includeContents: true,
    verbose: isVerbose,
    inVehicle: immediateContainer?.name || null,
    contents: visible.map(entity => ({
      id: entity.id,
      name: entity.name,
      description: entity.description
    })),
    timestamp: Date.now()
  };
};

/**
 * Container/supporter contents info for text rendering
 */
export interface ContainerContentsInfo {
  containerId: string;
  containerName: string;
  preposition: 'in' | 'on';
  itemIds: string[];
  itemNames: string[];
}

/**
 * Build list contents event data
 */
export const buildListContentsData: ActionDataBuilder<Record<string, unknown>> = (
  context: ActionContext,
  preState?: WorldModel,
  postState?: WorldModel
): Record<string, unknown> => {
  // Use visibility logic to determine what location to describe
  const { location } = VisibilityBehavior.getDescribableLocation(
    context.player,
    context.world
  );

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

  // Separate items directly in room from items in containers/supporters
  const directInRoom = visible.filter(e => {
    const itemLocation = context.world.getLocation(e.id);
    return itemLocation === location.id;
  });

  // Group direct room items by type
  const npcs = directInRoom.filter(e => e.hasTrait(TraitType.ACTOR));
  const containers = directInRoom.filter(e => e.hasTrait(TraitType.CONTAINER) && !e.hasTrait(TraitType.ACTOR));
  const supporters = directInRoom.filter(e => e.hasTrait(TraitType.SUPPORTER) && !e.hasTrait(TraitType.CONTAINER));
  const otherItems = directInRoom.filter(e =>
    !e.hasTrait(TraitType.ACTOR) &&
    !e.hasTrait(TraitType.CONTAINER) &&
    !e.hasTrait(TraitType.SUPPORTER)
  );

  // Build container/supporter contents info for separate rendering
  const openContainerContents: ContainerContentsInfo[] = [];

  // Check each container for visible contents
  for (const container of containers) {
    // Skip if container is closed
    if (container.hasTrait(TraitType.OPENABLE)) {
      const { OpenableBehavior } = require('@sharpee/world-model');
      if (!OpenableBehavior.isOpen(container)) continue;
    }

    const contents = context.world.getContents(container.id);
    if (contents.length > 0) {
      openContainerContents.push({
        containerId: container.id,
        containerName: container.name,
        preposition: 'in',
        itemIds: contents.map(e => e.id),
        itemNames: contents.map(e => e.name)
      });
    }
  }

  // Check each supporter for visible contents
  for (const supporter of supporters) {
    const contents = context.world.getContents(supporter.id);
    if (contents.length > 0) {
      openContainerContents.push({
        containerId: supporter.id,
        containerName: supporter.name,
        preposition: 'on',
        itemIds: contents.map(e => e.id),
        itemNames: contents.map(e => e.name)
      });
    }
  }

  return {
    // New atomic structure (full snapshots)
    allItems: visibleSnapshots,
    location: roomSnapshot,
    // Backward compatibility fields (just IDs as before)
    items: visible.map(e => e.id),
    // Direct room items (not inside containers)
    directItems: directInRoom.map(e => e.id),
    directItemNames: directInRoom.map(e => e.name),
    npcs: npcs.map(e => e.id),
    containers: containers.map(e => e.id),
    supporters: supporters.map(e => e.id),
    other: otherItems.map(e => e.id),
    // Container/supporter contents for separate rendering
    openContainerContents,
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
  // Use visibility logic to determine what location to describe
  const { location, immediateContainer } = VisibilityBehavior.getDescribableLocation(
    context.player,
    context.world
  );
  const params: Record<string, any> = {};

  if (isDark) {
    return {
      messageId: 'room_dark',
      params: { location: location.name }
    };
  }

  // Include name and description for room_description template
  params.name = location.name;
  params.description = location.description;
  params.location = location.name;

  // If we're in an immediate container (but can see the room), note it
  if (immediateContainer) {
    params.inVehicle = immediateContainer.name;
  }

  // Check if we're in a closed container/vehicle (can't see the room)
  // This only happens when getDescribableLocation returns the container itself
  if (!immediateContainer && location.hasTrait(TraitType.CONTAINER)) {
    return {
      messageId: 'in_container',
      params: {
        container: location.name,
        location: location.name
      }
    };
  } else if (!immediateContainer && location.hasTrait(TraitType.SUPPORTER)) {
    return {
      messageId: 'on_supporter',
      params: {
        supporter: location.name,
        location: location.name
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

  // Get items directly in the room (not inside containers)
  const directInRoom = visible.filter(e => {
    const itemLocation = context.world.getLocation(e.id);
    return itemLocation === location.id;
  });

  // If there are direct room items, include them in params for contents_list
  // (the action will emit room_description first, then contents_list)
  if (directInRoom.length > 0) {
    const itemList = directInRoom.map(e => e.name).join(', ');
    return {
      messageId,  // room_description or room_description_brief
      params: {
        items: itemList,
        count: directInRoom.length,
        hasItems: true,
        ...params
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