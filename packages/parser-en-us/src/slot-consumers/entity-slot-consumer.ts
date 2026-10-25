/**
 * @file Entity Slot Consumer
 * @description Reads entity and instrument slots: single nouns, lists ("X and
 *   Y", ADR-088), all phrases ("all", "all but X") and pronouns (ADR-089).
 *   It returns every extent the slot could take from its start, longest first
 *   (ADR-386 D1); the engine's search chooses among them. Every item has its
 *   leading articles and determiners split once (ADR-385 D2); a constrained
 *   slot admits an extent only when the gate names something for each of its
 *   items and records the admitted ids on the item (D3, D4); a pronoun is a
 *   whole item, may be a list item, and passes the same gate (D6).
 *
 * Public interface: EntitySlotConsumer.
 * Owner context: parser-en-us slot consumers.
 */

import {
  SlotType,
  type SlotMatch,
  type SlotConstraint,
  type Token,
  type GrammarContext,
  ScopeBuilderImpl,
  type ScopeConstraintBuilder
} from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext, isSlotRefusal, type SlotConsumeResult, type SlotRefusal } from './slot-consumer.js';
import { GrammarScopeResolver } from '../grammar-scope-resolver.js';
import { isRecognizedPronoun, getPronounContextManager } from '../pronoun-context.js';
import type { RequiredScope } from '../parse-failure.js';
import { isAllWord, isExceptWord, splitLeadingWords, startsNounPhrase } from './noun-phrase-split.js';

/** The list conjunction. English, until the language owns its word lists (step 7). */
const LIST_CONJUNCTION = 'and';

/** A slot's gate: its constraints and the world they are asked against. */
interface Gate {
  constraints: SlotConstraint;
  context: GrammarContext;
}

/** The token indices from `start` up to but not including `end`. */
const range = (start: number, end: number): number[] => {
  const out: number[] = [];
  for (let i = start; i < end; i++) out.push(i);
  return out;
};

/**
 * Consumer for entity slots (ENTITY, INSTRUMENT)
 * Handles multi-object parsing: "all", "all but X", "X and Y"
 */
export class EntitySlotConsumer implements SlotConsumer {
  readonly slotTypes = [SlotType.ENTITY, SlotType.INSTRUMENT];

  consume(ctx: SlotConsumerContext): SlotConsumeResult {
    const { tokens, startIndex } = ctx;
    if (startIndex >= tokens.length) {
      return null;
    }
    if (isAllWord(tokens[startIndex])) {
      return this.allReadings(ctx);
    }
    return this.itemReadings(ctx);
  }

  /** The slot's gate, when it is constrained and a world is there to ask. */
  private gateOf(ctx: SlotConsumerContext): Gate | undefined {
    const constraints = ctx.rule.slots.get(ctx.slotName);
    return constraints && constraints.constraints.length > 0 && ctx.context.world
      ? { constraints, context: ctx.context }
      : undefined;
  }

  /**
   * The readings of an all phrase: the all word, the noun words that may
   * follow it ("all coins"), and an optional except word with its exclusions
   * ("all but X and Y"), at every extent from the longest down to the bare
   * all word. The match's `determiners` lead with the all word, so the
   * parser's split leaves the noun words as the phrase's content.
   */
  private allReadings(ctx: SlotConsumerContext): SlotConsumeResult {
    const { tokens, startIndex, slotType } = ctx;
    const allWord = tokens[startIndex];
    const readings: SlotMatch[] = [];

    for (let end = tokens.length; end > startIndex; end--) {
      const rest = range(startIndex + 1, end);
      const exceptAt = rest.findIndex((i) => isExceptWord(tokens[i]));
      const nounSpan = exceptAt >= 0 ? rest.slice(0, exceptAt) : rest;
      if (nounSpan.some((i) => tokens[i].normalized === LIST_CONJUNCTION || isExceptWord(tokens[i]))) continue;

      let excluded: SlotMatch[] | undefined;
      if (exceptAt >= 0) {
        const exclusionSpans = this.splitItems(rest.slice(exceptAt + 1), tokens);
        if (!exclusionSpans) continue;
        excluded = exclusionSpans.map((span) => this.itemMatch(span, tokens));
      }

      const split = nounSpan.length > 0 ? splitLeadingWords(nounSpan, tokens) : undefined;
      readings.push({
        tokens: range(startIndex, end),
        text: [allWord, ...nounSpan.map((i) => tokens[i])].map((t) => t.word).join(' '),
        slotType,
        articles: split?.articles ?? [],
        determiners: [allWord.normalized, ...(split?.determiners ?? [])],
        ...(split?.ownedByActor ? { ownedByActor: true } : {}),
        isAll: true,
        ...(excluded ? { excluded } : {})
      });
    }

    return readings.length > 0 ? { readings } : null;
  }

  /**
   * The readings of one or more items ("X", "X and Y", "it and the box"):
   * every span from the start, longest first, each split at the conjunction
   * into items that are each a name or a whole-item pronoun, gated by the
   * slot's constraints when it has any. When a gate refuses every extent, the
   * refusal for the longest span is returned (ADR-385 D8).
   */
  private itemReadings(ctx: SlotConsumerContext): SlotConsumeResult {
    const { tokens, startIndex, slotType } = ctx;
    const gate = this.gateOf(ctx);
    const readings: SlotMatch[] = [];
    let refusal: SlotRefusal | undefined;

    for (let end = tokens.length; end > startIndex; end--) {
      const span = range(startIndex, end);
      const itemSpans = this.splitItems(span, tokens);
      if (!itemSpans) continue;

      const items: SlotMatch[] = [];
      let refused: SlotRefusal | undefined;
      let notAnItem = false;
      for (const itemSpan of itemSpans) {
        const consumed = this.consumeItem(itemSpan, tokens, gate);
        if (consumed === null) {
          notAnItem = true;
          break;
        }
        if (isSlotRefusal(consumed)) {
          refused = consumed;
          break;
        }
        items.push(...consumed);
      }
      if (notAnItem) continue;
      if (refused) {
        refusal ??= refused;
        continue;
      }
      readings.push(this.matchOf(span, items, tokens, slotType));
    }

    if (readings.length > 0) return { readings };
    return refusal ?? null;
  }

  /** One item is the slot's own match; several make a list whose items carry their own splits, scopes and entity ids. */
  private matchOf(span: number[], items: SlotMatch[], tokens: Token[], slotType: SlotType): SlotMatch {
    if (items.length === 1) {
      return { ...items[0], slotType };
    }
    return {
      tokens: span,
      text: this.wordsOf(span, tokens),
      slotType,
      isList: true,
      items,
      ...(items.every((item) => item.isPronoun) ? { isPronoun: true } : {})
    };
  }

  /**
   * Split a span at the list conjunction into item spans.
   * @returns The item spans, or null when a part is empty (a leading,
   *   trailing or doubled conjunction), which no extent reads
   */
  private splitItems(span: number[], tokens: Token[]): number[][] | null {
    const parts: number[][] = [[]];
    for (const i of span) {
      if (tokens[i].normalized === LIST_CONJUNCTION) {
        parts.push([]);
      } else {
        parts[parts.length - 1].push(i);
      }
    }
    return parts.some((part) => part.length === 0) ? null : parts;
  }

  /**
   * Read one item from its span: a whole-item pronoun with a referent, else
   * a name. Returns the item matches (a plural pronoun gives several), the
   * gate's refusal with its reason (ADR-385 D8), or null when the span is not
   * an item at all (a pronoun with a referent followed by the words of a new
   * noun phrase, which the one-token span already reads).
   */
  private consumeItem(span: number[], tokens: Token[], gate: Gate | undefined): SlotMatch[] | SlotRefusal | null {
    const first = tokens[span[0]];

    // A recognised pronoun is a pronoun only as the whole item (ADR-385
    // D6): alone, or followed by a word that opens a new noun phrase
    // (`give her the key`). Followed by a noun word it is a determiner
    // (`her key`) and the name path below splits it.
    if (isRecognizedPronoun(first.normalized)) {
      const referents = getPronounContextManager()?.resolve(first.normalized);
      if (referents && referents.length > 0) {
        if (span.length > 1) {
          if (startsNounPhrase(tokens[span[1]])) return null;
        } else {
          // The pronoun's entity must be one the slot's base admits, or the
          // slot fails exactly as a name would: a scope violation naming it
          if (gate) {
            const outside = referents.find((ref) => !this.admitsEntity(ref.entityId, gate));
            if (outside) {
              return this.refuse(gate, outside.entityId);
            }
          }
          return referents.map((ref) => ({
            tokens: [span[0]],
            text: ref.text,
            entityId: ref.entityId,
            resolvedText: ref.text,
            isPronoun: true
          }));
        }
      }
      // No referent yet ("take it" before anything was mentioned): the word
      // is tried as a name
    }

    const item = this.itemMatch(span, tokens);
    if (!gate) {
      return [item];
    }
    const admitted = this.admittedFor(item, gate);
    if (admitted.length === 0) {
      return this.refusalFor(item, gate);
    }
    return [{ ...item, scope: admitted }];
  }

  /**
   * The gate's refusal of a named item (ADR-385 D8): the matcher is asked
   * once more over everything the actor can see. A name found is a scope
   * violation naming that entity and the base the slot required; nothing
   * found is NO_MATCH naming the phrase's content words.
   */
  private refusalFor(item: SlotMatch, gate: Gate): SlotRefusal {
    const query = { text: this.contentTextOf(item), articles: item.articles ?? [] };
    const inView = GrammarScopeResolver.findEntitiesByName(query, new ScopeBuilderImpl().visible().build(), gate.context);
    if (inView.length > 0) {
      return this.refuse(gate, inView[0].id);
    }
    return { refused: true, failure: { reason: 'NO_MATCH', unknownWord: query.text } };
  }

  /** A scope violation: the entity found, and the base the slot's first constraint required. */
  private refuse(gate: Gate, entityId: string): SlotRefusal {
    return { refused: true, failure: { reason: 'SCOPE_VIOLATION', entityId, requiredScope: this.requiredScopeOf(gate) } };
  }

  /** The base the slot required, as the language words it: carried, touchable, or visible for every other base. */
  private requiredScopeOf(gate: Gate): RequiredScope {
    const base = this.scopesOf(gate)[0]?.base;
    return base === 'carried' || base === 'touchable' ? base : 'visible';
  }

  /** A slot match for one item span, its leading articles and determiners split off. */
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
