/**
 * Vampire Bat Handler
 *
 * Event-based handler for the vampire bat in the Bat Room.
 * When the player enters the Bat Room:
 * - If player has garlic: bat cowers, player can proceed safely
 * - If player doesn't have garlic: bat carries player to a random underground room
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';

export const BatMessages = {
  ATTACKS: 'dungeo.bat.attacks',
  CARRIES_AWAY: 'dungeo.bat.carries_away',
  COWERS: 'dungeo.bat.cowers',
  DROPPED: 'dungeo.bat.dropped',
} as const;

// State key for tracking if bat already acted this turn
const BAT_ACTED_KEY = 'dungeo.bat.acted';
// State key for tracking player's previous location
const BAT_PREV_LOCATION_KEY = 'dungeo.bat.prevLocation';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `bat-${Date.now()}-${++eventCounter}`;
}

/**
 * Check if an item is garlic
 */
function isGarlic(item: any): boolean {
  const identity = item.get(IdentityTrait);
  if (!identity) return false;
  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];
  return name.includes('garlic') || aliases.some((a: string) => a.toLowerCase().includes('garlic'));
}

/**
 * Check if the player has garlic in their inventory (including inside containers)
 */
function playerHasGarlic(world: WorldModel, playerId: string): boolean {
  const checkContents = (entityId: string): boolean => {
    const contents = world.getContents(entityId);
    return contents.some(item => {
      // Check if this item is garlic
      if (isGarlic(item)) return true;
      // Recursively check if this item contains garlic
      return checkContents(item.id);
    });
  };
  return checkContents(playerId);
}

/**
 * Get a random underground room to drop the player in
 */
function getRandomDropLocation(
  undergroundRoomIds: string[],
  batRoomId: string
): string {
  // Filter out the bat room itself
  const validRooms = undergroundRoomIds.filter(id => id !== batRoomId);

  if (validRooms.length === 0) {
    // Fallback to bat room if no valid rooms
    return batRoomId;
  }

  // Pick a random room
  const randomIndex = Math.floor(Math.random() * validRooms.length);
  return validRooms[randomIndex];
}

/**
 * Register the bat daemon with the scheduler
 */
export function registerBatHandler(
  scheduler: ISchedulerService,
  batRoomId: string,
  undergroundRoomIds: string[]
): void {
  const daemon: Daemon = {
    id: 'dungeo-bat',
    name: 'Vampire Bat',
    priority: 50,

    // Only run when player is in or just entered the Bat Room
    condition: (context: SchedulerContext): boolean => {
      const result = context.playerLocation === batRoomId;
      console.log(`[BAT DEBUG] condition: playerLocation=${context.playerLocation}, batRoomId=${batRoomId}, result=${result}`);
      return result;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world, playerId, playerLocation } = context;
      const events: ISemanticEvent[] = [];
      console.log(`[BAT DEBUG] run called: playerId=${playerId}, playerLocation=${playerLocation}`);

      // Check if we already acted this turn
      if (world.getStateValue(BAT_ACTED_KEY)) {
        return events;
      }

      // Check if player just entered (previous location was different)
      const prevLocation = world.getStateValue(BAT_PREV_LOCATION_KEY);
      if (prevLocation === batRoomId) {
        // Player was already here - don't act again
        return events;
      }

      // Player just entered bat room - bat will act!
      world.setStateValue(BAT_ACTED_KEY, true);
      world.setStateValue(BAT_PREV_LOCATION_KEY, batRoomId);

      if (playerHasGarlic(world, playerId)) {
        // Bat cowers from the garlic
        events.push({
          id: generateEventId(),
          type: 'npc.emoted',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: BatMessages.COWERS
          },
          narrate: true
        });
      } else {
        // Bat attacks and carries player away!
        events.push({
          id: generateEventId(),
          type: 'npc.emoted',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: BatMessages.ATTACKS
          },
          narrate: true
        });

        // Pick a random destination
        const destination = getRandomDropLocation(undergroundRoomIds, batRoomId);

        events.push({
          id: generateEventId(),
          type: 'npc.emoted',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: BatMessages.CARRIES_AWAY
          },
          narrate: true
        });

        // Move the player
        world.moveEntity(playerId, destination);

        // Update tracking so we don't trigger again immediately
        world.setStateValue(BAT_PREV_LOCATION_KEY, destination);

        // Show the new room
        const destRoom = world.getEntity(destination);
        const destIdentity = destRoom?.get(IdentityTrait);
        events.push({
          id: generateEventId(),
          type: 'if.event.room.description',
          timestamp: Date.now(),
          entities: {},
          data: {
            roomId: destination,
            roomName: destIdentity?.name || 'somewhere',
            roomDescription: destIdentity?.description || '',
            includeContents: true,
            verbose: true
          },
          narrate: true
        });
      }

      return events;
    }
  };

  // Also create a daemon to reset the bat acted flag at end of turn
  const resetDaemon: Daemon = {
    id: 'dungeo-bat-reset',
    name: 'Bat State Reset',
    priority: 200, // Run after everything else

    condition: (_context: SchedulerContext): boolean => {
      return true; // Always run
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      // Reset the acted flag for next turn
      context.world.setStateValue(BAT_ACTED_KEY, false);

      // Update previous location tracking
      context.world.setStateValue(BAT_PREV_LOCATION_KEY, context.playerLocation);

      return [];
    }
  };

  scheduler.registerDaemon(daemon);
  scheduler.registerDaemon(resetDaemon);
}
