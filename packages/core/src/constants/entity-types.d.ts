/**
 * Core entity types - generic types that any system might use
 * Game-specific types should be defined in their respective packages
 */
export declare enum CoreEntityType {
    ENTITY = "core.entity",
    COMPONENT = "core.component",
    SYSTEM = "core.system",
    EXTENSION = "core.extension"
}
/**
 * Type guard for core entity types
 */
export declare function isCoreEntityType(type: string): type is CoreEntityType;
