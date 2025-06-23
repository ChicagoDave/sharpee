/**
 * Interactive Fiction attributes
 *
 * Standard attributes used by IF entities
 */
export declare enum IFAttributes {
    NAME = "name",
    DESCRIPTION = "description",
    DETAILS = "details",
    OPEN = "open",
    LOCKED = "locked",
    PORTABLE = "portable",
    CONTAINER = "container",
    SUPPORTER = "supporter",
    SCENERY = "scenery",
    EDIBLE = "edible",
    WEARABLE = "wearable",
    WORN = "worn",
    SWITCHABLE = "switchable",
    ON = "on",
    CAPACITY = "capacity",
    SIZE = "size",
    PROPER_NAMED = "proper_named",
    PLURAL_NAMED = "plural_named",
    MENTIONED = "mentioned",
    HANDLED = "handled",
    VISITED = "visited"
}
export declare enum IFAttributeType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array"
}
/**
 * IF attribute definitions with their expected types
 */
export declare const IF_ATTRIBUTE_TYPES: Record<IFAttributes, IFAttributeType>;
