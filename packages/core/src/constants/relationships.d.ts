/**
 * Core relationship types - generic relationships that any system might use
 * Game-specific relationships should be defined in their respective packages
 */
export declare enum CoreRelationshipType {
    PARENT = "core.parent",
    CHILD = "core.child",
    RELATED_TO = "core.related_to",
    DEPENDS_ON = "core.depends_on",
    HAS_COMPONENT = "core.has_component",
    COMPONENT_OF = "core.component_of"
}
/**
 * Configuration for core relationships
 */
export interface CoreRelationshipConfig {
    bidirectional?: boolean;
    inverse?: CoreRelationshipType;
    exclusive?: boolean;
}
/**
 * Standard configurations for core relationships
 */
export declare const CORE_RELATIONSHIP_CONFIGS: Record<CoreRelationshipType, CoreRelationshipConfig>;
