/**
 * Maintenance Room Flooding - ADR-071
 *
 * Blue button in Maintenance Room triggers flooding sequence.
 * Water rises each turn until player drowns or escapes.
 *
 * From FORTRAN source (objects.for line 34400):
 * - Sets RVMNT=1 (flooding counter)
 * - Enables CEVMNT daemon with CTICK=-1 (runs every turn)
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';
import { ISchedulerService, SchedulerContext } from '@sharpee/plugin-scheduler';

// Flooding state key
export const FLOODING_STATE_KEY = 'dungeo.maintenance.flooding.state';

export interface FloodingState {
  floodingLevel: number;   // 0 = not flooding, 1-16 = flooding, >16 = flooded
  isFlooded: boolean;      // Room permanently flooded
  floodingJustStarted?: boolean;  // Skip daemon on button press turn
}

// Flooding constants
const FLOODING_DAEMON_ID = 'dungeo.maintenance.flooding';
const FLOOD_MAX_LEVEL = 16;  // Death occurs when level > 16

// Water level messages (from FORTRAN: message 71 + (level/2))
export const FloodingMessages = {
  LEAK_STARTED: 'dungeo.flooding.leak_started',      // Message 233
  WATER_ANKLES: 'dungeo.flooding.water_ankles',      // Message 71
  WATER_SHINS: 'dungeo.flooding.water_shins',        // Message 72
  WATER_KNEES: 'dungeo.flooding.water_knees',        // Message 73
  WATER_HIPS: 'dungeo.flooding.water_hips',          // Message 74
  WATER_WAIST: 'dungeo.flooding.water_waist',        // Message 75
  WATER_CHEST: 'dungeo.flooding.water_chest',        // Message 76
  WATER_NECK: 'dungeo.flooding.water_neck',          // Message 77
  WATER_HEAD: 'dungeo.flooding.water_head',          // Message 78
  ROOM_FLOODED: 'dungeo.flooding.room_flooded',      // Message 80
  DROWNED: 'dungeo.flooding.drowned',                // Message 81
  BUTTON_JAMMED: 'dungeo.flooding.button_jammed',    // Message 234
} as const;

/**
 * Get the water level message based on flooding level
 */
function getWaterLevelMessage(level: number): string {
  // FORTRAN: message 71 + (RVMNT/2), where 71=ankles, 72=shins, etc.
  const msgIndex = Math.floor((level - 1) / 2);
  switch (msgIndex) {
    case 0: return FloodingMessages.WATER_ANKLES;
    case 1: return FloodingMessages.WATER_SHINS;
    case 2: return FloodingMessages.WATER_KNEES;
    case 3: return FloodingMessages.WATER_HIPS;
    case 4: return FloodingMessages.WATER_WAIST;
    case 5: return FloodingMessages.WATER_CHEST;
    case 6: return FloodingMessages.WATER_NECK;
    default: return FloodingMessages.WATER_HEAD;
  }
}

/**
 * Check if flooding has started
 */
export function isFloodingStarted(world: WorldModel): boolean {
  const state = world.getCapability(FLOODING_STATE_KEY) as FloodingState | null;
  return (state?.floodingLevel ?? 0) > 0;
}

/**
 * Check if the maintenance room is permanently flooded
 */
export function isMaintenanceFlooded(world: WorldModel): boolean {
  const state = world.getCapability(FLOODING_STATE_KEY) as FloodingState | null;
  return state?.isFlooded ?? false;
}

/**
 * Start the maintenance room flooding sequence
 *
 * Called when the blue button is pressed. Starts a daemon that
 * raises the water level each turn. Player drowns if they don't escape.
 */
export function startFlooding(
  scheduler: ISchedulerService,
  world: WorldModel,
  maintenanceRoomId: EntityId,
  leakId?: EntityId
): ISemanticEvent[] {
  // Get or create flooding state
  let state = world.getCapability(FLOODING_STATE_KEY) as FloodingState | null;
  if (!state) {
    state = { floodingLevel: 0, isFlooded: false };
    world.registerCapability(FLOODING_STATE_KEY, { initialData: state });
  }

  // Already flooding or flooded? Button jammed
  if (state.floodingLevel > 0 || state.isFlooded) {
    return [{
      id: `flooding-jammed-${Date.now()}`,
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: {
        messageId: FloodingMessages.BUTTON_JAMMED
      }
    }];
  }

  // Start flooding (RVMNT = 1)
  state.floodingLevel = 1;
  state.floodingJustStarted = true;

  // Make leak visible if it exists
  if (leakId) {
    const leak = world.getEntity(leakId);
    if (leak) {
      (leak as any).isHidden = false;
    }
  }

  // Start the flooding daemon (runs every turn)
  scheduler.registerDaemon({
    id: FLOODING_DAEMON_ID,
    name: 'Maintenance Room Flooding',
    priority: 20,  // High priority - death trap!
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const floodState = ctx.world.getCapability(FLOODING_STATE_KEY) as FloodingState | null;
      if (!floodState || floodState.floodingLevel === 0) {
        return [];
      }

      // Skip first daemon run (button press turn)
      if (floodState.floodingJustStarted) {
        floodState.floodingJustStarted = false;
        return [];
      }

      const events: ISemanticEvent[] = [];
      const player = ctx.world.getPlayer();
      if (!player) return [];
      const playerId = player.id;
      const playerLocation = ctx.world.getLocation(playerId);
      const inMaintenanceRoom = playerLocation === maintenanceRoomId;

      // Show water level message if player is in the room
      if (inMaintenanceRoom && floodState.floodingLevel > 0) {
        events.push({
          id: `flooding-level-${ctx.turn}`,
          type: 'game.message',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: getWaterLevelMessage(floodState.floodingLevel),
            daemonId: FLOODING_DAEMON_ID,
            floodingLevel: floodState.floodingLevel
          }
        });
      }

      // Increment water level by 2 (matches FORTRAN RVMNT progression)
      floodState.floodingLevel += 2;

      // Check for drowning (level > 16)
      if (floodState.floodingLevel > FLOOD_MAX_LEVEL) {
        // Disable daemon
        scheduler.removeDaemon(FLOODING_DAEMON_ID);

        // Mark room as flooded
        floodState.isFlooded = true;
        floodState.floodingLevel = FLOOD_MAX_LEVEL + 1;

        // Update room description
        const room = ctx.world.getEntity(maintenanceRoomId);
        if (room) {
          const identity = room.get(IdentityTrait);
          if (identity) {
            identity.description = 'The room is full of water and cannot be entered.';
          }
        }

        // If player is in the room, they drown
        if (inMaintenanceRoom) {
          events.push({
            id: `flooding-drowned-${ctx.turn}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: FloodingMessages.DROWNED
            }
          });
          events.push({
            id: `flooding-death-${ctx.turn}`,
            type: 'player.died',
            timestamp: Date.now(),
            entities: { actor: playerId },
            data: {
              cause: 'drowning',
              daemonId: FLOODING_DAEMON_ID
            }
          });
        }
      }

      return events;
    }
  });

  // Return the initial leak event
  return [{
    id: `flooding-started-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: FloodingMessages.LEAK_STARTED
    }
  }];
}
