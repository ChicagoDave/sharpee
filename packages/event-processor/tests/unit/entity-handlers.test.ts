/**
 * Unit tests for ADR-052 Entity Handler Invocation
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import { IFEvents } from '@sharpee/if-domain';
import { SemanticEvent } from '@sharpee/core';

describe('Entity Handler Invocation (ADR-052)', () => {
  let mockWorld: MockWorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    mockWorld = createMockWorld();
    processor = new EventProcessor(mockWorld as any);
  });

  describe('invokeEntityHandlers', () => {
    it('should invoke entity handler when event has target with handler', () => {
      const handlerFn = vi.fn();

      // Create entity with handler
      mockWorld.addMockEntity('book', {
        id: 'book',
        on: {
          [IFEvents.PUSHED]: handlerFn
        }
      });

      // Create push event targeting the book
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

      expect(handlerFn).toHaveBeenCalledTimes(1);
      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IFEvents.PUSHED,
          entities: expect.objectContaining({ target: 'book' })
        })
      );
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

    it('should collect reaction events returned by handler', () => {
      const reactionEvent: SemanticEvent = {
        id: 'reaction-1',
        type: 'secret_door.revealed',
        entities: {
          target: 'secret-door'
        },
        data: { message: 'The bookshelf swings open!' },
        timestamp: Date.now()
      };

      // Handler returns a reaction event
      const handlerFn = vi.fn().mockReturnValue([reactionEvent]);

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

      const result = processor.processEvents([pushEvent]);

      // Reaction should be in the results
      expect(result.reactions).toContainEqual(reactionEvent);
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

    it('should pass event data to handler', () => {
      const handlerFn = vi.fn();

      mockWorld.addMockEntity('rug', {
        id: 'rug',
        on: {
          [IFEvents.PUSHED]: handlerFn
        }
      });

      const pushEvent: SemanticEvent = {
        id: 'test-push-1',
        type: IFEvents.PUSHED,
        entities: {
          actor: 'player',
          target: 'rug'
        },
        data: {
          direction: 'north',
          force: 'gentle'
        },
        timestamp: Date.now()
      };

      processor.processEvents([pushEvent]);

      expect(handlerFn).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            direction: 'north',
            force: 'gentle'
          }
        })
      );
    });
  });
});
