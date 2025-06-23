/**
 * Adapter to make existing world model work with simple rule system
 */
/**
 * Simple adapter for any object-based world state
 */
export class SimpleRuleWorldAdapter {
    constructor(worldState, playerId = 'player', currentLocationId) {
        this.worldState = worldState;
        this.playerId = playerId;
        this.currentLocationId = currentLocationId;
    }
    /**
     * Get an entity by ID
     */
    getEntity(id) {
        return this.worldState.entities?.[id] || this.worldState[id];
    }
    /**
     * Update an entity with new attributes
     */
    updateEntity(id, changes) {
        const entity = this.getEntity(id);
        if (entity) {
            if (entity.attributes) {
                // For entities with attributes object
                Object.assign(entity.attributes, changes);
            }
            else {
                // For flat entity objects
                Object.assign(entity, changes);
            }
        }
    }
    /**
     * Get the player entity
     */
    getPlayer() {
        return this.getEntity(this.playerId);
    }
    /**
     * Get the current location entity
     */
    getCurrentLocation() {
        return this.currentLocationId ? this.getEntity(this.currentLocationId) : undefined;
    }
    /**
     * Set the player ID
     */
    setPlayerId(playerId) {
        this.playerId = playerId;
    }
    /**
     * Set the current location ID
     */
    setCurrentLocationId(locationId) {
        this.currentLocationId = locationId;
    }
}
/**
 * Create a simple rule world from basic state
 */
export function createSimpleRuleWorld(worldState, playerId = 'player', currentLocationId) {
    return new SimpleRuleWorldAdapter(worldState, playerId, currentLocationId);
}
//# sourceMappingURL=rule-world-adapter.js.map