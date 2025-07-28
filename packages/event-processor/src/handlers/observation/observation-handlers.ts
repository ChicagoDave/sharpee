/**
 * Handle player.checked_inventory event
 * 
 * This event is fired when a player checks their inventory.
 * This is an observable action - NPCs can see the player checking pockets/bags.
 * Default behavior: No world state changes
 * 
 * Can be overridden to:
 * - Trigger NPC comments about the player's behavior
 * - Track how often the player checks inventory
 * - Reveal pickpocket attempts when player notices missing items
 */
export function handlePlayerCheckedInventory(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    actorId: string;
    locationId: string;
    timestamp: number;
  };

  // Default: No state changes
  // Story authors can override to add NPC reactions
  
  // Example Floyd reaction:
  // const npcs = world.getContents(data.locationId)
  //   .filter(e => e.has('ACTOR') && e.id === 'floyd');
  // 
  // if (npcs.length > 0 && Math.random() > 0.7) {
  //   world.applyEvent(createEvent('text.npc_comment', {
  //     npcId: 'floyd',
  //     text: 'Floyd remarks, "You spend a lot of time playing pocket pool."',
  //     timestamp: Date.now()
  //   }));
  // }
}

/**
 * Handle player.inventory_empty event
 * 
 * This event is fired when a player checks inventory and it's empty.
 * Default behavior: No world state changes
 * 
 * Can be overridden to:
 * - Trigger NPC sympathy or mockery
 * - Reveal hidden items in desperate situations
 * - Track story progress (player has given away everything)
 */
export function handlePlayerInventoryEmpty(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    actorId: string;
    locationId: string;
    timestamp: number;
  };

  // Default: No state changes
}

/**
 * Handle text.inventory_list event
 * 
 * This event requests the inventory contents be displayed.
 * Default behavior: No world state changes
 * 
 * Can be overridden to:
 * - Track which items the player knows they have
 * - Update item descriptions based on inventory context
 */
export function handleTextInventoryList(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    actorId: string;
    carried: string[];
    worn: string[];
    empty: boolean;
    timestamp: number;
  };

  // Default: No state changes
  // This is primarily a text output event
}

/**
 * Observation event handlers
 * 
 * Handles events related to looking, examining, and other observation actions
 */

import { SemanticEvent } from '@sharpee/core';
import { WorldModel, IFEntity } from '@sharpee/world-model';

/**
 * Handle player.looked event
 * 
 * This event is fired when a player looks around their current location.
 * Default behavior: No world state changes
 * 
 * Can be overridden to:
 * - Trigger NPC reactions (e.g., NPC notices player looking around)
 * - Update room states (e.g., reveal hidden items after first look)
 * - Track player behavior for adaptive storytelling
 */
export function handlePlayerLooked(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    actorId: string;
    locationId: string;
    timestamp: number;
  };

  // Default: No state changes
  // Story authors can override to add reactions
  
  // Example of what a story might do:
  // const location = world.getEntity(data.locationId);
  // const npcsInRoom = world.getContents(data.locationId)
  //   .filter(e => e.has('ACTOR') && !e.has('PLAYER'));
  // 
  // for (const npc of npcsInRoom) {
  //   if (npc.get('EMOTIONAL_STATE')?.mood === 'nervous') {
  //     // NPC gets startled when player looks around
  //     world.applyEvent(createEvent('npc.startled', {
  //       npcId: npc.id,
  //       cause: 'player_looked',
  //       timestamp: Date.now()
  //     }));
  //   }
  // }
}

/**
 * Handle player.examined event
 * 
 * This event is fired when a player examines a specific entity.
 * Default behavior: No world state changes
 * 
 * Can be overridden to:
 * - Mark items as "seen" or "known"
 * - Trigger NPC reactions to being examined
 * - Reveal hidden properties after examination
 * - Update player knowledge/memory
 */
export function handlePlayerExamined(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    actorId: string;
    entityId: string;
    timestamp: number;
  };

  // Default: No state changes
  // Story authors can override to add reactions
}

/**
 * Handle text.room_description event
 * 
 * This event requests a room description be displayed.
 * Default behavior: No world state changes
 * 
 * Can be overridden to:
 * - Track which rooms have been described
 * - Update room state after description (e.g., mark as visited)
 * - Trigger timed events after entering a room
 */
export function handleTextRoomDescription(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    roomId: string;
    includeContents: boolean;
    timestamp: number;
  };

  // Default: No state changes
  // This is primarily a text output event
}

/**
 * Handle text.list_contents event
 * 
 * This event requests a list of visible contents be displayed.
 * Default behavior: No world state changes
 * 
 * Can be overridden to:
 * - Track what items the player has noticed
 * - Update item states when listed
 */
export function handleTextListContents(event: SemanticEvent, world: WorldModel): void {
  const data = event.data as {
    items: string[];
    context: string;
    timestamp: number;
  };

  // Default: No state changes
  // This is primarily a text output event
}

/**
 * Register all observation-related event handlers
 */
export function registerObservationHandlers(world: WorldModel): void {
  // Looking handlers
  world.registerEventHandler('player.looked', handlePlayerLooked);
  world.registerEventHandler('player.examined', handlePlayerExamined);
  world.registerEventHandler('text.room_description', handleTextRoomDescription);
  world.registerEventHandler('text.list_contents', handleTextListContents);
  
  // Inventory handlers
  world.registerEventHandler('player.checked_inventory', handlePlayerCheckedInventory);
  world.registerEventHandler('player.inventory_empty', handlePlayerInventoryEmpty);
  world.registerEventHandler('text.inventory_list', handleTextInventoryList);
}
