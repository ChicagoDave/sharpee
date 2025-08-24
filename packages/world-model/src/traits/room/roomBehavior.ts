// packages/world-model/src/traits/room/roomBehavior.ts

import { Behavior } from '../../behaviors/behavior';
import { IFEntity } from '../../entities/if-entity';
import { TraitType } from '../trait-types';
import { RoomTrait, IExitInfo } from './roomTrait';
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { IFEvents } from '../../constants/if-events';
import { Direction, DirectionType, getOppositeDirection } from '../../constants/directions';
import { IWorldQuery } from '../container/containerBehavior';

/**
 * Behavior for room entities.
 * 
 * Handles the logic for rooms including exits, lighting, and visits.
 * All methods are pure and only operate on the given room entity.
 */
export class RoomBehavior extends Behavior {
  static requiredTraits = [TraitType.ROOM];
  
  /**
   * Get the exit in a given direction
   */
  static getExit(room: IFEntity, direction: DirectionType): IExitInfo | null {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    if (!roomTrait.exits) {
      return null;
    }
    const exitInfo = roomTrait.exits[direction];
    return exitInfo || null;
  }
  
  /**
   * Check if an exit exists in a direction
   */
  static hasExit(room: IFEntity, direction: DirectionType): boolean {
    return this.getExit(room, direction) !== undefined;
  }
  
  /**
   * Check if an exit is blocked
   */
  static isExitBlocked(room: IFEntity, direction: DirectionType): boolean {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    return roomTrait.blockedExits?.hasOwnProperty(direction) ?? false;
  }
  
  /**
   * Get blocked exit message
   */
  static getBlockedMessage(room: IFEntity, direction: DirectionType): string | undefined {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    return roomTrait.blockedExits?.[direction];
  }
  
  /**
   * Add or update an exit in this room
   */
  static setExit(room: IFEntity, direction: DirectionType, destination: string, via?: string): void {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    
    // Initialize exits if needed
    if (!roomTrait.exits) {
      roomTrait.exits = {} as Partial<Record<DirectionType, IExitInfo>>;
    }
    
    roomTrait.exits[direction] = {
      destination,
      via
    };
    
    // Remove any blocked message for this direction
    if (roomTrait.blockedExits) {
      delete roomTrait.blockedExits[direction];
    }
  }
  
  /**
   * Block an exit with a message
   */
  static blockExit(room: IFEntity, direction: DirectionType, message: string): ISemanticEvent[] {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    
    if (!roomTrait.blockedExits) {
      roomTrait.blockedExits = {} as Partial<Record<DirectionType, string>>;
    }
    
    roomTrait.blockedExits[direction] = message;
    
    return [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: IFEvents.MOVEMENT_BLOCKED,
      entities: {
        location: room.id
      },
      data: {
        direction: direction,
        message
      }
    }];
  }
  
  /**
   * Unblock an exit
   */
  static unblockExit(room: IFEntity, direction: DirectionType): ISemanticEvent[] {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    
    if (!roomTrait.blockedExits) {
      return [];
    }
    
    if (!roomTrait.blockedExits[direction]) {
      return [];
    }
    
    delete roomTrait.blockedExits[direction];
    
    return [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: IFEvents.NEW_EXIT_REVEALED,
      entities: {
        location: room.id
      },
      data: {
        direction: direction,
        unblocked: true
      }
    }];
  }
  
  /**
   * Remove an exit from this room
   */
  static removeExit(room: IFEntity, direction: DirectionType): void {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    
    // Remove the exit if exits exist
    if (roomTrait.exits) {
      delete roomTrait.exits[direction];
    }
    
    // Remove any blocked message
    if (roomTrait.blockedExits) {
      delete roomTrait.blockedExits[direction];
    }
  }
  
  /**
   * Mark room as visited
   */
  static markVisited(room: IFEntity, actor: IFEntity): ISemanticEvent[] {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    
    if (roomTrait.visited) {
      return [];
    }
    
    roomTrait.visited = true;
    
    return [{
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type: IFEvents.ROOM_FIRST_ENTERED,
      entities: {
        location: room.id,
        actor: actor.id
      },
      data: {
        hasInitialDescription: !!roomTrait.initialDescription
      }
    }];
  }
  
  /**
   * Check if room has been visited
   */
  static hasBeenVisited(room: IFEntity): boolean {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    return roomTrait.visited;
  }

  
  /**
   * Get all exits from the room
   */
  static getAllExits(room: IFEntity): Map<DirectionType, IExitInfo> {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    if (!roomTrait.exits) {
      return new Map();
    }
    return new Map(Object.entries(roomTrait.exits) as [DirectionType, IExitInfo][]);
  }
  
  /**
   * Get available (non-blocked) exits
   */
  static getAvailableExits(room: IFEntity): Map<DirectionType, IExitInfo> {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    const available = new Map<DirectionType, IExitInfo>();
    
    if (!roomTrait.exits) {
      return available;
    }
    
    for (const [direction, exitInfo] of Object.entries(roomTrait.exits) as [DirectionType, IExitInfo][]) {
      if (!this.isExitBlocked(room, direction)) {
        available.set(direction, exitInfo);
      }
    }
    
    return available;
  }
  
  /**
   * Check if room is outdoors
   */
  static isOutdoors(room: IFEntity): boolean {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    return roomTrait.isOutdoors || false;
  }
  
  /**
   * Check if room is underground
   */
  static isUnderground(room: IFEntity): boolean {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    return roomTrait.isUnderground || false;
  }
  
  /**
   * Get room region
   */
  static getRegion(room: IFEntity): string | undefined {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    return roomTrait.region;
  }
  
  /**
   * Check if room has a specific tag
   */
  static hasTag(room: IFEntity, tag: string): boolean {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    return roomTrait.tags.includes(tag.toLowerCase());
  }
  
  /**
   * Add a tag to the room
   */
  static addTag(room: IFEntity, tag: string): void {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    const normalizedTag = tag.toLowerCase();
    if (!roomTrait.tags.includes(normalizedTag)) {
      roomTrait.tags.push(normalizedTag);
    }
  }
  
  /**
   * Remove a tag from the room
   */
  static removeTag(room: IFEntity, tag: string): void {
    const roomTrait = RoomBehavior.require<RoomTrait>(room, TraitType.ROOM);
    const normalizedTag = tag.toLowerCase();
    const index = roomTrait.tags.indexOf(normalizedTag);
    if (index >= 0) {
      roomTrait.tags.splice(index, 1);
    }
  }
}