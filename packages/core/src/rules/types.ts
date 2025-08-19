/**
 * Simple Rule System v2 - Clean, functional design
 */

import { EntityId } from '../types/entity';
import { ISemanticEvent } from '../events/types';

/**
 * Simple world interface for rules - no complex abstractions
 */
export interface IRuleWorld {
  getEntity(id: EntityId): any;
  updateEntity(id: EntityId, changes: Record<string, any>): void;
  getPlayer(): any;
  getCurrentLocation(): any;
}

/**
 * Result of executing a rule
 */
export interface IRuleResult {
  /** Prevent the original action from happening */
  prevent?: boolean;
  /** Message to display to the player */
  message?: string;
  /** Additional events to generate */
  events?: ISemanticEvent[];
  /** Entity changes to apply */
  changes?: IEntityChange[];
}

/**
 * A change to apply to an entity
 */
export interface IEntityChange {
  entityId: EntityId;
  attribute: string;
  value: any;
}

/**
 * A simple rule definition
 */
export interface IRule {
  /** Unique identifier for the rule */
  id: string;
  /** Event type this rule responds to (e.g., 'item:taking') */
  eventType: string;
  /** Optional condition - if false, rule doesn't fire */
  condition?: (event: ISemanticEvent, world: IRuleWorld) => boolean;
  /** Action to take when rule fires */
  action: (event: ISemanticEvent, world: IRuleWorld) => IRuleResult;
  /** Priority (higher = runs first) */
  priority?: number;
}

/**
 * Simple rule system interface
 */
export interface ISimpleRuleSystem {
  /** Add a rule */
  addRule(rule: IRule): void;
  /** Remove a rule */
  removeRule(ruleId: string): void;
  /** Process an event through all matching rules */
  processEvent(event: ISemanticEvent, world: IRuleWorld): IRuleResult;
  /** Get all rules */
  getRules(): IRule[];
}
