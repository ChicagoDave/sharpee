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

      // ADR-082: Typed Value Slots
      case SlotType.NUMBER:
        return this.consumeNumberSlot(tokens, startIndex);

      case SlotType.ORDINAL:
        return this.consumeOrdinalSlot(tokens, startIndex);

      case SlotType.TIME:
        return this.consumeTimeSlot(tokens, startIndex);

      // ADR-082: Vocabulary-Constrained Slots
      case SlotType.DIRECTION:
        return this.consumeDirectionSlot(tokens, startIndex);

      case SlotType.ADJECTIVE:
        return this.consumeAdjectiveSlot(tokens, startIndex, context);

      case SlotType.NOUN:
        return this.consumeNounSlot(tokens, startIndex, context);

      // ADR-082: Text Variant Slots
      case SlotType.QUOTED_TEXT:
        return this.consumeQuotedTextSlot(tokens, startIndex);

      case SlotType.TOPIC:
        return this.consumeTopicSlot(tokens, startIndex, pattern, slotTokenIndex);

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

  // ==========================================================================
  // ADR-082: Typed Value Slot Consumption Functions
  // ==========================================================================

  /**
   * Number words mapped to numeric values
   */
  private static readonly NUMBER_WORDS: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
    eighty: 80, ninety: 90, hundred: 100
  };

  /**
   * Ordinal words mapped to numeric values
   */
  private static readonly ORDINAL_WORDS: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15,
    sixteenth: 16, seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20
  };

  /**
   * Direction vocabulary with canonical forms
   */
  private static readonly DIRECTIONS: Record<string, string> = {
    // Cardinals
    n: 'north', north: 'north',
    s: 'south', south: 'south',
    e: 'east', east: 'east',
    w: 'west', west: 'west',
    // Ordinals
    ne: 'northeast', northeast: 'northeast',
    nw: 'northwest', northwest: 'northwest',
    se: 'southeast', southeast: 'southeast',
    sw: 'southwest', southwest: 'southwest',
    // Verticals
    u: 'up', up: 'up',
    d: 'down', down: 'down',
    // Special
    in: 'in', out: 'out'
  };

  /**
   * Consume a number slot (integer)
   * Matches digits (1, 29, 100) or words (one, twenty)
   */
  private consumeNumberSlot(
    tokens: Token[],
    startIndex: number
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // Check word form
    if (normalized in EnglishGrammarEngine.NUMBER_WORDS) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.NUMBER
      };
    }

    // Check digit form
    if (/^\d+$/.test(normalized)) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.NUMBER
      };
    }

    return null;
  }

  /**
   * Consume an ordinal slot
   * Matches ordinal words (first, second) or suffixed numbers (1st, 2nd)
   */
  private consumeOrdinalSlot(
    tokens: Token[],
    startIndex: number
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // Check word form
    if (normalized in EnglishGrammarEngine.ORDINAL_WORDS) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.ORDINAL
      };
    }

    // Check suffixed number form (1st, 2nd, 3rd, 4th, etc.)
    const ordinalMatch = normalized.match(/^(\d+)(st|nd|rd|th)$/);
    if (ordinalMatch) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.ORDINAL
      };
    }

    return null;
  }

  /**
   * Consume a time slot
   * Matches HH:MM format (10:40, 6:00)
   */
  private consumeTimeSlot(
    tokens: Token[],
    startIndex: number
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const word = token.word;

    // Match HH:MM format
    const timeMatch = word.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);

      // Validate time range
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return {
          tokens: [startIndex],
          text: word,
          confidence: 1.0,
          slotType: SlotType.TIME
        };
      }
    }

    return null;
  }

  /**
   * Consume a direction slot
   * Matches built-in direction vocabulary (n, north, up, etc.)
   */
  private consumeDirectionSlot(
    tokens: Token[],
    startIndex: number
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    if (normalized in EnglishGrammarEngine.DIRECTIONS) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.DIRECTION
      };
    }

    return null;
  }

  // ==========================================================================
  // ADR-082: Vocabulary-Constrained Slot Consumption Functions
  // ==========================================================================

  /**
   * Consume an adjective slot from story vocabulary
   * Requires vocabulary to be registered via language provider
   */
  private consumeAdjectiveSlot(
    tokens: Token[],
    startIndex: number,
    context: GrammarContext
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // Get adjective vocabulary from context (world has language provider)
    const adjectives = this.getVocabulary(context, 'adjectives');

    if (adjectives && adjectives.has(normalized)) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.ADJECTIVE
      };
    }

    return null;
  }

  /**
   * Consume a noun slot from story vocabulary
   * Requires vocabulary to be registered via language provider
   */
  private consumeNounSlot(
    tokens: Token[],
    startIndex: number,
    context: GrammarContext
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // Get noun vocabulary from context (world has language provider)
    const nouns = this.getVocabulary(context, 'nouns');

    if (nouns && nouns.has(normalized)) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.NOUN
      };
    }

    return null;
  }

  /**
   * Get vocabulary set from context
   * Returns null if vocabulary not available
   */
  private getVocabulary(
    context: GrammarContext,
    type: 'adjectives' | 'nouns'
  ): Set<string> | null {
    // Try to get vocabulary from world's language provider
    const world = context.world;
    if (!world) return null;

    // Check for vocabulary provider interface
    const provider = world.getVocabularyProvider?.();
    if (!provider) return null;

    switch (type) {
      case 'adjectives':
        return provider.getAdjectives?.() || null;
      case 'nouns':
        return provider.getNouns?.() || null;
      default:
        return null;
    }
  }

  // ==========================================================================
  // ADR-082: Text Variant Slot Consumption Functions
  // ==========================================================================

  /**
   * Consume a quoted text slot
   * Matches text enclosed in double quotes
   */
  private consumeQuotedTextSlot(
    tokens: Token[],
    startIndex: number
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const word = token.word;

    // Check if token starts with quote
    if (!word.startsWith('"')) {
      return null;
    }

    // Single token quoted text: "hello"
    if (word.endsWith('"') && word.length > 2) {
      return {
        tokens: [startIndex],
        text: word.slice(1, -1), // Remove quotes
        confidence: 1.0,
        slotType: SlotType.QUOTED_TEXT
      };
    }

    // Multi-token quoted text: "hello world"
    // Consume tokens until closing quote
    const consumedIndices: number[] = [startIndex];
    const consumedWords: string[] = [word.slice(1)]; // Remove opening quote

    for (let i = startIndex + 1; i < tokens.length; i++) {
      const t = tokens[i];
      consumedIndices.push(i);

      if (t.word.endsWith('"')) {
        consumedWords.push(t.word.slice(0, -1)); // Remove closing quote
        return {
          tokens: consumedIndices,
          text: consumedWords.join(' '),
          confidence: 1.0,
          slotType: SlotType.QUOTED_TEXT
        };
      }

      consumedWords.push(t.word);
    }

    // No closing quote found
    return null;
  }

  /**
   * Consume a topic slot
   * Consumes one or more words until next pattern element
   */
  private consumeTopicSlot(
    tokens: Token[],
    startIndex: number,
    pattern: CompiledPattern,
    slotTokenIndex: number
  ): SlotMatch | null {
    if (startIndex >= tokens.length) {
      return null;
    }

    const nextPatternToken = pattern.tokens[slotTokenIndex + 1];
    const consumedIndices: number[] = [];
    const consumedWords: string[] = [];

    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];

      // Check for pattern delimiter
      if (nextPatternToken) {
        if (nextPatternToken.type === 'literal' &&
            token.normalized === nextPatternToken.value) {
          break;
        }
        if (nextPatternToken.type === 'alternates' &&
            nextPatternToken.alternates!.includes(token.normalized)) {
          break;
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
      slotType: SlotType.TOPIC
    };
  }

  // ==========================================================================
  // ADR-082: Helper Functions for Typed Slot Values
  // ==========================================================================

  /**
   * Extract typed value from a NUMBER slot match
   */
  static extractNumberValue(match: SlotMatch): number | null {
    if (match.slotType !== SlotType.NUMBER) return null;

    const normalized = match.text.toLowerCase();

    // Word form
    if (normalized in EnglishGrammarEngine.NUMBER_WORDS) {
      return EnglishGrammarEngine.NUMBER_WORDS[normalized];
    }

    // Digit form
    if (/^\d+$/.test(normalized)) {
      return parseInt(normalized, 10);
    }

    return null;
  }

  /**
   * Extract typed value from an ORDINAL slot match
   */
  static extractOrdinalValue(match: SlotMatch): number | null {
    if (match.slotType !== SlotType.ORDINAL) return null;

    const normalized = match.text.toLowerCase();

    // Word form
    if (normalized in EnglishGrammarEngine.ORDINAL_WORDS) {
      return EnglishGrammarEngine.ORDINAL_WORDS[normalized];
    }

    // Suffixed number form
    const ordinalMatch = normalized.match(/^(\d+)(st|nd|rd|th)$/);
    if (ordinalMatch) {
      return parseInt(ordinalMatch[1], 10);
    }

    return null;
  }

  /**
   * Extract canonical direction from a DIRECTION slot match
   */
  static extractDirectionValue(match: SlotMatch): string | null {
    if (match.slotType !== SlotType.DIRECTION) return null;

    const normalized = match.text.toLowerCase();
    return EnglishGrammarEngine.DIRECTIONS[normalized] || null;
  }

  /**
   * Extract time components from a TIME slot match
   */
  static extractTimeValue(match: SlotMatch): { hours: number; minutes: number } | null {
    if (match.slotType !== SlotType.TIME) return null;

    const timeMatch = match.text.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      return {
        hours: parseInt(timeMatch[1], 10),
        minutes: parseInt(timeMatch[2], 10)
      };
    }

    return null;
  }
}