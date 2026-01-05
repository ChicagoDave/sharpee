/**
 * @file Slot Consumer Registry
 * @description Registry for slot consumption strategies (ADR-088)
 */

import { SlotType, SlotMatch } from '@sharpee/if-domain';
import { SlotConsumer, SlotConsumerContext } from './slot-consumer';
import { EntitySlotConsumer } from './entity-slot-consumer';
import { TextSlotConsumer } from './text-slot-consumer';
import { TypedSlotConsumer } from './typed-slot-consumer';
import { VocabularySlotConsumer } from './vocabulary-slot-consumer';

export { SlotConsumer, SlotConsumerContext, getNextPatternToken, isPatternDelimiter } from './slot-consumer';
export { EntitySlotConsumer } from './entity-slot-consumer';
export { TextSlotConsumer } from './text-slot-consumer';
export { TypedSlotConsumer } from './typed-slot-consumer';
export { VocabularySlotConsumer } from './vocabulary-slot-consumer';

/**
 * Registry for slot consumers
 * Maps slot types to their consumer implementations
 */
export class SlotConsumerRegistry {
  private consumers: Map<SlotType, SlotConsumer> = new Map();

  /**
   * Register a consumer for its declared slot types
   */
  register(consumer: SlotConsumer): void {
    for (const type of consumer.slotTypes) {
      this.consumers.set(type, consumer);
    }
  }

  /**
   * Check if a consumer is registered for a slot type
   */
  hasConsumer(slotType: SlotType): boolean {
    return this.consumers.has(slotType);
  }

  /**
   * Consume tokens for a slot type
   * @param ctx The consumption context
   * @returns SlotMatch if successful, null if no match
   * @throws Error if no consumer registered for the slot type
   */
  consume(ctx: SlotConsumerContext): SlotMatch | null {
    const consumer = this.consumers.get(ctx.slotType);
    if (!consumer) {
      throw new Error(`No consumer registered for slot type: ${ctx.slotType}`);
    }
    return consumer.consume(ctx);
  }

  /**
   * Get all registered slot types
   */
  getRegisteredTypes(): SlotType[] {
    return Array.from(this.consumers.keys());
  }
}

/**
 * Create a default registry with all standard consumers
 * This will be populated as consumers are extracted
 */
export function createDefaultRegistry(): SlotConsumerRegistry {
  const registry = new SlotConsumerRegistry();
  // ADR-088: All slot consumers extracted
  registry.register(new EntitySlotConsumer());
  registry.register(new TextSlotConsumer());
  registry.register(new TypedSlotConsumer());
  registry.register(new VocabularySlotConsumer());
  return registry;
}
