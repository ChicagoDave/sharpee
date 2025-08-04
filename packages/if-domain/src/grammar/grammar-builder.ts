/**
 * @file Grammar Builder Interfaces
 * @description Language-agnostic interfaces for defining grammar rules
 */

import { Entity } from '@sharpee/core';

/**
 * Constraint types for slot matching
 */
export type PropertyConstraint = Record<string, any>;
export type FunctionConstraint = (entity: Entity, context: GrammarContext) => boolean;
export type ScopeConstraintBuilder = (scope: ScopeBuilder) => ScopeBuilder;

export type Constraint = 
  | PropertyConstraint 
  | FunctionConstraint 
  | ScopeConstraintBuilder;

/**
 * Context provided to constraint functions
 */
export interface GrammarContext {
  world: any; // WorldModel interface
  actorId: string;
  actionId?: string;
  currentLocation: string;
  slots: Map<string, Entity[]>; // Other resolved slots
}

/**
 * Scope builder for constraint definitions
 */
export interface ScopeBuilder {
  visible(): ScopeBuilder;
  touchable(): ScopeBuilder;
  carried(): ScopeBuilder;
  nearby(): ScopeBuilder;
  matching(constraint: PropertyConstraint | FunctionConstraint): ScopeBuilder;
  kind(kind: string): ScopeBuilder;
  orExplicitly(entityIds: string[]): ScopeBuilder;
  orRule(ruleId: string): ScopeBuilder;
  build(): ScopeConstraint;
}

/**
 * Internal scope constraint representation
 */
export interface ScopeConstraint {
  base: 'visible' | 'touchable' | 'carried' | 'nearby' | 'all';
  filters: Array<PropertyConstraint | FunctionConstraint>;
  explicitEntities: string[];
  includeRules: string[];
}

/**
 * Pattern builder for defining grammar rules
 */
export interface PatternBuilder {
  /**
   * Define a constraint for a slot
   * @param slot The slot name from the pattern
   * @param constraint The constraint to apply
   */
  where(slot: string, constraint: Constraint): PatternBuilder;
  
  /**
   * Map this pattern to an action
   * @param action The action identifier
   */
  mapsTo(action: string): PatternBuilder;
  
  /**
   * Set the priority for this pattern (higher = preferred)
   * @param priority The priority value
   */
  withPriority(priority: number): PatternBuilder;
  
  /**
   * Build the final grammar rule
   */
  build(): GrammarRule;
}

/**
 * Main grammar builder interface
 */
export interface GrammarBuilder {
  /**
   * Define a new grammar pattern
   * @param pattern The pattern string (e.g., "put :item in|into :container")
   */
  define(pattern: string): PatternBuilder;
  
  /**
   * Get all defined rules
   */
  getRules(): GrammarRule[];
  
  /**
   * Clear all rules
   */
  clear(): void;
}

/**
 * A compiled grammar rule
 */
export interface GrammarRule {
  id: string;
  pattern: string;
  compiledPattern?: CompiledPattern; // Set during compilation
  slots: Map<string, SlotConstraint>;
  action: string;
  priority: number;
}

/**
 * Slot constraint definition
 */
export interface SlotConstraint {
  name: string;
  constraints: Constraint[];
}

/**
 * Token in a pattern
 */
export interface PatternToken {
  type: 'literal' | 'slot' | 'alternates';
  value: string;
  alternates?: string[]; // For alternates like "in|into|inside"
  optional?: boolean;   // For optional elements like "[carefully]"
}

/**
 * Compiled pattern for efficient matching
 */
export interface CompiledPattern {
  tokens: PatternToken[];
  slots: Map<string, number>; // slot name -> token index
  minTokens: number;
  maxTokens: number;
}

/**
 * Result of pattern matching
 */
export interface PatternMatch {
  rule: GrammarRule;
  confidence: number;
  slots: Map<string, { 
    tokens: number[]; // Token indices
    text: string;     // Combined text
  }>;
  consumed: number; // Number of tokens consumed
}