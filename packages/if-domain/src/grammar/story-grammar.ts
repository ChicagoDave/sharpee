/**
 * @file Story Grammar API
 * @description API for stories to register custom grammar rules
 */

import { GrammarBuilder, PatternBuilder, GrammarRule } from './grammar-builder';
import { ScopeBuilder } from './grammar-builder';

/**
 * Story grammar registration API
 */
export interface StoryGrammar {
  /**
   * Define a new grammar pattern
   */
  define(pattern: string): StoryPatternBuilder;
  
  /**
   * Override an existing grammar rule by action ID
   */
  override(actionId: string, pattern: string): StoryPatternBuilder;
  
  /**
   * Extend an existing pattern with additional constraints
   */
  extend(actionId: string): StoryExtensionBuilder;
  
  /**
   * Remove a grammar rule
   */
  remove(ruleId: string): void;
  
  /**
   * Get all story-defined rules
   */
  getRules(): GrammarRule[];
  
  /**
   * Clear all story-specific rules
   */
  clear(): void;
  
  /**
   * Enable/disable debug mode for grammar matching
   */
  setDebugMode(enabled: boolean): void;
}

/**
 * Pattern builder for story-specific rules
 */
export interface StoryPatternBuilder extends PatternBuilder {
  /**
   * Set a description for debugging
   */
  describe(description: string): StoryPatternBuilder;

  /**
   * Mark as experimental (lower confidence)
   */
  experimental(): StoryPatternBuilder;

  /**
   * Set custom error message when this pattern fails
   */
  withErrorMessage(message: string): StoryPatternBuilder;

  // Override base methods to return StoryPatternBuilder
  where(slot: string, constraint: any): StoryPatternBuilder;
  text(slot: string): StoryPatternBuilder;
  instrument(slot: string): StoryPatternBuilder;
  mapsTo(action: string): StoryPatternBuilder;
  withPriority(priority: number): StoryPatternBuilder;
}

/**
 * Extension builder for modifying existing patterns
 */
export interface StoryExtensionBuilder {
  /**
   * Add additional constraints to slots
   */
  where(slot: string, constraint: ((scope: ScopeBuilder) => ScopeBuilder) | any): StoryExtensionBuilder;
  
  /**
   * Increase priority over base rule
   */
  withHigherPriority(increase?: number): StoryExtensionBuilder;
  
  /**
   * Build the extension
   */
  build(): GrammarRule;
}

/**
 * Grammar registration options
 */
export interface GrammarRegistrationOptions {
  /**
   * Source identifier for debugging
   */
  source?: string;
  
  /**
   * Whether to validate patterns on registration
   */
  validate?: boolean;
  
  /**
   * Whether to allow overriding core patterns
   */
  allowCoreOverride?: boolean;
}

/**
 * Grammar debug event
 */
export interface GrammarDebugEvent {
  type: 'pattern_registered' | 'pattern_matched' | 'pattern_failed' | 'pattern_override';
  pattern: string;
  action?: string;
  ruleId?: string;
  source?: string;
  timestamp: number;
  details?: any;
}

/**
 * Grammar statistics for debugging
 */
export interface GrammarStats {
  totalRules: number;
  coreRules: number;
  storyRules: number;
  overriddenRules: number;
  rulesByAction: Map<string, number>;
  matchAttempts: number;
  successfulMatches: number;
  averageMatchTime: number;
}