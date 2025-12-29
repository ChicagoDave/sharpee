/**
 * Forest Ambience Daemon - ADR-071 Phase 2
 *
 * When the player is in a forest location, there's a small chance each turn
 * of hearing ambient forest sounds. This adds atmosphere without being annoying.
 *
 * Sounds include:
 * - Bird chirping
 * - Leaves rustling
 * - Breeze through branches
 * - Branch cracking
 *
 * Probability: ~15% chance per turn in forest
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, RoomTrait } from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/engine';
import { DungeoSchedulerMessages } from './scheduler-messages';

// Daemon ID
const FOREST_AMBIENCE_DAEMON = 'dungeo.forest.ambience';

// Configuration
const AMBIENCE_PROBABILITY = 0.15;  // 15% chance per turn

// Forest room IDs - these will be set during registration
let forestRoomIds: Set<string> = new Set();

/**
 * Forest ambience messages with relative weights
 */
const FOREST_SOUNDS = [
  { messageId: DungeoSchedulerMessages.FOREST_BIRD, weight: 4 },
  { messageId: DungeoSchedulerMessages.FOREST_RUSTLE, weight: 3 },
  { messageId: DungeoSchedulerMessages.FOREST_BREEZE, weight: 2 },
  { messageId: DungeoSchedulerMessages.FOREST_BRANCH, weight: 1 },
];

/**
 * Pick a random sound based on weights
 */
function pickRandomSound(ctx: SchedulerContext): string {
  const totalWeight = FOREST_SOUNDS.reduce((sum, s) => sum + s.weight, 0);
  let random = ctx.random.next() * totalWeight;

  for (const sound of FOREST_SOUNDS) {
    random -= sound.weight;
    if (random <= 0) {
      return sound.messageId;
    }
  }

  return FOREST_SOUNDS[0].messageId;
}

/**
 * Check if a location is a forest room
 */
function isForestRoom(locationId: string, world: WorldModel): boolean {
  // First check our known forest room IDs
  if (forestRoomIds.has(locationId)) {
    return true;
  }

  // Fallback: check if the room is outdoors and has "forest" in name/aliases
  const room = world.getEntity(locationId);
  if (!room) return false;

  const roomTrait = room.get(RoomTrait);
  if (!roomTrait?.isOutdoors) return false;

  const identity = room.get('identity') as { name?: string; aliases?: string[] } | undefined;
  if (!identity) return false;

  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];

  return name.includes('forest') ||
         name.includes('clearing') ||
         name.includes('tree') ||
         aliases.some(a => a.toLowerCase().includes('forest'));
}

/**
 * Create the forest ambience daemon
 */
function createForestAmbienceDaemon(): Daemon {
  return {
    id: FOREST_AMBIENCE_DAEMON,
    name: 'Forest Ambience',
    priority: 1,  // Low priority, runs after more important things

    // Only run when player is in a forest location
    condition: (ctx: SchedulerContext): boolean => {
      return isForestRoom(ctx.playerLocation, ctx.world);
    },

    // Emit ambient sound with some probability
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      // Roll for ambience
      if (!ctx.random.chance(AMBIENCE_PROBABILITY)) {
        return [];
      }

      // Pick a random forest sound
      const messageId = pickRandomSound(ctx);

      return [{
        id: `forest-ambience-${ctx.turn}`,
        type: 'ambient',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId,
          daemonId: FOREST_AMBIENCE_DAEMON,
          isAmbient: true
        }
      }];
    }
  };
}

/**
 * Register the forest ambience daemon
 *
 * Call this from story.onEngineReady() with the forest room IDs.
 */
export function registerForestAmbienceDaemon(
  scheduler: ISchedulerService,
  roomIds: string[]
): void {
  // Store the forest room IDs for quick lookup
  forestRoomIds = new Set(roomIds);

  // Register the daemon
  scheduler.registerDaemon(createForestAmbienceDaemon());
}

/**
 * Check if the forest ambience daemon is active
 */
export function isForestAmbienceActive(scheduler: ISchedulerService): boolean {
  return scheduler.hasDaemon(FOREST_AMBIENCE_DAEMON);
}
