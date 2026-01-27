/**
 * Tiny Room Key Puzzle Handler
 *
 * Classic IF puzzle: key is in the lock on the other side of the door.
 *
 * Solution:
 * 1. PUT MAT UNDER DOOR - positions mat to catch key
 * 2. PUSH KEY WITH SCREWDRIVER / USE SCREWDRIVER ON KEYHOLE - key falls onto mat
 * 3. TAKE MAT / PULL MAT - get key from under door
 * 4. UNLOCK DOOR WITH KEY - standard unlock
 * 5. OPEN DOOR / GO NORTH - access Dreary Room
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IFEntity, IdentityTrait, Direction, RoomTrait, OpenableTrait, IParsedCommand, TraitType, LockableTrait } from '@sharpee/world-model';
import { ParsedCommandTransformer } from '@sharpee/engine';
import { DOOR_BLOCKED_ACTION_ID } from '../actions/door-blocked';
import { PULL_MAT_ACTION_ID } from '../actions/pull-mat';
import { TinyRoomDoorTrait, TinyRoomKeyTrait, UnderDoorTrait } from '../traits';

// Message IDs
export const TinyRoomMessages = {
  MAT_PLACED: 'dungeo.tiny_room.mat_placed',
  MAT_NOT_HELD: 'dungeo.tiny_room.mat_not_held',
  MAT_ALREADY_PLACED: 'dungeo.tiny_room.mat_already_placed',
  NO_DOOR_HERE: 'dungeo.tiny_room.no_door_here',
  KEY_PUSHED: 'dungeo.tiny_room.key_pushed',
  KEY_PUSHED_NO_MAT: 'dungeo.tiny_room.key_pushed_no_mat',
  KEY_ALREADY_PUSHED: 'dungeo.tiny_room.key_already_pushed',
  NO_SCREWDRIVER: 'dungeo.tiny_room.no_screwdriver',
  MAT_PULLED: 'dungeo.tiny_room.mat_pulled',
  MAT_PULLED_WITH_KEY: 'dungeo.tiny_room.mat_pulled_with_key',
  MAT_NOT_UNDER_DOOR: 'dungeo.tiny_room.mat_not_under_door',
  DOOR_LOCKED: 'dungeo.tiny_room.door_locked',
  DOOR_UNLOCKED: 'dungeo.tiny_room.door_unlocked',
  WRONG_KEY: 'dungeo.tiny_room.wrong_key',
  KEYHOLE_BLOCKED: 'dungeo.tiny_room.keyhole_blocked',
  LOOK_AT_DOOR: 'dungeo.tiny_room.look_at_door',
  LOOK_AT_DOOR_WITH_MAT: 'dungeo.tiny_room.look_at_door_with_mat',
  LOOK_AT_DOOR_KEY_ON_MAT: 'dungeo.tiny_room.look_at_door_key_on_mat',
  LOOK_AT_DOOR_UNLOCKED: 'dungeo.tiny_room.look_at_door_unlocked'
};

/**
 * Find the tiny room door in a room
 */
export function findTinyRoomDoor(world: WorldModel, roomId: string): IFEntity | undefined {
  // First try getContents
  const contents = world.getContents(roomId);
  let door = contents.find(e => e.get(TinyRoomDoorTrait) !== undefined);
  if (door) return door;

  // If not found, search all entities (door might not be in spatial index yet)
  const allDoors = world.findWhere((e: IFEntity) => e.get(TinyRoomDoorTrait) !== undefined);
  if (allDoors.length > 0) {
    // Check if the door is in the specified room
    door = allDoors.find(d => world.getLocation(d.id) === roomId);
    if (door) return door;
    // If we're in tiny room and door exists, return it even if spatial index is wrong
    return allDoors[0];
  }

  return undefined;
}

/**
 * Find the tiny room key
 */
export function findTinyRoomKey(world: WorldModel): IFEntity | undefined {
  // Search everywhere for the key using the trait
  const keys = world.findWhere((e: IFEntity) => e.get(TinyRoomKeyTrait) !== undefined);
  return keys.length > 0 ? keys[0] : undefined;
}

/**
 * Find the mat (welcome mat from West of House)
 */
export function findMat(world: WorldModel, playerId: string): IFEntity | undefined {
  // Check player inventory first
  const inventory = world.getContents(playerId);
  for (const item of inventory) {
    const identity = item.get(IdentityTrait);
    if (identity) {
      const name = identity.name?.toLowerCase() || '';
      const aliases = identity.aliases || [];
      if (name.includes('mat') || aliases.some(a => a.toLowerCase().includes('mat'))) {
        return item;
      }
    }
  }
  return undefined;
}

/**
 * Find the screwdriver in player inventory
 */
export function findScrewdriver(world: WorldModel, playerId: string): IFEntity | undefined {
  const inventory = world.getContents(playerId);
  for (const item of inventory) {
    const identity = item.get(IdentityTrait);
    if (identity) {
      const name = identity.name?.toLowerCase() || '';
      const aliases = identity.aliases || [];
      if (name.includes('screwdriver') || aliases.some(a => a.toLowerCase().includes('screwdriver'))) {
        return item;
      }
    }
  }
  return undefined;
}

/**
 * Handle PUT MAT UNDER DOOR command
 */
export function handlePutMatUnderDoor(
  world: WorldModel,
  playerId: string,
  roomId: string
): { success: boolean; messageId: string; events: ISemanticEvent[] } {
  const door = findTinyRoomDoor(world, roomId);
  if (!door) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_DOOR_HERE,
      events: []
    };
  }

  const mat = findMat(world, playerId);
  if (!mat) {
    return {
      success: false,
      messageId: TinyRoomMessages.MAT_NOT_HELD,
      events: []
    };
  }

  const doorTrait = door.get(TinyRoomDoorTrait);
  if (!doorTrait) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_DOOR_HERE,
      events: []
    };
  }

  if (doorTrait.matUnderDoor) {
    return {
      success: false,
      messageId: TinyRoomMessages.MAT_ALREADY_PLACED,
      events: []
    };
  }

  // Place mat under door
  doorTrait.matUnderDoor = true;
  // Remove mat from player inventory - it's now "under the door"
  world.moveEntity(mat.id, roomId);
  const matTrait = mat.get(UnderDoorTrait);
  if (matTrait) {
    matTrait.isUnderDoor = true;
  }

  return {
    success: true,
    messageId: TinyRoomMessages.MAT_PLACED,
    events: [{
      id: `tiny-room-mat-placed-${Date.now()}`,
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: { messageId: TinyRoomMessages.MAT_PLACED }
    }]
  };
}

/**
 * Handle pushing key with screwdriver through keyhole
 */
export function handlePushKeyWithScrewdriver(
  world: WorldModel,
  playerId: string,
  roomId: string
): { success: boolean; messageId: string; events: ISemanticEvent[] } {
  const door = findTinyRoomDoor(world, roomId);
  if (!door) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_DOOR_HERE,
      events: []
    };
  }

  const screwdriver = findScrewdriver(world, playerId);
  if (!screwdriver) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_SCREWDRIVER,
      events: []
    };
  }

  const doorTrait = door.get(TinyRoomDoorTrait);
  if (!doorTrait) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_DOOR_HERE,
      events: []
    };
  }

  // Check if key is still in lock
  if (!doorTrait.keyInLock) {
    return {
      success: false,
      messageId: TinyRoomMessages.KEY_ALREADY_PUSHED,
      events: []
    };
  }

  // Push key out
  doorTrait.keyInLock = false;

  // Check if mat is under door
  if (doorTrait.matUnderDoor) {
    doorTrait.keyOnMat = true;
    return {
      success: true,
      messageId: TinyRoomMessages.KEY_PUSHED,
      events: [{
        id: `tiny-room-key-pushed-${Date.now()}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: { messageId: TinyRoomMessages.KEY_PUSHED }
      }]
    };
  } else {
    // Key falls but is lost under the door (game over for this puzzle)
    return {
      success: true,
      messageId: TinyRoomMessages.KEY_PUSHED_NO_MAT,
      events: [{
        id: `tiny-room-key-lost-${Date.now()}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: { messageId: TinyRoomMessages.KEY_PUSHED_NO_MAT }
      }]
    };
  }
}

/**
 * Handle pulling mat from under door
 */
export function handlePullMat(
  world: WorldModel,
  playerId: string,
  roomId: string
): { success: boolean; messageId: string; events: ISemanticEvent[] } {
  const door = findTinyRoomDoor(world, roomId);
  if (!door) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_DOOR_HERE,
      events: []
    };
  }

  const doorTrait = door.get(TinyRoomDoorTrait);
  if (!doorTrait) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_DOOR_HERE,
      events: []
    };
  }

  if (!doorTrait.matUnderDoor) {
    return {
      success: false,
      messageId: TinyRoomMessages.MAT_NOT_UNDER_DOOR,
      events: []
    };
  }

  // Find the mat in the room (by UnderDoorTrait)
  const roomContents = world.getContents(roomId);
  const mat = roomContents.find(e => e.get(UnderDoorTrait)?.isUnderDoor === true);

  if (!mat) {
    return {
      success: false,
      messageId: TinyRoomMessages.MAT_NOT_UNDER_DOOR,
      events: []
    };
  }

  // Pull mat out
  doorTrait.matUnderDoor = false;
  const matTrait = mat.get(UnderDoorTrait);
  if (matTrait) {
    matTrait.isUnderDoor = false;
  }
  world.moveEntity(mat.id, playerId); // Give mat back to player

  // If key was on mat, give key to player too
  if (doorTrait.keyOnMat) {
    doorTrait.keyOnMat = false;
    const key = findTinyRoomKey(world);
    if (key) {
      const keyTrait = key.get(TinyRoomKeyTrait);
      if (keyTrait) {
        keyTrait.isHidden = false;
      }
      world.moveEntity(key.id, playerId);
    }
    return {
      success: true,
      messageId: TinyRoomMessages.MAT_PULLED_WITH_KEY,
      events: [{
        id: `tiny-room-mat-key-${Date.now()}`,
        type: 'game.message',
        timestamp: Date.now(),
        entities: {},
        data: { messageId: TinyRoomMessages.MAT_PULLED_WITH_KEY }
      }]
    };
  }

  return {
    success: true,
    messageId: TinyRoomMessages.MAT_PULLED,
    events: [{
      id: `tiny-room-mat-pulled-${Date.now()}`,
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: { messageId: TinyRoomMessages.MAT_PULLED }
    }]
  };
}

/**
 * Handle unlocking the door with the key
 */
export function handleUnlockDoor(
  world: WorldModel,
  playerId: string,
  roomId: string,
  keyEntity: IFEntity
): { success: boolean; messageId: string; events: ISemanticEvent[] } {
  const door = findTinyRoomDoor(world, roomId);
  if (!door) {
    return {
      success: false,
      messageId: TinyRoomMessages.NO_DOOR_HERE,
      events: []
    };
  }

  // Check if it's the right key (must have TinyRoomKeyTrait)
  if (!keyEntity.get(TinyRoomKeyTrait)) {
    return {
      success: false,
      messageId: TinyRoomMessages.WRONG_KEY,
      events: []
    };
  }

  // Unlock the door via trait
  const lockable = door.get(TraitType.LOCKABLE) as LockableTrait;
  if (lockable) {
    lockable.isLocked = false;
  }

  return {
    success: true,
    messageId: TinyRoomMessages.DOOR_UNLOCKED,
    events: [{
      id: `tiny-room-door-unlocked-${Date.now()}`,
      type: 'game.message',
      timestamp: Date.now(),
      entities: {},
      data: { messageId: TinyRoomMessages.DOOR_UNLOCKED }
    }]
  };
}

/**
 * Check if movement north is blocked by locked door
 */
export function isNorthBlocked(world: WorldModel, roomId: string): boolean {
  const door = findTinyRoomDoor(world, roomId);
  if (!door) return false;

  return door.isLocked;
}

/**
 * Get door description based on state
 */
export function getDoorDescription(door: IFEntity): string {
  const doorTrait = door.get(TinyRoomDoorTrait);

  if (!door.isLocked) {
    return 'A small wooden door leads north. It is unlocked.';
  }

  if (doorTrait?.keyOnMat) {
    return 'A small wooden door leads north. There is a keyhole at eye level. A small key sits on the mat beneath the door.';
  }

  if (doorTrait?.matUnderDoor) {
    return 'A small wooden door leads north. There is a keyhole at eye level. The mat has been slid under the door.';
  }

  if (doorTrait?.keyInLock) {
    return 'A small wooden door leads north. There is a keyhole at eye level. Looking through, you can see a key in the lock on the other side.';
  }

  return 'A small wooden door leads north. There is a keyhole at eye level.';
}

/**
 * Check if player is in the Tiny Room
 */
function isInTinyRoom(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const room = world.getEntity(playerLocation);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  const roomName = identity?.name || '';

  return roomName === 'Tiny Room';
}

/**
 * Check if command is going north
 */
function isGoingNorth(parsed: IParsedCommand): boolean {
  const actionId = parsed.action?.toLowerCase();

  // Check if it's a GO/GOING action
  if (actionId !== 'go' && actionId !== 'going' && actionId !== 'if.action.going') {
    return false;
  }

  // Get direction
  let direction: string | undefined;

  if (parsed.extras?.direction) {
    direction = String(parsed.extras.direction).toLowerCase();
  } else if (parsed.structure?.directObject?.head) {
    direction = parsed.structure.directObject.head.toLowerCase();
  }

  return direction === 'north' || direction === 'n';
}

/**
 * Check if the door is still locked
 */
function isDoorLocked(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const door = findTinyRoomDoor(world, playerLocation);
  if (!door) return false;

  return door.isLocked;
}

/**
 * Create the tiny room door command transformer
 *
 * Intercepts "go north" in Tiny Room when door is locked,
 * redirecting to a custom blocking action that shows the appropriate message.
 */
export function createTinyRoomDoorTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Only intercept when in Tiny Room, going north, and door is locked
    if (!isInTinyRoom(world) || !isGoingNorth(parsed) || !isDoorLocked(world)) {
      return parsed;
    }

    // Redirect to custom blocking action
    return {
      ...parsed,
      action: DOOR_BLOCKED_ACTION_ID,
      extras: {
        ...parsed.extras,
        originalAction: parsed.action,
        isDoorBlocked: true
      }
    };
  };
}

/**
 * Check if command is taking the mat
 */
function isTakingMat(parsed: IParsedCommand): boolean {
  if (parsed.action !== 'if.action.taking') return false;

  // Check if direct object is the mat
  const directObject = parsed.structure?.directObject?.head?.toLowerCase();
  return directObject === 'mat' || directObject === 'welcome mat';
}

/**
 * Check if mat is currently under the door
 */
function isMatUnderDoor(world: WorldModel): boolean {
  const player = world.getPlayer();
  if (!player) return false;

  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const door = findTinyRoomDoor(world, playerLocation);
  if (!door) return false;

  const doorTrait = door.get(TinyRoomDoorTrait);
  return doorTrait?.matUnderDoor === true;
}

/**
 * Create the tiny room mat command transformer
 *
 * Intercepts "take mat" when the mat is under the door,
 * redirecting to the pull-mat action that handles key retrieval.
 */
export function createTinyRoomMatTransformer(): ParsedCommandTransformer {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    // Only intercept when in Tiny Room, taking mat, and mat is under door
    if (!isInTinyRoom(world) || !isTakingMat(parsed) || !isMatUnderDoor(world)) {
      return parsed;
    }

    // Redirect to pull-mat action
    return {
      ...parsed,
      action: PULL_MAT_ACTION_ID,
      extras: {
        ...parsed.extras,
        originalAction: parsed.action,
        isPullingMatFromDoor: true
      }
    };
  };
}
