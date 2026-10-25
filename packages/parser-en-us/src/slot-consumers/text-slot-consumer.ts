/**
 * @file Text Slot Consumer
 * @description Reads text capture slots (ADR-088): a single word, greedy text,
 *   quoted text and a topic. A span slot returns every extent to the end of
 *   the input, longest first (ADR-386 D1); the engine's search chooses.
 *
 * Public interface: TextSlotConsumer.
 * Owner context: parser-en-us slot consumers.
 */

import { SlotType, type SlotMatch, type Token } from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext, type SlotConsumeResult } from './slot-consumer.js';
import { splitLeadingWords } from './noun-phrase-split.js';

/**
 * Consumer for text slots (TEXT, TEXT_GREEDY, QUOTED_TEXT, TOPIC)
 * Captures raw text without entity resolution
 */
export class TextSlotConsumer implements SlotConsumer {
  readonly slotTypes = [
    SlotType.TEXT,
    SlotType.TEXT_GREEDY,
    SlotType.QUOTED_TEXT,
    SlotType.TOPIC
  ];

  consume(ctx: SlotConsumerContext): SlotConsumeResult {
    const { slotType } = ctx;

    switch (slotType) {
      case SlotType.TEXT:
        return this.one(this.consumeText(ctx));
      case SlotType.TEXT_GREEDY:
        return this.consumeGreedyText(ctx);
      case SlotType.QUOTED_TEXT:
        return this.one(this.consumeQuotedText(ctx));
      case SlotType.TOPIC:
        return this.consumeTopic(ctx);
      default:
        return null;
    }
  }

  /** A single match as the slot's one reading. */
  private one(match: SlotMatch | null): SlotConsumeResult {
    return match ? { readings: [match] } : null;
  }

  /** Every span from the start to each later end, longest first. */
  private spans(tokens: Token[], startIndex: number): number[][] {
    const out: number[][] = [];
    for (let end = tokens.length; end > startIndex; end--) {
      const span: number[] = [];
      for (let i = startIndex; i < end; i++) span.push(i);
      out.push(span);
    }
    return out;
  }

  /**
   * Consume a single token as raw text (no entity resolution)
   */
  private consumeText(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, slotType } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    return {
      tokens: [startIndex],
      text: token.word,
      slotType
    };
  }

  /**
   * Greedy text: every extent from the start to the end of the input
   */
  private consumeGreedyText(ctx: SlotConsumerContext): SlotConsumeResult {
    const { tokens, startIndex, slotType } = ctx;
    const readings = this.spans(tokens, startIndex).map((span) => ({
      tokens: span,
      text: span.map((i) => tokens[i].word).join(' '),
      slotType
    }));
    return readings.length > 0 ? { readings } : null;
  }

  /**
   * Consume a quoted text slot
   * Matches text enclosed in double quotes
   */
  private consumeQuotedText(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;

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
          slotType: SlotType.QUOTED_TEXT
        };
      }

      consumedWords.push(t.word);
    }

    // No closing quote found
    return null;
  }

  /**
   * A topic slot: every extent from the start, longest first. The text stays
   * verbatim (articles kept, ADR-231 D4); the leading articles and
   * determiners are also split once (ADR-385 D2) so the validator's
   * entity-first attempt reads content words.
   */
  private consumeTopic(ctx: SlotConsumerContext): SlotConsumeResult {
    const { tokens, startIndex } = ctx;
    const readings = this.spans(tokens, startIndex).map((span) => {
      const split = splitLeadingWords(span, tokens);
      return {
        tokens: span,
        text: span.map((i) => tokens[i].word).join(' '),
        slotType: SlotType.TOPIC,
        articles: split.articles,
        determiners: split.determiners,
        ...(split.ownedByActor ? { ownedByActor: true } : {})
      };
    });
    return readings.length > 0 ? { readings } : null;
  }
}
