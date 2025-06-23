// packages/world-model/src/traits/door/doorBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { DoorTrait } from './doorTrait';

/**
 * Behavior for door entities.
 * 
 * Handles the logic for doors that connect two rooms.
 */
export class DoorBehavior extends Behavior {
  static requiredTraits = [TraitType.DOOR];
  
  /**
   * Get the rooms this door connects
   */
  static getRooms(door: IFEntity): [string, string] {
    const trait = DoorBehavior.require<DoorTrait>(door, TraitType.DOOR);
    return [trait.room1, trait.room2];
  }
  
  /**
   * Get the other room when coming from a specific room
   * @returns The other room ID, or null if the door doesn't connect to the current room
   */
  static getOtherRoom(door: IFEntity, currentRoom: string): string | null {
    const trait = DoorBehavior.require<DoorTrait>(door, TraitType.DOOR);
    
    if (trait.room1 === currentRoom) {
      return trait.room2;
    } else if (trait.room2 === currentRoom) {
      // Check if traversal is allowed in this direction
      return trait.bidirectional ? trait.room1 : null;
    }
    
    return null;
  }
  
  /**
   * Check if the door can be traversed in both directions
   */
  static isBidirectional(door: IFEntity): boolean {
    const trait = DoorBehavior.require<DoorTrait>(door, TraitType.DOOR);
    return trait.bidirectional;
  }
  
  /**
   * Check if the door connects two specific rooms (in any order)
   */
  static connects(door: IFEntity, room1: string, room2: string): boolean {
    const trait = DoorBehavior.require<DoorTrait>(door, TraitType.DOOR);
    return (trait.room1 === room1 && trait.room2 === room2) ||
           (trait.room1 === room2 && trait.room2 === room1);
  }
  
  /**
   * Check if the door connects to a specific room
   */
  static connectsTo(door: IFEntity, roomId: string): boolean {
    const trait = DoorBehavior.require<DoorTrait>(door, TraitType.DOOR);
    return trait.room1 === roomId || trait.room2 === roomId;
  }
  
  /**
   * Get the entry room (for one-way doors)
   * This is the room you can enter from
   */
  static getEntryRoom(door: IFEntity): string {
    const trait = DoorBehavior.require<DoorTrait>(door, TraitType.DOOR);
    return trait.room1;
  }
  
  /**
   * Get the exit room (for one-way doors)
   * This is the room you exit to
   */
  static getExitRoom(door: IFEntity): string {
    const trait = DoorBehavior.require<DoorTrait>(door, TraitType.DOOR);
    return trait.room2;
  }
}
