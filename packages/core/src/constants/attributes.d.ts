/**
 * Core entity attributes - generic attributes that any entity might have
 * Game-specific attributes should be defined in their respective packages
 */
export declare enum CoreAttributes {
    ID = "id",
    TYPE = "type",
    NAME = "name",
    CREATED_AT = "created_at",
    UPDATED_AT = "updated_at",
    VERSION = "version",
    ACTIVE = "active",
    VISIBLE = "visible",
    EXTENSIONS = "extensions",
    METADATA = "metadata"
}
/**
 * Core attribute types for validation
 */
export declare enum CoreAttributeType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    OBJECT = "object",
    ARRAY = "array",
    DATE = "date"
}
/**
 * Core attribute definitions with their expected types
 */
export declare const CORE_ATTRIBUTE_TYPES: Record<CoreAttributes, CoreAttributeType>;
