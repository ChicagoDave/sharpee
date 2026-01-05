/**
 * @file Typed Slot Consumer
 * @description Handles typed value slots (ADR-088, ADR-082)
 */

import { SlotType, SlotMatch } from '@sharpee/if-domain';
import { cardinalNumbers, ordinalNumbers, directionMap } from '@sharpee/lang-en-us';
import { SlotConsumer, SlotConsumerContext } from './slot-consumer';

/**
 * Consumer for typed value slots (NUMBER, ORDINAL, TIME, DIRECTION)
 * Validates input matches expected format/vocabulary
 */
export class TypedSlotConsumer implements SlotConsumer {
  readonly slotTypes = [
    SlotType.NUMBER,
    SlotType.ORDINAL,
    SlotType.TIME,
    SlotType.DIRECTION
  ];

  consume(ctx: SlotConsumerContext): SlotMatch | null {
    const { slotType } = ctx;

    switch (slotType) {
      case SlotType.NUMBER:
        return this.consumeNumber(ctx);
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
   * Consume a number slot (integer)
   * Matches digits (1, 29, 100) or words (one, twenty)
   */
  private consumeNumber(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // Check word form (using imported vocabulary from lang-en-us)
    if (normalized in cardinalNumbers) {
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
  private consumeOrdinal(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // Check word form (using imported vocabulary from lang-en-us)
    if (normalized in ordinalNumbers) {
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
  private consumeDirection(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const normalized = token.normalized;

    // Check direction vocabulary (using imported vocabulary from lang-en-us)
    if (normalized in directionMap) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.DIRECTION
      };
    }

    return null;
  }
}
