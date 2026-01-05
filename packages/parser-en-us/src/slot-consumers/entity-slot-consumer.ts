/**
 * @file Entity Slot Consumer
 * @description Handles entity resolution slots including multi-object parsing (ADR-088)
 *              and pronoun resolution (ADR-089)
 */

import {
  SlotType,
  SlotMatch,
  PatternToken,
  SlotConstraint,
  ScopeBuilderImpl,
  ScopeConstraintBuilder
} from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext, getNextPatternToken, isPatternDelimiter } from './slot-consumer';
import { ScopeEvaluator } from '../scope-evaluator';
import { isRecognizedPronoun, getPronounContextManager } from '../pronoun-context';

/**
 * Consumer for entity slots (ENTITY, INSTRUMENT)
 * Handles multi-object parsing: "all", "all but X", "X and Y"
 */
export class EntitySlotConsumer implements SlotConsumer {
  readonly slotTypes = [SlotType.ENTITY, SlotType.INSTRUMENT];

  consume(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, slotType } = ctx;
    const DEBUG = ctx.DEBUG || false;
    const nextPatternToken = getNextPatternToken(ctx);

    // Check for pronoun at start (ADR-089)
    if (startIndex < tokens.length) {
      const firstWord = tokens[startIndex].normalized;
      if (DEBUG) {
        console.log(`consumeEntitySlot: startIndex=${startIndex}, token.word='${tokens[startIndex]?.word}', token.normalized='${firstWord}'`);
      }

      // Try to resolve as pronoun first
      if (isRecognizedPronoun(firstWord)) {
        const pronounResult = this.tryResolvePronoun(ctx, firstWord, DEBUG);
        if (pronounResult) {
          return pronounResult;
        }
        // If pronoun resolution failed, fall through to standard entity resolution
        // This handles cases like "take it" when there's no previous object
        if (DEBUG) {
          console.log(`Pronoun '${firstWord}' could not be resolved, trying standard entity resolution`);
        }
      }
    }

    // Check for "all" keyword at start
    if (startIndex < tokens.length && tokens[startIndex].normalized === 'all') {
      if (DEBUG) {
        console.log('Detected "all" keyword, calling consumeAllSlot');
      }
      return this.consumeAllSlot(ctx, nextPatternToken, DEBUG);
    }

    // Standard entity consumption with "and" list detection
    return this.consumeEntityWithListDetection(ctx, DEBUG);
  }

  /**
   * Try to resolve a pronoun token using the pronoun context (ADR-089)
   */
  private tryResolvePronoun(
    ctx: SlotConsumerContext,
    pronoun: string,
    DEBUG: boolean
  ): SlotMatch | null {
    const { tokens, startIndex, slotType, context } = ctx;
    const pronounContext = getPronounContextManager();

    if (!pronounContext) {
      if (DEBUG) {
        console.log('No pronoun context manager available');
      }
      return null;
    }

    const resolved = pronounContext.resolve(pronoun);
    if (!resolved || resolved.length === 0) {
      if (DEBUG) {
        console.log(`Pronoun '${pronoun}' did not resolve to any entity`);
      }
      return null;
    }

    if (DEBUG) {
      console.log(`Pronoun '${pronoun}' resolved to: ${resolved.map(r => r.entityId).join(', ')}`);
    }

    // Single entity resolution
    if (resolved.length === 1) {
      const ref = resolved[0];
      // Use resolved entity's original text for entity resolution
      // Store pronoun metadata as extended properties
      const result: SlotMatch & { entityId?: string; resolvedText?: string; isPronoun?: boolean } = {
        tokens: [startIndex],
        text: ref.text, // Use resolved entity text for entity resolution
        confidence: 1.0,
        slotType
      };
      // Extended properties for pronoun tracking
      result.entityId = ref.entityId;
      result.resolvedText = ref.text;
      result.isPronoun = true;
      return result;
    }

    // Multiple entities (e.g., "them" referring to multiple objects)
    // Use extended type for items with entityId
    const result: SlotMatch = {
      tokens: [startIndex],
      text: pronoun,
      confidence: 1.0,
      slotType,
      isList: true,
      items: resolved.map(ref => ({
        tokens: [startIndex],
        text: ref.text,
        entityId: ref.entityId
      } as SlotMatch & { entityId?: string }))
    };
    // Mark as pronoun resolution
    (result as any).isPronoun = true;
    return result;
  }

  /**
   * Consume "all" and optionally "all but/except X"
   */
  private consumeAllSlot(
    ctx: SlotConsumerContext,
    nextPatternToken: PatternToken | undefined,
    DEBUG: boolean
  ): SlotMatch | null {
    const { tokens, startIndex, slotType } = ctx;
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
          ctx, currentIndex, nextPatternToken, DEBUG
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
    ctx: SlotConsumerContext,
    startIndex: number,
    nextPatternToken: PatternToken | undefined,
    DEBUG: boolean
  ): { tokens: number[]; items: SlotMatch[] } | null {
    const { tokens } = ctx;
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
    ctx: SlotConsumerContext,
    DEBUG: boolean
  ): SlotMatch | null {
    const { slotName, tokens, startIndex, pattern, slotTokenIndex, rule, context, slotType } = ctx;
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
    context: any // GrammarContext
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
