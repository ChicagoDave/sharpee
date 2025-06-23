// packages/core/src/constants/core-events.ts
/**
 * Core system events - generic events that any narrative system might use
 * These are infrastructure-level events, not game-specific
 */
export var CoreEvents;
(function (CoreEvents) {
    // System lifecycle events
    CoreEvents["SYSTEM_INITIALIZED"] = "core.system.initialized";
    CoreEvents["SYSTEM_SHUTDOWN"] = "core.system.shutdown";
    // State management events
    CoreEvents["STATE_CHANGED"] = "core.state.changed";
    CoreEvents["STATE_RESTORED"] = "core.state.restored";
    // Entity lifecycle events
    CoreEvents["ENTITY_CREATED"] = "core.entity.created";
    CoreEvents["ENTITY_UPDATED"] = "core.entity.updated";
    CoreEvents["ENTITY_DESTROYED"] = "core.entity.destroyed";
    // Relationship events
    CoreEvents["RELATIONSHIP_CREATED"] = "core.relationship.created";
    CoreEvents["RELATIONSHIP_UPDATED"] = "core.relationship.updated";
    CoreEvents["RELATIONSHIP_DESTROYED"] = "core.relationship.destroyed";
    // Command processing events
    CoreEvents["COMMAND_RECEIVED"] = "core.command.received";
    CoreEvents["COMMAND_PARSED"] = "core.command.parsed";
    CoreEvents["COMMAND_EXECUTED"] = "core.command.executed";
    CoreEvents["COMMAND_FAILED"] = "core.command.failed";
    // Extension events
    CoreEvents["EXTENSION_LOADED"] = "core.extension.loaded";
    CoreEvents["EXTENSION_UNLOADED"] = "core.extension.unloaded";
    // Error events
    CoreEvents["ERROR_OCCURRED"] = "core.error.occurred";
    CoreEvents["WARNING_RAISED"] = "core.warning.raised";
})(CoreEvents || (CoreEvents = {}));
/**
 * Core event categories for filtering
 */
export var CoreEventCategory;
(function (CoreEventCategory) {
    CoreEventCategory["SYSTEM"] = "system";
    CoreEventCategory["STATE"] = "state";
    CoreEventCategory["ENTITY"] = "entity";
    CoreEventCategory["RELATIONSHIP"] = "relationship";
    CoreEventCategory["COMMAND"] = "command";
    CoreEventCategory["EXTENSION"] = "extension";
    CoreEventCategory["ERROR"] = "error";
})(CoreEventCategory || (CoreEventCategory = {}));
//# sourceMappingURL=core-events.js.map