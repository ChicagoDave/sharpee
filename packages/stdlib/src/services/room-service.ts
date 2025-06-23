/**
 * Room Service
 * 
 * Manages room connections, lighting, descriptions, and spatial relationships
 * for the standard library.
 */

import { Entity as IFEntity } from '@sharpee/core';
import { IFWorld } from '../world-model/world-interface';
import { 
  TraitType, 
  RoomBehavior,
  LightSourceBehavior,
  ExitBehavior,
  DoorBehavior,
  IdentityBehavior,
  SceneryBehavior,
  OpenableBehavior,
  LockableBehavior
} from '@sharpee/world-model';
import { Direction } from '@sharpee/world-model';

export interface ExitInfo {
  direction: Direction;
  destination: IFEntity | null;
  exit: IFEntity;
  isOpen: boolean;
  isLocked: boolean;
  description?: string;
}

export class RoomService {
  constructor(private world: IFWorld) {}

  /**
   * Connect two rooms with exits in specified directions
   * Creates reciprocal connections
   */
  connect(
    room1: IFEntity, 
    dir1: Direction, 
    room2: IFEntity, 
    dir2: Direction
  ): void {
    if (!room1.has(TraitType.ROOM) || !room2.has(TraitType.ROOM)) {
      throw new Error('Both entities must be rooms');
    }

    // Set exits on both rooms
    RoomBehavior.setExit(room1, dir1, room2);
    RoomBehavior.setExit(room2, dir2, room1);
  }

  /**
   * Disconnect an exit from a room
   * Optionally removes reciprocal connection
   */
  disconnect(room: IFEntity, direction: Direction, reciprocal: boolean = true): void {
    if (!room.has(TraitType.ROOM)) {
      throw new Error('Entity must be a room');
    }

    const exit = RoomBehavior.getExit(room, direction);
    if (!exit) return;

    // If reciprocal and exit leads to another room, remove reverse connection
    if (reciprocal) {
      let targetRoom: IFEntity | null = null;

      if (exit.has(TraitType.ROOM)) {
        targetRoom = exit;
      } else if (exit.has(TraitType.DOOR)) {
        const otherId = DoorBehavior.getOtherRoom(exit, room.id);
        targetRoom = otherId ? this.world.getEntity(otherId) : null;
      } else if (exit.has(TraitType.EXIT)) {
        const destId = ExitBehavior.getDestination(exit);
        targetRoom = destId ? this.world.getEntity(destId) : null;
      }

      if (targetRoom) {
        // Find which direction points back to this room
        const reverseDir = this.findExitTo(targetRoom, room);
        if (reverseDir) {
          RoomBehavior.removeExit(targetRoom, reverseDir);
        }
      }
    }

    RoomBehavior.removeExit(room, direction);
  }

  /**
   * Get total light level in a room
   */
  getTotalLight(room: IFEntity): number {
    if (!room.has(TraitType.ROOM)) return 0;

    let totalLight = 0;

    // Check room's inherent light
    if (room.has(TraitType.LIGHT_SOURCE)) {
      if (LightSourceBehavior.isLit(room)) {
        totalLight += LightSourceBehavior.getBrightness(room);
      }
    }

    // Check all light sources in the room
    const contents = this.world.getContents(room.id);
    for (const item of contents) {
      totalLight += this.getLightContribution(item);
    }

    return totalLight;
  }

  /**
   * Check if a room is dark
   */
  isDark(room: IFEntity): boolean {
    if (!room.has(TraitType.ROOM)) return false;
    return RoomBehavior.isDark(room, this.world);
  }

  /**
   * Get all light sources in a room
   */
  getLightSources(room: IFEntity): IFEntity[] {
    const sources: IFEntity[] = [];

    // Check if room itself is a light source
    if (room.has(TraitType.LIGHT_SOURCE) && LightSourceBehavior.isLit(room)) {
      sources.push(room);
    }

    // Find all light sources in contents
    this.findLightSourcesRecursive(room, sources);

    return sources;
  }

  /**
   * Get full description of a room from an observer's perspective
   */
  getFullDescription(room: IFEntity, observer: IFEntity): string {
    const parts: string[] = [];

    // Room name
    const name = room.has(TraitType.IDENTITY) 
      ? IdentityBehavior.getName(room) 
      : room.id;
    parts.push(name);

    // Room description
    if (room.has(TraitType.IDENTITY)) {
      const desc = IdentityBehavior.getDescription(room);
      if (desc) parts.push(desc);
    }

    // Check if dark
    if (this.isDark(room)) {
      parts.push("It is dark here.");
      return parts.join('\n\n');
    }

    // List exits
    const exits = this.listExits(room);
    if (exits.length > 0) {
      const exitDescs = exits.map(exit => {
        let desc = exit.direction;
        if (exit.description) {
          desc += ` (${exit.description})`;
        }
        if (!exit.isOpen) {
          desc += ' [closed]';
        }
        if (exit.isLocked) {
          desc += ' [locked]';
        }
        return desc;
      });
      parts.push(`Exits: ${exitDescs.join(', ')}`);
    }

    // List visible contents
    const contents = this.listContents(room, observer);
    if (contents.length > 0) {
      const contentDescs = contents.map(item => {
        const itemName = item.has(TraitType.IDENTITY)
          ? IdentityBehavior.getName(item)
          : item.id;
        
        // Add position info
        const position = this.world.getLocation(item.id);
        if (position && position !== room.id) {
          const container = this.world.getEntity(position);
          if (container && container.has(TraitType.SUPPORTER)) {
            return `${itemName} (on ${IdentityBehavior.getName(container)})`;
          } else if (container && container.has(TraitType.CONTAINER)) {
            return `${itemName} (in ${IdentityBehavior.getName(container)})`;
          }
        }
        
        return itemName;
      });
      parts.push(`You can see: ${contentDescs.join(', ')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * List all exits from a room
   */
  listExits(room: IFEntity): ExitInfo[] {
    if (!room.has(TraitType.ROOM)) return [];

    const exitInfos: ExitInfo[] = [];
    const exits = RoomBehavior.getAllExits(room);

    for (const [direction, exit] of exits) {
      const info: ExitInfo = {
        direction,
        destination: null,
        exit,
        isOpen: true,
        isLocked: false
      };

      // Get destination
      if (exit.has(TraitType.ROOM)) {
        info.destination = exit;
      } else if (exit.has(TraitType.DOOR)) {
        const otherId = DoorBehavior.getOtherRoom(exit, room.id);
        info.destination = otherId ? this.world.getEntity(otherId) : null;
        
        if (exit.has(TraitType.OPENABLE)) {
          info.isOpen = OpenableBehavior.isOpen(exit);
        }
        if (exit.has(TraitType.LOCKABLE)) {
          info.isLocked = LockableBehavior.isLocked(exit);
        }
      } else if (exit.has(TraitType.EXIT)) {
        const destId = ExitBehavior.getDestination(exit);
        info.destination = destId ? this.world.getEntity(destId) : null;
      }

      // Get description if available
      if (exit.has(TraitType.IDENTITY)) {
        info.description = IdentityBehavior.getDescription(exit);
      }

      exitInfos.push(info);
    }

    return exitInfos;
  }

  /**
   * List contents of a room visible to an observer
   */
  listContents(room: IFEntity, observer: IFEntity): IFEntity[] {
    const contents = this.world.getContents(room.id);
    const visible: IFEntity[] = [];

    for (const item of contents) {
      // Skip the observer
      if (item.id === observer.id) continue;

      // Skip exits (they're listed separately)
      if (item.has(TraitType.EXIT) || item.has(TraitType.DOOR)) continue;

      // Skip hidden scenery unless examined
      if (item.has(TraitType.SCENERY) && SceneryBehavior.isHidden(item)) {
        continue;
      }

      visible.push(item);

      // Add visible contents of open containers and supporters
      if (item.has(TraitType.CONTAINER) && 
          (!item.has(TraitType.OPENABLE) || OpenableBehavior.isOpen(item))) {
        visible.push(...this.world.getContents(item.id));
      } else if (item.has(TraitType.SUPPORTER)) {
        visible.push(...this.world.getContents(item.id));
      }
    }

    return visible;
  }

  /**
   * Create a door between two rooms
   */
  createDoor(
    room1: IFEntity,
    dir1: Direction,
    room2: IFEntity, 
    dir2: Direction,
    doorEntity: IFEntity
  ): void {
    if (!doorEntity.has(TraitType.DOOR)) {
      throw new Error('Entity must have DOOR trait');
    }

    // Set up the door's room connections
    DoorBehavior.setRooms(doorEntity, room1.id, room2.id);

    // Set the door as the exit in both directions
    RoomBehavior.setExit(room1, dir1, doorEntity);
    RoomBehavior.setExit(room2, dir2, doorEntity);

    // Place the door in a special location or the first room
    this.world.moveEntity(doorEntity.id, room1.id);
  }

  /**
   * Find which direction in a room leads to a target
   */
  private findExitTo(from: IFEntity, target: IFEntity): Direction | null {
    const exits = RoomBehavior.getAllExits(from);
    
    for (const [direction, exit] of exits) {
      if (exit.id === target.id) {
        return direction;
      }

      // Check door destinations
      if (exit.has(TraitType.DOOR)) {
        const otherId = DoorBehavior.getOtherRoom(exit, from.id);
        if (otherId === target.id) {
          return direction;
        }
      }

      // Check exit destinations
      if (exit.has(TraitType.EXIT)) {
        const destId = ExitBehavior.getDestination(exit);
        if (destId === target.id) {
          return direction;
        }
      }
    }

    return null;
  }

  /**
   * Get light contribution from an entity (recursive)
   */
  private getLightContribution(entity: IFEntity): number {
    let light = 0;

    // Direct light source
    if (entity.has(TraitType.LIGHT_SOURCE) && LightSourceBehavior.isLit(entity)) {
      light += LightSourceBehavior.getBrightness(entity);
    }

    // Check contents if it's an open container or supporter
    if (entity.has(TraitType.CONTAINER)) {
      if (!entity.has(TraitType.OPENABLE) || OpenableBehavior.isOpen(entity)) {
        const contents = this.world.getContents(entity.id);
        for (const item of contents) {
          light += this.getLightContribution(item);
        }
      }
    } else if (entity.has(TraitType.SUPPORTER)) {
      const contents = this.world.getContents(entity.id);
      for (const item of contents) {
        light += this.getLightContribution(item);
      }
    }

    return light;
  }

  /**
   * Recursively find light sources
   */
  private findLightSourcesRecursive(container: IFEntity, sources: IFEntity[]): void {
    const contents = this.world.getContents(container.id);

    for (const item of contents) {
      if (item.has(TraitType.LIGHT_SOURCE) && LightSourceBehavior.isLit(item)) {
        sources.push(item);
      }

      // Recurse into open containers and supporters
      if (item.has(TraitType.CONTAINER)) {
        if (!item.has(TraitType.OPENABLE) || OpenableBehavior.isOpen(item)) {
          this.findLightSourcesRecursive(item, sources);
        }
      } else if (item.has(TraitType.SUPPORTER)) {
        this.findLightSourcesRecursive(item, sources);
      }
    }
  }
}
