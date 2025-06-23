// packages/stdlib/src/constants/if-relationships.ts
/**
 * Interactive Fiction relationship types
 * These define how entities relate to each other in an IF world
 */
export var IFRelationshipType;
(function (IFRelationshipType) {
    // Containment relationships
    IFRelationshipType["CONTAINS"] = "if.contains";
    IFRelationshipType["CONTAINED_BY"] = "if.contained_by";
    IFRelationshipType["SUPPORTS"] = "if.supports";
    IFRelationshipType["SUPPORTED_BY"] = "if.supported_by";
    IFRelationshipType["ENCLOSES"] = "if.encloses";
    IFRelationshipType["ENCLOSED_BY"] = "if.enclosed_by";
    // Wearing relationships
    IFRelationshipType["WORN_BY"] = "if.worn_by";
    IFRelationshipType["WEARING"] = "if.wearing";
    // Carrying relationships
    IFRelationshipType["CARRIED_BY"] = "if.carried_by";
    IFRelationshipType["CARRYING"] = "if.carrying";
    // Spatial/exit relationships
    IFRelationshipType["NORTH_OF"] = "if.north_of";
    IFRelationshipType["SOUTH_OF"] = "if.south_of";
    IFRelationshipType["EAST_OF"] = "if.east_of";
    IFRelationshipType["WEST_OF"] = "if.west_of";
    IFRelationshipType["NORTHEAST_OF"] = "if.northeast_of";
    IFRelationshipType["NORTHWEST_OF"] = "if.northwest_of";
    IFRelationshipType["SOUTHEAST_OF"] = "if.southeast_of";
    IFRelationshipType["SOUTHWEST_OF"] = "if.southwest_of";
    IFRelationshipType["UP_FROM"] = "if.up_from";
    IFRelationshipType["DOWN_FROM"] = "if.down_from";
    IFRelationshipType["IN_FROM"] = "if.in_from";
    IFRelationshipType["OUT_FROM"] = "if.out_from";
    // Door/passage relationships
    IFRelationshipType["CONNECTS"] = "if.connects";
    IFRelationshipType["CONNECTED_TO"] = "if.connected_to";
    IFRelationshipType["LEADS_TO"] = "if.leads_to";
    IFRelationshipType["LEADS_FROM"] = "if.leads_from";
    // Lock/key relationships
    IFRelationshipType["UNLOCKS"] = "if.unlocks";
    IFRelationshipType["UNLOCKED_BY"] = "if.unlocked_by";
    IFRelationshipType["LOCKS"] = "if.locks";
    IFRelationshipType["LOCKED_BY"] = "if.locked_by";
    // Part/component relationships
    IFRelationshipType["PART_OF"] = "if.part_of";
    IFRelationshipType["HAS_PART"] = "if.has_part";
    IFRelationshipType["INCORPORATES"] = "if.incorporates";
    IFRelationshipType["INCORPORATED_BY"] = "if.incorporated_by";
    // Ownership relationships
    IFRelationshipType["OWNS"] = "if.owns";
    IFRelationshipType["OWNED_BY"] = "if.owned_by";
    IFRelationshipType["BELONGS_TO"] = "if.belongs_to";
    // Visibility/knowledge relationships
    IFRelationshipType["CAN_SEE"] = "if.can_see";
    IFRelationshipType["SEEN_BY"] = "if.seen_by";
    IFRelationshipType["KNOWS_ABOUT"] = "if.knows_about";
    IFRelationshipType["KNOWN_BY"] = "if.known_by";
})(IFRelationshipType || (IFRelationshipType = {}));
/**
 * Get the inverse of an IF relationship
 */
export function getInverseRelationship(rel) {
    const inverseMap = {
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
 * Map directions to their relationship types
 */
export function directionToRelationship(direction) {
    const directionMap = {
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
//# sourceMappingURL=if-relationships.js.map