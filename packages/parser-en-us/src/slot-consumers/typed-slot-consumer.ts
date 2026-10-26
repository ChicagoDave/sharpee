/**
 * @file Typed Slot Consumer
 * @description Reads typed value slots (ADR-088, ADR-082): a number, an
 *   ordinal, a time and a direction. An ordinal, time or direction slot has
 *   one reading, the one token its vocabulary reads; a number slot admits
 *   every span from its start the language reads as one number, longest
 *   first (ADR-386 D1, D8).
 *
 * Public interface: TypedSlotConsumer.
 * Owner context: parser-en-us slot consumers.
 */

import { SlotType, type SlotMatch } from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext, type SlotConsumeResult } from './slot-consumer.js';
import { spanText } from './noun-phrase-split.js';

/**
 * Consumer for typed value slots (NUMBER, ORDINAL, TIME, DIRECTION)
 */
export class TypedSlotConsumer implements SlotConsumer {
  readonly slotTypes = [
    SlotType.NUMBER,
    SlotType.ORDINAL,
    SlotType.TIME,
    SlotType.DIRECTION
  ];

  consume(ctx: SlotConsumerContext): SlotConsumeResult {
    if (ctx.slotType === SlotType.NUMBER) {
      return this.consumeNumber(ctx);
    }
    const match = this.matchOne(ctx);
    return match ? { readings: [match] } : null;
  }

  /** The one match the slot's vocabulary reads at the start token, or null. */
  private matchOne(ctx: SlotConsumerContext): SlotMatch | null {
    const { slotType } = ctx;

    switch (slotType) {
      case SlotType.ORDINAL:
        return this.consumeOrdinal(ctx);
      case SlotType.TIME:
        return this.consumeTime(ctx);
      case SlotType.DIRECTION:
        return this.consumeDirection(ctx);
      default:
        return null;
    }
  }

  /**
   * A number slot: every span from the start that the language reads as one
   * number (`25`, `twenty`, `twenty five`, `twenty-five`), longest first
   * (ADR-386 D8). A compound is at most two words, so two spans are tried.
   */
  private consumeNumber(ctx: SlotConsumerContext): SlotConsumeResult {
    const { tokens, startIndex } = ctx;
    const readings: SlotMatch[] = [];
    for (let end = Math.min(tokens.length, startIndex + 2); end > startIndex; end--) {
      const span: number[] = [];
      for (let i = startIndex; i < end; i++) span.push(i);
      if (ctx.language.parseCardinal(span.map((i) => tokens[i].normalized)) === null) continue;
      readings.push({ tokens: span, text: spanText(span, tokens), slotType: SlotType.NUMBER });
    }
    return readings.length > 0 ? { readings } : null;
  }

  /**
   * Consume an ordinal slot
   * Matches ordinal words (first, second) or suffixed numbers (1st, 2nd)
   */
  private consumeOrdinal(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // The language's ordinal words (ADR-387 D1)
    if (normalized in ctx.language.getOrdinalNumbers()) {
      return {
        tokens: [startIndex],
        text: token.word,
        slotType: SlotType.ORDINAL
      };
    }

    // Check suffixed number form (1st, 2nd, 3rd, 4th, etc.)
    const ordinalMatch = normalized.match(/^(\d+)(st|nd|rd|th)$/);
    if (ordinalMatch) {
      return {
        tokens: [startIndex],
        text: token.word,
        slotType: SlotType.ORDINAL
      };
    }

    return null;
  }

  /**
   * Consume a time slot
   * Matches HH:MM format (10:40, 6:00)
   */
  private consumeTime(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;

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
          slotType: SlotType.TIME
        };
      }
    }

    return null;
  }

  /**
   * Consume a direction slot: one token that is a word or abbreviation of the
   * language's direction table (ADR-387 D5).
   */
  private consumeDirection(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, words } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    if (words.directions.has(normalized)) {
      return {
        tokens: [startIndex],
        text: token.word,
        slotType: SlotType.DIRECTION
      };
    }

    return null;
  }
}
