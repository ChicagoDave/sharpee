/**
 * @file Entity Slot Consumer
 * @description Handles entity resolution slots including multi-object parsing (ADR-088)
 *              and pronoun resolution (ADR-089). Every item it consumes has its
 *              leading articles and determiners split once (ADR-385 D2), and the
 *              all and except words come from the language, through the tokens.
 */

import {
  SlotType,
  type SlotMatch,
  type PatternToken,
  type SlotConstraint,
  type Token,
  ScopeBuilderImpl,
  type ScopeConstraintBuilder
} from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext, getNextPatternToken, isPatternDelimiter } from './slot-consumer.js';
import { GrammarScopeResolver } from '../grammar-scope-resolver.js';
import { isRecognizedPronoun, getPronounContextManager } from '../pronoun-context.js';
import { isAllWord, isExceptWord, splitLeadingWords, startsNounPhrase, type NounPhraseSplit } from './noun-phrase-split.js';

/** The list conjunction. English, until the language owns its word lists (step 7). */
const LIST_CONJUNCTION = 'and';

/**
 * Consumer for entity slots (ENTITY, INSTRUMENT)
 * Handles multi-object parsing: "all", "all but X", "X and Y"
 */
export class EntitySlotConsumer implements SlotConsumer {
  readonly slotTypes = [SlotType.ENTITY, SlotType.INSTRUMENT];

  consume(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;
    const DEBUG = ctx.DEBUG || false;
    const nextPatternToken = getNextPatternToken(ctx);

    if (startIndex >= tokens.length) {
      return null;
    }
    const first = tokens[startIndex];
    if (DEBUG) {
      console.log(`consumeEntitySlot: startIndex=${startIndex}, token.word='${first.word}', token.normalized='${first.normalized}'`);
    }

    // A recognised pronoun is a pronoun only as the whole item (ADR-385 D6):
    // followed by a noun word it is a determiner (`her key`), and the split
    // below takes it.
    if (isRecognizedPronoun(first.normalized) && this.isWholeItem(ctx, startIndex, nextPatternToken)) {
      const pronounResult = this.tryResolvePronoun(ctx, first.normalized, DEBUG);
      if (pronounResult) {
        return pronounResult;
      }
      // Pronoun resolution failed (no referent yet): fall through to standard
      // entity resolution, which handles "take it" with no previous object.
      if (DEBUG) {
        console.log(`Pronoun '${first.normalized}' could not be resolved, trying standard entity resolution`);
      }
    }

    // One of the language's all words at the item's start
    if (isAllWord(first)) {
      if (DEBUG) {
        console.log('Detected an all word, calling consumeAllSlot');
      }
      return this.consumeAllSlot(ctx, nextPatternToken, DEBUG);
    }

    // Standard entity consumption with "and" list detection
    return this.consumeEntityWithListDetection(ctx, DEBUG);
  }

  /**
   * Whether the token at `index` ends its item: nothing follows, or the next
   * token is the list conjunction, the next pattern element, or a word that
   * opens a new noun phrase (an article, a determiner, an all word).
   */
  private isWholeItem(ctx: SlotConsumerContext, index: number, nextPatternToken: PatternToken | undefined): boolean {
    const next = ctx.tokens[index + 1];
    if (!next) return true;
    if (next.normalized === LIST_CONJUNCTION) return true;
    if (isPatternDelimiter(next, nextPatternToken)) return true;
    return startsNounPhrase(next);
  }

  /**
   * Try to resolve a pronoun token using the pronoun context (ADR-089)
   */
  private tryResolvePronoun(
    ctx: SlotConsumerContext,
    pronoun: string,
    DEBUG: boolean
  ): SlotMatch | null {
    const { startIndex, slotType } = ctx;
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
      const result: SlotMatch = {
        tokens: [startIndex],
        text: ref.text, // Use resolved entity text for entity resolution
        slotType,
        entityId: ref.entityId,
        resolvedText: ref.text,
        isPronoun: true
      };
      return result;
    }

    // Multiple entities (e.g., "them" referring to multiple objects)
    // Use extended type for items with entityId
    const result: SlotMatch = {
      tokens: [startIndex],
      text: pronoun,
      slotType,
      isList: true,
      isPronoun: true,
      items: resolved.map(ref => ({
        tokens: [startIndex],
        text: ref.text,
        entityId: ref.entityId
      }))
    };
    return result;
  }

  /**
   * Consume an all word, the noun words that may follow it ("all coins"),
   * and an optional except word with its exclusions ("all but X and Y").
   *
   * The match's `determiners` lead with the all word, so the parser's split
   * leaves the noun words as the phrase's content (empty for a bare "all").
   */
  private consumeAllSlot(
    ctx: SlotConsumerContext,
    nextPatternToken: PatternToken | undefined,
    DEBUG: boolean
  ): SlotMatch | null {
    const { tokens, startIndex, slotType } = ctx;
    const allWord = tokens[startIndex];
    const consumedIndices: number[] = [startIndex];
    let currentIndex = startIndex + 1;
    const excluded: SlotMatch[] = [];

    // The noun words the all word qualifies, up to an except word, the list
    // conjunction or the next pattern element
    const nounSpan: number[] = [];
    while (currentIndex < tokens.length) {
      const token = tokens[currentIndex];
      if (isExceptWord(token) || token.normalized === LIST_CONJUNCTION || isPatternDelimiter(token, nextPatternToken)) {
        break;
      }
      nounSpan.push(currentIndex);
      currentIndex++;
    }
    consumedIndices.push(...nounSpan);
    const split = nounSpan.length > 0 ? splitLeadingWords(nounSpan, tokens) : undefined;

    // An except word, then the excluded items ("X and Y")
    if (currentIndex < tokens.length && isExceptWord(tokens[currentIndex])) {
      consumedIndices.push(currentIndex);
      currentIndex++;

      const excludedResult = this.consumeExcludedEntities(ctx, currentIndex, nextPatternToken);
      if (excludedResult) {
        consumedIndices.push(...excludedResult.tokens);
        excluded.push(...excludedResult.items);
      }
    }

    if (DEBUG) {
      console.log(`Consumed all slot with ${nounSpan.length} noun words and ${excluded.length} exclusions`);
    }

    return {
      tokens: consumedIndices,
      text: [allWord, ...nounSpan.map((i) => tokens[i])].map((t) => t.word).join(' '),
      slotType,
      articles: split?.articles ?? [],
      determiners: [allWord.normalized, ...(split?.determiners ?? [])],
      ...(split?.ownedByActor ? { ownedByActor: true } : {}),
      isAll: true,
      excluded: excluded.length > 0 ? excluded : undefined
    };
  }

  /**
   * Consume entities after an except word with "and" support
   */
  private consumeExcludedEntities(
    ctx: SlotConsumerContext,
    startIndex: number,
    nextPatternToken: PatternToken | undefined
  ): { tokens: number[]; items: SlotMatch[] } | null {
    const { tokens } = ctx;
    const items: SlotMatch[] = [];
    const allTokens: number[] = [];
    let currentIndex = startIndex;

    while (currentIndex < tokens.length) {
      if (isPatternDelimiter(tokens[currentIndex], nextPatternToken)) {
        break;
      }

      // Skip the list conjunction
      if (tokens[currentIndex].normalized === LIST_CONJUNCTION) {
        allTokens.push(currentIndex);
        currentIndex++;
        continue;
      }

      // One excluded noun phrase, up to the conjunction or the delimiter
      const span = this.itemSpan(tokens, currentIndex, nextPatternToken);
      if (span.length > 0) {
        items.push(this.itemMatch(span, tokens));
        allTokens.push(...span);
        currentIndex += span.length;
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
    let currentIndex = startIndex;

    // When next pattern token is a slot (consecutive slots like "give :recipient :item"),
    // we need to be conservative and find entity boundaries via constraint matching
    const nextIsSlot = nextPatternToken?.type === 'slot';
    const slotConstraints = rule.slots.get(slotName);
    const gated = !!(slotConstraints && slotConstraints.constraints.length > 0 && context.world);

    // Main loop: consume entity, check for "and", repeat
    while (currentIndex < tokens.length) {
      if (isPatternDelimiter(tokens[currentIndex], nextPatternToken)) {
        break;
      }

      // The item's maximal span: up to the conjunction or the delimiter
      const span = this.itemSpan(tokens, currentIndex, nextPatternToken);
      let item: SlotMatch | undefined;

      if (nextIsSlot && items.length === 0 && span.length > 0) {
        // Consecutive slots: the shortest content span that satisfies the
        // constraints, after the leading articles and determiners; with no
        // constraints, the first content word only.
        const split = splitLeadingWords(span, tokens);
        const prefix = span.slice(0, span.length - split.content.length);
        if (gated) {
          for (let n = 1; n <= split.content.length; n++) {
            const content = split.content.slice(0, n);
            if (this.satisfiesSlotConstraints(this.wordsOf(content, tokens), slotConstraints!, context)) {
              item = this.itemMatch([...prefix, ...content], tokens);
              break;
            }
          }
        } else {
          item = this.itemMatch([...prefix, split.content[0]], tokens);
        }
      } else if (span.length > 0) {
        item = this.itemMatch(span, tokens);
      }

      if (item) {
        items.push(item);
        allTokens.push(...item.tokens);
        currentIndex += item.tokens.length;
      }

      // Check if next token is "and" - if so, consume it and continue
      if (currentIndex < tokens.length && tokens[currentIndex].normalized === LIST_CONJUNCTION) {
        allTokens.push(currentIndex);
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

    if (DEBUG) {
      console.log(`Checking constraints for slot '${slotName}':`);
      console.log(`  slotConstraints exists: ${!!slotConstraints}`);
      console.log(`  constraints count: ${slotConstraints?.constraints?.length ?? 0}`);
      console.log(`  context.world exists: ${!!context.world}`);
    }

    if (gated) {
      // For lists, every item must satisfy the constraints; the gate reads
      // the item's content words, never its articles or determiners
      const satisfied = items.every((item) =>
        this.satisfiesSlotConstraints(this.contentTextOf(item), slotConstraints!, context)
      );

      if (!satisfied) {
        if (DEBUG) {
          console.log(`Failed to consume slot '${slotName}'`);
        }
        return null;
      }
    }

    // One item is the slot's own match; several make a list whose items
    // carry their own splits
    if (items.length === 1) {
      return { ...items[0], slotType };
    }

    const result: SlotMatch = {
      tokens: allTokens,
      text: this.wordsOf(allTokens, tokens),
      slotType,
      isList: true,
      items
    };
    if (DEBUG) {
      console.log(`Consumed list slot with ${items.length} items: ${items.map(i => i.text).join(', ')}`);
    }
    return result;
  }

  /** The token indices of one item from `start`: up to the conjunction or the next pattern element. */
  private itemSpan(tokens: Token[], start: number, nextPatternToken: PatternToken | undefined): number[] {
    const span: number[] = [];
    for (let i = start; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.normalized === LIST_CONJUNCTION || isPatternDelimiter(token, nextPatternToken)) break;
      span.push(i);
    }
    return span;
  }

  /** A slot match for one consumed item, its leading articles and determiners split off. */
  private itemMatch(span: number[], tokens: Token[]): SlotMatch {
    const split: NounPhraseSplit = splitLeadingWords(span, tokens);
    return {
      tokens: span,
      text: this.wordsOf(span, tokens),
      articles: split.articles,
      determiners: split.determiners,
      ...(split.ownedByActor ? { ownedByActor: true } : {})
    };
  }

  /** The typed words at the indices, space-joined. */
  private wordsOf(indices: readonly number[], tokens: Token[]): string {
    return indices.map((i) => tokens[i].word).join(' ');
  }

  /** An item's content words: its text after the split prefix. */
  private contentTextOf(item: SlotMatch): string {
    const prefix = (item.articles?.length ?? 0) + (item.determiners?.length ?? 0);
    return item.text.split(' ').slice(prefix).join(' ');
  }

  /**
   * Whether any entity in the slot's scope matches the text
   * @param slotText The content words the slot would take (articles and determiners already split off)
   * @param slotConstraints The slot's scope constraints
   * @param context The grammar context (world, actor, location)
   * @returns True when at least one constraint yields an entity matching the text
   */
  private satisfiesSlotConstraints(
    slotText: string,
    slotConstraints: SlotConstraint,
    context: any // GrammarContext
  ): boolean {
    // For each constraint, check if any entities match
    let hasMatchingEntity = false;

    if (process.env.PARSER_DEBUG === 'true') {
      console.log(`Evaluating constraints for slot text: "${slotText}"`);
    }

    // ADR-231 D2a Amendment 1: `.where()` takes a ScopeConstraintBuilder and
    // nothing else, so every constraint here is a scope-builder callback. The
    // property- and function-constraint branches this loop used to carry only
    // ever emitted "not yet supported" warnings; both forms were removed from
    // `.where()` rather than left as silent no-ops. Property and function
    // predicates still reach the resolver, via `ScopeBuilder.matching()`.
    for (const constraint of slotConstraints.constraints) {
      const scopeBuilder = new ScopeBuilderImpl();
      const scope = (constraint as ScopeConstraintBuilder)(scopeBuilder);
      const scopeConstraint = scope.build();

      // Find entities matching the text within the scope
      const matchingEntities = GrammarScopeResolver.findEntitiesByName(
        slotText,
        scopeConstraint,
        context
      );

      if (process.env.PARSER_DEBUG === 'true') {
        console.log(`Found ${matchingEntities.length} matching entities for "${slotText}"`);
        // Show scope details
        console.log(`  Scope base: ${scopeConstraint.base}, filters: ${scopeConstraint.filters.length}`);
        // Show what entities are in scope before filtering
        const allInScope = GrammarScopeResolver.getEntitiesInScope(
          { ...scopeConstraint, filters: [] }, // Without filters
          context
        );
        console.log(`  Entities in ${scopeConstraint.base} scope: ${allInScope.length}`);
        for (const e of allInScope.slice(0, 5)) {
          const eAny = e as unknown as Record<string, unknown>;
          const getFn = eAny.get as ((type: string) => Record<string, unknown> | undefined) | undefined;
          const identity = getFn?.('identity');
          const name = identity?.name || e.id;
          const enterable = eAny.enterable;
          console.log(`    - ${name} (enterable=${enterable})`);
        }
        if (allInScope.length > 5) {
          console.log(`    ... and ${allInScope.length - 5} more`);
        }
      }

      if (matchingEntities.length > 0) {
        hasMatchingEntity = true;
        // Store matched entities in context for later resolution
        const existingEntities = context.slots.get(slotText) || [];
        context.slots.set(slotText, [...existingEntities, ...matchingEntities]);
      }
    }

    return hasMatchingEntity;
  }
}
