/**
 * Trapdoor Auto-Close Handler
 *
 * When the player descends through the trap door from Living Room to Cellar,
 * the door crashes shut and is barred from above.
 *
 * Canonical message: "The door crashes shut, and you hear someone barring it."
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, OpenableTrait, IdentityTrait, RoomTrait, Direction } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';

export const TrapdoorMessages = {
  SLAMS_SHUT: 'dungeo.trapdoor.slams_shut',
} as const;

// State keys
const PREV_LOCATION_KEY = 'dungeo.trapdoor.prevLocation';
const TRAPDOOR_BARRED_KEY = 'dungeo.trapdoor.barred';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `trapdoor-${Date.now()}-${++eventCounter}`;
}

/**
 * Find the trap door entity
 */
function findTrapdoor(world: WorldModel): string | null {
  for (const entity of world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === 'trap door') {
      return entity.id;
    }
  }
  return null;
}

/**
 * Register the trap door auto-close daemon
 */
export function registerTrapdoorHandler(
  scheduler: ISchedulerService,
  livingRoomId: string,
  cellarId: string
): void {
  const closeDaemon: Daemon = {
    id: 'dungeo-trapdoor-autoclose',
    name: 'Trapdoor Auto-Close',
    priority: 80, // Run early, before other movement effects

    // Only run when player just went from Living Room to Cellar
    condition: (context: SchedulerContext): boolean => {
      const prevLocation = context.world.getStateValue(PREV_LOCATION_KEY);
      const isBarred = context.world.getStateValue(TRAPDOOR_BARRED_KEY);

      // Only trigger once - if already barred, skip
      if (isBarred) return false;

      // Check if player was in Living Room and is now in Cellar
      return prevLocation === livingRoomId && context.playerLocation === cellarId;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world } = context;
      const events: ISemanticEvent[] = [];

      // Find and close the trap door
      const trapdoorId = findTrapdoor(world);
      if (trapdoorId) {
        const trapdoor = world.getEntity(trapdoorId);
        if (trapdoor) {
          const openable = trapdoor.get(OpenableTrait);
          if (openable) {
            openable.isOpen = false;
          }
          // Update description
          const identity = trapdoor.get(IdentityTrait);
          if (identity) {
            identity.description = 'The dusty cover of a closed trap door.';
          }
        }
      }

      // Remove the UP exit from Cellar (barred from above)
      const cellar = world.getEntity(cellarId);
      if (cellar) {
        const roomTrait = cellar.get(RoomTrait);
        if (roomTrait && roomTrait.exits) {
          delete roomTrait.exits[Direction.UP];
        }
      }

      // Mark as barred
      world.setStateValue(TRAPDOOR_BARRED_KEY, true);

      // Emit the slam message
      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: TrapdoorMessages.SLAMS_SHUT
        },
        narrate: true
      });

      return events;
    }
  };

  // Track player's previous location each turn
  const trackingDaemon: Daemon = {
    id: 'dungeo-trapdoor-tracking',
    name: 'Trapdoor Location Tracking',
    priority: -100, // Run at end of turn

    condition: (_context: SchedulerContext): boolean => {
      return true; // Always run
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      context.world.setStateValue(PREV_LOCATION_KEY, context.playerLocation);
      return [];
    }
  };

  scheduler.registerDaemon(closeDaemon);
  scheduler.registerDaemon(trackingDaemon);
}
