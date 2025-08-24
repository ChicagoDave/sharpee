// packages/world-model/src/traits/room/roomTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';
import { EntityId } from '@sharpee/core';
import { DirectionType } from '../../constants/directions';

export interface IExitInfo {
  /** The destination room ID (must be an entity ID, not a name) */
  destination: string;
  /** Optional door/portal entity ID that must be traversed (must be an entity ID, not a name) */
  via?: string;
}

export interface IRoomData {
  /** Whether this room has been visited by the player */
  visited?: boolean;
  
  /** Exits from this room */
  exits?: Partial<Record<DirectionType, IExitInfo>>;
  
  /** Custom messages for blocked exits */
  blockedExits?: Partial<Record<DirectionType, string>>;
  
  /** Whether this is an outdoor location */
  outdoor?: boolean;
  
  /** Whether this room is dark (requires light source to see) */
  isDark?: boolean;
  
  /** Whether this room is affected by time of day (for outdoor locations) */
  isOutdoors?: boolean;
  
  /** Whether this room is underground (never has natural light) */
  isUnderground?: boolean;
  
  /** Initial description (shown on first visit) */
  initialDescription?: string;
  
  /** Ambient sound description */
  ambientSound?: string;
  
  /** Ambient smell description */
  ambientSmell?: string;
  
  /** Region or area this room belongs to */
  region?: string;
  
  /** Tags for categorizing rooms */
  tags?: string[];
  
  // Container functionality for rooms
  /** Capacity constraints for the room (optional) */
  capacity?: {
    /** Maximum total weight the room can hold (in kg) */
    maxWeight?: number;
    
    /** Maximum total volume the room can hold (in liters) */
    maxVolume?: number;
    
    /** Maximum number of items the room can hold */
    maxItems?: number;
  };
  
  /** Only these entity types can be placed in the room */
  allowedTypes?: string[];
  
  /** These entity types cannot be placed in the room */
  excludedTypes?: string[];
}

/**
 * Room trait marks an entity as a location/room in the game world.
 * Rooms are special entities that represent locations and can contain other entities.
 * 
 * Rooms inherently have container functionality - they can hold items, actors, and other entities.
 * The actual containment relationships are stored in the SpatialIndex, not in the trait itself.
 */
export class RoomTrait implements ITrait, IRoomData {
  static readonly type = TraitType.ROOM;
  readonly type = TraitType.ROOM;
  
  // RoomData properties
  visited: boolean;
  exits: Partial<Record<DirectionType, IExitInfo>>;
  blockedExits?: Partial<Record<DirectionType, string>>;
  outdoor: boolean;
  isDark: boolean;
  isOutdoors: boolean;
  isUnderground: boolean;
  initialDescription?: string;
  ambientSound?: string;
  ambientSmell?: string;
  region?: string;
  tags: string[];
  
  // Container functionality
  capacity?: {
    maxWeight?: number;
    maxVolume?: number;
    maxItems?: number;
  };
  allowedTypes?: string[];
  excludedTypes?: string[];
  
  // Rooms are always transparent (contents visible) and enterable
  readonly isTransparent: boolean = true;
  readonly enterable: boolean = true;
  
  constructor(data: IRoomData = {}) {
    // Set defaults and merge with provided data
    this.visited = data.visited ?? false;
    this.exits = data.exits ?? {} as Partial<Record<DirectionType, IExitInfo>>;
    this.blockedExits = data.blockedExits;
    this.outdoor = data.outdoor ?? false;
    this.isDark = data.isDark ?? false;  // Default to lit
    this.isOutdoors = data.isOutdoors ?? false;
    this.isUnderground = data.isUnderground ?? false;
    this.initialDescription = data.initialDescription;
    this.ambientSound = data.ambientSound;
    this.ambientSmell = data.ambientSmell;
    this.region = data.region;
    this.tags = data.tags ?? [];
    
    // Container properties
    this.capacity = data.capacity;
    this.allowedTypes = data.allowedTypes;
    this.excludedTypes = data.excludedTypes;
  }
}
