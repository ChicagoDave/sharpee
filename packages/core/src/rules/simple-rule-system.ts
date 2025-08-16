/**
 * Simple Rule System Implementation
 */

import { ISemanticEvent } from '../events/types';
import { createEvent } from '../events/event-system';
import { StandardEventTypes } from '../events/standard-events';
import { IRule, IRuleResult, IRuleWorld, ISimpleRuleSystem, IEntityChange } from './types';

/**
 * Simple rule system implementation
 */
export class SimpleRuleSystemImpl implements ISimpleRuleSystem {
  private rules: Map<string, IRule> = new Map();

  /**
   * Add a rule to the system
   */
  addRule(rule: IRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rule from the system
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all rules
   */
  getRules(): IRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Process an event through all matching rules
   */
  processEvent(event: ISemanticEvent, world: IRuleWorld): IRuleResult {
    // Find matching rules
    const matchingRules = this.getMatchingRules(event);
    
    // Sort by priority (higher first)
    matchingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let prevented = false;
    let message: string | undefined;
    const allEvents: ISemanticEvent[] = [];
    const allChanges: IEntityChange[] = [];

    // Process each matching rule
    for (const rule of matchingRules) {
      // Check condition if present
      if (rule.condition && !rule.condition(event, world)) {
        continue;
      }

      // Execute the rule
      let result: IRuleResult;
      try {
        result = rule.action(event, world);
      } catch (error) {
        console.error(`Error executing rule ${rule.id}:`, error);
        continue; // Skip this rule and continue with others
      }

      // Handle prevention (first rule to prevent wins)
      if (result.prevent && !prevented) {
        prevented = true;
        message = result.message;
        
        // Create a narrative event for the prevent message
        if (result.message) {
          allEvents.push(createEvent(
            StandardEventTypes.NARRATIVE,
            { message: result.message },
            { 
              actor: event.entities.actor,
              location: event.entities.location 
            }
          ));
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
        // Keep the message for the result
        if (!message) {
          message = result.message;
        }
        allEvents.push(createEvent(
          StandardEventTypes.NARRATIVE,
          { message: result.message },
          { 
            actor: event.entities.actor,
            location: event.entities.location 
          }
        ));
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
      message,
      events: allEvents,
      changes: allChanges
    };
  }

  /**
   * Find rules that match the given event
   */
  private getMatchingRules(event: ISemanticEvent): IRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      // Handle wildcards
      if (rule.eventType === '*') return true;
      
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
export function createSimpleRuleSystem(): ISimpleRuleSystem {
  return new SimpleRuleSystemImpl();
}
