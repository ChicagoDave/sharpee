/**
 * Tests for event sorting in TextService
 *
 * Verifies that events within a transaction are sorted correctly for prose:
 * 1. action.* events first
 * 2. Then by chainDepth (lower first)
 *
 * @see ADR-094 Event Chaining
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextService } from '../src/text-service';
import type { ISemanticEvent } from '@sharpee/core';
import type { TextServiceContext } from '@sharpee/if-services';

/**
 * Create a mock event with chain metadata
 */
function createEvent(
  type: string,
  transactionId?: string,
  chainDepth?: number,
  additionalData: Record<string, unknown> = {}
): ISemanticEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data: {
      ...(transactionId ? { _transactionId: transactionId } : {}),
      ...(chainDepth !== undefined ? { _chainDepth: chainDepth } : {}),
      ...additionalData,
    },
  };
}

/**
 * Create a mock TextServiceContext that returns specific events
 */
function createMockContext(events: ISemanticEvent[]): TextServiceContext {
  return {
    getCurrentTurnEvents: () => events,
  } as TextServiceContext;
}

describe('TextService Event Sorting', () => {
  let textService: TextService;

  beforeEach(() => {
    textService = new TextService();
  });

  describe('sortEventsForProse', () => {
    it('should put action.* events before other events in same transaction', () => {
      const events = [
        createEvent('if.event.opened', 'txn-1', 0),
        createEvent('action.success', 'txn-1', 0, { message: 'You open the chest.' }),
        createEvent('if.event.revealed', 'txn-1', 1, { message: 'Inside you see a sword.' }),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      // action.success should come first in output
      expect(blocks.length).toBe(2); // action.success + if.event.revealed
      expect(blocks[0].content[0]).toBe('You open the chest.');
      expect(blocks[1].content[0]).toBe('Inside you see a sword.');
    });

    it('should sort by chainDepth within same transaction (lower depth first)', () => {
      const events = [
        createEvent('if.event.revealed', 'txn-1', 2, { message: 'Depth 2 event.' }),
        createEvent('if.event.revealed', 'txn-1', 1, { message: 'Depth 1 event.' }),
        createEvent('action.success', 'txn-1', 0, { message: 'Action result.' }),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      expect(blocks.length).toBe(3);
      expect(blocks[0].content[0]).toBe('Action result.');
      expect(blocks[1].content[0]).toBe('Depth 1 event.');
      expect(blocks[2].content[0]).toBe('Depth 2 event.');
    });

    it('should maintain order across different transactions', () => {
      const events = [
        createEvent('action.success', 'txn-1', 0, { message: 'First action.' }),
        createEvent('if.event.revealed', 'txn-1', 1, { message: 'First revealed.' }),
        createEvent('action.success', 'txn-2', 0, { message: 'Second action.' }),
        createEvent('if.event.revealed', 'txn-2', 1, { message: 'Second revealed.' }),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      expect(blocks.length).toBe(4);
      expect(blocks[0].content[0]).toBe('First action.');
      expect(blocks[1].content[0]).toBe('First revealed.');
      expect(blocks[2].content[0]).toBe('Second action.');
      expect(blocks[3].content[0]).toBe('Second revealed.');
    });

    it('should handle events without transactionId', () => {
      const events = [
        createEvent('action.success', undefined, undefined, { message: 'No txn action.' }),
        createEvent('if.event.revealed', undefined, undefined, { message: 'No txn revealed.' }),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      // Should maintain original order when no transactionId
      expect(blocks.length).toBe(2);
      expect(blocks[0].content[0]).toBe('No txn action.');
      expect(blocks[1].content[0]).toBe('No txn revealed.');
    });

    it('should handle mixed events (some with transactionId, some without)', () => {
      const events = [
        createEvent('if.event.revealed', 'txn-1', 1, { message: 'With txn (chained).' }),
        createEvent('action.success', undefined, undefined, { message: 'No txn.' }),
        createEvent('action.success', 'txn-1', 0, { message: 'With txn (action).' }),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      // txn-1 events should be sorted together (action before revealed)
      // No-txn events maintain relative position
      expect(blocks.length).toBe(3);
      // Events without txn don't sort relative to events with txn
      expect(blocks.map((b) => b.content[0])).toContain('With txn (action).');
      expect(blocks.map((b) => b.content[0])).toContain('With txn (chained).');
      expect(blocks.map((b) => b.content[0])).toContain('No txn.');
    });
  });

  describe('processTurn with realistic container scenario', () => {
    it('should produce correct prose order for "open chest" scenario', () => {
      // Simulating: Player types "open chest"
      // Engine emits events in this order:
      // 1. if.event.opened (state change, depth 0)
      // 2. if.event.revealed (chained from opened, depth 1)
      // 3. action.success (action result, depth 0)
      const events = [
        createEvent('if.event.opened', 'txn-open-chest', 0, {
          targetId: 'chest',
          targetName: 'wooden chest',
        }),
        createEvent('if.event.revealed', 'txn-open-chest', 1, {
          _chainedFrom: 'if.event.opened',
          containerId: 'chest',
          containerName: 'wooden chest',
          items: [
            { entityId: 'sword', name: 'a gleaming sword' },
            { entityId: 'key', name: 'a rusty key' },
          ],
        }),
        createEvent('action.success', 'txn-open-chest', 0, {
          message: 'You open the wooden chest.',
        }),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      // Expected prose order:
      // 1. "You open the wooden chest." (action.success)
      // 2. "Inside the wooden chest you see..." (if.event.revealed)
      // Note: if.event.opened produces no output (state event)

      expect(blocks.length).toBe(2);
      expect(blocks[0].content[0]).toBe('You open the wooden chest.');
      expect(blocks[1].content[0]).toContain('wooden chest');
      expect(blocks[1].content[0]).toContain('gleaming sword');
    });
  });

  describe('state change events', () => {
    it('should skip if.event.opened (state change event)', () => {
      const events = [
        createEvent('if.event.opened', 'txn-1', 0, {
          targetId: 'chest',
          targetName: 'wooden chest',
        }),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      expect(blocks.length).toBe(0);
    });

    it('should skip if.event.closed (state change event)', () => {
      const events = [createEvent('if.event.closed', 'txn-1', 0)];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      expect(blocks.length).toBe(0);
    });

    it('should skip if.event.locked (state change event)', () => {
      const events = [createEvent('if.event.locked', 'txn-1', 0)];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      expect(blocks.length).toBe(0);
    });
  });

  describe('system events', () => {
    it('should skip system.* events', () => {
      const events = [
        createEvent('system.turn.start', undefined, undefined),
        createEvent('action.success', 'txn-1', 0, { message: 'You do something.' }),
        createEvent('system.turn.end', undefined, undefined),
      ];

      textService.initialize(createMockContext(events));
      const blocks = textService.processTurn();

      expect(blocks.length).toBe(1);
      expect(blocks[0].content[0]).toBe('You do something.');
    });
  });
});
