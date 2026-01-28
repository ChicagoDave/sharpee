/**
 * Turn Bolt Action - Opens/closes Flood Control Dam #3
 *
 * Per FORTRAN source (objects.f lines 1050-1068):
 * - GATEF must be TRUE (yellow button pressed) for bolt to turn
 * - Wrench required to turn the bolt
 * - Dam draining is INSTANT: LWTIDF flag toggle, no fuses
 * - When opened: reservoir becomes land, trunk materializes
 * - When closed: reservoir becomes water, trunk hidden
 *
 * All reservoir mutations (exit blocking, descriptions, trunk visibility)
 * are owned by this action's execute phase — no event handler needed.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import {
  WorldModel,
  IdentityTrait,
  IFEntity,
  RoomBehavior,
  Direction
} from '@sharpee/world-model';
import { TURN_BOLT_ACTION_ID, TurnBoltMessages } from './types';
import {
  isYellowButtonPressed,
  isDamDrained,
  setDamDrained
} from '../../scheduler/dam-state';

// Room IDs for reservoir mutations (set during registration)
let reservoirSouthId: string = '';
let reservoirId: string = '';
let reservoirNorthId: string = '';

/**
 * Configure the turn-bolt action with reservoir room IDs.
 * Called during story initialization.
 */
export function setTurnBoltReservoirIds(ids: {
  reservoirSouth: string;
  reservoir: string;
  reservoirNorth: string;
}): void {
  reservoirSouthId = ids.reservoirSouth;
  reservoirId = ids.reservoir;
  reservoirNorthId = ids.reservoirNorth;
}

/**
 * Block all reservoir exits (dam closed / flooded state).
 * Called at world setup and when dam is closed.
 */
export function blockReservoirExits(world: WorldModel): void {
  const rSouth = world.getEntity(reservoirSouthId);
  const rMid = world.getEntity(reservoirId);
  const rNorth = world.getEntity(reservoirNorthId);

  if (rSouth) {
    RoomBehavior.blockExit(rSouth, Direction.NORTH,
      'The reservoir is full of water. You cannot walk that way.');
  }
  if (rMid) {
    RoomBehavior.blockExit(rMid, Direction.NORTH,
      'The reservoir is full of water. You cannot continue north.');
    RoomBehavior.blockExit(rMid, Direction.SOUTH,
      'The reservoir is full of water. You cannot continue south.');
  }
  if (rNorth) {
    RoomBehavior.blockExit(rNorth, Direction.SOUTH,
      'The reservoir is full of water. You cannot walk that way.');
  }
}

/**
 * Unblock all reservoir exits (dam opened / drained state).
 */
function unblockReservoirExits(world: WorldModel): void {
  const rSouth = world.getEntity(reservoirSouthId);
  const rMid = world.getEntity(reservoirId);
  const rNorth = world.getEntity(reservoirNorthId);

  if (rSouth) {
    RoomBehavior.unblockExit(rSouth, Direction.NORTH);
  }
  if (rMid) {
    RoomBehavior.unblockExit(rMid, Direction.NORTH);
    RoomBehavior.unblockExit(rMid, Direction.SOUTH);
  }
  if (rNorth) {
    RoomBehavior.unblockExit(rNorth, Direction.SOUTH);
  }
}

/**
 * Update reservoir room descriptions based on dam state.
 */
function updateReservoirDescriptions(world: WorldModel, drained: boolean): void {
  const rSouth = world.getEntity(reservoirSouthId);
  const rMid = world.getEntity(reservoirId);
  const rNorth = world.getEntity(reservoirNorthId);

  if (drained) {
    if (rSouth) {
      const identity = rSouth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on the southern edge of what was once a reservoir. The water has drained away, leaving a muddy expanse stretching north. A path leads south.';
      }
    }
    if (rMid) {
      const identity = rMid.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on the muddy bottom of a drained reservoir. The exposed lake bed stretches in all directions. Various objects that were once submerged are now visible.';
      }
    }
    if (rNorth) {
      const identity = rNorth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are at the north end of a drained reservoir. The muddy bottom extends to the south, and a dark passage leads north.';
      }
    }
  } else {
    if (rSouth) {
      const identity = rSouth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on the southern shore of a large reservoir. The water extends north as far as you can see. A path leads south.';
      }
    }
    if (rMid) {
      const identity = rMid.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are on what used to be a large reservoir, now drained. The muddy bottom is exposed, and you can see various objects that were once submerged.';
      }
    }
    if (rNorth) {
      const identity = rNorth.get(IdentityTrait);
      if (identity) {
        identity.description = 'You are at the north end of a large reservoir. A passage leads north into darkness, and the reservoir extends to the south.';
      }
    }
  }
}

/**
 * Make the trunk visible in the reservoir (FORTRAN: VISIBT flag on TRUNK).
 */
function revealTrunk(world: WorldModel): void {
  const trunk = world.getAllEntities().find(e => {
    const id = e.get(IdentityTrait);
    return id?.name === 'trunk';
  });
  if (trunk) {
    (trunk as any).revealed = true;
  }
}

/**
 * Hide the trunk if it's still in the reservoir (FORTRAN: clear VISIBT on TRUNK if in RESER).
 */
function hideTrunkIfInReservoir(world: WorldModel): void {
  const trunk = world.getAllEntities().find(e => {
    const id = e.get(IdentityTrait);
    return id?.name === 'trunk';
  });
  if (trunk) {
    const trunkLocation = world.getLocation(trunk.id);
    if (trunkLocation === reservoirId) {
      (trunk as any).revealed = false;
    }
  }
}

/**
 * Check if entity is the bolt
 */
function isBolt(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;
  const name = identity.name?.toLowerCase() || '';
  return name === 'bolt' || name.includes('bolt');
}

/**
 * Check if entity is a wrench
 */
function isWrench(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;
  const name = identity.name?.toLowerCase() || '';
  const aliases = identity.aliases || [];
  return name.includes('wrench') || aliases.some((a: string) => a.toLowerCase().includes('wrench'));
}

/**
 * Find bolt in current room
 */
function findBoltInRoom(context: ActionContext): IFEntity | undefined {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return undefined;
  const roomContents = world.getContents(playerLocation);
  return roomContents.find(e => isBolt(e));
}

/**
 * Check if player has wrench
 */
function playerHasWrench(context: ActionContext): boolean {
  const { world, player } = context;
  const inventory = world.getContents(player.id);
  return inventory.some(e => isWrench(e));
}

/**
 * Turn Bolt Action Definition
 */
export const turnBoltAction: Action = {
  id: TURN_BOLT_ACTION_ID,
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const bolt = findBoltInRoom(context);

    if (!bolt) {
      return { valid: false, error: TurnBoltMessages.NO_BOLT };
    }

    if (!playerHasWrench(context)) {
      return { valid: false, error: TurnBoltMessages.NO_WRENCH };
    }

    if (!isYellowButtonPressed(context.world as WorldModel)) {
      return { valid: false, error: TurnBoltMessages.GATE_LOCKED };
    }

    const alreadyDrained = isDamDrained(context.world as WorldModel);
    context.sharedData.bolt = bolt;
    context.sharedData.alreadyDrained = alreadyDrained;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { world, sharedData } = context;
    const w = world as WorldModel;
    const alreadyDrained = sharedData.alreadyDrained as boolean;

    if (alreadyDrained) {
      // Close the dam (refill reservoir) — FORTRAN line 27200
      setDamDrained(w, false);
      blockReservoirExits(w);
      updateReservoirDescriptions(w, false);
      hideTrunkIfInReservoir(w);
      sharedData.closedDam = true;
    } else {
      // Open the dam (drain reservoir) — FORTRAN line 27100
      setDamDrained(w, true);
      unblockReservoirExits(w);
      updateReservoirDescriptions(w, true);
      revealTrunk(w);
      sharedData.closedDam = false;
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    return [context.event('action.blocked', {
      actionId: TURN_BOLT_ACTION_ID,
      messageId: result.error || TurnBoltMessages.NO_BOLT,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const closedDam = sharedData.closedDam as boolean;

    const messageId = closedDam
      ? TurnBoltMessages.DAM_CLOSED
      : TurnBoltMessages.DAM_OPENED;

    return [context.event('game.message', { messageId })];
  }
};
