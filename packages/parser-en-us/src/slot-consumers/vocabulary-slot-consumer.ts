/**
 * @file Vocabulary Slot Consumer
 * @description Handles vocabulary-constrained slots (ADR-088, ADR-082)
 */

import { SlotType, SlotMatch, GrammarContext } from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext } from './slot-consumer';

/**
 * Built-in manner adverbs that modify how actions are performed.
 * Stories can extend this via vocab.extend('manner', [...])
 */
const MANNER_ADVERBS = new Set([
  'carefully', 'quietly', 'quickly', 'slowly',
  'forcefully', 'gently', 'loudly', 'softly',
  'cautiously', 'boldly', 'stealthily', 'silently',
  'hastily', 'deliberately', 'violently', 'tenderly'
]);

/**
 * Consumer for vocabulary-constrained slots (ADJECTIVE, NOUN, VOCABULARY, MANNER)
 * Validates input against registered vocabulary categories
 */
export class VocabularySlotConsumer implements SlotConsumer {
  readonly slotTypes = [
    SlotType.ADJECTIVE,
    SlotType.NOUN,
    SlotType.VOCABULARY,
    SlotType.MANNER
  ];

  consume(ctx: SlotConsumerContext): SlotMatch | null {
    const { slotType } = ctx;

    switch (slotType) {
      case SlotType.ADJECTIVE:
        return this.consumeAdjective(ctx);
      case SlotType.NOUN:
        return this.consumeNoun(ctx);
      case SlotType.VOCABULARY:
        return this.consumeVocabulary(ctx);
      case SlotType.MANNER:
        return this.consumeManner(ctx);
      default:
        return null;
    }
  }

  /**
   * Consume an adjective slot from story vocabulary
   * Requires vocabulary to be registered via language provider
   */
  private consumeAdjective(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, context } = ctx;

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
  private consumeNoun(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, context } = ctx;

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
   * Consume a vocabulary slot from a story-defined category.
   * Uses GrammarVocabularyProvider to check if word is in category
   * and if the category is active in the current context.
   */
  private consumeVocabulary(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, context, slotConstraints } = ctx;
    const category = slotConstraints?.vocabularyCategory;

    if (startIndex >= tokens.length || !category) {
      return null;
    }

    const token = tokens[startIndex];
    const word = token.normalized;

    // Get the vocabulary provider from the world
    const world = context.world;
    if (!world?.getGrammarVocabularyProvider) {
      return null;
    }

    const vocabProvider = world.getGrammarVocabularyProvider();

    // Check if word matches the category in current context
    if (vocabProvider.match(category, word, context)) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.VOCABULARY,
        // Store category and matched word for action access
        category,
        matchedWord: word
      };
    }

    return null;
  }

  /**
   * Consume a manner adverb slot.
   * Matches built-in manner adverbs plus any story-defined extensions.
   * The matched manner is intended to feed into command.intention.manner
   */
  private consumeManner(ctx: SlotConsumerContext): SlotMatch | null {
    const { tokens, startIndex, context } = ctx;

    if (startIndex >= tokens.length) {
      return null;
    }

    const token = tokens[startIndex];
    const word = token.normalized;

    // First check built-in manner adverbs
    if (MANNER_ADVERBS.has(word)) {
      return {
        tokens: [startIndex],
        text: token.word,
        confidence: 1.0,
        slotType: SlotType.MANNER,
        manner: word
      };
    }

    // Then check story-extended manner vocabulary
    const world = context.world;
    if (world?.getGrammarVocabularyProvider) {
      const vocabProvider = world.getGrammarVocabularyProvider();
      if (vocabProvider.match('manner', word, context)) {
        return {
          tokens: [startIndex],
          text: token.word,
          confidence: 1.0,
          slotType: SlotType.MANNER,
          manner: word
        };
      }
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
}
