/**
 * Tests for the D4 reaction-narration partition (ADR-296, narrowing ADR-106).
 *
 * Overrides require something to override:
 *   - game.message targeting a messageless trigger → standalone phrase
 *     emission, default-stamped _narrativeSlot: 'afterRoomDescription'.
 *   - game.message targeting a trigger WITH a messageId → ADR-106 override,
 *     unchanged behavior (trigger's message replaced, reaction consumed).
 *   - game.message carrying _chainedFrom → always a phrase emission.
 *   - The multiple-message error branch counts only the override partition.
 *
 * All assertions are on emitted event data fields (messageId,
 * _narrativeSlot, _chainedFrom) per the project's "verify" bar.
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { WorldModel } from '@sharpee/world-model';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import type { Effect } from '../../src/effects';
import type { SemanticEvent } from '@sharpee/core';

function makeEvent(
  type: string,
  data: Record<string, unknown>,
  id = `test-${type}-${Math.random().toString(36).slice(2)}`
): SemanticEvent {
  return {
    id,
    type,
    entities: { actor: 'player', target: 'thing1' },
    data,
    timestamp: Date.now()
  };
}

function gameMessage(data: Record<string, unknown>): SemanticEvent {
  return makeEvent('game.message', data);
}

describe('EventProcessor - D4 partition (ADR-296)', () => {
  let mockWorld: MockWorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    mockWorld = createMockWorld();
    processor = new EventProcessor(mockWorld as unknown as WorldModel);
  });

  it('promotes a game.message targeting a messageless trigger to a standalone, default-slotted event', () => {
    const message = gameMessage({ messageId: 'story.thief.scream' });
    processor.registerHandler('if.event.actor_moved', () => {
      return [{ type: 'emit', event: message } as Effect];
    });

    // Bookkeeping trigger: no messageId in its data.
    const trigger = makeEvent('if.event.actor_moved', { toLocation: 'room2' });
    const result = processor.processEvents([trigger]);

    // The message stays in the reaction stream as its own event...
    const emitted = result.reactions.filter(r => r.type === 'game.message');
    expect(emitted).toHaveLength(1);
    expect((emitted[0].data as Record<string, unknown>).messageId).toBe('story.thief.scream');
    // ...default-stamped for slot placement (handler-produced, not chained).
    expect((emitted[0].data as Record<string, unknown>)._narrativeSlot).toBe('afterRoomDescription');
    // The trigger gained no injected messageId.
    expect((trigger.data as Record<string, unknown>).messageId).toBeUndefined();
  });

  it('still applies the ADR-106 override when the trigger has a messageId', () => {
    const message = gameMessage({ messageId: 'dungeo.mirror.rumble' });
    processor.registerHandler('if.event.touched', () => {
      return [{ type: 'emit', event: message } as Effect];
    });

    const trigger = makeEvent('if.event.touched', { messageId: 'if.touched.default' });
    const result = processor.processEvents([trigger]);

    // The trigger's messageId is REPLACED (not appended)...
    expect((trigger.data as Record<string, unknown>).messageId).toBe('dungeo.mirror.rumble');
    // ...and the override is consumed, not rendered standalone.
    expect(result.reactions.filter(r => r.type === 'game.message')).toHaveLength(0);
  });

  it('treats a _chainedFrom-stamped game.message as a phrase emission even when the trigger has a messageId', () => {
    const chained = gameMessage({
      messageId: 'story.carousel.entry',
      _chainedFrom: 'if.event.actor_moved',
      _narrativeSlot: 'afterRoomDescription'
    });
    processor.registerHandler('if.event.actor_moved', () => {
      return [{ type: 'emit', event: chained } as Effect];
    });

    const trigger = makeEvent('if.event.actor_moved', { messageId: 'if.moved.default' });
    const result = processor.processEvents([trigger]);

    // Trigger keeps its own message — no override happened.
    expect((trigger.data as Record<string, unknown>).messageId).toBe('if.moved.default');
    // The chained message is standalone and keeps its dispatch-time slot stamp.
    const emitted = result.reactions.filter(r => r.type === 'game.message');
    expect(emitted).toHaveLength(1);
    expect((emitted[0].data as Record<string, unknown>)._narrativeSlot).toBe('afterRoomDescription');
  });

  it('preserves an existing _narrativeSlot stamp instead of re-defaulting it', () => {
    const chained = gameMessage({
      messageId: 'story.trap.snaps',
      _chainedFrom: 'if.event.actor_moved',
      _narrativeSlot: 'afterEverything'
    });
    processor.registerHandler('if.event.actor_moved', () => {
      return [{ type: 'emit', event: chained } as Effect];
    });

    const trigger = makeEvent('if.event.actor_moved', {});
    const result = processor.processEvents([trigger]);

    const emitted = result.reactions.filter(r => r.type === 'game.message');
    expect(emitted).toHaveLength(1);
    expect((emitted[0].data as Record<string, unknown>)._narrativeSlot).toBe('afterEverything');
  });

  it('fires the multiple-message error branch only for the override partition', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // One override (messageId trigger, unchained) + one phrase (chained):
      // NOT an error — the phrase left the consumption set before the count.
      const override = gameMessage({ messageId: 'story.replacement' });
      const phrase = gameMessage({ messageId: 'story.aside', _chainedFrom: 'if.event.touched' });
      processor.registerHandler('if.event.touched', () => {
        return [
          { type: 'emit', event: override } as Effect,
          { type: 'emit', event: phrase } as Effect
        ];
      });

      const trigger = makeEvent('if.event.touched', { messageId: 'if.touched.default' });
      const result = processor.processEvents([trigger]);

      expect(result.reactions.filter(r => r.type === 'if.event.error')).toHaveLength(0);
      expect((trigger.data as Record<string, unknown>).messageId).toBe('story.replacement');
      const emitted = result.reactions.filter(r => r.type === 'game.message');
      expect(emitted).toHaveLength(1);
      expect((emitted[0].data as Record<string, unknown>).messageId).toBe('story.aside');
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('errors when two or more messages remain in the override partition', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const first = gameMessage({ messageId: 'story.first' });
      const second = gameMessage({ messageId: 'story.second' });
      processor.registerHandler('if.event.touched', () => {
        return [
          { type: 'emit', event: first } as Effect,
          { type: 'emit', event: second } as Effect
        ];
      });

      const trigger = makeEvent('if.event.touched', { messageId: 'if.touched.default' });
      const result = processor.processEvents([trigger]);

      // Error event appended, carrying the override count.
      const errors = result.reactions.filter(r => r.type === 'if.event.error');
      expect(errors).toHaveLength(1);
      expect((errors[0].data as Record<string, unknown>).count).toBe(2);
      // First override still applied to the trigger.
      expect((trigger.data as Record<string, unknown>).messageId).toBe('story.first');
      // Both overrides consumed — neither renders standalone.
      expect(result.reactions.filter(r => r.type === 'game.message')).toHaveLength(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
