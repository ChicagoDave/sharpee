/**
 * @file Text Slot Consumer
 * @description Handles text capture slots (ADR-088)
 */

import { SlotType, SlotMatch } from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext, getNextPatternToken, isPatternDelimiter } from './slot-consumer';

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

  consume(ctx: SlotConsumerContext): SlotMatch | null {
    const { slotType } = ctx;

    switch (slotType) {
      case SlotType.TEXT:
        return this.consumeText(ctx);
      case SlotType.TEXT_GREEDY:
        return this.consumeGreedyText(ctx);
      case SlotType.QUOTED_TEXT:
        return this.consumeQuotedText(ctx);
      case SlotType.TOPIC:
        return this.consumeTopic(ctx);
      default:
        return null;
    }
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
      confidence: 1.0,
      slotType
    };
  }

  /**
   * Consume tokens until next pattern element or end (greedy text)
   */
  private consumeGreedyText(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, slotType } = ctx;
    const nextPatternToken = getNextPatternToken(ctx);
    const consumedIndices: number[] = [];
    const consumedWords: string[] = [];

    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];

      // Check if this token matches the next pattern element (delimiter)
      if (isPatternDelimiter(token, nextPatternToken)) {
        break; // Stop - this token belongs to next pattern element
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
  private consumeTopic(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const nextPatternToken = getNextPatternToken(ctx);
    const consumedIndices: number[] = [];
    const consumedWords: string[] = [];

    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];

      // Check for pattern delimiter
      if (isPatternDelimiter(token, nextPatternToken)) {
        break;
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
}
