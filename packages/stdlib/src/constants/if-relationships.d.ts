/**
 * Interactive Fiction relationship types
 * These define how entities relate to each other in an IF world
 */
export declare enum IFRelationshipType {
    CONTAINS = "if.contains",
    CONTAINED_BY = "if.contained_by",
    SUPPORTS = "if.supports",
    SUPPORTED_BY = "if.supported_by",
    ENCLOSES = "if.encloses",
    ENCLOSED_BY = "if.enclosed_by",
    WORN_BY = "if.worn_by",
    WEARING = "if.wearing",
    CARRIED_BY = "if.carried_by",
    CARRYING = "if.carrying",
    NORTH_OF = "if.north_of",
    SOUTH_OF = "if.south_of",
    EAST_OF = "if.east_of",
    WEST_OF = "if.west_of",
    NORTHEAST_OF = "if.northeast_of",
    NORTHWEST_OF = "if.northwest_of",
    SOUTHEAST_OF = "if.southeast_of",
    SOUTHWEST_OF = "if.southwest_of",
    UP_FROM = "if.up_from",
    DOWN_FROM = "if.down_from",
    IN_FROM = "if.in_from",
    OUT_FROM = "if.out_from",
    CONNECTS = "if.connects",
    CONNECTED_TO = "if.connected_to",
    LEADS_TO = "if.leads_to",
    LEADS_FROM = "if.leads_from",
    UNLOCKS = "if.unlocks",
    UNLOCKED_BY = "if.unlocked_by",
    LOCKS = "if.locks",
    LOCKED_BY = "if.locked_by",
    PART_OF = "if.part_of",
    HAS_PART = "if.has_part",
    INCORPORATES = "if.incorporates",
    INCORPORATED_BY = "if.incorporated_by",
    OWNS = "if.owns",
    OWNED_BY = "if.owned_by",
    BELONGS_TO = "if.belongs_to",
    CAN_SEE = "if.can_see",
    SEEN_BY = "if.seen_by",
    KNOWS_ABOUT = "if.knows_about",
    KNOWN_BY = "if.known_by"
}
/**
 * Get the inverse of an IF relationship
 */
export declare function getInverseRelationship(rel: IFRelationshipType): IFRelationshipType | null;
/**
 * Direction types used in IF
 */
export type IFDirection = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest' | 'up' | 'down' | 'in' | 'out';
/**
 * Map directions to their relationship types
 */
export declare function directionToRelationship(direction: IFDirection): IFRelationshipType;
