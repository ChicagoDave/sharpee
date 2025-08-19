/**
 * @file Scope Registry
 * @description Manages scope rules and provides registration/lookup
 */

import { 
  IScopeRule, 
  IScopeContext, 
  IScopeEvaluationOptions, 
  IScopeEvaluationResult,
  IScopeRuleResult 
} from './scope-rule';

/**
 * Registry for managing scope rules
 */
export class ScopeRegistry {
  private rules: Map<string, IScopeRule> = new Map();
  private rulesByLocation: Map<string, Set<string>> = new Map();
  private rulesByAction: Map<string, Set<string>> = new Map();
  private globalRules: Set<string> = new Set();

  /**
   * Add a scope rule to the registry
   */
  addRule(rule: IScopeRule): void {
    // Validate rule
    if (!rule.id) {
      throw new Error('Scope rule must have an id');
    }

    // Set defaults
    rule.priority = rule.priority ?? 100;
    rule.enabled = rule.enabled ?? true;
    rule.source = rule.source ?? 'core';

    // Store rule
    this.rules.set(rule.id, rule);

    // Index by location
    if (rule.fromLocations === '*') {
      this.globalRules.add(rule.id);
    } else {
      for (const location of rule.fromLocations) {
        if (!this.rulesByLocation.has(location)) {
          this.rulesByLocation.set(location, new Set());
        }
        this.rulesByLocation.get(location)!.add(rule.id);
      }
    }

    // Index by action
    if (rule.forActions && rule.forActions !== '*') {
      for (const action of rule.forActions) {
        if (!this.rulesByAction.has(action)) {
          this.rulesByAction.set(action, new Set());
        }
        this.rulesByAction.get(action)!.add(rule.id);
      }
    }
  }

  /**
   * Remove a scope rule
   */
  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    // Remove from main storage
    this.rules.delete(ruleId);

    // Remove from location index
    if (rule.fromLocations === '*') {
      this.globalRules.delete(ruleId);
    } else {
      for (const location of rule.fromLocations) {
        this.rulesByLocation.get(location)?.delete(ruleId);
      }
    }

    // Remove from action index
    if (rule.forActions && rule.forActions !== '*') {
      for (const action of rule.forActions) {
        this.rulesByAction.get(action)?.delete(ruleId);
      }
    }

    return true;
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): IScopeRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): IScopeRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules applicable to a context
   */
  getApplicableRules(context: IScopeContext): IScopeRule[] {
    const applicableRuleIds = new Set<string>();

    // Add global rules
    for (const ruleId of this.globalRules) {
      applicableRuleIds.add(ruleId);
    }

    // Add location-specific rules
    const locationRules = this.rulesByLocation.get(context.currentLocation);
    if (locationRules) {
      for (const ruleId of locationRules) {
        applicableRuleIds.add(ruleId);
      }
    }

    // Filter by action if specified
    const rules: IScopeRule[] = [];
    for (const ruleId of applicableRuleIds) {
      const rule = this.rules.get(ruleId);
      if (!rule || !rule.enabled) continue;

      // Check if rule applies to current action
      if (context.actionId && rule.forActions && rule.forActions !== '*') {
        if (!rule.forActions.includes(context.actionId)) {
          continue;
        }
      }

      rules.push(rule);
    }

    // Sort by priority (descending)
    return rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    return true;
  }

  /**
   * Clear all rules
   */
  clear(): void {
    this.rules.clear();
    this.rulesByLocation.clear();
    this.rulesByAction.clear();
    this.globalRules.clear();
  }

  /**
   * Get rules by source
   */
  getRulesBySource(source: string): IScopeRule[] {
    return Array.from(this.rules.values())
      .filter(rule => rule.source === source);
  }

  /**
   * Get statistics about registered rules
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    globalRules: number;
    locationSpecificRules: number;
    actionSpecificRules: number;
    rulesBySource: Map<string, number>;
  } {
    const stats = {
      totalRules: this.rules.size,
      enabledRules: 0,
      disabledRules: 0,
      globalRules: this.globalRules.size,
      locationSpecificRules: 0,
      actionSpecificRules: 0,
      rulesBySource: new Map<string, number>()
    };

    for (const rule of this.rules.values()) {
      if (rule.enabled) {
        stats.enabledRules++;
      } else {
        stats.disabledRules++;
      }

      if (rule.fromLocations !== '*') {
        stats.locationSpecificRules++;
      }

      if (rule.forActions && rule.forActions !== '*') {
        stats.actionSpecificRules++;
      }

      const source = rule.source || 'unknown';
      stats.rulesBySource.set(source, (stats.rulesBySource.get(source) || 0) + 1);
    }

    return stats;
  }
}