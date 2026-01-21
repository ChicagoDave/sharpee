/**
 * Grue Handler
 *
 * Implements grue death mechanics from Mainframe Zork FORTRAN source (verbs.f).
 *
 * Per FORTRAN WALK function (lines 1846-1897):
 * - Grue check only triggers when moving FROM a dark room
 * - 25% survival roll (PROB(25,25)) - passes go to safe path
 * - On grue path (75%):
 *   - Invalid exit -> death (msg 522)
 *   - Blocked exit (door/flag) -> death (msg 523)
 *   - Dark destination -> death (msg 522)
 *   - Lit destination -> survive
 *
 * This creates a command transformer to intercept GO commands in dark rooms.
 */

import {
  WorldModel,
  IParsedCommand,
  TraitType,
  RoomTrait,
  DirectionType,
  VisibilityBehavior
} from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';
import { GRUE_DEATH_ACTION_ID } from '../actions/grue-death/types';
import { getGDTFlags } from '../actions/gdt/gdt-context';

/**
 * Check if GDT immortality mode is enabled
 */
function isImmortal(world: WorldModel): boolean {
  const flags = getGDTFlags(world);
  return flags.immortal;
}

/**
 * Get the player's containing room, handling being inside a vehicle
 */
function getPlayerRoom(world: WorldModel): string | null {
  const player = world.getPlayer();
  if (!player) return null;

  const containingRoom = world.getContainingRoom(player.id);
  return containingRoom?.id || null;
}

/**
 * Get the containing room entity
 */
function getPlayerRoomEntity(world: WorldModel): any | null {
  const player = world.getPlayer();
  if (!player) return null;

  return world.getContainingRoom(player.id);
}

/**
 * Extract direction from parsed command
 */
function getDirection(parsed: IParsedCommand): string | null {
  // Check extras first (set by parser)
  if (parsed.extras?.direction) {
    return String(parsed.extras.direction).toLowerCase();
  }

  // Check structure for direct object
  if (parsed.structure?.directObject?.head) {
    return parsed.structure.directObject.head.toLowerCase();
  }

  return null;
}

/**
 * Get destination room ID and exit info from going command
 */
function getExitInfo(world: WorldModel, direction: string): {
  destination: string | null;
  exitType: 'normal' | 'conditional' | 'door' | 'invalid';
  isBlocked: boolean;
  viaEntityId?: string;
} {
  const player = world.getPlayer();
  if (!player) {
    return { destination: null, exitType: 'invalid', isBlocked: false };
  }

  const containingRoom = world.getContainingRoom(player.id);
  if (!containingRoom) {
    return { destination: null, exitType: 'invalid', isBlocked: false };
  }

  const roomTrait = containingRoom.get(RoomTrait);
  if (!roomTrait) {
    return { destination: null, exitType: 'invalid', isBlocked: false };
  }

  // Direction from parser is lowercase, but RoomTrait uses uppercase DirectionType
  const upperDirection = direction.toUpperCase() as DirectionType;
  const exit = roomTrait.exits[upperDirection];

  if (!exit || !exit.destination) {
    return { destination: null, exitType: 'invalid', isBlocked: false };
  }

  // Check if exit is blocked by a door/gate
  if (exit.via) {
    const viaEntity = world.getEntity(exit.via);
    if (viaEntity) {
      // Check if it's openable and closed
      const openable = viaEntity.getTrait(TraitType.OPENABLE);
      if (openable && !(openable as any).isOpen) {
        return {
          destination: exit.destination,
          exitType: 'door',
          isBlocked: true,
          viaEntityId: exit.via
        };
      }
    }
  }

  return {
    destination: exit.destination,
    exitType: 'normal',
    isBlocked: false,
    viaEntityId: exit.via
  };
}

/**
 * Check if a room is dark (no light sources)
 */
function isRoomDark(world: WorldModel, roomId: string): boolean {
  const room = world.getEntity(roomId);
  if (!room) return false;

  return VisibilityBehavior.isDark(room, world);
}

/**
 * 25% survival roll - returns true if player survives
 */
function survivalRoll(): boolean {
  return Math.random() < 0.25;
}

/**
 * Check if the action is a going action
 */
function isGoingAction(parsed: IParsedCommand): boolean {
  const actionId = parsed.action?.toLowerCase() || '';
  return actionId === 'go' || actionId === 'going' || actionId === 'if.action.going';
}

/**
 * Create command transformer for grue death
 *
 * Intercepts GO commands in dark rooms and potentially redirects to death.
 *
 * Per FORTRAN:
 * - Only triggers when player (not NPC) moves FROM dark room
 * - 25% chance to skip grue check entirely (safe path)
 * - On grue path: invalid exit, blocked exit, or dark destination = death
 */
export function createGrueDeathTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // GDT immortality mode (ND command)
    if (isImmortal(world)) return parsed;

    // Only intercept going actions
    if (!isGoingAction(parsed)) return parsed;

    // Get current room and check if dark
    const currentRoom = getPlayerRoomEntity(world);
    if (!currentRoom) return parsed;

    // If current room is lit, no grue check
    if (!VisibilityBehavior.isDark(currentRoom, world)) return parsed;

    // SURVIVAL ROLL: 25% chance to skip grue check entirely
    // Per FORTRAN: IF(...PROB(25,25)) GO TO 500 (safe path)
    if (survivalRoll()) {
      // Player got lucky - normal movement (may still fail for other reasons)
      return parsed;
    }

    // ---- ON GRUE PATH (75%) ----

    const direction = getDirection(parsed);
    if (!direction) {
      // No direction specified - let normal action handle error
      return parsed;
    }

    const exitInfo = getExitInfo(world, direction);

    // Invalid exit -> death (msg 522)
    if (exitInfo.exitType === 'invalid' || !exitInfo.destination) {
      return {
        ...parsed,
        action: GRUE_DEATH_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          grueDeathType: 'walked_into',
          reason: 'invalid_exit'
        }
      };
    }

    // Blocked exit (door closed) -> death (msg 523)
    if (exitInfo.isBlocked) {
      return {
        ...parsed,
        action: GRUE_DEATH_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          grueDeathType: 'slithered',
          reason: 'blocked_exit'
        }
      };
    }

    // Check if destination is lit
    const destRoom = world.getEntity(exitInfo.destination);
    if (!destRoom) {
      // Can't find destination room - death (msg 522)
      return {
        ...parsed,
        action: GRUE_DEATH_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          grueDeathType: 'walked_into',
          reason: 'no_destination'
        }
      };
    }

    const destDark = VisibilityBehavior.isDark(destRoom, world);
    if (destDark) {
      // Dark destination -> death (msg 522)
      return {
        ...parsed,
        action: GRUE_DEATH_ACTION_ID,
        extras: {
          ...parsed.extras,
          originalAction: parsed.action,
          grueDeathType: 'walked_into',
          reason: 'dark_destination'
        }
      };
    }

    // Destination is lit - player survives!
    // Normal movement continues
    return parsed;
  };
}
