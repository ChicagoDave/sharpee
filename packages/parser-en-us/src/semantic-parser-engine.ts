/**
 * Semantic Parser Engine
 * 
 * Extends the English grammar engine to apply semantic mappings
 * during parsing, producing semantic properties directly from grammar rules.
 */

import { 
  GrammarContext, 
  PatternMatch,
  GrammarMatchOptions,
  Token,
  SemanticProperties,
  SemanticMapping
} from '@sharpee/if-domain';
import { EnglishGrammarEngine } from './english-grammar-engine';

/**
 * Enhanced parser that applies semantic mappings
 */
export class SemanticParserEngine extends EnglishGrammarEngine {
  
  /**
   * Find matching grammar rules and apply semantics
   */
  findMatches(
    tokens: Token[], 
    context: GrammarContext,
    options: GrammarMatchOptions = {}
  ): PatternMatch[] {
    // Get base matches from parent
    const matches = super.findMatches(tokens, context, options);
    
    // Apply semantic mappings to each match
    for (const match of matches) {
      if (match.rule.semantics || match.rule.defaultSemantics) {
        match.semantics = this.applySemantics(match, tokens);
      }
    }
    
    return matches;
  }
  
  /**
   * Apply semantic mappings to a match
   */
  private applySemantics(match: PatternMatch, tokens: Token[]): SemanticProperties {
    const rule = match.rule;
    const semantics: SemanticProperties = { ...rule.defaultSemantics };
    
    // Track what we matched
    const matchedTokens: any = {};
    
    // Extract verb, preposition, direction from the match
    const pattern = rule.pattern;
    const patternParts = pattern.split(/\s+/);
    
    for (let i = 0; i < patternParts.length; i++) {
      const part = patternParts[i];
      
      // Check for verb at the beginning
      if (i === 0 && !part.startsWith(':') && !part.includes('|')) {
        // This is likely the verb
        if (tokens[0]) {
          matchedTokens.verb = tokens[0].normalized;
        }
      }
      
      // Check for prepositions (in|into|on|onto etc)
      if (part.includes('|') && (part.includes('in') || part.includes('on') || part.includes('under'))) {
        // Find which token matched this
        const prepIndex = this.findPrepositionIndex(tokens, part);
        if (prepIndex !== -1) {
          matchedTokens.preposition = tokens[prepIndex].normalized;
        }
      }
      
      // Check for directions
      if (part === ':direction' || part.includes('north') || part.includes('south')) {
        const dirIndex = this.findDirectionIndex(tokens);
        if (dirIndex !== -1) {
          matchedTokens.direction = tokens[dirIndex].normalized;
        }
      }
    }
    
    // Apply verb semantics
    if (matchedTokens.verb && rule.semantics?.verbs) {
      const verbSemantics = rule.semantics.verbs[matchedTokens.verb];
      if (verbSemantics) {
        Object.assign(semantics, verbSemantics);
      }
    }
    
    // Apply preposition semantics
    if (matchedTokens.preposition && rule.semantics?.prepositions) {
      const prepMapping = rule.semantics.prepositions[matchedTokens.preposition];
      if (prepMapping) {
        semantics.spatialRelation = prepMapping as any;
      }
    } else if (rule.pattern.includes(':container') && !matchedTokens.preposition) {
      // Implicit preposition case (e.g., "insert X Y" without "into")
      semantics.implicitPreposition = true;
    }
    
    // Apply direction semantics
    if (matchedTokens.direction && rule.semantics?.directions) {
      const dirMapping = rule.semantics.directions[matchedTokens.direction];
      if (dirMapping) {
        semantics.direction = dirMapping as any;
      }
    }
    
    // Apply computed semantics if provided
    if (rule.semantics?.compute) {
      const computed = rule.semantics.compute(matchedTokens);
      Object.assign(semantics, computed);
    }
    
    // Store matched tokens for reference
    match.matchedTokens = matchedTokens;
    
    return semantics;
  }
  
  /**
   * Find the index of a preposition token
   */
  private findPrepositionIndex(tokens: Token[], prepPattern: string): number {
    // Extract alternatives from pattern like "in|into|inside"
    const alternatives = prepPattern.split('|');
    
    for (let i = 0; i < tokens.length; i++) {
      if (alternatives.includes(tokens[i].normalized)) {
        return i;
      }
    }
    
    return -1;
  }
  
  /**
   * Find the index of a direction token
   */
  private findDirectionIndex(tokens: Token[]): number {
    const directions = [
      'north', 'n', 'south', 's', 'east', 'e', 'west', 'w',
      'northeast', 'ne', 'northwest', 'nw', 'southeast', 'se', 'southwest', 'sw',
      'up', 'u', 'down', 'd', 'in', 'out'
    ];
    
    for (let i = 0; i < tokens.length; i++) {
      if (directions.includes(tokens[i].normalized)) {
        return i;
      }
    }
    
    return -1;
  }
}

/**
 * Example usage:
 * 
 * const engine = new SemanticParserEngine();
 * 
 * // Add a semantic rule for inserting
 * engine.addRule({
 *   pattern: 'insert :item :container',
 *   action: 'if.action.inserting',
 *   semantics: {
 *     verbs: {
 *       'insert': { manner: 'normal' },
 *       'jam': { manner: 'forceful' },
 *       'slip': { manner: 'stealthy' }
 *     }
 *   },
 *   defaultSemantics: {
 *     spatialRelation: 'in',
 *     implicitPreposition: true
 *   }
 * });
 * 
 * // Parse "insert coin slot"
 * const matches = engine.findMatches(tokens, context);
 * // matches[0].semantics = { 
 * //   manner: 'normal', 
 * //   spatialRelation: 'in',
 * //   implicitPreposition: true 
 * // }
 */