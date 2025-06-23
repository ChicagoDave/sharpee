/**
 * Movement Service
 * 
 * Handles entity movement, pathfinding, and navigation
 * for the standard library.
 */

import { Entity as IFEntity, World as IFWorld } from '@sharpee/core';
import { 
  TraitType, 
  RoomBehavior,
  ExitBehavior,
  DoorBehavior,
  OpenableBehavior,
  ContainerBehavior,
  LockableBehavior
} from '@sharpee/world-model';
import { Direction } from '@sharpee/world-model';

export class MovementService {
  constructor(private world: IFWorld) {}

  /**
   * Move an entity to a destination
   * Returns true if successful, false otherwise
   */
  moveEntity(entity: IFEntity, destination: IFEntity): boolean {
    // Validate destination can contain the entity
    if (destination.has(TraitType.CONTAINER)) {
      if (!ContainerBehavior.canAccept(destination, entity)) {
        return false;
      }
    }

    // Check if destination is a room
    if (!destination.has(TraitType.ROOM) && !destination.has(TraitType.CONTAINER)) {
      return false;
    }

    try {
      this.world.moveEntity(entity.id, destination.id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an entity can move in a direction
   * Returns true if possible, or a string reason if not
   */
  canMove(entity: IFEntity, direction: Direction): boolean | string {
    const currentLocation = this.world.getLocation(entity.id);
    if (!currentLocation) return "Not in a location";

    const room = this.world.getEntity(currentLocation);
    if (!room || !room.has(TraitType.ROOM)) return "Not in a room";

    // Check if there's an exit in that direction
    const exit = RoomBehavior.getExit(room, direction);
    if (!exit) return "No exit in that direction";

    // Check if it's a door
    if (exit.has(TraitType.DOOR)) {
      // Check if door is open
      if (exit.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(exit)) {
        if (exit.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(exit)) {
          return "The door is locked";
        }
        return "The door is closed";
      }
    }

    // Get destination
    const destination = this.getDestination(room, direction);
    if (!destination) return "No destination found";

    // Check if destination is accessible
    if (!destination.has(TraitType.ROOM)) return "Destination is not a room";

    return true;
  }

  /**
   * Get the destination room when moving in a direction
   */
  getDestination(from: IFEntity, direction: Direction): IFEntity | null {
    if (!from.has(TraitType.ROOM)) return null;

    const exit = RoomBehavior.getExit(from, direction);
    if (!exit) return null;

    // If it's a room, return it directly
    if (exit.has(TraitType.ROOM)) {
      return exit;
    }

    // If it's a door, get the other side
    if (exit.has(TraitType.DOOR)) {
      const otherRoom = DoorBehavior.getOtherRoom(exit, from.id);
      if (otherRoom) {
        return this.world.getEntity(otherRoom);
      }
    }

    // If it's an exit, get the destination
    if (exit.has(TraitType.EXIT)) {
      const destination = ExitBehavior.getDestination(exit);
      if (destination) {
        return this.world.getEntity(destination);
      }
    }

    return null;
  }

  /**
   * Find a route between two rooms
   * Returns array of directions to follow, or null if no route
   */
  findRoute(from: IFEntity, to: IFEntity): Direction[] | null {
    if (!from.has(TraitType.ROOM) || !to.has(TraitType.ROOM)) {
      return null;
    }

    if (from.id === to.id) return [];

    // Simple BFS pathfinding
    const queue: { room: IFEntity; path: Direction[] }[] = [
      { room: from, path: [] }
    ];
    const visited = new Set<string>([from.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Check all exits
      const exits = RoomBehavior.getAllExits(current.room);
      
      for (const [direction, exit] of exits) {
        const destination = this.getDestination(current.room, direction);
        if (!destination) continue;

        if (destination.id === to.id) {
          return [...current.path, direction];
        }

        if (!visited.has(destination.id)) {
          visited.add(destination.id);
          queue.push({
            room: destination,
            path: [...current.path, direction]
          });
        }
      }
    }

    return null;
  }

  /**
   * Get all rooms connected to a starting room within a certain distance
   */
  getConnectedRooms(start: IFEntity, maxDistance: number): IFEntity[] {
    if (!start.has(TraitType.ROOM)) return [];

    const connected: Map<string, IFEntity> = new Map();
    const queue: { room: IFEntity; distance: number }[] = [
      { room: start, distance: 0 }
    ];
    
    connected.set(start.id, start);

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.distance >= maxDistance) continue;

      const exits = RoomBehavior.getAllExits(current.room);
      
      for (const [direction, exit] of exits) {
        const destination = this.getDestination(current.room, direction);
        if (!destination) continue;

        if (!connected.has(destination.id)) {
          connected.set(destination.id, destination);
          queue.push({
            room: destination,
            distance: current.distance + 1
          });
        }
      }
    }

    return Array.from(connected.values());
  }

  /**
   * Check if movement between two rooms is blocked
   */
  isPathBlocked(from: IFEntity, to: IFEntity, direction: Direction): boolean {
    const exit = RoomBehavior.getExit(from, direction);
    if (!exit) return true;

    // Check if it's a closed/locked door
    if (exit.has(TraitType.DOOR)) {
      if (exit.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(exit)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all accessible exits from a room
   */
  getAccessibleExits(room: IFEntity): Map<Direction, IFEntity> {
    if (!room.has(TraitType.ROOM)) return new Map();

    const accessible = new Map<Direction, IFEntity>();
    const allExits = RoomBehavior.getAllExits(room);

    for (const [direction, exit] of allExits) {
      const canMove = this.canMove(room, direction);
      if (canMove === true) {
        const destination = this.getDestination(room, direction);
        if (destination) {
          accessible.set(direction, destination);
        }
      }
    }

    return accessible;
  }

  /**
   * Get movement restrictions for an entity
   * (e.g., too heavy to move, tied down, etc.)
   */
  getMovementRestrictions(entity: IFEntity): string[] {
    const restrictions: string[] = [];

    // Add more restriction checks as needed
    // For now, just a placeholder

    return restrictions;
  }

  /**
   * Calculate movement cost between rooms
   * (for future weighted pathfinding)
   */
  getMovementCost(from: IFEntity, to: IFEntity, direction: Direction): number {
    // Base cost
    let cost = 1;

    // Could add modifiers based on:
    // - Terrain difficulty
    // - Entity encumbrance
    // - Environmental conditions
    
    return cost;
  }
}
