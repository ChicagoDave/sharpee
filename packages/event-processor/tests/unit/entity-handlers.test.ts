/**
 * Unit tests for event handler invocation
 *
 * Entity `on` handlers were removed in ISSUE-068 — these tests verify
 * that the EventProcessor correctly handles events with/without targets
 * and delegates to story-level handlers (ADR-075).
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { WorldModel } from '@sharpee/world-model';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import { IFEvents } from '@sharpee/if-domain';
import { SemanticEvent } from '@sharpee/core';

describe('Event Handler Invocation', () => {
  let mockWorld: MockWorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    mockWorld = createMockWorld();
    processor = new EventProcessor(mockWorld as unknown as WorldModel);
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
