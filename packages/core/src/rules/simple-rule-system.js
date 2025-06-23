/**
 * Simple Rule System Implementation
 */
import { createEvent } from '../events/event-system';
import { StandardEventTypes } from '../events/standard-events';
/**
 * Simple rule system implementation
 */
export class SimpleRuleSystemImpl {
    constructor() {
        this.rules = new Map();
    }
    /**
     * Add a rule to the system
     */
    addRule(rule) {
        this.rules.set(rule.id, rule);
    }
    /**
     * Remove a rule from the system
     */
    removeRule(ruleId) {
        this.rules.delete(ruleId);
    }
    /**
     * Get all rules
     */
    getRules() {
        return Array.from(this.rules.values());
    }
    /**
     * Process an event through all matching rules
     */
    processEvent(event, world) {
        // Find matching rules
        const matchingRules = this.getMatchingRules(event);
        // Sort by priority (higher first)
        matchingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        let prevented = false;
        let preventMessage;
        const allEvents = [];
        const allChanges = [];
        // Process each matching rule
        for (const rule of matchingRules) {
            // Check condition if present
            if (rule.condition && !rule.condition(event, world)) {
                continue;
            }
            // Execute the rule
            const result = rule.action(event, world);
            // Handle prevention (first rule to prevent wins)
            if (result.prevent && !prevented) {
                prevented = true;
                preventMessage = result.message;
                // Create a narrative event for the prevent message
                if (result.message) {
                    allEvents.push(createEvent(StandardEventTypes.NARRATIVE, { message: result.message }, {
                        actor: event.entities.actor,
                        location: event.entities.location
                    }));
                }
                // When prevented, stop processing more rules
                break;
            }
            // Collect events
            if (result.events) {
                allEvents.push(...result.events);
            }
            // Handle message (create narrative event)
            if (result.message && !result.prevent) {
                allEvents.push(createEvent(StandardEventTypes.NARRATIVE, { message: result.message }, {
                    actor: event.entities.actor,
                    location: event.entities.location
                }));
            }
            // Collect entity changes
            if (result.changes) {
                allChanges.push(...result.changes);
            }
        }
        // Apply entity changes to the world
        for (const change of allChanges) {
            const entity = world.getEntity(change.entityId);
            if (entity) {
                world.updateEntity(change.entityId, {
                    [change.attribute]: change.value
                });
            }
        }
        return {
            prevent: prevented,
            message: preventMessage,
            events: allEvents,
            changes: allChanges
        };
    }
    /**
     * Find rules that match the given event
     */
    getMatchingRules(event) {
        return Array.from(this.rules.values()).filter(rule => {
            // Handle wildcards
            if (rule.eventType === '*')
                return true;
            // Handle category wildcards (e.g., 'item:*')
            if (rule.eventType.endsWith(':*')) {
                const category = rule.eventType.split(':')[0];
                return event.type.startsWith(`${category}:`);
            }
            // Exact match
            return rule.eventType === event.type;
        });
    }
}
/**
 * Create a new simple rule system
 */
export function createSimpleRuleSystem() {
    return new SimpleRuleSystemImpl();
}
//# sourceMappingURL=simple-rule-system.js.map