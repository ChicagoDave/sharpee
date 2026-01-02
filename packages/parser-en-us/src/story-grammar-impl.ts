/**
 * @file Story Grammar Implementation
 * @description Implementation of story-specific grammar registration
 */

import { 
  StoryGrammar, 
  StoryPatternBuilder, 
  StoryExtensionBuilder,
  GrammarRegistrationOptions,
  GrammarDebugEvent,
  GrammarStats
} from '@sharpee/if-domain';

import { 
  GrammarRule, 
  GrammarBuilder,
  PatternBuilder,
  ScopeBuilder
} from '@sharpee/if-domain';

import { EnglishGrammarEngine } from './english-grammar-engine';

/**
 * Implementation of story grammar registration
 */
export class StoryGrammarImpl implements StoryGrammar {
  private engine: EnglishGrammarEngine;
  private storyRules: Map<string, GrammarRule> = new Map();
  private overriddenRules: Map<string, GrammarRule> = new Map();
  private debugMode: boolean = false;
  private debugCallback?: (event: GrammarDebugEvent) => void;
  private stats: GrammarStats = {
    totalRules: 0,
    coreRules: 0,
    storyRules: 0,
    overriddenRules: 0,
    rulesByAction: new Map(),
    matchAttempts: 0,
    successfulMatches: 0,
    averageMatchTime: 0
  };

  constructor(engine: EnglishGrammarEngine) {
    this.engine = engine;
    this.updateStats();
  }

  /**
   * Define a new grammar pattern
   *
   * Uses a transparent proxy to forward all PatternBuilder methods to the base
   * builder while intercepting .build() for tracking and debug events.
   * This ensures stories have access to ALL PatternBuilder features (ADR-084).
   */
  define(pattern: string): StoryPatternBuilder {
    const self = this;
    const builder = this.engine.createBuilder();
    const baseBuilder = builder.define(pattern);

    // Track story-specific metadata
    let experimentalConfidence: number | undefined;
    let description: string | undefined;
    let errorMessage: string | undefined;

    // Create a proxy that forwards all methods to baseBuilder
    // but intercepts build() and adds story-specific methods
    const storyBuilder = new Proxy(baseBuilder, {
      get(target, prop, receiver) {
        // Story-specific methods
        if (prop === 'describe') {
          return (desc: string): StoryPatternBuilder => {
            description = desc;
            (target as any).description = desc;
            return storyBuilder as StoryPatternBuilder;
          };
        }

        if (prop === 'experimental') {
          return (): StoryPatternBuilder => {
            experimentalConfidence = 0.7;
            return storyBuilder as StoryPatternBuilder;
          };
        }

        if (prop === 'withErrorMessage') {
          return (msg: string): StoryPatternBuilder => {
            errorMessage = msg;
            (target as any).errorMessage = msg;
            return storyBuilder as StoryPatternBuilder;
          };
        }

        // Intercept build() to add tracking
        if (prop === 'build') {
          return (): GrammarRule => {
            const rule = target.build();

            // Apply experimental confidence if set
            if (experimentalConfidence !== undefined) {
              (rule as any).experimentalConfidence = experimentalConfidence;
            }

            // Track as story rule
            self.storyRules.set(rule.id, rule);
            (rule as any).source = 'story';

            // Emit debug event
            self.emitDebugEvent({
              type: 'pattern_registered',
              pattern: rule.pattern,
              action: rule.action,
              ruleId: rule.id,
              source: 'story',
              timestamp: Date.now()
            });

            self.updateStats();
            return rule;
          };
        }

        // For all other methods, forward to base builder but return proxy for chaining
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
          return (...args: any[]) => {
            const result = value.apply(target, args);
            // If the method returns the builder (for chaining), return our proxy instead
            if (result === target) {
              return storyBuilder;
            }
            return result;
          };
        }

        return value;
      }
    }) as StoryPatternBuilder;

    return storyBuilder;
  }

  /**
   * Override an existing grammar rule
   */
  override(actionId: string, pattern: string): StoryPatternBuilder {
    // Find existing rules for this action
    const existingRules = this.engine.getRulesForAction(actionId);
    
    if (existingRules.length > 0) {
      // Store the original rules
      for (const rule of existingRules) {
        if (!this.overriddenRules.has(rule.id)) {
          this.overriddenRules.set(rule.id, rule);
        }
      }
    }
    
    // Create new rule with higher priority
    const storyBuilder = this.define(pattern);
    const highestPriority = existingRules.reduce((max, rule) => 
      Math.max(max, rule.priority), 100
    );
    
    // Configure the builder and return it
    storyBuilder
      .mapsTo(actionId)
      .withPriority(highestPriority + 50); // Ensure it overrides
      
    return storyBuilder;
  }

  /**
   * Extend an existing pattern
   */
  extend(actionId: string): StoryExtensionBuilder {
    const self = this; // Capture this reference
    const existingRules = this.engine.getRulesForAction(actionId);
    
    if (existingRules.length === 0) {
      throw new Error(`No existing rules found for action: ${actionId}`);
    }
    
    // Take the highest priority rule as base
    const baseRule = existingRules.reduce((highest, rule) => 
      rule.priority > highest.priority ? rule : highest
    );
    
    // Create a new rule based on the existing one
    const extendedRule: Partial<GrammarRule> = {
      id: `${baseRule.id}_extended_${Date.now()}`,
      pattern: baseRule.pattern,
      action: baseRule.action,
      priority: baseRule.priority + 10,
      slots: new Map(baseRule.slots),
      compiledPattern: baseRule.compiledPattern
    };
    
    const extensionBuilder: StoryExtensionBuilder = {
      where(slot: string, constraint: any): StoryExtensionBuilder {
        const existingConstraint = extendedRule.slots!.get(slot);
        if (existingConstraint) {
          // Add to existing constraints
          existingConstraint.constraints.push(constraint);
        } else {
          // Create new slot constraint
          extendedRule.slots!.set(slot, {
            name: slot,
            constraints: [constraint]
          });
        }
        return extensionBuilder;
      },
      
      withHigherPriority(increase: number = 10): StoryExtensionBuilder {
        extendedRule.priority! += increase;
        return extensionBuilder;
      },
      
      build(): GrammarRule {
        const rule = extendedRule as GrammarRule;
        self.engine.addRule(rule);
        self.storyRules.set(rule.id, rule);
        (rule as any).source = 'story_extension';
        
        self.emitDebugEvent({
          type: 'pattern_registered',
          pattern: rule.pattern,
          action: rule.action,
          ruleId: rule.id,
          source: 'story_extension',
          timestamp: Date.now(),
          details: { baseRuleId: baseRule.id }
        });
        
        self.updateStats();
        return rule;
      }
    };
    
    return extensionBuilder;
  }

  /**
   * Remove a grammar rule
   */
  remove(ruleId: string): void {
    // Remove from engine
    const allRules = this.engine.getRules();
    const filteredRules = allRules.filter(r => r.id !== ruleId);
    
    // Clear and re-add rules
    this.engine.clear();
    filteredRules.forEach(rule => this.engine.addRule(rule));
    
    // Remove from tracking
    this.storyRules.delete(ruleId);
    
    this.updateStats();
  }

  /**
   * Get all story-defined rules
   */
  getRules(): GrammarRule[] {
    return Array.from(this.storyRules.values());
  }

  /**
   * Clear all story-specific rules
   */
  clear(): void {
    // Remove all story rules from engine
    const allRules = this.engine.getRules();
    const coreRules = allRules.filter(r => 
      !this.storyRules.has(r.id)
    );
    
    // Clear and re-add only core rules
    this.engine.clear();
    coreRules.forEach(rule => this.engine.addRule(rule));
    
    // Clear tracking
    this.storyRules.clear();
    this.overriddenRules.clear();
    
    this.updateStats();
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Set debug callback
   */
  setDebugCallback(callback: (event: GrammarDebugEvent) => void): void {
    this.debugCallback = callback;
  }

  /**
   * Get grammar statistics
   */
  getStats(): GrammarStats {
    return { ...this.stats };
  }

  /**
   * Emit debug event
   */
  private emitDebugEvent(event: GrammarDebugEvent): void {
    if (this.debugMode && this.debugCallback) {
      this.debugCallback(event);
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const allRules = this.engine.getRules();
    this.stats.totalRules = allRules.length;
    this.stats.storyRules = this.storyRules.size;
    this.stats.coreRules = this.stats.totalRules - this.stats.storyRules;
    this.stats.overriddenRules = this.overriddenRules.size;
    
    // Count rules by action
    this.stats.rulesByAction.clear();
    for (const rule of allRules) {
      const count = this.stats.rulesByAction.get(rule.action) || 0;
      this.stats.rulesByAction.set(rule.action, count + 1);
    }
  }
}