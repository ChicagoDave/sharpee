/**
 * Dam Draining Sequence - ADR-071 Phase 2
 *
 * Correct puzzle sequence (matching Mainframe Zork):
 * 1. Player presses YELLOW button in Maintenance Room - enables bolt at Dam
 * 2. Player goes to Dam and turns bolt with wrench - starts draining
 *
 * When the bolt is turned (after pressing the yellow button), a multi-stage
 * draining sequence begins:
 *
 * Stage 1 (turn 0): "The sluice gates open and water begins draining from the reservoir."
 * Stage 2 (turn 5): "The water level is dropping rapidly now."
 * Stage 3 (turn 8): "The reservoir is nearly empty."
 * Stage 4 (turn 10): "The last of the water drains away, revealing a trunk in the mud!"
 *
 * After completion:
 * - Reservoir room description changes to show it's drained
 * - Trunk of jewels becomes visible/accessible
 * - Reservoir passable by walking (no boat needed)
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import { WorldModel, RoomTrait, IdentityTrait, IWorldModel } from '@sharpee/world-model';
import { ISchedulerService, Fuse, SchedulerContext } from '@sharpee/engine';
import { DungeoSchedulerMessages } from './scheduler-messages';

// Fuse IDs
const DAM_DRAIN_STAGE_1 = 'dungeo.dam.drain.stage1';
const DAM_DRAIN_STAGE_2 = 'dungeo.dam.drain.stage2';
const DAM_DRAIN_STAGE_3 = 'dungeo.dam.drain.stage3';

// Timing constants (in turns after button press)
const STAGE_2_DELAY = 5;
const STAGE_3_DELAY = 3;  // 3 turns after stage 2
const STAGE_4_DELAY = 2;  // 2 turns after stage 3

// Dam state key for world capability
export const DAM_STATE_KEY = 'dungeo.dam.state';

export interface DamState {
  isDraining: boolean;
  isDrained: boolean;
  buttonPressed: boolean;  // Yellow button pressed - enables bolt at Dam
  // Flooding state (blue button)
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
 * Start the dam draining sequence
 *
 * Call this when the player presses the yellow button.
 * Returns events to emit immediately (the initial draining message).
 */
export function startDamDraining(
  scheduler: ISchedulerService,
  world: WorldModel,
  reservoirId: EntityId
): ISemanticEvent[] {
  // Get or create dam state
  let damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  if (!damState) {
    damState = { isDraining: false, isDrained: false, buttonPressed: false, floodingLevel: 0, isFlooded: false };
    world.registerCapability(DAM_STATE_KEY, { initialData: damState });
  }

  // Don't start if already draining or drained
  if (damState.isDraining || damState.isDrained) {
    return [];
  }

  // Mark as draining
  damState.isDraining = true;

  // Schedule stage 2 (water dropping)
  scheduler.setFuse({
    id: DAM_DRAIN_STAGE_1,
    name: 'Dam Draining - Stage 2',
    turns: STAGE_2_DELAY,
    priority: 15,
    trigger: (ctx: SchedulerContext): ISemanticEvent[] => {
      // Schedule stage 3
      scheduler.setFuse({
        id: DAM_DRAIN_STAGE_2,
        name: 'Dam Draining - Stage 3',
        turns: STAGE_3_DELAY,
        priority: 15,
        trigger: (ctx2: SchedulerContext): ISemanticEvent[] => {
          // Schedule final stage
          scheduler.setFuse({
            id: DAM_DRAIN_STAGE_3,
            name: 'Dam Draining - Complete',
            turns: STAGE_4_DELAY,
            priority: 15,
            trigger: (ctx3: SchedulerContext): ISemanticEvent[] => {
              return completeDamDraining(ctx3.world, reservoirId);
            }
          });

          return [{
            id: `dam-nearly-empty-${ctx2.turn}`,
            type: 'scheduler.fuse.triggered',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: DungeoSchedulerMessages.DAM_NEARLY_EMPTY,
              fuseId: DAM_DRAIN_STAGE_2
            }
          }];
        }
      });

      return [{
        id: `dam-draining-${ctx.turn}`,
        type: 'scheduler.fuse.triggered',
        timestamp: Date.now(),
        entities: {},
        data: {
          messageId: DungeoSchedulerMessages.DAM_DRAINING,
          fuseId: DAM_DRAIN_STAGE_1
        }
      }];
    }
  });

  // Return the initial draining event
  return [{
    id: `dam-gates-open-${Date.now()}`,
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: DungeoSchedulerMessages.DAM_DRAINING
    }
  }];
}

/**
 * Complete the dam draining - update world state
 */
function completeDamDraining(
  world: WorldModel,
  reservoirId: EntityId
): ISemanticEvent[] {
  // Update dam state
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  if (damState) {
    damState.isDraining = false;
    damState.isDrained = true;
  }

  // Update reservoir room description
  const reservoir = world.getEntity(reservoirId);
  if (reservoir) {
    const identity = reservoir.get(IdentityTrait);
    if (identity) {
      identity.description = 'This is the bed of a large reservoir, now drained. The muddy bottom stretches in all directions. You can walk freely here now that the water is gone.';
    }

    // Mark reservoir as passable without boat
    const roomTrait = reservoir.get(RoomTrait);
    if (roomTrait) {
      (roomTrait as any).requiresBoat = false;
    }
  }

  // Make trunk visible (it was created but hidden)
  // Find the trunk and ensure it's accessible
  const trunk = world.getAllEntities().find(e => {
    const id = e.get('identity') as { name?: string } | undefined;
    return id?.name === 'trunk';
  });

  if (trunk) {
    // Update trunk description
    const trunkIdentity = trunk.get(IdentityTrait);
    if (trunkIdentity) {
      trunkIdentity.description = 'This is an old trunk, covered in mud and sediment from the drained reservoir. It appears to contain a fortune in jewels!';
    }
    // Ensure trunk is in the reservoir room
    world.moveEntity(trunk.id, reservoirId);
    // Mark trunk as visible/accessible
    (trunk as any).revealed = true;
  }

  return [{
    id: `dam-empty-trunk-${Date.now()}`,
    type: 'scheduler.fuse.triggered',
    timestamp: Date.now(),
    entities: { target: trunk?.id },
    data: {
      messageId: DungeoSchedulerMessages.DAM_TRUNK_REVEALED,
      fuseId: DAM_DRAIN_STAGE_3,
      trunkRevealed: true,
      trunkId: trunk?.id
    }
  }];
}

/**
 * Check if the dam is drained
 */
export function isDamDrained(world: WorldModel): boolean {
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return damState?.isDrained ?? false;
}

/**
 * Check if the dam is currently draining
 */
export function isDamDraining(world: WorldModel): boolean {
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return damState?.isDraining ?? false;
}

/**
 * Check if the yellow button has been pressed (bolt is enabled)
 */
export function isYellowButtonPressed(world: WorldModel): boolean {
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return damState?.buttonPressed ?? false;
}

/**
 * Check if flooding has started
 */
export function isFloodingStarted(world: WorldModel): boolean {
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return (damState?.floodingLevel ?? 0) > 0;
}

/**
 * Check if the maintenance room is permanently flooded
 */
export function isMaintenanceFlooded(world: WorldModel): boolean {
  const damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  return damState?.isFlooded ?? false;
}

/**
 * Get the water level message based on flooding level
 */
function getWaterLevelMessage(level: number): string {
  // FORTRAN: message 71 + (RVMNT/2), where 71=ankles, 72=shins, etc.
  // level starts at 1, so: level 1-2 → ankles, 3-4 → shins, etc.
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
 * Start the maintenance room flooding sequence
 *
 * Called when the blue button is pressed. Starts a daemon that
 * raises the water level each turn. Player drowns if they don't escape.
 *
 * From FORTRAN source (objects.for line 34400):
 * - Sets RVMNT=1 (flooding counter)
 * - Enables CEVMNT daemon with CTICK=-1 (runs every turn)
 * - Makes leak visible
 */
export function startFlooding(
  scheduler: ISchedulerService,
  world: WorldModel,
  maintenanceRoomId: EntityId,
  leakId?: EntityId
): ISemanticEvent[] {
  // Get dam state
  let damState = world.getCapability(DAM_STATE_KEY) as DamState | null;
  if (!damState) {
    damState = { isDraining: false, isDrained: false, buttonPressed: false, floodingLevel: 0, isFlooded: false };
    world.registerCapability(DAM_STATE_KEY, { initialData: damState });
  }

  // Already flooding or flooded? Button jammed
  if (damState.floodingLevel > 0 || damState.isFlooded) {
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
  damState.floodingLevel = 1;
  damState.floodingJustStarted = true;  // Skip daemon on button press turn

  // Make leak visible if it exists
  if (leakId) {
    const leak = world.getEntity(leakId);
    if (leak) {
      const identity = leak.get(IdentityTrait);
      if (identity) {
        // Remove hidden flag if any
        (leak as any).isHidden = false;
      }
    }
  }

  // Start the flooding daemon (runs every turn)
  scheduler.registerDaemon({
    id: FLOODING_DAEMON_ID,
    name: 'Maintenance Room Flooding',
    priority: 20,  // High priority - death trap!
    run: (ctx: SchedulerContext): ISemanticEvent[] => {
      const state = ctx.world.getCapability(DAM_STATE_KEY) as DamState | null;
      if (!state || state.floodingLevel === 0) {
        return [];
      }

      // Skip first daemon run (button press turn)
      if (state.floodingJustStarted) {
        state.floodingJustStarted = false;
        return [];
      }

      const events: ISemanticEvent[] = [];
      const player = ctx.world.getPlayer();
      if (!player) return [];
      const playerId = player.id;
      const playerLocation = ctx.world.getLocation(playerId);
      const inMaintenanceRoom = playerLocation === maintenanceRoomId;

      // Show water level message if player is in the room
      if (inMaintenanceRoom && state.floodingLevel > 0) {
        events.push({
          id: `flooding-level-${ctx.turn}`,
          type: 'game.message',  // Use game.message so text service renders it
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: getWaterLevelMessage(state.floodingLevel),
            daemonId: FLOODING_DAEMON_ID,
            floodingLevel: state.floodingLevel
          }
        });
      }

      // Increment water level by 2 (matches FORTRAN RVMNT progression)
      state.floodingLevel += 2;

      // Check for drowning (level > 16)
      if (state.floodingLevel > FLOOD_MAX_LEVEL) {
        // Disable daemon
        scheduler.removeDaemon(FLOODING_DAEMON_ID);

        // Mark room as flooded
        state.isFlooded = true;
        state.floodingLevel = FLOOD_MAX_LEVEL + 1;

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
          // Show drowning message
          events.push({
            id: `flooding-drowned-${ctx.turn}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: FloodingMessages.DROWNED
            }
          });
          // Then trigger death
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

/**
 * Register dam event handlers
 *
 * Correct sequence (matching Mainframe Zork):
 * 1. Press yellow button in Maintenance Room → enables bolt
 * 2. Turn bolt with wrench at Dam → starts draining
 *
 * Call this from story.onEngineReady().
 */
export function registerDamHandlers(
  scheduler: ISchedulerService,
  world: WorldModel,
  reservoirId: EntityId
): void {
  // Initialize dam state capability
  world.registerCapability(DAM_STATE_KEY, {
    initialData: {
      isDraining: false,
      isDrained: false,
      buttonPressed: false,
      floodingLevel: 0,
      isFlooded: false
    } as DamState
  });

  // Handler for pressing the yellow button (in Maintenance Room)
  // This enables the bolt at the Dam to be turned
  world.registerEventHandler('dungeo.button.yellow.pressed', (event, w: IWorldModel) => {
    const damState = w.getCapability(DAM_STATE_KEY) as DamState | null;
    if (damState) {
      damState.buttonPressed = true;
      // The green bubble on the control panel now glows, indicating bolt is enabled
    }
  });

  // Handler for turning the bolt (at the Dam)
  // This only works if the yellow button was pressed first
  world.registerEventHandler('dungeo.bolt.turned', (event, w: IWorldModel) => {
    const damState = w.getCapability(DAM_STATE_KEY) as DamState | null;

    // Bolt only turns if yellow button was pressed (green bubble glowing)
    if (!damState?.buttonPressed) {
      // Bolt won't budge - yellow button not pressed yet
      return;
    }

    // Start the draining sequence
    startDamDraining(scheduler, w as WorldModel, reservoirId);
  });
}
