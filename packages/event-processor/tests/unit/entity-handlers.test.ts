/**
 * Unit tests for event handler invocation
 *
 * Entity `on` handlers were removed in ISSUE-068 — these tests verify
 * that the EventProcessor correctly handles events with/without targets
 * and delegates to story-level handlers (ADR-075).
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import { IFEvents } from '@sharpee/if-domain';
import { SemanticEvent } from '@sharpee/core';

describe('Event Handler Invocation', () => {
  let mockWorld: MockWorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    mockWorld = createMockWorld();
    processor = new EventProcessor(mockWorld as any);
  });

  describe('invokeEntityHandlers', () => {
    it('should not invoke entity on handler (removed in ISSUE-068)', () => {
      const handlerFn = vi.fn();

      // Entity has an on handler, but dispatch is removed
      mockWorld.addMockEntity('book', {
        id: 'book',
        on: {
          [IFEvents.PUSHED]: handlerFn
        }
      });

      const pushEvent: SemanticEvent = {
        id: 'test-push-1',
        type: IFEvents.PUSHED,
        entities: {
          actor: 'player',
          target: 'book'
        },
        data: {},
        timestamp: Date.now()
      };

      processor.processEvents([pushEvent]);

      // Entity on handlers are no longer invoked
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should not invoke handler when event has no target', () => {
      const handlerFn = vi.fn();

      mockWorld.addMockEntity('book', {
        id: 'book',
        on: {
          [IFEvents.PUSHED]: handlerFn
        }
      });

      // Event without target
      const lookEvent: SemanticEvent = {
        id: 'test-look-1',
        type: 'player.looked',
        entities: {
          actor: 'player',
          location: 'room1'
        },
        data: {},
        timestamp: Date.now()
      };

      processor.processEvents([lookEvent]);

      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should not invoke handler when entity has no handler for event type', () => {
      const handlerFn = vi.fn();

      // Entity has handler for PUSHED but not PULLED
      mockWorld.addMockEntity('lever', {
        id: 'lever',
        on: {
          [IFEvents.PUSHED]: handlerFn
        }
      });

      // Pull event targeting the lever
      const pullEvent: SemanticEvent = {
        id: 'test-pull-1',
        type: IFEvents.PULLED,
        entities: {
          actor: 'player',
          target: 'lever'
        },
        data: {},
        timestamp: Date.now()
      };

      processor.processEvents([pullEvent]);

      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('should handle handler returning void', () => {
      // Handler returns nothing
      const handlerFn = vi.fn();

      mockWorld.addMockEntity('button', {
        id: 'button',
        on: {
          [IFEvents.PUSHED]: handlerFn
        }
      });

      const pushEvent: SemanticEvent = {
        id: 'test-push-1',
        type: IFEvents.PUSHED,
        entities: {
          actor: 'player',
          target: 'button'
        },
        data: {},
        timestamp: Date.now()
      };

      const result = processor.processEvents([pushEvent]);

      expect(result.applied).toHaveLength(1);
      expect(result.reactions).toHaveLength(0);
    });

    it('should handle handler throwing error gracefully', () => {
      const handlerFn = vi.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      mockWorld.addMockEntity('trap', {
        id: 'trap',
        on: {
          [IFEvents.PUSHED]: handlerFn
        }
      });

      const pushEvent: SemanticEvent = {
        id: 'test-push-1',
        type: IFEvents.PUSHED,
        entities: {
          actor: 'player',
          target: 'trap'
        },
        data: {},
        timestamp: Date.now()
      };

      // Should not throw, just log the error
      const result = processor.processEvents([pushEvent]);

      expect(result.applied).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });

    it('should not invoke handler when entity does not exist', () => {
      // Event targets nonexistent entity
      const pushEvent: SemanticEvent = {
        id: 'test-push-1',
        type: IFEvents.PUSHED,
        entities: {
          actor: 'player',
          target: 'nonexistent'
        },
        data: {},
        timestamp: Date.now()
      };

      // Should not throw
      const result = processor.processEvents([pushEvent]);

      expect(result.applied).toHaveLength(1);
    });

  });
});
