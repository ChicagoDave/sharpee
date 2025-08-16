/**
 * @file Scope Rule Interface
 * @description Defines rules for entity visibility and interaction scope
 */

import { IEntity } from '@sharpee/core';

/**
 * Context provided to scope rules for evaluation
 */
export interface IScopeContext {
  /** The world model instance */
  world: any; // Will be WorldModel when circular dependency is resolved
  /** ID of the actor performing the action */
  actorId: string;
  /** ID of the action being performed (optional) */
  actionId?: string;
  /** Actor's current location ID */
  currentLocation: string;
}

/**
 * A rule that defines scope (what entities are available) in specific contexts
 */
export interface IScopeRule {
  /** Unique identifier for this rule */
  id: string;
  
  /** Location IDs where this rule applies, or '*' for all */
  fromLocations: string[] | '*';
  
  /** Entity IDs to include, or function to compute them */
  includeEntities: string[] | ((context: IScopeContext) => string[]);
  
  /** Location IDs whose contents become visible (optional) */
  includeLocations?: string[];
  
  /** Action IDs this rule applies to, or '*' for all (optional) */
  forActions?: string[] | '*';
  
  /** Condition that must be true for rule to apply (optional) */
  condition?: (context: IScopeContext) => boolean;
  
  /** Message to display when this rule grants visibility (optional) */
  message?: string | ((entityId: string, actionId: string) => string);
  
  /** Priority for rule ordering (higher = evaluated first) */
  priority?: number;
  
  /** Whether this rule is enabled */
  enabled?: boolean;
  
  /** Source of this rule (core, story, extension) */
  source?: string;
}

/**
 * Result of evaluating a scope rule
 */
export interface IScopeRuleResult {
  /** The rule that was evaluated */
  rule: IScopeRule;
  
  /** Entity IDs included by this rule */
  includedEntities: string[];
  
  /** Whether the rule's condition passed */
  conditionMet: boolean;
  
  /** Optional message from the rule */
  message?: string;
}

/**
 * Options for scope evaluation
 */
export interface IScopeEvaluationOptions {
  /** Whether to include debug information */
  debug?: boolean;
  
  /** Maximum number of rules to evaluate */
  maxRules?: number;
  
  /** Whether to cache results */
  cache?: boolean;
  
  /** Custom rule filter */
  ruleFilter?: (rule: IScopeRule) => boolean;
}

/**
 * Result of scope evaluation
 */
export interface IScopeEvaluationResult {
  /** All entity IDs in scope */
  entityIds: Set<string>;
  
  /** Rules that contributed entities */
  appliedRules: IScopeRuleResult[];
  
  /** Rules that were skipped due to conditions */
  skippedRules?: IScopeRule[];
  
  /** Performance metrics */
  metrics?: {
    rulesEvaluated: number;
    totalTime: number;
    cacheHits?: number;
  };
}