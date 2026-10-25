/**
 * @file Entity Slot Consumer
 * @description Handles entity resolution slots including multi-object parsing (ADR-088)
 *              and pronoun resolution (ADR-089). Every item it consumes has its
 *              leading articles and determiners split once (ADR-385 D2); a
 *              constrained slot admits what the one noun matcher names and records
 *              the admitted ids on its match (D3, D4); a pronoun is a whole item,
 *              may be a list item, and passes the same gate (D6).
 */

import {
  SlotType,
  type SlotMatch,
  type PatternToken,
  type SlotConstraint,
  type Token,
  type GrammarContext,
  ScopeBuilderImpl,
  type ScopeConstraintBuilder
} from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext, getNextPatternToken, isPatternDelimiter } from './slot-consumer.js';
import { GrammarScopeResolver } from '../grammar-scope-resolver.js';
import { isRecognizedPronoun, getPronounContextManager } from '../pronoun-context.js';
import { isAllWord, isExceptWord, splitLeadingWords, startsNounPhrase } from './noun-phrase-split.js';

/** The list conjunction. English, until the language owns its word lists (step 7). */
const LIST_CONJUNCTION = 'and';

/** A slot's gate: its constraints and the world they are asked against. */
interface Gate {
  constraints: SlotConstraint;
  context: GrammarContext;
}

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

    // One of the language's all words at the item's start
    if (isAllWord(first)) {
      if (DEBUG) {
        console.log('Detected an all word, calling consumeAllSlot');
      }
      return this.consumeAllSlot(ctx, nextPatternToken, DEBUG);
    }

    // Items (names or pronouns) with "and" list detection
    return this.consumeEntityWithListDetection(ctx, DEBUG);
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
   * Consume one or more items ("X", "X and Y", "it and the box"), each a
   * name or a whole-item pronoun, gated by the slot's constraints when it
   * has any.
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
    const gate: Gate | undefined =
      slotConstraints && slotConstraints.constraints.length > 0 && context.world
        ? { constraints: slotConstraints, context }
        : undefined;

    if (DEBUG) {
      console.log(`Consuming slot '${slotName}': gated=${!!gate}, constraints=${slotConstraints?.constraints?.length ?? 0}, world=${!!context.world}`);
    }

    // Main loop: consume an item, check for "and", repeat
    while (currentIndex < tokens.length) {
      if (isPatternDelimiter(tokens[currentIndex], nextPatternToken)) {
        break;
      }

      // The item's maximal span: up to the conjunction or the delimiter
      const span = this.itemSpan(tokens, currentIndex, nextPatternToken);
      if (span.length === 0) {
        break;
      }

      const consumed = this.consumeItem(span, tokens, gate, nextIsSlot && items.length === 0, DEBUG);
      if (!consumed) {
        if (DEBUG) {
          console.log(`Failed to consume slot '${slotName}' at '${tokens[currentIndex].word}'`);
        }
        return null;
      }
      items.push(...consumed.items);
      allTokens.push(...consumed.tokens);
      currentIndex += consumed.tokens.length;

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

    // One item is the slot's own match; several make a list whose items
    // carry their own splits, scopes and entity ids
    if (items.length === 1) {
      return { ...items[0], slotType };
    }

    const result: SlotMatch = {
      tokens: allTokens,
      text: this.wordsOf(allTokens, tokens),
      slotType,
      isList: true,
      items,
      ...(items.every((item) => item.isPronoun) ? { isPronoun: true } : {})
    };
    if (DEBUG) {
      console.log(`Consumed list slot with ${items.length} items: ${items.map(i => i.text).join(', ')}`);
    }
    return result;
  }

  /**
   * Consume one item from its maximal span: a whole-item pronoun with a
   * referent, else a name. Returns the item matches (a plural pronoun gives
   * several) and the tokens consumed, or null when the gate refuses.
   *
   * @param span The item's maximal token indices
   * @param tokens The input tokens
   * @param gate The slot's gate, when constrained
   * @param shortest Consecutive slots: take the shortest content span the gate
   *   admits (with no gate, the first content word), so the next slot gets the rest
   */
  private consumeItem(
    span: number[],
    tokens: Token[],
    gate: Gate | undefined,
    shortest: boolean,
    DEBUG: boolean
  ): { items: SlotMatch[]; tokens: number[] } | null {
    const first = tokens[span[0]];

    // A recognised pronoun is a pronoun only as the whole item (ADR-385
    // D6): alone, or followed by a word that opens a new noun phrase
    // (`give her the key`). Followed by a noun word it is a determiner
    // (`her key`) and the name path below splits it.
    if (isRecognizedPronoun(first.normalized) && (span.length === 1 || startsNounPhrase(tokens[span[1]]))) {
      const referents = getPronounContextManager()?.resolve(first.normalized);
      if (referents && referents.length > 0) {
        if (DEBUG) {
          console.log(`Pronoun '${first.normalized}' resolved to: ${referents.map(r => r.entityId).join(', ')}`);
        }
        // The pronoun's entity must be one the slot's base admits, or the
        // slot fails exactly as a name would
        if (gate && !referents.every((ref) => this.admitsEntity(ref.entityId, gate))) {
          return null;
        }
        const items: SlotMatch[] = referents.map((ref) => ({
          tokens: [span[0]],
          text: ref.text,
          entityId: ref.entityId,
          resolvedText: ref.text,
          isPronoun: true
        }));
        return { items, tokens: [span[0]] };
      }
      // No referent yet ("take it" before anything was mentioned): the word
      // is tried as a name
      if (DEBUG) {
        console.log(`Pronoun '${first.normalized}' has no referent, trying it as a name`);
      }
    }

    if (shortest) {
      // The shortest content span the gate admits, after the leading articles
      // and determiners; with no gate, the first content word only
      const split = splitLeadingWords(span, tokens);
      const prefix = span.slice(0, span.length - split.content.length);
      if (!gate) {
        const item = this.itemMatch([...prefix, split.content[0]], tokens);
        return { items: [item], tokens: item.tokens };
      }
      for (let n = 1; n <= split.content.length; n++) {
        const item = this.itemMatch([...prefix, ...split.content.slice(0, n)], tokens);
        const admitted = this.admittedFor(item, gate);
        if (admitted.length > 0) {
          return { items: [{ ...item, scope: admitted }], tokens: item.tokens };
        }
      }
      return null;
    }

    const item = this.itemMatch(span, tokens);
    if (!gate) {
      return { items: [item], tokens: item.tokens };
    }
    const admitted = this.admittedFor(item, gate);
    if (admitted.length === 0) {
      return null;
    }
    return { items: [{ ...item, scope: admitted }], tokens: item.tokens };
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
    const split = splitLeadingWords(span, tokens);
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

  /** The scope constraints a gate's builders describe. */
  private scopesOf(gate: Gate) {
    // ADR-231 D2a Amendment 1: `.where()` takes a ScopeConstraintBuilder and
    // nothing else, so every constraint here is a scope-builder callback.
    return gate.constraints.constraints.map((constraint) => (constraint as ScopeConstraintBuilder)(new ScopeBuilderImpl()).build());
  }

  /**
   * The ids of the entities the gate admits for an item: those in any
   * constraint's scope base that the one noun matcher names (ADR-385 D3).
   * @returns The admitted ids, each once; empty when the gate refuses
   */
  private admittedFor(item: SlotMatch, gate: Gate): string[] {
    const query = { text: this.contentTextOf(item), articles: item.articles ?? [] };
    const admitted: string[] = [];
    for (const scope of this.scopesOf(gate)) {
      for (const entity of GrammarScopeResolver.findEntitiesByName(query, scope, gate.context)) {
        if (!admitted.includes(entity.id)) admitted.push(entity.id);
      }
    }
    if (process.env.PARSER_DEBUG === 'true') {
      console.log(`Gate for "${query.text}": admitted ${admitted.length} (${admitted.join(', ')})`);
    }
    return admitted;
  }

  /** Whether any constraint's scope base holds the entity (a pronoun's referent, ADR-385 D6). */
  private admitsEntity(entityId: string, gate: Gate): boolean {
    return this.scopesOf(gate).some((scope) =>
      GrammarScopeResolver.getEntitiesInScope(scope, gate.context).some((e) => e.id === entityId)
    );
  }
}
