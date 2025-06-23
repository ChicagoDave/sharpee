/**
 * Simple Rule System v2 - Clean, functional design
 */

import { EntityId } from '../types/entity';
import { SemanticEvent } from '../events/types';

/**
 * Simple world interface for rules - no complex abstractions
 */
export interface RuleWorld {
  getEntity(id: EntityId): any;
  updateEntity(id: EntityId, changes: Record<string, any>): void;
  getPlayer(): any;
  getCurrentLocation(): any;
}

/**
 * Result of executing a rule
 */
export interface RuleResult {
  /** Prevent the original action from happening */
  prevent?: boolean;
  /** Message to display to the player */
  message?: string;
  /** Additional events to generate */
  events?: SemanticEvent[];
  /** Entity changes to apply */
  changes?: EntityChange[];
}

/**
 * A change to apply to an entity
 */
export interface EntityChange {
  entityId: EntityId;
  attribute: string;
  value: any;
}

/**
 * A simple rule definition
 */
export interface Rule {
  /** Unique identifier for the rule */
  id: string;
  /** Event type this rule responds to (e.g., 'item:taking') */
  eventType: string;
  /** Optional condition - if false, rule doesn't fire */
  condition?: (event: SemanticEvent, world: RuleWorld) => boolean;
  /** Action to take when rule fires */
  action: (event: SemanticEvent, world: RuleWorld) => RuleResult;
  /** Priority (higher = runs first) */
  priority?: number;
}

/**
 * Simple rule system interface
 */
export interface SimpleRuleSystem {
  /** Add a rule */
  addRule(rule: Rule): void;
  /** Remove a rule */
  removeRule(ruleId: string): void;
  /** Process an event through all matching rules */
  processEvent(event: SemanticEvent, world: RuleWorld): RuleResult;
  /** Get all rules */
  getRules(): Rule[];
}
