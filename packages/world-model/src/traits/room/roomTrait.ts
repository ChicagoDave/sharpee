// packages/world-model/src/traits/room/roomTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';
import { EntityId } from '@sharpee/core';
import { SnippetMap } from '@sharpee/if-domain';
import { DirectionType } from '../../constants/directions';

/**
 * Map position hint for an exit (ADR-113).
 * Overrides direction-based positioning in the auto-mapper.
 */
export interface IExitMapHint {
  /** Grid offset X (-1 = west, +1 = east) */
  dx?: number;
  /** Grid offset Y (-1 = north, +1 = south) */
  dy?: number;
  /** Grid offset Z (-1 = down, +1 = up) */
  dz?: number;
}

export interface IExitInfo {
  /** The destination room ID (must be an entity ID, not a name) */
  destination: string;
  /** Optional door/portal entity ID that must be traversed (must be an entity ID, not a name) */
  via?: string;
  /** Optional map positioning hint (ADR-113) */
  mapHint?: IExitMapHint;
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
  
  /**
   * Whether this room is *intrinsically* dark — it needs an active light source
   * to be seen. This is the raw input, not the answer: the effective "is it dark
   * right now?" question (which also accounts for a carried lit lamp) is owned by
   * `VisibilityBehavior.isDark(room, world)` — never read this field directly for that.
   */
  requiresLight?: boolean;
  
  /** Whether this room is affected by time of day (for outdoor locations) */
  isOutdoors?: boolean;
  
  /** Whether this room is underground (never has natural light) */
  isUnderground?: boolean;
  
  /** Initial description (shown on first visit) */
  initialDescription?: string;

  /**
   * Message ID for localized initial description (ADR-107).
   * If set, takes precedence over literal `initialDescription`.
   */
  initialDescriptionId?: string;

  /**
   * Marker→snippet table (ADR-209). When present, `{snippet:name}` markers in
   * `description` and `initialDescription` are spliced from these entries at
   * render time; when absent, descriptions are never scanned (braces stay
   * literal prose). Plain serializable data — selection counters live in the
   * text-state store, not here. Handlers may mutate entries at runtime (set to
   * `''` rather than deleting, so load-time validation stays meaningful).
   */
  snippets?: SnippetMap;

  /** Ambient sound description */
  ambientSound?: string;
  
  /** Ambient smell description */
  ambientSmell?: string;
  
  /** ID of the region entity this room belongs to (ADR-149) */
  regionId?: string;

  /**
   * Wall entities this room borders (ADR-173).
   * Maintained automatically by `WorldModel.createWall` —
   * authors do not append directly.
   */
  walls?: string[];

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
  requiresLight: boolean;
  isOutdoors: boolean;
  isUnderground: boolean;
  initialDescription?: string;
  initialDescriptionId?: string;
  snippets?: SnippetMap;
  ambientSound?: string;
  ambientSmell?: string;
  regionId?: string;
  walls: string[];
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
    this.requiresLight = data.requiresLight ?? false;  // Default to lit
    this.isOutdoors = data.isOutdoors ?? false;
    this.isUnderground = data.isUnderground ?? false;
    this.initialDescription = data.initialDescription;
    this.initialDescriptionId = data.initialDescriptionId;
    this.snippets = data.snippets;
    this.ambientSound = data.ambientSound;
    this.ambientSmell = data.ambientSmell;
    this.regionId = data.regionId;
    this.walls = data.walls ?? [];
    this.tags = data.tags ?? [];
    
    // Container properties
    this.capacity = data.capacity;
    this.allowedTypes = data.allowedTypes;
    this.excludedTypes = data.excludedTypes;
  }
}
