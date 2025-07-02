/**
 * Adapter to make existing world model work with simple rule system
 */
import { EntityId } from '../types/entity';
import { RuleWorld } from './types';
/**
 * Simple adapter for any object-based world state
 */
export declare class SimpleRuleWorldAdapter implements RuleWorld {
    private worldState;
    private playerId;
    private currentLocationId?;
    constructor(worldState: any, playerId?: EntityId, currentLocationId?: EntityId | undefined);
    /**
     * Get an entity by ID
     */
    getEntity(id: EntityId): any;
    /**
     * Update an entity with new attributes
     */
    updateEntity(id: EntityId, changes: Record<string, any>): void;
    /**
     * Get the player entity
     */
    getPlayer(): any;
    /**
     * Get the current location entity
     */
    getCurrentLocation(): any;
    /**
     * Set the player ID
     */
    setPlayerId(playerId: EntityId): void;
    /**
     * Set the current location ID
     */
    setCurrentLocationId(locationId: EntityId): void;
}
/**
 * Create a simple rule world from basic state
 */
export declare function createSimpleRuleWorld(worldState: any, playerId?: EntityId, currentLocationId?: EntityId): RuleWorld;
//# sourceMappingURL=rule-world-adapter.d.ts.map