/**
 * Inside Mirror Handler
 *
 * The Inside Mirror is a rotating/sliding box puzzle:
 * - Short pole controls rotation lock
 * - Red/Yellow panels rotate the box 45 degrees
 * - Mahogany/Pine panels move the box along the groove
 * - Exit north only when aligned N-S at position 3
 *
 * Based on Dungeon FORTRAN mechanics (objects.for):
 * - MDIR: direction (0=N, 45=NE, 90=E, etc)
 * - MLOC: position (0-3 along groove)
 * - POLEUF: pole state (0=lowered in channel, 1=on floor, 2=raised)
 */

import { ISemanticEvent, EntityId } from '@sharpee/core';
import {
  WorldModel,
  IdentityTrait,
  RoomTrait,
  Direction
} from '@sharpee/world-model';
import { ISchedulerService, Daemon, SchedulerContext } from '@sharpee/plugin-scheduler';

export const InsideMirrorMessages = {
  // Pole operations
  POLE_RAISED: 'dungeo.mirror.pole_raised',
  POLE_LOWERED_CHANNEL: 'dungeo.mirror.pole_lowered_channel',
  POLE_LOWERED_FLOOR: 'dungeo.mirror.pole_lowered_floor',
  POLE_ALREADY_RAISED: 'dungeo.mirror.pole_already_raised',
  POLE_ALREADY_LOWERED: 'dungeo.mirror.pole_already_lowered',
  POLE_CANT_LOWER: 'dungeo.mirror.pole_cant_lower',

  // Panel operations
  BOX_ROTATES: 'dungeo.mirror.box_rotates',
  BOX_MOVES: 'dungeo.mirror.box_moves',
  BOX_CANT_ROTATE: 'dungeo.mirror.box_cant_rotate',
  BOX_CANT_MOVE_UNLOCKED: 'dungeo.mirror.box_cant_move_unlocked',
  BOX_CANT_MOVE_ORIENTATION: 'dungeo.mirror.box_cant_move_orientation',
  BOX_AT_END: 'dungeo.mirror.box_at_end',

  // Entry/Exit
  ENTER_MIRROR: 'dungeo.mirror.enter',
  EXIT_MIRROR: 'dungeo.mirror.exit',
  CANT_EXIT: 'dungeo.mirror.cant_exit',
  NO_MIRROR_HERE: 'dungeo.mirror.no_mirror_here',

  // T-bar compass indicator
  TBAR_DIRECTION: 'dungeo.mirror.tbar_direction',
} as const;

// State keys
const DIRECTION_KEY = 'insideMirror.direction';
const POSITION_KEY = 'insideMirror.position';
const POLE_STATE_KEY = 'insideMirror.poleState';

// Feedback flags
const POLE_RAISED_KEY = 'insideMirror.poleJustRaised';
const POLE_LOWERED_KEY = 'insideMirror.poleJustLowered';
const BOX_ROTATED_KEY = 'insideMirror.boxJustRotated';
const BOX_MOVED_KEY = 'insideMirror.boxJustMoved';
const ENTERED_MIRROR_KEY = 'insideMirror.justEntered';
const EXITED_MIRROR_KEY = 'insideMirror.justExited';
const ACTION_BLOCKED_KEY = 'insideMirror.actionBlocked';
const BLOCKED_MESSAGE_KEY = 'insideMirror.blockedMessage';

// Pole states
const POLE_LOWERED = 0;    // In channel (locks rotation, enables movement)
const POLE_ON_FLOOR = 1;   // On floor (does nothing)
const POLE_RAISED = 2;     // Raised (enables rotation)

// Directions (in degrees)
const DIR_NORTH = 0;
const DIR_NORTHEAST = 45;
const DIR_EAST = 90;
const DIR_SOUTHEAST = 135;
const DIR_SOUTH = 180;
const DIR_SOUTHWEST = 225;
const DIR_WEST = 270;
const DIR_NORTHWEST = 315;

/**
 * Get the current mirror state
 */
export function getMirrorState(world: WorldModel): {
  direction: number;
  position: number;
  poleState: number;
} {
  return {
    direction: (world.getStateValue(DIRECTION_KEY) as number) || 0,
    position: (world.getStateValue(POSITION_KEY) as number) || 0,
    poleState: (world.getStateValue(POLE_STATE_KEY) as number) ?? POLE_ON_FLOOR
  };
}

/**
 * Check if direction is N-S aligned (0 or 180 degrees)
 */
function isNorthSouthAligned(direction: number): boolean {
  return direction === DIR_NORTH || direction === DIR_SOUTH;
}

/**
 * Check if the player can exit the mirror to the north
 */
export function canExitMirror(world: WorldModel): boolean {
  const state = getMirrorState(world);
  // Must be at position 3 (end of groove) and facing north
  return state.position === 3 && state.direction === DIR_NORTH;
}

/**
 * Get direction name for T-bar indicator
 */
function getDirectionName(direction: number): string {
  const names: Record<number, string> = {
    [DIR_NORTH]: 'north',
    [DIR_NORTHEAST]: 'northeast',
    [DIR_EAST]: 'east',
    [DIR_SOUTHEAST]: 'southeast',
    [DIR_SOUTH]: 'south',
    [DIR_SOUTHWEST]: 'southwest',
    [DIR_WEST]: 'west',
    [DIR_NORTHWEST]: 'northwest'
  };
  return names[direction] || 'north';
}

/**
 * Raise the short pole
 */
export function raisePole(world: WorldModel): { success: boolean; message: string } {
  const state = getMirrorState(world);

  if (state.poleState === POLE_RAISED) {
    return { success: false, message: InsideMirrorMessages.POLE_ALREADY_RAISED };
  }

  world.setStateValue(POLE_STATE_KEY, POLE_RAISED);
  world.setStateValue(POLE_RAISED_KEY, true);
  return { success: true, message: InsideMirrorMessages.POLE_RAISED };
}

/**
 * Lower the short pole
 */
export function lowerPole(world: WorldModel): { success: boolean; message: string } {
  const state = getMirrorState(world);

  if (state.poleState === POLE_LOWERED) {
    return { success: false, message: InsideMirrorMessages.POLE_ALREADY_LOWERED };
  }

  // Can only lower into channel if N-S aligned
  if (isNorthSouthAligned(state.direction)) {
    world.setStateValue(POLE_STATE_KEY, POLE_LOWERED);
    world.setStateValue(POLE_LOWERED_KEY, 'channel');
    return { success: true, message: InsideMirrorMessages.POLE_LOWERED_CHANNEL };
  } else {
    // Falls to floor if not aligned
    world.setStateValue(POLE_STATE_KEY, POLE_ON_FLOOR);
    world.setStateValue(POLE_LOWERED_KEY, 'floor');
    return { success: true, message: InsideMirrorMessages.POLE_LOWERED_FLOOR };
  }
}

/**
 * Rotate the box (push red or yellow panel)
 */
export function rotateBox(world: WorldModel, clockwise: boolean): { success: boolean; message: string } {
  const state = getMirrorState(world);

  // Can only rotate if pole is not lowered into channel
  if (state.poleState === POLE_LOWERED) {
    return { success: false, message: InsideMirrorMessages.BOX_CANT_ROTATE };
  }

  // Rotate 45 degrees
  const delta = clockwise ? 45 : -45;
  let newDirection = (state.direction + delta) % 360;
  if (newDirection < 0) newDirection += 360;

  world.setStateValue(DIRECTION_KEY, newDirection);
  world.setStateValue(BOX_ROTATED_KEY, getDirectionName(newDirection));
  return { success: true, message: InsideMirrorMessages.BOX_ROTATES };
}

/**
 * Move the box along the groove (push mahogany or pine panel)
 */
export function moveBox(world: WorldModel, forward: boolean): { success: boolean; message: string } {
  const state = getMirrorState(world);

  // Can only move if pole is lowered into channel
  if (state.poleState !== POLE_LOWERED) {
    return { success: false, message: InsideMirrorMessages.BOX_CANT_MOVE_UNLOCKED };
  }

  // Can only move if N-S aligned
  if (!isNorthSouthAligned(state.direction)) {
    return { success: false, message: InsideMirrorMessages.BOX_CANT_MOVE_ORIENTATION };
  }

  // Move along groove
  const delta = forward ? 1 : -1;
  const newPosition = state.position + delta;

  // Check bounds
  if (newPosition < 0 || newPosition > 3) {
    return { success: false, message: InsideMirrorMessages.BOX_AT_END };
  }

  world.setStateValue(POSITION_KEY, newPosition);
  world.setStateValue(BOX_MOVED_KEY, newPosition);
  return { success: true, message: InsideMirrorMessages.BOX_MOVES };
}

/**
 * Enter the mirror from the Hallway
 */
export function enterMirror(world: WorldModel, playerId: EntityId, insideMirrorId: EntityId): void {
  world.moveEntity(playerId, insideMirrorId);
  world.setStateValue(ENTERED_MIRROR_KEY, true);
}

/**
 * Exit the mirror to the Dungeon Entrance
 */
export function exitMirror(
  world: WorldModel,
  playerId: EntityId,
  dungeonEntranceId: EntityId
): { success: boolean; message: string } {
  if (!canExitMirror(world)) {
    world.setStateValue(ACTION_BLOCKED_KEY, true);
    world.setStateValue(BLOCKED_MESSAGE_KEY, InsideMirrorMessages.CANT_EXIT);
    return { success: false, message: InsideMirrorMessages.CANT_EXIT };
  }

  world.moveEntity(playerId, dungeonEntranceId);
  world.setStateValue(EXITED_MIRROR_KEY, true);
  return { success: true, message: InsideMirrorMessages.EXIT_MIRROR };
}

/**
 * Register Inside Mirror event handlers and daemon
 */
export function registerInsideMirrorHandler(
  _engine: any,
  world: WorldModel,
  hallwayId: EntityId,
  insideMirrorId: EntityId,
  dungeonEntranceId: EntityId,
  scheduler?: ISchedulerService
): void {
  // NOTE: All state changes (lift, lower, push) are handled by their respective actions.
  // Event handlers for if.event.lifted, if.event.lowered, if.event.pushed were removed
  // to avoid double execution. The daemon handles feedback messages.

  // Update Inside Mirror exits dynamically based on state
  function updateMirrorExits(): void {
    const mirror = world.getEntity(insideMirrorId);
    if (!mirror) return;

    const roomTrait = mirror.get(RoomTrait);
    if (!roomTrait) return;

    // OUT always goes back to Hallway
    roomTrait.exits = {
      [Direction.OUT]: { destination: hallwayId }
    };

    // N exit only available when properly aligned
    if (canExitMirror(world)) {
      roomTrait.exits[Direction.NORTH] = { destination: dungeonEntranceId };
    }
  }

  // If scheduler available, register daemon for feedback messages
  if (scheduler) {
    const mirrorFeedbackDaemon: Daemon = {
      id: 'dungeo-inside-mirror-feedback',
      name: 'Inside Mirror Feedback',
      priority: 30,

      condition: (context: SchedulerContext): boolean => {
        const { world: w } = context;
        return (
          w.getStateValue(POLE_RAISED_KEY) === true ||
          w.getStateValue(POLE_LOWERED_KEY) !== undefined ||
          w.getStateValue(BOX_ROTATED_KEY) !== undefined ||
          w.getStateValue(BOX_MOVED_KEY) !== undefined ||
          w.getStateValue(ENTERED_MIRROR_KEY) === true ||
          w.getStateValue(EXITED_MIRROR_KEY) === true ||
          w.getStateValue(ACTION_BLOCKED_KEY) === true
        );
      },

      run: (context: SchedulerContext): ISemanticEvent[] => {
        const { world: w } = context;
        const events: ISemanticEvent[] = [];

        // Update exits after any state change
        updateMirrorExits();

        if (w.getStateValue(POLE_RAISED_KEY)) {
          events.push({
            id: `mirror-pole-raised-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: { messageId: InsideMirrorMessages.POLE_RAISED }
          });
          w.setStateValue(POLE_RAISED_KEY, undefined);
        }

        const poleResult = w.getStateValue(POLE_LOWERED_KEY);
        if (poleResult) {
          const messageId = poleResult === 'channel'
            ? InsideMirrorMessages.POLE_LOWERED_CHANNEL
            : InsideMirrorMessages.POLE_LOWERED_FLOOR;
          events.push({
            id: `mirror-pole-lowered-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: { messageId }
          });
          w.setStateValue(POLE_LOWERED_KEY, undefined);
        }

        const newDirection = w.getStateValue(BOX_ROTATED_KEY);
        if (newDirection) {
          events.push({
            id: `mirror-box-rotated-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: InsideMirrorMessages.BOX_ROTATES,
              params: { direction: newDirection }
            }
          });
          // Also show T-bar direction
          events.push({
            id: `mirror-tbar-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: InsideMirrorMessages.TBAR_DIRECTION,
              params: { direction: newDirection }
            }
          });
          w.setStateValue(BOX_ROTATED_KEY, undefined);
        }

        const newPosition = w.getStateValue(BOX_MOVED_KEY);
        if (newPosition !== undefined) {
          events.push({
            id: `mirror-box-moved-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: InsideMirrorMessages.BOX_MOVES,
              params: { position: newPosition }
            }
          });
          w.setStateValue(BOX_MOVED_KEY, undefined);
        }

        if (w.getStateValue(ENTERED_MIRROR_KEY)) {
          events.push({
            id: `mirror-entered-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: { messageId: InsideMirrorMessages.ENTER_MIRROR }
          });
          w.setStateValue(ENTERED_MIRROR_KEY, undefined);
        }

        if (w.getStateValue(EXITED_MIRROR_KEY)) {
          events.push({
            id: `mirror-exited-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: { messageId: InsideMirrorMessages.EXIT_MIRROR }
          });
          w.setStateValue(EXITED_MIRROR_KEY, undefined);
        }

        if (w.getStateValue(ACTION_BLOCKED_KEY)) {
          const blockedMessage = w.getStateValue(BLOCKED_MESSAGE_KEY) as string;
          events.push({
            id: `mirror-blocked-${Date.now()}`,
            type: 'game.message',
            timestamp: Date.now(),
            entities: {},
            data: { messageId: blockedMessage || InsideMirrorMessages.CANT_EXIT }
          });
          w.setStateValue(ACTION_BLOCKED_KEY, undefined);
          w.setStateValue(BLOCKED_MESSAGE_KEY, undefined);
        }

        return events;
      }
    };

    scheduler.registerDaemon(mirrorFeedbackDaemon);
  }

  // Initialize exits
  updateMirrorExits();
}
