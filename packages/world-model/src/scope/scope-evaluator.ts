/**
 * @file Scope Evaluator
 * @description Evaluates scope rules to determine visible entities
 */

import { IEntity } from '@sharpee/core';
import { 
  IScopeRule, 
  IScopeContext, 
  IScopeEvaluationOptions, 
  IScopeEvaluationResult,
  IScopeRuleResult 
} from './scope-rule';
import { ScopeRegistry } from './scope-registry';

/**
 * Evaluates scope rules to determine what entities are in scope
 */
export class ScopeEvaluator {
  private registry: ScopeRegistry;
  private cache: Map<string, IScopeEvaluationResult> = new Map();

  constructor(registry: ScopeRegistry) {
    this.registry = registry;
  }

  /**
   * Evaluate scope for a given context
   */
  evaluate(
    context: IScopeContext, 
    options: IScopeEvaluationOptions = {}
  ): IScopeEvaluationResult {
    const startTime = Date.now();
    
    // Check cache if enabled
    const cacheKey = this.getCacheKey(context);
    if (options.cache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (cached.metrics) {
        cached.metrics.cacheHits = (cached.metrics.cacheHits || 0) + 1;
      }
      return cached;
    }

    // Get applicable rules
    let rules = this.registry.getApplicableRules(context);
    
    // Apply custom filter if provided
    if (options.ruleFilter) {
      rules = rules.filter(options.ruleFilter);
    }

    // Limit rules if specified
    if (options.maxRules && rules.length > options.maxRules) {
      rules = rules.slice(0, options.maxRules);
    }

    // Evaluate rules
    const entityIds = new Set<string>();
    const appliedRules: IScopeRuleResult[] = [];
    const skippedRules: IScopeRule[] = [];

    for (const rule of rules) {
      const result = this.evaluateRule(rule, context);
      
      if (result.conditionMet) {
        // Add entities to scope
        for (const entityId of result.includedEntities) {
          entityIds.add(entityId);
        }
        appliedRules.push(result);
      } else if (options.debug) {
        skippedRules.push(rule);
      }
    }

    // Build result
    const result: IScopeEvaluationResult = {
      entityIds,
      appliedRules,
      metrics: {
        rulesEvaluated: rules.length,
        totalTime: Date.now() - startTime,
        cacheHits: 0
      }
    };

    if (options.debug) {
      result.skippedRules = skippedRules;
    }

    // Cache if enabled
    if (options.cache) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: IScopeRule, context: IScopeContext): IScopeRuleResult {
    // Check condition
    const conditionMet = !rule.condition || rule.condition(context);
    
    if (!conditionMet) {
      return {
        rule,
        includedEntities: [],
        conditionMet: false
      };
    }

    // Get entities to include
    let includedEntities: string[] = [];
    
    // Include explicit entities
    if (rule.includeEntities) {
      if (typeof rule.includeEntities === 'function') {
        includedEntities = rule.includeEntities(context);
      } else {
        includedEntities = [...rule.includeEntities];
      }
    }

    // Include entities from specified locations
    if (rule.includeLocations && context.world) {
      for (const locationId of rule.includeLocations) {
        const locationEntities = this.getEntitiesInLocation(context.world, locationId);
        includedEntities.push(...locationEntities);
      }
    }

    // Generate message if applicable
    let message: string | undefined;
    if (rule.message) {
      if (typeof rule.message === 'function') {
        message = rule.message(
          includedEntities[0] || '', 
          context.actionId || ''
        );
      } else {
        message = rule.message;
      }
    }

    return {
      rule,
      includedEntities,
      conditionMet: true,
      message
    };
  }

  /**
   * Get entities in a location
   */
  private getEntitiesInLocation(world: any, locationId: string): string[] {
    const entities: string[] = [];
    
    // Add the location itself
    if (world.getEntity(locationId)) {
      entities.push(locationId);
    }
    
    // Add contents of the location
    if (world.getContents) {
      const contents = world.getContents(locationId) || [];
      entities.push(...contents.map((e: any) => e.id));
      
      // Add nested contents
      for (const entity of contents) {
        if (world.getAllContents) {
          const nested = world.getAllContents(entity.id) || [];
          entities.push(...nested.map((e: any) => e.id));
        }
      }
    }
    
    return entities;
  }

  /**
   * Generate cache key for a context
   */
  private getCacheKey(context: IScopeContext): string {
    return `${context.actorId}:${context.currentLocation}:${context.actionId || 'any'}`;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get standard scope (visible entities) for backward compatibility
   */
  getVisibleEntities(context: IScopeContext): string[] {
    // Evaluate with looking/examining action
    const evalContext = {
      ...context,
      actionId: context.actionId || 'examining'
    };

    const result = this.evaluate(evalContext);
    return Array.from(result.entityIds);
  }

  /**
   * Get touchable entities for backward compatibility
   */
  getTouchableEntities(context: IScopeContext): string[] {
    // For now, touchable = visible
    // Can be extended with distance-based rules later
    return this.getVisibleEntities(context);
  }

  /**
   * Check if a specific entity is in scope
   */
  isEntityInScope(entityId: string, context: IScopeContext): boolean {
    const result = this.evaluate(context);
    return result.entityIds.has(entityId);
  }

  /**
   * Get scope with detailed rule information
   */
  getScopeWithDetails(context: IScopeContext): {
    entities: string[];
    ruleDetails: Map<string, {
      rule: IScopeRule;
      entities: string[];
      message?: string;
    }>;
  } {
    const result = this.evaluate(context, { debug: true });
    const ruleDetails = new Map();

    for (const appliedRule of result.appliedRules) {
      ruleDetails.set(appliedRule.rule.id, {
        rule: appliedRule.rule,
        entities: appliedRule.includedEntities,
        message: appliedRule.message
      });
    }

    return {
      entities: Array.from(result.entityIds),
      ruleDetails
    };
  }
}