/**
 * Core system events - generic events that any narrative system might use
 * These are infrastructure-level events, not game-specific
 */
export declare enum CoreEvents {
    SYSTEM_INITIALIZED = "core.system.initialized",
    SYSTEM_SHUTDOWN = "core.system.shutdown",
    STATE_CHANGED = "core.state.changed",
    STATE_RESTORED = "core.state.restored",
    ENTITY_CREATED = "core.entity.created",
    ENTITY_UPDATED = "core.entity.updated",
    ENTITY_DESTROYED = "core.entity.destroyed",
    RELATIONSHIP_CREATED = "core.relationship.created",
    RELATIONSHIP_UPDATED = "core.relationship.updated",
    RELATIONSHIP_DESTROYED = "core.relationship.destroyed",
    COMMAND_RECEIVED = "core.command.received",
    COMMAND_PARSED = "core.command.parsed",
    COMMAND_EXECUTED = "core.command.executed",
    COMMAND_FAILED = "core.command.failed",
    EXTENSION_LOADED = "core.extension.loaded",
    EXTENSION_UNLOADED = "core.extension.unloaded",
    ERROR_OCCURRED = "core.error.occurred",
    WARNING_RAISED = "core.warning.raised"
}
/**
 * Core event categories for filtering
 */
export declare enum CoreEventCategory {
    SYSTEM = "system",
    STATE = "state",
    ENTITY = "entity",
    RELATIONSHIP = "relationship",
    COMMAND = "command",
    EXTENSION = "extension",
    ERROR = "error"
}
