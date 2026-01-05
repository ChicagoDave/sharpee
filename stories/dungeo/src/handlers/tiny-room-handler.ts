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
import { WorldModel, IFEntity, IdentityTrait, Direction, RoomTrait, OpenableTrait } from '@sharpee/world-model';

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
  const contents = world.getContents(roomId);
  return contents.find(e => (e as any).isTinyRoomDoor === true);
}

/**
 * Find the tiny room key
 */
export function findTinyRoomKey(world: WorldModel): IFEntity | undefined {
  // Search everywhere for the key
  const allEntities = (world as any).entities?.values?.() || [];
  for (const entity of allEntities) {
    if ((entity as any).isTinyRoomKey === true) {
      return entity;
    }
  }
  return undefined;
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

  if ((door as any).matUnderDoor) {
    return {
      success: false,
      messageId: TinyRoomMessages.MAT_ALREADY_PLACED,
      events: []
    };
  }

  // Place mat under door
  (door as any).matUnderDoor = true;
  // Remove mat from player inventory - it's now "under the door"
  world.moveEntity(mat.id, roomId);
  (mat as any).isUnderDoor = true;

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

  // Check if key is still in lock
  if (!(door as any).keyInLock) {
    return {
      success: false,
      messageId: TinyRoomMessages.KEY_ALREADY_PUSHED,
      events: []
    };
  }

  // Push key out
  (door as any).keyInLock = false;

  // Check if mat is under door
  if ((door as any).matUnderDoor) {
    (door as any).keyOnMat = true;
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

  if (!(door as any).matUnderDoor) {
    return {
      success: false,
      messageId: TinyRoomMessages.MAT_NOT_UNDER_DOOR,
      events: []
    };
  }

  // Find the mat in the room
  const roomContents = world.getContents(roomId);
  const mat = roomContents.find(e => (e as any).isUnderDoor === true);

  if (!mat) {
    return {
      success: false,
      messageId: TinyRoomMessages.MAT_NOT_UNDER_DOOR,
      events: []
    };
  }

  // Pull mat out
  (door as any).matUnderDoor = false;
  (mat as any).isUnderDoor = false;
  world.moveEntity(mat.id, playerId); // Give mat back to player

  // If key was on mat, give key to player too
  if ((door as any).keyOnMat) {
    (door as any).keyOnMat = false;
    const key = findTinyRoomKey(world);
    if (key) {
      (key as any).isHidden = false;
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

  // Check if it's the right key
  if (!(keyEntity as any).isTinyRoomKey) {
    return {
      success: false,
      messageId: TinyRoomMessages.WRONG_KEY,
      events: []
    };
  }

  // Unlock the door
  (door as any).isLocked = false;

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

  return (door as any).isLocked === true;
}

/**
 * Get door description based on state
 */
export function getDoorDescription(door: IFEntity): string {
  if (!(door as any).isLocked) {
    return 'A small wooden door leads north. It is unlocked.';
  }

  if ((door as any).keyOnMat) {
    return 'A small wooden door leads north. There is a keyhole at eye level. A small key sits on the mat beneath the door.';
  }

  if ((door as any).matUnderDoor) {
    return 'A small wooden door leads north. There is a keyhole at eye level. The mat has been slid under the door.';
  }

  if ((door as any).keyInLock) {
    return 'A small wooden door leads north. There is a keyhole at eye level. Looking through, you can see a key in the lock on the other side.';
  }

  return 'A small wooden door leads north. There is a keyhole at eye level.';
}
