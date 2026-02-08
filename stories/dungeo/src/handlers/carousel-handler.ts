/**
 * Low Room Carousel Handler (MAGNET-ROOM in MDL)
 *
 * When the carousel is active, compass directions in the Low Room are
 * scrambled — any exit randomly leads to Machine Room or Tea Room (50/50).
 * The robot must push the triangular button in Machine Room to fix this.
 *
 * MDL source: act3.199:167-191 (MAGNET-ROOM + MAGNET-ROOM-EXIT)
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';

export const CarouselMessages = {
  COMPASS_SPINNING: 'dungeo.carousel.compass_spinning',
  CANNOT_GET_BEARINGS: 'dungeo.carousel.cannot_get_bearings',
} as const;

// State keys
const CAROUSEL_ACTIVE_KEY = 'dungeo.carousel.active';
const CAROUSEL_PREV_LOCATION_KEY = 'dungeo.carousel.prevLocation';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `carousel-${Date.now()}-${++eventCounter}`;
}

/**
 * Check if the carousel is active (exits randomized)
 */
function isCarouselActive(world: WorldModel): boolean {
  const active = world.getStateValue(CAROUSEL_ACTIVE_KEY) as boolean | undefined;
  return active ?? false; // Canonical: Low Room carousel starts inactive (MDL CAROUSEL-FLIP-FLAG = FALSE)
}

/**
 * Pick a random destination: Machine Room or Tea Room (50/50)
 */
function getRandomDestination(machineRoomId: string, teaRoomId: string): string {
  return Math.random() < 0.5 ? machineRoomId : teaRoomId;
}

/**
 * Register the Low Room carousel handler
 */
export function registerCarouselHandler(
  scheduler: ISchedulerService,
  lowRoomId: string,
  machineRoomId: string,
  teaRoomId: string
): void {
  // ============================================================
  // Exit Daemon: Randomize destination when leaving Low Room
  // ============================================================
  const exitDaemon: Daemon = {
    id: 'dungeo-carousel-exit',
    name: 'Low Room Carousel Exit',
    priority: 60,

    condition: (context: SchedulerContext): boolean => {
      const prevLocation = context.world.getStateValue(CAROUSEL_PREV_LOCATION_KEY);
      return prevLocation === lowRoomId &&
             context.playerLocation !== lowRoomId;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      const { world, playerId, playerLocation } = context;

      if (!isCarouselActive(world)) {
        return []; // Carousel off, exits work normally
      }

      const events: ISemanticEvent[] = [];

      // Pick random destination (may be the same as where they ended up)
      const randomDest = getRandomDestination(machineRoomId, teaRoomId);

      // Emit "cannot get your bearings" message
      events.push({
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: CarouselMessages.CANNOT_GET_BEARINGS
        },
        narrate: true
      });

      // Move player to random destination if different from where they went
      if (randomDest !== playerLocation) {
        world.moveEntity(playerId, randomDest);
      }

      // Show the destination room
      const destRoom = world.getEntity(randomDest);
      const destIdentity = destRoom?.get(IdentityTrait);
      events.push({
        id: generateEventId(),
        type: 'if.event.room.description',
        timestamp: Date.now(),
        entities: {},
        data: {
          roomId: randomDest,
          roomName: destIdentity?.name || 'somewhere',
          roomDescription: destIdentity?.description || '',
          includeContents: true,
          verbose: true
        },
        narrate: true
      });

      // Update tracking to prevent infinite loops
      world.setStateValue(CAROUSEL_PREV_LOCATION_KEY, randomDest);

      return events;
    }
  };

  // ============================================================
  // Entry Daemon: Show compass spinning message when entering
  // ============================================================
  const entryDaemon: Daemon = {
    id: 'dungeo-carousel-entry',
    name: 'Low Room Carousel Entry',
    priority: 55,

    condition: (context: SchedulerContext): boolean => {
      const prevLocation = context.world.getStateValue(CAROUSEL_PREV_LOCATION_KEY);
      return context.playerLocation === lowRoomId &&
             prevLocation !== lowRoomId;
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      if (!isCarouselActive(context.world)) {
        return []; // Carousel off, no message
      }

      return [{
        id: generateEventId(),
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: CarouselMessages.COMPASS_SPINNING
        },
        narrate: true
      }];
    }
  };

  // ============================================================
  // Tracking Daemon: Record player location each turn
  // ============================================================
  const trackingDaemon: Daemon = {
    id: 'dungeo-carousel-tracking',
    name: 'Low Room Carousel Tracking',
    priority: -100, // Run at end of turn

    condition: (): boolean => {
      return true; // Always run
    },

    run: (context: SchedulerContext): ISemanticEvent[] => {
      context.world.setStateValue(CAROUSEL_PREV_LOCATION_KEY, context.playerLocation);
      return [];
    }
  };

  scheduler.registerDaemon(exitDaemon);
  scheduler.registerDaemon(entryDaemon);
  scheduler.registerDaemon(trackingDaemon);
}
