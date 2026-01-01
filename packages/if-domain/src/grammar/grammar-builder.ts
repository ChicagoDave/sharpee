/**
 * @file Grammar Builder Interfaces
 * @description Language-agnostic interfaces for defining grammar rules
 */

import { IEntity } from '@sharpee/core';

/**
 * Slot types for grammar patterns
 * Controls how the parser handles slot matching
 */
export enum SlotType {
  /** Default: resolve slot text to an entity via vocabulary lookup */
  ENTITY = 'entity',
  /** Capture raw text without entity resolution (single token) */
  TEXT = 'text',
  /** Capture raw text until next pattern element or end (greedy) */
  TEXT_GREEDY = 'text_greedy',
  /** Resolve entity but mark as instrument for the action */
  INSTRUMENT = 'instrument'
}

/**
 * Constraint types for slot matching
 */
export type PropertyConstraint = Record<string, any>;
export type FunctionConstraint = (entity: IEntity, context: GrammarContext) => boolean;
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
  slots: Map<string, IEntity[]>; // Other resolved slots
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
   * Mark a slot as capturing raw text (single token) instead of resolving to entity
   * For greedy text capture, use :slot... syntax in the pattern
   * @param slot The slot name from the pattern
   */
  text(slot: string): PatternBuilder;

  /**
   * Mark a slot as an instrument for the action
   * The slot will still resolve to an entity, but be stored in command.instrument
   * @param slot The slot name from the pattern
   */
  instrument(slot: string): PatternBuilder;

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
   * Add semantic mappings for verbs
   * @param verbs Map of verb text to semantic properties
   */
  withSemanticVerbs(verbs: Record<string, Partial<SemanticProperties>>): PatternBuilder;
  
  /**
   * Add semantic mappings for prepositions
   * @param prepositions Map of preposition text to spatial relations
   */
  withSemanticPrepositions(prepositions: Record<string, string>): PatternBuilder;
  
  /**
   * Add semantic mappings for directions
   * @param directions Map of direction text to normalized directions
   */
  withSemanticDirections(directions: Record<string, string>): PatternBuilder;
  
  /**
   * Set default semantic properties
   * @param defaults Default semantic properties
   */
  withDefaultSemantics(defaults: Partial<SemanticProperties>): PatternBuilder;
  
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
  semantics?: SemanticMapping; // Semantic mappings for this rule
  defaultSemantics?: Partial<SemanticProperties>; // Default semantics
}

/**
 * Semantic properties that can be derived from grammar
 */
export interface SemanticProperties {
  /** How an action is performed */
  manner?: 'normal' | 'careful' | 'careless' | 'forceful' | 'stealthy' | 'quick';
  
  /** Spatial relationship for placement actions */
  spatialRelation?: 'in' | 'on' | 'under' | 'behind' | 'beside' | 'above' | 'below';
  
  /** Direction for movement */
  direction?: 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 
              'northeast' | 'northwest' | 'southeast' | 'southwest' |
              'in' | 'out';
  
  /** Whether the preposition was implicit */
  implicitPreposition?: boolean;
  
  /** Whether a direction was implicit */
  implicitDirection?: boolean;
  
  /** Custom properties for specific actions */
  [key: string]: any;
}

/**
 * Mapping from text variations to semantic properties
 */
export interface SemanticMapping {
  /** Map verb variations to properties */
  verbs?: Record<string, Partial<SemanticProperties>>;
  
  /** Map preposition variations to spatial relations */
  prepositions?: Record<string, string>;
  
  /** Map direction variations to normalized directions */
  directions?: Record<string, string>;
  
  /** Function to compute dynamic semantics based on match */
  compute?: (match: any) => Partial<SemanticProperties>;
}

/**
 * Slot constraint definition
 */
export interface SlotConstraint {
  name: string;
  constraints: Constraint[];
  /** How the parser should handle this slot (default: ENTITY) */
  slotType?: SlotType;
}

/**
 * Token in a pattern
 */
export interface PatternToken {
  type: 'literal' | 'slot' | 'alternates';
  value: string;
  alternates?: string[]; // For alternates like "in|into|inside"
  optional?: boolean;   // For optional elements like "[carefully]"
  slotType?: SlotType;  // For slot tokens: how to handle matching
  greedy?: boolean;     // For :slot... syntax: consume until delimiter
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
 * Slot match data with multi-object support
 */
export interface SlotMatch {
  tokens: number[];       // Token indices
  text: string;           // Combined text
  slotType?: SlotType;    // How the slot was matched
  confidence?: number;    // Match confidence (0-1)
  // Multi-object support (ADR-080 Phase 2)
  isAll?: boolean;        // True if "all" keyword
  isList?: boolean;       // True if "X and Y" list
  items?: SlotMatch[];    // List items when isList is true
  excluded?: SlotMatch[]; // Excluded items for "all but X"
}

/**
 * Result of pattern matching
 */
export interface PatternMatch {
  rule: GrammarRule;
  confidence: number;
  slots: Map<string, SlotMatch>;
  consumed: number; // Number of tokens consumed
  semantics?: SemanticProperties; // Derived semantic properties
  matchedTokens?: { // Track which tokens matched which parts
    verb?: string;
    preposition?: string;
    direction?: string;
  };
}