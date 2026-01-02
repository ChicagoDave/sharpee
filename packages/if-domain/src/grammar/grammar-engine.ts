/**
 * @file Grammar Engine Base
 * @description Abstract base class for grammar matching engines
 */

import { Token } from '../parser-contracts/parser-types';
import {
  GrammarRule,
  PatternMatch,
  GrammarContext,
  CompiledPattern,
  GrammarBuilder,
  PatternBuilder,
  SemanticProperties,
  SlotType
} from './grammar-builder';
import { PatternCompiler } from './pattern-compiler';

/**
 * Grammar matching options
 */
export interface GrammarMatchOptions {
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Maximum number of matches to return */
  maxMatches?: number;
  /** Whether to allow partial matches */
  allowPartial?: boolean;
}

/**
 * Abstract base class for grammar engines
 * Language-specific implementations provide concrete matching logic
 */
export abstract class GrammarEngine {
  protected rules: GrammarRule[] = [];
  protected rulesByAction: Map<string, GrammarRule[]> = new Map();
  protected compiler: PatternCompiler;
  
  constructor(compiler: PatternCompiler) {
    this.compiler = compiler;
  }
  
  /**
   * Add a grammar rule
   */
  addRule(rule: GrammarRule): void {
    // Compile the pattern if not already compiled
    if (!rule.compiledPattern) {
      rule.compiledPattern = this.compiler.compile(rule.pattern);
    }
    
    this.rules.push(rule);
    
    // Index by action for faster lookup
    const actionRules = this.rulesByAction.get(rule.action) || [];
    actionRules.push(rule);
    this.rulesByAction.set(rule.action, actionRules);
    
    // Sort by priority
    this.sortRules();
  }
  
  /**
   * Add multiple rules
   */
  addRules(rules: GrammarRule[]): void {
    rules.forEach(rule => this.addRule(rule));
  }
  
  /**
   * Find matching grammar rules for tokens
   */
  abstract findMatches(
    tokens: Token[], 
    context: GrammarContext,
    options?: GrammarMatchOptions
  ): PatternMatch[];
  
  /**
   * Get the best match from a set of tokens
   */
  getBestMatch(
    tokens: Token[], 
    context: GrammarContext,
    options?: GrammarMatchOptions
  ): PatternMatch | null {
    const matches = this.findMatches(tokens, context, options);
    return matches.length > 0 ? matches[0] : null;
  }
  
  /**
   * Clear all rules
   */
  clear(): void {
    this.rules = [];
    this.rulesByAction.clear();
  }
  
  /**
   * Get all rules
   */
  getRules(): GrammarRule[] {
    return [...this.rules];
  }
  
  /**
   * Get rules for a specific action
   */
  getRulesForAction(action: string): GrammarRule[] {
    return this.rulesByAction.get(action) || [];
  }
  
  /**
   * Sort rules by priority (descending)
   */
  protected sortRules(): void {
    this.rules.sort((a, b) => b.priority - a.priority);
    
    // Also sort within each action group
    this.rulesByAction.forEach((rules) => {
      rules.sort((a, b) => b.priority - a.priority);
    });
  }
  
  /**
   * Create a grammar builder connected to this engine
   */
  createBuilder(): GrammarBuilder {
    const engine = this;
    
    return {
      define(pattern: string) {
        const rule: Partial<GrammarRule> = {
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern,
          slots: new Map(),
          priority: 100 // Default priority
        };
        
        const builder: PatternBuilder = {
          where(slot: string, constraint: any) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.constraints.push(constraint);
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          text(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.TEXT;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          instrument(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.INSTRUMENT;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          mapsTo(action: string) {
            rule.action = action;
            return builder;
          },
          
          withPriority(priority: number) {
            rule.priority = priority;
            return builder;
          },
          
          withSemanticVerbs(verbs: Record<string, Partial<SemanticProperties>>) {
            if (!rule.semantics) rule.semantics = {};
            rule.semantics.verbs = verbs;
            return builder;
          },
          
          withSemanticPrepositions(prepositions: Record<string, string>) {
            if (!rule.semantics) rule.semantics = {};
            rule.semantics.prepositions = prepositions;
            return builder;
          },
          
          withSemanticDirections(directions: Record<string, string>) {
            if (!rule.semantics) rule.semantics = {};
            rule.semantics.directions = directions;
            return builder;
          },
          
          withDefaultSemantics(defaults: Partial<SemanticProperties>) {
            rule.defaultSemantics = defaults;
            return builder;
          },

          // ADR-082: Typed Value Slots

          number(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.NUMBER;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          ordinal(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.ORDINAL;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          time(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.TIME;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // ADR-082: Built-in Vocabulary Slots

          direction(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.DIRECTION;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          manner(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.MANNER;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // ADR-082: Category-Based Vocabulary Slots

          fromVocabulary(slot: string, category: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.VOCABULARY;
            slotConstraint.vocabularyCategory = category;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // Deprecated methods - use fromVocabulary() instead

          adjective(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.ADJECTIVE;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          noun(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.NOUN;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // ADR-082: Text Variant Slots

          quotedText(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.QUOTED_TEXT;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          topic(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.TOPIC;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          build() {
            if (!rule.action) {
              throw new Error('Grammar rule must have an action (use .mapsTo())');
            }
            engine.addRule(rule as GrammarRule);
            return rule as GrammarRule;
          }
        };
        
        return builder;
      },
      
      getRules() {
        return engine.getRules();
      },
      
      clear() {
        engine.clear();
      }
    };
  }
}