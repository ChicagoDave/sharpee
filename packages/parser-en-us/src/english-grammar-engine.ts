/**
 * @file English Grammar Engine
 * @description English-specific implementation of grammar matching
 */

import { 
  GrammarEngine, 
  GrammarContext, 
  PatternMatch,
  GrammarMatchOptions,
  PatternToken,
  CompiledPattern,
  SlotConstraint,
  ScopeBuilderImpl,
  ScopeConstraintBuilder
} from '@sharpee/if-domain';
import { Token } from '@sharpee/if-domain';
import { EnglishPatternCompiler } from './english-pattern-compiler';
import { ScopeEvaluator } from './scope-evaluator';

/**
 * English-specific grammar matching engine
 */
export class EnglishGrammarEngine extends GrammarEngine {
  constructor() {
    super(new EnglishPatternCompiler());
  }
  
  /**
   * Find matching grammar rules for tokens
   */
  findMatches(
    tokens: Token[], 
    context: GrammarContext,
    options: GrammarMatchOptions = {}
  ): PatternMatch[] {
    const matches: PatternMatch[] = [];
    const { minConfidence = 0.1, maxMatches = 10 } = options;
    
    // Try each rule
    for (const rule of this.rules) {
      if (!rule.compiledPattern) continue;
      
      const match = this.tryMatchRule(rule, tokens, context);
      if (match && match.confidence >= minConfidence) {
        matches.push(match);
        
        // Stop if we have enough matches
        if (matches.length >= maxMatches) {
          break;
        }
      }
    }
    
    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }
  
  /**
   * Try to match a single rule against tokens
   */
  private tryMatchRule(
    rule: any, // GrammarRule
    tokens: Token[],
    context: GrammarContext
  ): PatternMatch | null {
    const pattern = rule.compiledPattern!;
    const DEBUG = false; // Disable debug logging
    
    if (DEBUG) {
      console.log(`\nTrying to match rule: ${rule.pattern}`);
      console.log('Tokens:', tokens.map(t => t.word).join(' '));
    }
    
    // Quick check: do we have enough tokens?
    if (tokens.length < pattern.minTokens) {
      return null;
    }
    
    const slots = new Map<string, { tokens: number[]; text: string }>();
    let tokenIndex = 0;
    let confidence = 1.0;
    let skippedOptionals = 0;
    
    // Try to match each pattern token
    for (const patternToken of pattern.tokens) {
      // Check if we have a token to match
      if (tokenIndex >= tokens.length) {
        // If this pattern token is optional, we can skip it
        if (patternToken.optional) {
          continue;
        }
        // Not enough tokens for required pattern element
        return null;
      }
      
      const token = tokens[tokenIndex];
      
      switch (patternToken.type) {
        case 'literal':
          // Check if it matches
          if (token.normalized === patternToken.value) {
            tokenIndex++;
          } else if (patternToken.optional) {
            // Optional literal doesn't match, skip it
            skippedOptionals++;
            continue;
          } else {
            // Required literal doesn't match
            if (DEBUG) {
              console.log(`Literal mismatch at token ${tokenIndex}: expected '${patternToken.value}', got '${token.normalized}'`);
            }
            return null;
          }
          break;
          
        case 'alternates':
          // Check if it matches one of the alternates
          if (patternToken.alternates!.includes(token.normalized)) {
            tokenIndex++;
            // Slightly lower confidence for alternate matches
            if (token.normalized !== patternToken.value) {
              confidence *= 0.95;
            }
          } else if (patternToken.optional) {
            // Optional alternates don't match, skip
            skippedOptionals++;
            continue;
          } else {
            // Required alternates don't match
            return null;
          }
          break;
          
        case 'slot':
          // Try to consume tokens for this slot
          if (DEBUG) {
            console.log(`Consuming slot '${patternToken.value}' starting at token ${tokenIndex}`);
          }
          const slotResult = this.consumeSlot(
            patternToken.value,
            tokens,
            tokenIndex,
            pattern,
            rule,
            context
          );
          
          if (!slotResult) {
            if (patternToken.optional) {
              // Optional slot couldn't be filled, skip it
              skippedOptionals++;
              continue;
            } else {
              // Required slot couldn't be filled
              if (DEBUG) {
                console.log(`Failed to consume slot '${patternToken.value}'`);
              }
              return null;
            }
          }
          
          if (DEBUG) {
            console.log(`Consumed slot '${patternToken.value}': "${slotResult.text}"`);
          }
          slots.set(patternToken.value, slotResult);
          tokenIndex = slotResult.tokens[slotResult.tokens.length - 1] + 1;
          confidence *= slotResult.confidence || 0.9;
          break;
      }
    }
    
    // Check if we consumed all tokens (for now, require exact match)
    if (tokenIndex !== tokens.length) {
      // Leftover tokens
      if (DEBUG) {
        console.log(`Pattern match failed: consumed ${tokenIndex} tokens but have ${tokens.length} total`);
      }
      return null;
    }
    
    // Reduce confidence for each skipped optional element
    // This ensures exact matches are preferred over matches with skipped optionals
    confidence *= Math.pow(0.9, skippedOptionals);
    
    // Apply experimental confidence if set
    if ((rule as any).experimentalConfidence) {
      confidence *= (rule as any).experimentalConfidence;
    }
    
    if (DEBUG) {
      console.log(`Pattern matched successfully! Skipped ${skippedOptionals} optional elements`);
    }
    
    return {
      rule,
      confidence,
      slots,
      consumed: tokenIndex
    };
  }
  
  /**
   * Consume tokens for a slot
   */
  private consumeSlot(
    slotName: string,
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    rule: any, // GrammarRule
    context: GrammarContext
  ): { tokens: number[]; text: string; confidence?: number } | null {
    // Find the current slot in the pattern tokens
    let slotTokenIndex = -1;
    for (let i = 0; i < pattern.tokens.length; i++) {
      const token = pattern.tokens[i];
      if (token.type === 'slot' && token.value === slotName) {
        slotTokenIndex = i;
        break;
      }
    }
    
    if (slotTokenIndex === -1) {
      return null;
    }
    
    const nextPatternToken = pattern.tokens[slotTokenIndex + 1];
    const consumedIndices: number[] = [];
    const consumedWords: string[] = [];
    
    // Consume tokens until we hit the next pattern element
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      
      // Check if this token matches the next pattern element
      if (nextPatternToken) {
        if (nextPatternToken.type === 'literal' && 
            token.normalized === nextPatternToken.value) {
          // Stop here - this token belongs to the next pattern element
          break;
        }
        
        if (nextPatternToken.type === 'alternates' && 
            nextPatternToken.alternates!.includes(token.normalized)) {
          // Stop here - this token belongs to the next pattern element
          break;
        }
        
        // If the next pattern token is another slot, we need to be more careful
        if (nextPatternToken.type === 'slot') {
          // For consecutive slots, consume only one token for now
          // This is a simple heuristic that works for patterns like "give :recipient :item"
          consumedIndices.push(i);
          consumedWords.push(token.word);
          break;
        }
      }
      
      consumedIndices.push(i);
      consumedWords.push(token.word);
    }
    
    // Must consume at least one token
    if (consumedIndices.length === 0) {
      return null;
    }
    
    // Check if the consumed text matches slot constraints
    const slotText = consumedWords.join(' ');
    const slotConstraints = rule.slots.get(slotName);
    let confidence = 1.0;
    
    if (slotConstraints && slotConstraints.constraints.length > 0 && context.world) {
      // We have constraints and a world model to check against
      confidence = this.evaluateSlotConstraints(
        slotText,
        slotConstraints,
        context
      );
      
      // If constraints completely fail, return null
      if (confidence === 0) {
        return null;
      }
    }
    
    return {
      tokens: consumedIndices,
      text: slotText,
      confidence
    };
  }
  
  /**
   * Evaluate slot constraints and return confidence
   */
  private evaluateSlotConstraints(
    slotText: string,
    slotConstraints: SlotConstraint,
    context: GrammarContext
  ): number {
    // For each constraint, check if any entities match
    let hasMatchingEntity = false;
    
    for (const constraint of slotConstraints.constraints) {
      if (typeof constraint === 'function') {
        // Check if it's a ScopeConstraintBuilder (1 arg) vs FunctionConstraint (2 args)
        if (constraint.length === 1) {
          // ScopeConstraintBuilder
          const scopeBuilder = new ScopeBuilderImpl();
          const scope = (constraint as ScopeConstraintBuilder)(scopeBuilder);
          const scopeConstraint = scope.build();
          
          // Find entities matching the text within the scope
          const matchingEntities = ScopeEvaluator.findEntitiesByName(
            slotText,
            scopeConstraint,
            context
          );
          
          if (matchingEntities.length > 0) {
            hasMatchingEntity = true;
            // Store matched entities in context for later resolution
            const existingEntities = context.slots.get(slotText) || [];
            context.slots.set(slotText, [...existingEntities, ...matchingEntities]);
          }
        } else {
          // FunctionConstraint - needs entity and context
          // For now, we'll need to get candidate entities first
          // This is a limitation - we'd need to refactor to support this properly
          console.warn('FunctionConstraint in slot constraints not yet supported');
        }
      } else {
        // PropertyConstraint
        // TODO: Handle property constraints
        console.warn('PropertyConstraint in slot constraints not yet supported');
      }
    }
    
    // Return confidence based on whether we found matching entities
    return hasMatchingEntity ? 1.0 : 0.0;
  }
}