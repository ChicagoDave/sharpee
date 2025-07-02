// packages/core/src/events/event-system.ts
import { createSemanticEventSource } from './semantic-event-source';
/**
 * Create a new semantic event
 */
export function createEvent(type, payload, options = {}) {
    return {
        id: generateEventId(),
        type,
        timestamp: Date.now(),
        entities: {
            actor: options.actor,
            target: options.target,
            instrument: options.instrument,
            location: options.location,
            others: options.others
        },
        payload,
        tags: options.tags || [],
        priority: options.priority ?? 0,
        narrate: options.narrate ?? true
    };
}
// Event source implementation moved to semantic-event-source.ts
// Re-export for backwards compatibility
export { SemanticEventSourceImpl as EventSourceImpl } from './semantic-event-source';
/**
 * Generate a unique ID for an event
 */
function generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Create a new event source
 * @deprecated Use createSemanticEventSource from './semantic-event-source'
 */
export function createEventSource() {
    return createSemanticEventSource();
}
//# sourceMappingURL=event-system.js.map