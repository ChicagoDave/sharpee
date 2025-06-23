// packages/core/src/constants/entity-types.ts
/**
 * Core entity types - generic types that any system might use
 * Game-specific types should be defined in their respective packages
 */
export var CoreEntityType;
(function (CoreEntityType) {
    // Base entity type
    CoreEntityType["ENTITY"] = "core.entity";
    // Component entities (for ECS-style systems)
    CoreEntityType["COMPONENT"] = "core.component";
    // System entities
    CoreEntityType["SYSTEM"] = "core.system";
    // Extension entities
    CoreEntityType["EXTENSION"] = "core.extension";
})(CoreEntityType || (CoreEntityType = {}));
/**
 * Type guard for core entity types
 */
export function isCoreEntityType(type) {
    return Object.values(CoreEntityType).includes(type);
}
//# sourceMappingURL=entity-types.js.map