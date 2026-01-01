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
  ScopeConstraintBuilder,
  SlotType,
  SlotMatch
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
    
    // Sort by confidence descending, then by priority descending
    matches.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // If confidence is equal, sort by rule priority
      return b.rule.priority - a.rule.priority;
    });
    
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
    const DEBUG = process.env.PARSER_DEBUG === 'true'; // Enable debug logging with env var
    
    if (DEBUG) {
      console.log(`\nTrying to match rule: ${rule.pattern}`);
      console.log('Tokens:', tokens.map(t => t.word).join(' '));
    }
    
    // Quick check: do we have enough tokens?
    if (tokens.length < pattern.minTokens) {
      return null;
    }
    
    const slots = new Map<string, SlotMatch>();
    let tokenIndex = 0;
    let confidence = 1.0;
    let skippedOptionals = 0;
    const matchedTokens: any = {}; // Track which tokens matched which parts
    
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
            // Track if this is a verb in the first position (for semantic mapping)
            if (tokenIndex === 0) {
              matchedTokens.verb = token.normalized;
            }
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
            // Track if this is a verb in the first position (for semantic mapping)
            // We track it regardless of token type since patterns may have verb alternates
            if (tokenIndex === 0) {
              matchedTokens.verb = token.normalized;
            }
            if (DEBUG) {
              console.log(`Alternates match: token '${token.normalized}' matches alternates [${patternToken.alternates!.join(', ')}]`);
            }
            tokenIndex++;
            // Don't reduce confidence for alternate matches - they're equally valid
          } else if (patternToken.optional) {
            // Optional alternates don't match, skip
            skippedOptionals++;
            continue;
          } else {
            // Required alternates don't match
            if (DEBUG) {
              console.log(`Alternates mismatch: token '${token.normalized}' not in alternates [${patternToken.alternates!.join(', ')}]`);
            }
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
          
          // Track matched slot values for semantic mapping
          if (patternToken.value === 'direction') {
            matchedTokens.direction = slotResult.text;
          } else if (patternToken.value === 'preposition') {
            matchedTokens.preposition = slotResult.text;
          }
          
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
    
    // Build semantics from the rule and matched tokens
    const semantics = this.buildSemantics(rule, matchedTokens);
    
    return {
      rule,
      confidence,
      slots,
      consumed: tokenIndex,
      semantics,
      matchedTokens
    };
  }
  
  /**
   * Build semantic properties from rule and matched tokens
   */
  private buildSemantics(
    rule: any, // GrammarRule
    matchedTokens: any
  ): any { // SemanticProperties | undefined
    const DEBUG = process.env.PARSER_DEBUG === 'true';
    let semantics: any = {};
    
    if (DEBUG) {
      console.log(`Building semantics for rule: ${rule.pattern}`);
      console.log(`Matched tokens:`, matchedTokens);
      console.log(`Rule semantics:`, rule.semantics);
      console.log(`Rule default semantics:`, rule.defaultSemantics);
    }
    
    // Start with default semantics if available
    if (rule.defaultSemantics) {
      semantics = { ...rule.defaultSemantics };
    }
    
    // Apply semantic mappings if available
    if (rule.semantics) {
      // Apply verb semantics
      if (rule.semantics.verbs && matchedTokens.verb) {
        const verbSemantics = rule.semantics.verbs[matchedTokens.verb];
        if (verbSemantics) {
          semantics = { ...semantics, ...verbSemantics };
          if (DEBUG) {
            console.log(`Applied verb semantics for '${matchedTokens.verb}':`, verbSemantics);
          }
        }
      }
      
      // Apply direction semantics
      if (rule.semantics.directions && matchedTokens.direction) {
        const normalizedDirection = rule.semantics.directions[matchedTokens.direction];
        if (normalizedDirection) {
          semantics.direction = normalizedDirection;
        }
      }
      
      // Apply preposition semantics
      if (rule.semantics.prepositions && matchedTokens.preposition) {
        const spatialRelation = rule.semantics.prepositions[matchedTokens.preposition];
        if (spatialRelation) {
          semantics.spatialRelation = spatialRelation;
        }
      }
    }
    
    if (DEBUG) {
      console.log(`Final semantics:`, semantics);
    }
    
    return Object.keys(semantics).length > 0 ? semantics : undefined;
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
  ): SlotMatch | null {
    const DEBUG = process.env.PARSER_DEBUG === 'true';

    // Find the current slot in the pattern tokens
    let slotTokenIndex = -1;
    let patternSlotToken: PatternToken | undefined;
    for (let i = 0; i < pattern.tokens.length; i++) {
      const token = pattern.tokens[i];
      if (token.type === 'slot' && token.value === slotName) {
        slotTokenIndex = i;
        patternSlotToken = token;
        break;
      }
    }

    if (slotTokenIndex === -1) {
      return null;
    }

    // Determine slot type: prefer SlotConstraint.slotType, then PatternToken.slotType
    const slotConstraints = rule.slots.get(slotName);
    const slotType = slotConstraints?.slotType || patternSlotToken?.slotType || SlotType.ENTITY;

    if (DEBUG) {
      console.log(`Slot '${slotName}' has type: ${slotType}`);
    }

    // Handle based on slot type
    switch (slotType) {
      case SlotType.TEXT:
        return this.consumeTextSlot(tokens, startIndex, slotType);

      case SlotType.TEXT_GREEDY:
        return this.consumeGreedyTextSlot(tokens, startIndex, pattern, slotTokenIndex, slotType);

      case SlotType.INSTRUMENT:
        // For instruments, resolve entity but mark as instrument
        return this.consumeEntitySlot(slotName, tokens, startIndex, pattern, slotTokenIndex, rule, context, slotType);

      case SlotType.ENTITY:
      default:
        return this.consumeEntitySlot(slotName, tokens, startIndex, pattern, slotTokenIndex, rule, context, slotType);
    }
  }

  /**
   * Consume a single token as raw text (no entity resolution)
   */
  private consumeTextSlot(
    tokens: Token[],
    startIndex: number,
    slotType: SlotType
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    return {
      tokens: [startIndex],
      text: token.word,
      confidence: 1.0,
      slotType
    };
  }

  /**
   * Consume tokens until next pattern element or end (greedy text)
   */
  private consumeGreedyTextSlot(
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    slotTokenIndex: number,
    slotType: SlotType
  ): SlotMatch | null {
    const nextPatternToken = pattern.tokens[slotTokenIndex + 1];
    const consumedIndices: number[] = [];
    const consumedWords: string[] = [];

    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];

      // Check if this token matches the next pattern element (delimiter)
      if (nextPatternToken) {
        if (nextPatternToken.type === 'literal' &&
            token.normalized === nextPatternToken.value) {
          break; // Stop - this token belongs to next pattern element
        }

        if (nextPatternToken.type === 'alternates' &&
            nextPatternToken.alternates!.includes(token.normalized)) {
          break; // Stop - this token belongs to next pattern element
        }
      }

      consumedIndices.push(i);
      consumedWords.push(token.word);
    }

    if (consumedIndices.length === 0) {
      return null;
    }

    return {
      tokens: consumedIndices,
      text: consumedWords.join(' '),
      confidence: 1.0,
      slotType
    };
  }

  /**
   * Consume tokens as entity reference (with resolution)
   * Supports multi-object parsing: "all", "all but X", "X and Y"
   */
  private consumeEntitySlot(
    slotName: string,
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    slotTokenIndex: number,
    rule: any,
    context: GrammarContext,
    slotType: SlotType
  ): SlotMatch | null {
    const DEBUG = process.env.PARSER_DEBUG === 'true';
    const nextPatternToken = pattern.tokens[slotTokenIndex + 1];

    // Check for "all" keyword at start
    if (DEBUG) {
      console.log(`consumeEntitySlot: startIndex=${startIndex}, token.word='${tokens[startIndex]?.word}', token.normalized='${tokens[startIndex]?.normalized}'`);
    }
    if (startIndex < tokens.length && tokens[startIndex].normalized === 'all') {
      if (DEBUG) {
        console.log('Detected "all" keyword, calling consumeAllSlot');
      }
      return this.consumeAllSlot(tokens, startIndex, nextPatternToken, slotType, DEBUG);
    }

    // Standard entity consumption with "and" list detection
    return this.consumeEntityWithListDetection(
      slotName, tokens, startIndex, pattern, slotTokenIndex, rule, context, slotType, DEBUG
    );
  }

  /**
   * Consume "all" and optionally "all but/except X"
   */
  private consumeAllSlot(
    tokens: Token[],
    startIndex: number,
    nextPatternToken: PatternToken | undefined,
    slotType: SlotType,
    DEBUG: boolean
  ): SlotMatch | null {
    const consumedIndices: number[] = [startIndex];
    let currentIndex = startIndex + 1;
    const excluded: SlotMatch[] = [];

    // Check for "but" or "except" after "all"
    if (currentIndex < tokens.length) {
      const nextWord = tokens[currentIndex].normalized;
      if (nextWord === 'but' || nextWord === 'except') {
        consumedIndices.push(currentIndex);
        currentIndex++;

        // Consume excluded entities (handles "X and Y" in exclusions)
        const excludedResult = this.consumeExcludedEntities(
          tokens, currentIndex, nextPatternToken, DEBUG
        );

        if (excludedResult) {
          consumedIndices.push(...excludedResult.tokens);
          excluded.push(...excludedResult.items);
        }
      }
    }

    if (DEBUG) {
      console.log(`Consumed "all" slot with ${excluded.length} exclusions`);
    }

    return {
      tokens: consumedIndices,
      text: 'all',
      confidence: 1.0,
      slotType,
      isAll: true,
      excluded: excluded.length > 0 ? excluded : undefined
    };
  }

  /**
   * Consume entities after "but/except" with "and" support
   */
  private consumeExcludedEntities(
    tokens: Token[],
    startIndex: number,
    nextPatternToken: PatternToken | undefined,
    DEBUG: boolean
  ): { tokens: number[]; items: SlotMatch[] } | null {
    const items: SlotMatch[] = [];
    const allTokens: number[] = [];
    let currentIndex = startIndex;

    while (currentIndex < tokens.length) {
      // Check for pattern delimiter
      if (nextPatternToken) {
        const currentWord = tokens[currentIndex].normalized;
        if (nextPatternToken.type === 'literal' && currentWord === nextPatternToken.value) {
          break;
        }
        if (nextPatternToken.type === 'alternates' &&
            nextPatternToken.alternates!.includes(currentWord)) {
          break;
        }
      }

      // Skip "and" conjunctions
      if (tokens[currentIndex].normalized === 'and') {
        allTokens.push(currentIndex);
        currentIndex++;
        continue;
      }

      // Consume entity tokens (noun phrase)
      const entityStart = currentIndex;
      const entityTokens: number[] = [];
      const entityWords: string[] = [];

      while (currentIndex < tokens.length) {
        const word = tokens[currentIndex].normalized;

        // Stop at "and", pattern delimiter, or other keywords
        if (word === 'and') break;
        if (nextPatternToken?.type === 'literal' && word === nextPatternToken.value) break;
        if (nextPatternToken?.type === 'alternates' &&
            nextPatternToken.alternates!.includes(word)) break;

        entityTokens.push(currentIndex);
        entityWords.push(tokens[currentIndex].word);
        currentIndex++;
      }

      if (entityTokens.length > 0) {
        items.push({
          tokens: entityTokens,
          text: entityWords.join(' ')
        });
        allTokens.push(...entityTokens);
      }
    }

    if (items.length === 0) {
      return null;
    }

    return { tokens: allTokens, items };
  }

  /**
   * Consume entity slot with "and" list detection
   */
  private consumeEntityWithListDetection(
    slotName: string,
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    slotTokenIndex: number,
    rule: any,
    context: GrammarContext,
    slotType: SlotType,
    DEBUG: boolean
  ): SlotMatch | null {
    const nextPatternToken = pattern.tokens[slotTokenIndex + 1];
    const items: SlotMatch[] = [];
    const allTokens: number[] = [];
    const allWords: string[] = [];
    let currentIndex = startIndex;

    // When next pattern token is a slot (consecutive slots like "give :recipient :item"),
    // we need to be conservative and find entity boundaries via constraint matching
    const nextIsSlot = nextPatternToken?.type === 'slot';

    // Main loop: consume entity, check for "and", repeat
    while (currentIndex < tokens.length) {
      // Check for pattern delimiter first
      if (nextPatternToken) {
        const currentWord = tokens[currentIndex].normalized;
        if (nextPatternToken.type === 'literal' && currentWord === nextPatternToken.value) {
          break;
        }
        if (nextPatternToken.type === 'alternates' &&
            nextPatternToken.alternates!.includes(currentWord)) {
          break;
        }
      }

      // Consume entity tokens (single noun phrase until "and" or delimiter)
      const entityTokens: number[] = [];
      const entityWords: string[] = [];

      // For consecutive slots, use constraint-aware consumption
      if (nextIsSlot && items.length === 0) {
        // Try to find the shortest match that satisfies constraints
        const slotConstraints = rule.slots.get(slotName);
        let bestMatch: { tokens: number[]; words: string[]; confidence: number } | null = null;

        // Try progressively longer phrases until we find a match or run out
        for (let tryLength = 1; tryLength <= tokens.length - currentIndex; tryLength++) {
          const tryTokens: number[] = [];
          const tryWords: string[] = [];

          for (let i = 0; i < tryLength && currentIndex + i < tokens.length; i++) {
            const word = tokens[currentIndex + i].normalized;
            // Stop at "and" - that would indicate a list
            if (word === 'and') break;
            tryTokens.push(currentIndex + i);
            tryWords.push(tokens[currentIndex + i].word);
          }

          if (tryTokens.length === 0) break;

          const tryText = tryWords.join(' ');

          // Check if this matches constraints
          if (slotConstraints && slotConstraints.constraints.length > 0 && context.world) {
            const confidence = this.evaluateSlotConstraints(tryText, slotConstraints, context);
            if (confidence > 0) {
              bestMatch = { tokens: tryTokens, words: tryWords, confidence };
              // Found a match - use it (greedy: first match wins)
              break;
            }
          } else {
            // No constraints - take first word only for consecutive slots
            bestMatch = { tokens: tryTokens, words: tryWords, confidence: 1.0 };
            break;
          }
        }

        if (bestMatch) {
          entityTokens.push(...bestMatch.tokens);
          entityWords.push(...bestMatch.words);
          allTokens.push(...bestMatch.tokens);
          allWords.push(...bestMatch.words);
          currentIndex += bestMatch.tokens.length;
        }
      } else {
        // Standard consumption with delimiter detection
        while (currentIndex < tokens.length) {
          const word = tokens[currentIndex].normalized;

          // Stop at "and" or pattern delimiter
          if (word === 'and') break;
          if (nextPatternToken?.type === 'literal' && word === nextPatternToken.value) break;
          if (nextPatternToken?.type === 'alternates' &&
              nextPatternToken.alternates!.includes(word)) break;

          entityTokens.push(currentIndex);
          entityWords.push(tokens[currentIndex].word);
          allTokens.push(currentIndex);
          allWords.push(tokens[currentIndex].word);
          currentIndex++;
        }
      }

      if (entityTokens.length > 0) {
        items.push({
          tokens: entityTokens,
          text: entityWords.join(' ')
        });
      }

      // Check if next token is "and" - if so, consume it and continue
      if (currentIndex < tokens.length && tokens[currentIndex].normalized === 'and') {
        allTokens.push(currentIndex);
        allWords.push(tokens[currentIndex].word);
        currentIndex++;
        // Continue the outer loop to consume more items
      } else {
        // No more "and", we're done
        break;
      }
    }

    // Must consume at least one token
    if (allTokens.length === 0) {
      return null;
    }

    // Check constraints on each item
    const slotConstraints = rule.slots.get(slotName);
    let confidence = 1.0;

    if (slotConstraints && slotConstraints.constraints.length > 0 && context.world) {
      // For lists, check constraints on each item
      for (const item of items) {
        const itemConfidence = this.evaluateSlotConstraints(
          item.text,
          slotConstraints,
          context
        );
        confidence = Math.min(confidence, itemConfidence);
      }

      if (confidence === 0) {
        if (DEBUG) {
          console.log(`Failed to consume slot '${slotName}'`);
        }
        return null;
      }
    }

    const result: SlotMatch = {
      tokens: allTokens,
      text: allWords.join(' '),
      confidence,
      slotType
    };

    // If we have multiple items, mark as list
    if (items.length > 1) {
      result.isList = true;
      result.items = items;
      if (DEBUG) {
        console.log(`Consumed list slot with ${items.length} items: ${items.map(i => i.text).join(', ')}`);
      }
    }

    return result;
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
    
    if (process.env.PARSER_DEBUG === 'true') {
      console.log(`Evaluating constraints for slot text: "${slotText}"`);
    }
    
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
          
          if (process.env.PARSER_DEBUG === 'true') {
            console.log(`Found ${matchingEntities.length} matching entities`);
          }
          
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