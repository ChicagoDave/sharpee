/**
 * Compatibility adapter for the old RuleSystem interface
 * This allows existing code to work with the new simple rule system
 */
import { SemanticEvent } from '../events/types';
import { SimpleRuleSystemImpl } from './simple-rule-system';
/**
 * Game context interface that the old system expects
 */
interface GameContext {
    worldState: any;
    player: any;
    currentLocation: any;
    getEntity: (id: string) => any;
    updateWorldState?: (updater: (state: any) => any) => GameContext;
    [key: string]: any;
}
/**
 * Result interface that the old system expects
 */
interface OldRuleResult {
    prevented: boolean;
    preventMessage?: string;
    events: SemanticEvent[];
    context: GameContext;
}
/**
 * Old RuleSystem interface for compatibility
 */
export interface RuleSystem {
    processEvent(event: SemanticEvent, context: GameContext): OldRuleResult;
}
/**
 * Adapter that makes the new SimpleRuleSystem compatible with old interfaces
 */
export declare class RuleSystemAdapter implements RuleSystem {
    private simpleRuleSystem;
    constructor(simpleRuleSystem: SimpleRuleSystemImpl);
    processEvent(event: SemanticEvent, context: GameContext): OldRuleResult;
}
/**
 * Create a compatible rule system
 */
export declare function createRuleSystem(): RuleSystem;
export {};
