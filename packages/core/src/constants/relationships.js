// packages/core/src/constants/relationships.ts
/**
 * Core relationship types - generic relationships that any system might use
 * Game-specific relationships should be defined in their respective packages
 */
export var CoreRelationshipType;
(function (CoreRelationshipType) {
    // Basic hierarchical relationships
    CoreRelationshipType["PARENT"] = "core.parent";
    CoreRelationshipType["CHILD"] = "core.child";
    // Generic associations
    CoreRelationshipType["RELATED_TO"] = "core.related_to";
    CoreRelationshipType["DEPENDS_ON"] = "core.depends_on";
    // Component relationships (for ECS-style systems)
    CoreRelationshipType["HAS_COMPONENT"] = "core.has_component";
    CoreRelationshipType["COMPONENT_OF"] = "core.component_of";
})(CoreRelationshipType || (CoreRelationshipType = {}));
/**
 * Standard configurations for core relationships
 */
export const CORE_RELATIONSHIP_CONFIGS = {
    [CoreRelationshipType.PARENT]: {
        bidirectional: true,
        inverse: CoreRelationshipType.CHILD,
        exclusive: true
    },
    [CoreRelationshipType.CHILD]: {
        bidirectional: true,
        inverse: CoreRelationshipType.PARENT,
        exclusive: false
    },
    [CoreRelationshipType.RELATED_TO]: {
        bidirectional: true,
        inverse: CoreRelationshipType.RELATED_TO,
        exclusive: false
    },
    [CoreRelationshipType.DEPENDS_ON]: {
        bidirectional: false,
        exclusive: false
    },
    [CoreRelationshipType.HAS_COMPONENT]: {
        bidirectional: true,
        inverse: CoreRelationshipType.COMPONENT_OF,
        exclusive: false
    },
    [CoreRelationshipType.COMPONENT_OF]: {
        bidirectional: true,
        inverse: CoreRelationshipType.HAS_COMPONENT,
        exclusive: true
    }
};
//# sourceMappingURL=relationships.js.map