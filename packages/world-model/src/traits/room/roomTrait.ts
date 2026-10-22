// packages/world-model/src/traits/room/roomTrait.ts

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';
import { type EntityId } from '@sharpee/core';
import { type SnippetMap } from '@sharpee/if-domain';
import { ExitKey } from '../../constants/directions.js';

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

/**
 * Who may take a way beyond a walker (ADR-366 D6, ADR-378 D6): the steered
 * vehicles by id, and the pushed things — every pushable (`'any'`) or these
 * by id. Read only by the traversal system (`TraversalBehavior.admitsMover`).
 */
export interface Admittance {
  /** The steered vehicles admitted, by entity id. */
  vehicles: string[];
  /** The pushed things admitted: every pushable, or these entity ids. */
  pushed: 'any' | string[];
}

export interface IExitInfo {
  /** The destination room ID (must be an entity ID, not a name) */
  destination: string;
  /** Optional door/portal entity ID that must be traversed (must be an entity ID, not a name) */
  via?: string;
  /** Optional map positioning hint (ADR-113) */
  mapHint?: IExitMapHint;
  /**
   * This way's own admittance (ADR-378 D6), read field by field before the
   * destination room's: an exit line's `admits` writes both fields; a
   * thing's `pushing` block (D6b) adds its id to `pushed` alone. A field
   * absent here is the room's to decide.
   */
  admits?: Partial<Admittance>;
}

export interface IRoomData {
  /** Whether this room has been visited by the player */
  visited?: boolean;
  
  /** Exits from this room, by compass direction or passage key (ADR-378 D1a) */
  exits?: Partial<Record<ExitKey, IExitInfo>>;

  /** Custom messages for blocked exits */
  blockedExits?: Partial<Record<ExitKey, string>>;
  
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

  /**
   * Who may arrive here beyond a walker (ADR-366 D6, ADR-378 D6). Read by
   * the traversal system for every way into this room whose exit does not
   * decide the field itself; a room admits nothing by default.
   */
  admits?: Admittance;

  /**
   * A landmark room's outlook over its expanse (ADR-376 D6), in expanse
   * units: from here the player sees what lies within this distance of the
   * room's cell. Absent means the room sees nothing of the expanse.
   */
  sight?: number;
  
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
  exits: Partial<Record<ExitKey, IExitInfo>>;
  blockedExits?: Partial<Record<ExitKey, string>>;
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
  admits: Admittance;
  sight?: number;
  
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
    this.exits = data.exits ?? {} as Partial<Record<ExitKey, IExitInfo>>;
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
    this.admits = data.admits ?? { vehicles: [], pushed: [] };
    this.sight = data.sight;
    
    // Container properties
    this.capacity = data.capacity;
    this.allowedTypes = data.allowedTypes;
    this.excludedTypes = data.excludedTypes;
  }
}
