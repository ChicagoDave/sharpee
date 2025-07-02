/**
 * Simple Rule System Implementation
 */
import { SemanticEvent } from '../events/types';
import { Rule, RuleResult, RuleWorld, SimpleRuleSystem } from './types';
/**
 * Simple rule system implementation
 */
export declare class SimpleRuleSystemImpl implements SimpleRuleSystem {
    private rules;
    /**
     * Add a rule to the system
     */
    addRule(rule: Rule): void;
    /**
     * Remove a rule from the system
     */
    removeRule(ruleId: string): void;
    /**
     * Get all rules
     */
    getRules(): Rule[];
    /**
     * Process an event through all matching rules
     */
    processEvent(event: SemanticEvent, world: RuleWorld): RuleResult;
    /**
     * Find rules that match the given event
     */
    private getMatchingRules;
}
/**
 * Create a new simple rule system
 */
export declare function createSimpleRuleSystem(): SimpleRuleSystem;
//# sourceMappingURL=simple-rule-system.d.ts.map