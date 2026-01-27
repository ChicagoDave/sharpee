/**
 * Tiny Room Door Trait
 *
 * Trait for tracking the state of the locked door in the Tiny Room key puzzle.
 * The classic IF puzzle where the key is in the lock on the other side.
 *
 * Puzzle solution:
 * 1. PUT MAT UNDER DOOR - positions mat to catch key
 * 2. PUSH KEY WITH SCREWDRIVER - key falls onto mat
 * 3. PULL MAT - get key from under door
 * 4. UNLOCK DOOR WITH KEY - standard unlock
 *
 * Replaces the anti-pattern of:
 * - (door as any).keyInLock = true
 * - (door as any).matUnderDoor = false
 * - (door as any).keyOnMat = false
 * - (door as any).isTinyRoomDoor = true
 * - (door as any).connectsRooms = [...]
 * - (door as any).blocksDirection = {...}
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the tiny room door trait
 */
export interface TinyRoomDoorTraitConfig {
  /** Whether the key is still in the lock on the other side */
  keyInLock: boolean;
  /** Whether the mat has been placed under the door */
  matUnderDoor: boolean;
  /** Whether the key has fallen onto the mat */
  keyOnMat: boolean;
  /** The two room IDs this door connects [tinyRoomId, drearyRoomId] */
  connectsRooms: [string, string];
  /** Which direction is blocked in each room { roomId: 'NORTH' | 'SOUTH' } */
  blocksDirection: Record<string, string>;
}

/**
 * Tiny Room Door Trait
 *
 * Tracks the state of the key puzzle door:
 * - Key position (in lock vs fallen)
 * - Mat position (normal vs under door)
 * - Key on mat state (for retrieval)
 */
export class TinyRoomDoorTrait implements ITrait {
  static readonly type = 'dungeo.trait.tiny_room_door' as const;

  readonly type = TinyRoomDoorTrait.type;

  /** Whether the key is still in the lock on the other side */
  keyInLock: boolean;

  /** Whether the mat has been placed under the door */
  matUnderDoor: boolean;

  /** Whether the key has fallen onto the mat */
  keyOnMat: boolean;

  /** The two room IDs this door connects */
  connectsRooms: [string, string];

  /** Which direction is blocked in each room */
  blocksDirection: Record<string, string>;

  constructor(config: TinyRoomDoorTraitConfig) {
    this.keyInLock = config.keyInLock;
    this.matUnderDoor = config.matUnderDoor;
    this.keyOnMat = config.keyOnMat;
    this.connectsRooms = config.connectsRooms;
    this.blocksDirection = config.blocksDirection;
  }
}

// Ensure the class implements ITraitConstructor
export const TinyRoomDoorTraitConstructor: ITraitConstructor<TinyRoomDoorTrait> = TinyRoomDoorTrait;
