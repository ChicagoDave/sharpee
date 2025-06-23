// packages/stdlib/src/constants/if-relationships.ts

/**
 * Interactive Fiction relationship types
 * These define how entities relate to each other in an IF world
 */
export enum IFRelationshipType {
  // Containment relationships
  CONTAINS = 'if.contains',
  CONTAINED_BY = 'if.contained_by',
  SUPPORTS = 'if.supports',
  SUPPORTED_BY = 'if.supported_by',
  ENCLOSES = 'if.encloses',
  ENCLOSED_BY = 'if.enclosed_by',
  
  // Wearing relationships
  WORN_BY = 'if.worn_by',
  WEARING = 'if.wearing',
  
  // Carrying relationships
  CARRIED_BY = 'if.carried_by',
  CARRYING = 'if.carrying',
  
  // Spatial/exit relationships
  NORTH_OF = 'if.north_of',
  SOUTH_OF = 'if.south_of',
  EAST_OF = 'if.east_of',
  WEST_OF = 'if.west_of',
  NORTHEAST_OF = 'if.northeast_of',
  NORTHWEST_OF = 'if.northwest_of',
  SOUTHEAST_OF = 'if.southeast_of',
  SOUTHWEST_OF = 'if.southwest_of',
  UP_FROM = 'if.up_from',
  DOWN_FROM = 'if.down_from',
  IN_FROM = 'if.in_from',
  OUT_FROM = 'if.out_from',
  
  // Door/passage relationships
  CONNECTS = 'if.connects',
  CONNECTED_TO = 'if.connected_to',
  LEADS_TO = 'if.leads_to',
  LEADS_FROM = 'if.leads_from',
  
  // Lock/key relationships
  UNLOCKS = 'if.unlocks',
  UNLOCKED_BY = 'if.unlocked_by',
  LOCKS = 'if.locks',
  LOCKED_BY = 'if.locked_by',
  
  // Part/component relationships
  PART_OF = 'if.part_of',
  HAS_PART = 'if.has_part',
  INCORPORATES = 'if.incorporates',
  INCORPORATED_BY = 'if.incorporated_by',
  
  // Ownership relationships
  OWNS = 'if.owns',
  OWNED_BY = 'if.owned_by',
  BELONGS_TO = 'if.belongs_to',
  
  // Visibility/knowledge relationships
  CAN_SEE = 'if.can_see',
  SEEN_BY = 'if.seen_by',
  KNOWS_ABOUT = 'if.knows_about',
  KNOWN_BY = 'if.known_by'
}

/**
 * Get the inverse of an IF relationship
 */
export function getInverseRelationship(rel: IFRelationshipType): IFRelationshipType | null {
  const inverseMap: Partial<Record<IFRelationshipType, IFRelationshipType>> = {
    [IFRelationshipType.CONTAINS]: IFRelationshipType.CONTAINED_BY,
    [IFRelationshipType.CONTAINED_BY]: IFRelationshipType.CONTAINS,
    [IFRelationshipType.SUPPORTS]: IFRelationshipType.SUPPORTED_BY,
    [IFRelationshipType.SUPPORTED_BY]: IFRelationshipType.SUPPORTS,
    [IFRelationshipType.ENCLOSES]: IFRelationshipType.ENCLOSED_BY,
    [IFRelationshipType.ENCLOSED_BY]: IFRelationshipType.ENCLOSES,
    [IFRelationshipType.WORN_BY]: IFRelationshipType.WEARING,
    [IFRelationshipType.WEARING]: IFRelationshipType.WORN_BY,
    [IFRelationshipType.CARRIED_BY]: IFRelationshipType.CARRYING,
    [IFRelationshipType.CARRYING]: IFRelationshipType.CARRIED_BY,
    [IFRelationshipType.NORTH_OF]: IFRelationshipType.SOUTH_OF,
    [IFRelationshipType.SOUTH_OF]: IFRelationshipType.NORTH_OF,
    [IFRelationshipType.EAST_OF]: IFRelationshipType.WEST_OF,
    [IFRelationshipType.WEST_OF]: IFRelationshipType.EAST_OF,
    [IFRelationshipType.NORTHEAST_OF]: IFRelationshipType.SOUTHWEST_OF,
    [IFRelationshipType.SOUTHWEST_OF]: IFRelationshipType.NORTHEAST_OF,
    [IFRelationshipType.NORTHWEST_OF]: IFRelationshipType.SOUTHEAST_OF,
    [IFRelationshipType.SOUTHEAST_OF]: IFRelationshipType.NORTHWEST_OF,
    [IFRelationshipType.UP_FROM]: IFRelationshipType.DOWN_FROM,
    [IFRelationshipType.DOWN_FROM]: IFRelationshipType.UP_FROM,
    [IFRelationshipType.IN_FROM]: IFRelationshipType.OUT_FROM,
    [IFRelationshipType.OUT_FROM]: IFRelationshipType.IN_FROM,
    [IFRelationshipType.CONNECTS]: IFRelationshipType.CONNECTED_TO,
    [IFRelationshipType.CONNECTED_TO]: IFRelationshipType.CONNECTS,
    [IFRelationshipType.LEADS_TO]: IFRelationshipType.LEADS_FROM,
    [IFRelationshipType.LEADS_FROM]: IFRelationshipType.LEADS_TO,
    [IFRelationshipType.UNLOCKS]: IFRelationshipType.UNLOCKED_BY,
    [IFRelationshipType.UNLOCKED_BY]: IFRelationshipType.UNLOCKS,
    [IFRelationshipType.LOCKS]: IFRelationshipType.LOCKED_BY,
    [IFRelationshipType.LOCKED_BY]: IFRelationshipType.LOCKS,
    [IFRelationshipType.PART_OF]: IFRelationshipType.HAS_PART,
    [IFRelationshipType.HAS_PART]: IFRelationshipType.PART_OF,
    [IFRelationshipType.INCORPORATES]: IFRelationshipType.INCORPORATED_BY,
    [IFRelationshipType.INCORPORATED_BY]: IFRelationshipType.INCORPORATES,
    [IFRelationshipType.OWNS]: IFRelationshipType.OWNED_BY,
    [IFRelationshipType.OWNED_BY]: IFRelationshipType.OWNS,
    [IFRelationshipType.CAN_SEE]: IFRelationshipType.SEEN_BY,
    [IFRelationshipType.SEEN_BY]: IFRelationshipType.CAN_SEE,
    [IFRelationshipType.KNOWS_ABOUT]: IFRelationshipType.KNOWN_BY,
    [IFRelationshipType.KNOWN_BY]: IFRelationshipType.KNOWS_ABOUT
  };
  
  return inverseMap[rel] || null;
}

/**
 * Direction types used in IF
 */
export type IFDirection = 
  | 'north' | 'south' | 'east' | 'west'
  | 'northeast' | 'northwest' | 'southeast' | 'southwest'
  | 'up' | 'down' | 'in' | 'out';

/**
 * Map directions to their relationship types
 */
export function directionToRelationship(direction: IFDirection): IFRelationshipType {
  const directionMap: Record<IFDirection, IFRelationshipType> = {
    'north': IFRelationshipType.NORTH_OF,
    'south': IFRelationshipType.SOUTH_OF,
    'east': IFRelationshipType.EAST_OF,
    'west': IFRelationshipType.WEST_OF,
    'northeast': IFRelationshipType.NORTHEAST_OF,
    'northwest': IFRelationshipType.NORTHWEST_OF,
    'southeast': IFRelationshipType.SOUTHEAST_OF,
    'southwest': IFRelationshipType.SOUTHWEST_OF,
    'up': IFRelationshipType.UP_FROM,
    'down': IFRelationshipType.DOWN_FROM,
    'in': IFRelationshipType.IN_FROM,
    'out': IFRelationshipType.OUT_FROM
  };
  
  return directionMap[direction];
}
