/**
 * Round Room (Carousel Room) Handler
 *
 * When `isFixed` is false, compass directions don't work normally.
 * Any attempt to leave the Round Room results in being deposited at
 * a random exit, with the message "Your compass is spinning wildly."
 *
 * The room is "fixed" when the robot pushes the button (not yet implemented).
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, RoomTrait, IdentityTrait, Direction, DirectionType } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';
import { RoundRoomTrait } from '../traits';

export const RoundRoomMessages = {
  COMPASS_SPINNING: 'dungeo.round_room.compass_spinning',
  DISORIENTED: 'dungeo.round_room.disoriented',
  ROOM_FIXED: 'dungeo.round_room.fixed',
} as const;

// State keys
const ROUND_ROOM_PREV_LOCATION_KEY = 'dungeo.round_room.prevLocation';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `round-room-${Date.now()}-${++eventCounter}`;
}

/**
 * Get all valid exit destinations from the Round Room
 */
function getValidExits(world: WorldModel, roundRoomId: string): string[] {
  const roundRoom = world.getEntity(roundRoomId);
  if (!roundRoom) return [];

  const roomTrait = roundRoom.get(RoomTrait);
  if (!roomTrait || !roomTrait.exits) return [];

  const destinations: string[] = [];
  for (const exit of Object.values(roomTrait.exits)) {
    if (exit && typeof exit === 'object' && 'destination' in exit) {
      destinations.push(exit.destination);
    }
  }

  return destinations;
}

/**
 * Pick a random exit destination from the Round Room
 */
function getRandomExit(world: WorldModel, roundRoomId: string, excludeId?: string): string | null {
  const exits = getValidExits(world, roundRoomId);

  // Filter out the excluded destination (so we don't send them where they were trying to go)
  const validExits = excludeId
    ? exits.filter(id => id !== excludeId)
    : exits;

  if (validExits.length === 0) {
    return exits.length > 0 ? exits[0] : null;
  }

  const randomIndex = Math.floor(Math.random() * validExits.length);
  return validExits[randomIndex];
}

/**
 * Check if the Round Room is fixed (exits work normally)
 */
function isRoomFixed(world: WorldModel, roundRoomId: string): boolean {
  const roundRoom = world.getEntity(roundRoomId);
  if (!roundRoom) return true; // Default to fixed if room not found

  // Check the isFixed flag via RoundRoomTrait
  const trait = roundRoom.get(RoundRoomTrait);
  return trait?.isFixed === true;
}

/**
 * Register the Round Room randomization daemon
 */
export function registerRoundRoomHandler(
  scheduler: ISchedulerService,
  roundRoomId: string
): void {
  const daemon: Daemon = {
    id: 'dungeo-round-room',
    name: 'Round Room Carousel',
    priority: 60, // Run before bat handler (50) to catch movement first

    // Only run when player just left the Round Room
    condition: (context: SchedulerContext): boolean => {
      const prevLocation = context.world.getStateValue(ROUND_ROOM_PREV_LOCATION_KEY);

      // Check if player was in Round Room and is now somewhere else
      return prevLocation === roundRoomId &&
             context.playerLocation !== roundRoomId;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world, playerId, playerLocation } = context;
      const events: ISemanticEvent[] = [];

      // Check if the room is fixed - if so, exits work normally
      if (isRoomFixed(world, roundRoomId)) {
        return events;
      }

      // Room is spinning! Randomize the destination
      const intendedDestination = playerLocation;
      const randomDestination = getRandomExit(world, roundRoomId, intendedDestination);

      if (!randomDestination || randomDestination === intendedDestination) {
        // No valid alternative destination, or randomly picked the same one
        // Just emit the spinning message but let them stay
        events.push({
          id: generateEventId(),
          type: 'game.message',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: RoundRoomMessages.COMPASS_SPINNING
          },
          narrate: true
        });
        return events;
      }

      // Emit spinning message
      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: RoundRoomMessages.COMPASS_SPINNING
        },
        narrate: true
      });

      // Move the player to the random destination
      world.moveEntity(playerId, randomDestination);

      // Emit disoriented message
      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: RoundRoomMessages.DISORIENTED
        },
        narrate: true
      });

      // Update tracking to prevent infinite loops
      world.setStateValue(ROUND_ROOM_PREV_LOCATION_KEY, randomDestination);

      // Show the new room
      const destRoom = world.getEntity(randomDestination);
      const destIdentity = destRoom?.get(IdentityTrait);
      events.push({
        id: generateEventId(),
        type: 'if.event.room.description',
        timestamp: Date.now(),
        entities: {},
        data: {
          roomId: randomDestination,
          roomName: destIdentity?.name || 'somewhere',
          roomDescription: destIdentity?.description || '',
          includeContents: true,
          verbose: true
        },
        narrate: true
      });

      return events;
    }
  };

  // Track player's previous location each turn
  const trackingDaemon: Daemon = {
    id: 'dungeo-round-room-tracking',
    name: 'Round Room Location Tracking',
    priority: -100, // Run at end of turn

    condition: (_context: SchedulerContext): boolean => {
      return true; // Always run
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      // Update previous location tracking for next turn
      context.world.setStateValue(ROUND_ROOM_PREV_LOCATION_KEY, context.playerLocation);
      return [];
    }
  };

  scheduler.registerDaemon(daemon);
  scheduler.registerDaemon(trackingDaemon);
}
