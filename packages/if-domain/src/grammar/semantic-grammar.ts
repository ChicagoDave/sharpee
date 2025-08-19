/**
 * Semantic Grammar Support
 * 
 * Extends grammar rules to include semantic mappings that produce
 * meaningful properties directly from parsing, eliminating the need
 * for actions to interpret raw parser data.
 */

import { GrammarRule, SemanticProperties, SemanticMapping } from './grammar-builder';

/**
 * A parsed match from grammar
 */
export interface ParseMatch {
  /** The matched verb text */
  verb?: string;
  
  /** The matched preposition text */
  preposition?: string;
  
  /** The matched direction text */
  direction?: string;
  
  /** Any matched objects */
  objects?: Array<{ text: string; slot: string }>;
}

/**
 * Grammar rule with semantic mappings
 * (Note: GrammarRule already has semantics and defaultSemantics properties)
 */
export type SemanticGrammarRule = GrammarRule;

/**
 * Result of parsing with semantic grammar
 */
export interface SemanticParseResult {
  /** The action to execute */
  actionId: string;
  
  /** Direct object if present */
  directObject?: any;
  
  /** Indirect object if present */
  indirectObject?: any;
  
  /** Original preposition text (for error messages) */
  prepositionText?: string;
  
  /** Semantic properties derived from grammar */
  semantics: SemanticProperties;
  
  /** Original input for reference */
  inputText: string;
}

/**
 * Builder for semantic grammar rules
 */
export class SemanticGrammarBuilder {
  private rule: Partial<SemanticGrammarRule> = {};
  
  /**
   * Define the pattern for this rule
   */
  pattern(pattern: string): this {
    this.rule.pattern = pattern;
    return this;
  }
  
  /**
   * Map to an action ID
   */
  mapsTo(actionId: string): this {
    this.rule.action = actionId;
    return this;
  }
  
  /**
   * Add verb semantic mappings
   */
  withVerbs(verbs: Record<string, Partial<SemanticProperties>>): this {
    if (!this.rule.semantics) {
      this.rule.semantics = {};
    }
    this.rule.semantics.verbs = verbs;
    return this;
  }
  
  /**
   * Add preposition semantic mappings
   */
  withPrepositions(prepositions: Record<string, string>): this {
    if (!this.rule.semantics) {
      this.rule.semantics = {};
    }
    this.rule.semantics.prepositions = prepositions;
    return this;
  }
  
  /**
   * Add direction semantic mappings
   */
  withDirections(directions: Record<string, string>): this {
    if (!this.rule.semantics) {
      this.rule.semantics = {};
    }
    this.rule.semantics.directions = directions;
    return this;
  }
  
  /**
   * Add dynamic semantic computation
   */
  withCompute(compute: (match: ParseMatch) => Partial<SemanticProperties>): this {
    if (!this.rule.semantics) {
      this.rule.semantics = {};
    }
    this.rule.semantics.compute = compute;
    return this;
  }
  
  /**
   * Set default semantics
   */
  withDefaults(defaults: Partial<SemanticProperties>): this {
    this.rule.defaultSemantics = defaults;
    return this;
  }
  
  /**
   * Build the rule
   */
  build(): SemanticGrammarRule {
    if (!this.rule.pattern || !this.rule.action) {
      throw new Error('Pattern and action are required');
    }
    return this.rule as SemanticGrammarRule;
  }
}

/**
 * Apply semantic mappings to a parse match
 */
export function applySemantics(
  match: ParseMatch,
  mapping: SemanticMapping | undefined,
  defaults?: Partial<SemanticProperties>
): SemanticProperties {
  let semantics: SemanticProperties = { ...defaults };
  
  if (!mapping) {
    return semantics;
  }
  
  // Apply verb semantics
  if (match.verb && mapping.verbs && mapping.verbs[match.verb]) {
    Object.assign(semantics, mapping.verbs[match.verb]);
  }
  
  // Apply preposition semantics
  if (match.preposition && mapping.prepositions && mapping.prepositions[match.preposition]) {
    semantics.spatialRelation = mapping.prepositions[match.preposition] as any;
  }
  
  // Apply direction semantics
  if (match.direction && mapping.directions && mapping.directions[match.direction]) {
    semantics.direction = mapping.directions[match.direction] as any;
  }
  
  // Apply computed semantics
  if (mapping.compute) {
    Object.assign(semantics, mapping.compute(match));
  }
  
  return semantics;
}