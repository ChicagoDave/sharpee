// packages/world-model/src/traits/room/roomTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';
import { EntityId } from '@sharpee/core';

export interface ExitInfo {
  /** The destination room ID */
  destination: string;
  /** Optional door/portal entity ID that must be traversed */
  via?: string;
}

export interface RoomData {
  /** Whether this room has been visited by the player */
  visited?: boolean;
  
  /** Exits from this room */
  exits?: Record<string, ExitInfo>;
  
  /** Custom messages for blocked exits */
  blockedExits?: Record<string, string>;
  
  /** Whether this is an outdoor location */
  outdoor?: boolean;
  
  /** Base light level (0-10, where 0 is pitch black) */
  baseLight?: number;
  
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
}

/**
 * Room trait marks an entity as a location/room in the game world.
 * Rooms are special entities that represent locations and can contain other entities.
 */
export class RoomTrait implements Trait, RoomData {
  static readonly type = TraitType.ROOM;
  readonly type = TraitType.ROOM;
  
  // RoomData properties
  visited: boolean;
  exits: Record<string, ExitInfo>;
  blockedExits?: Record<string, string>;
  outdoor: boolean;
  baseLight: number;
  isOutdoors: boolean;
  isUnderground: boolean;
  initialDescription?: string;
  ambientSound?: string;
  ambientSmell?: string;
  region?: string;
  tags: string[];
  
  constructor(data: RoomData = {}) {
    // Set defaults and merge with provided data
    this.visited = data.visited ?? false;
    this.exits = data.exits ?? {};
    this.blockedExits = data.blockedExits;
    this.outdoor = data.outdoor ?? false;
    this.baseLight = data.baseLight ?? 0;  // Default to dark
    this.isOutdoors = data.isOutdoors ?? false;
    this.isUnderground = data.isUnderground ?? false;
    this.initialDescription = data.initialDescription;
    this.ambientSound = data.ambientSound;
    this.ambientSmell = data.ambientSmell;
    this.region = data.region;
    this.tags = data.tags ?? [];
  }
}
