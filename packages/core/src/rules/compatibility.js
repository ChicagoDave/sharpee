/**
 * Compatibility adapter for the old RuleSystem interface
 * This allows existing code to work with the new simple rule system
 */
import { SimpleRuleSystemImpl } from './simple-rule-system';
/**
 * Adapter that makes the new SimpleRuleSystem compatible with old interfaces
 */
export class RuleSystemAdapter {
    constructor(simpleRuleSystem) {
        this.simpleRuleSystem = simpleRuleSystem;
    }
    processEvent(event, context) {
        // Create a RuleWorld adapter from the GameContext
        const world = createRuleWorldFromGameContext(context);
        // Process through the simple rule system
        const result = this.simpleRuleSystem.processEvent(event, world);
        // Convert back to old format
        return {
            prevented: result.prevent || false,
            preventMessage: result.message,
            events: result.events || [],
            context: context // Return original context for now
        };
    }
}
/**
 * Create a RuleWorld from a GameContext
 */
function createRuleWorldFromGameContext(context) {
    return {
        getEntity: (id) => context.getEntity(id),
        updateEntity: (id, changes) => {
            // For now, just update the entity directly
            const entity = context.getEntity(id);
            if (entity) {
                if (entity.attributes) {
                    Object.assign(entity.attributes, changes);
                }
                else {
                    Object.assign(entity, changes);
                }
            }
        },
        getPlayer: () => context.player,
        getCurrentLocation: () => context.currentLocation
    };
}
/**
 * Create a compatible rule system
 */
export function createRuleSystem() {
    const simpleRuleSystem = new SimpleRuleSystemImpl();
    return new RuleSystemAdapter(simpleRuleSystem);
}
//# sourceMappingURL=compatibility.js.map