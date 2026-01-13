// packages/world-model/tests/unit/world/event-chaining.test.ts
// Tests for event chaining (ADR-094)

import { WorldModel, ChainEventOptions, EventChainHandler } from '../../../src/world/WorldModel';
import { ISemanticEvent } from '@sharpee/core';
import { IEventProcessorWiring } from '@sharpee/if-domain';

describe('Event Chaining (ADR-094)', () => {
  let world: WorldModel;
  let mockWiring: IEventProcessorWiring;
  let registeredHandlers: Map<string, ((event: ISemanticEvent) => unknown[])[]>;

  beforeEach(() => {
    world = new WorldModel();
    registeredHandlers = new Map();

    // Create mock wiring that collects handlers
    mockWiring = {
      registerHandler: (eventType: string, handler: (event: ISemanticEvent) => unknown[]) => {
        if (!registeredHandlers.has(eventType)) {
          registeredHandlers.set(eventType, []);
        }
        registeredHandlers.get(eventType)!.push(handler);
      }
    };
  });

  // Helper to create a test event
  function createTestEvent(type: string, data: any = {}): ISemanticEvent {
    return {
      id: `test-${Date.now()}`,
      type,
      timestamp: Date.now(),
      entities: {},
      data
    };
  }

  // Helper to invoke all handlers for an event type and collect results
  function invokeHandlers(eventType: string, event: ISemanticEvent): ISemanticEvent[] {
    const handlers = registeredHandlers.get(eventType) || [];
    const results: ISemanticEvent[] = [];
    for (const handler of handlers) {
      results.push(...(handler(event) as ISemanticEvent[]));
    }
    return results;
  }

  describe('basic chain registration', () => {
    it('should register a chain handler', () => {
      const handler: EventChainHandler = (event, world) => ({
        id: 'chained-1',
        type: 'if.event.chained',
        timestamp: Date.now(),
        entities: {},
        data: { sourceId: event.id }
      });

      world.chainEvent('if.event.trigger', handler);
      world.connectEventProcessor(mockWiring);

      expect(registeredHandlers.has('if.event.trigger')).toBe(true);
    });

    it('should invoke chain handler and return events', () => {
      world.chainEvent('if.event.opened', (event, world) => ({
        type: 'if.event.revealed',
        data: { containerId: event.data.targetId }
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', { targetId: 'chest-1' });
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(1);
      expect(chainedEvents[0].type).toBe('if.event.revealed');
      expect(chainedEvents[0].data.containerId).toBe('chest-1');
    });

    it('should return empty array when handler returns null', () => {
      world.chainEvent('if.event.opened', (event, world) => null);
      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', { targetId: 'chest-1' });
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(0);
    });

    it('should return empty array when handler returns undefined', () => {
      world.chainEvent('if.event.opened', (event, world) => undefined);
      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', { targetId: 'chest-1' });
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(0);
    });

    it('should handle handler returning multiple events', () => {
      world.chainEvent('if.event.opened', (event, world) => [
        { type: 'if.event.revealed', data: { itemId: 'item-1' } },
        { type: 'if.event.revealed', data: { itemId: 'item-2' } }
      ]);

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', { targetId: 'chest-1' });
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(2);
      expect(chainedEvents[0].data.itemId).toBe('item-1');
      expect(chainedEvents[1].data.itemId).toBe('item-2');
    });
  });

  describe('cascade mode (default)', () => {
    it('should fire all cascaded chains', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.first',
        data: {}
      }));

      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.second',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(2);
      expect(chainedEvents.map(e => e.type)).toContain('if.event.first');
      expect(chainedEvents.map(e => e.type)).toContain('if.event.second');
    });
  });

  describe('override mode', () => {
    it('should replace all existing chains', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.first',
        data: {}
      }));

      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.second',
        data: {}
      }));

      // Override replaces both previous chains
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.override',
        data: {}
      }), { mode: 'override' });

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(1);
      expect(chainedEvents[0].type).toBe('if.event.override');
    });
  });

  describe('keyed chains', () => {
    it('should replace chain with same key', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.original',
        data: {}
      }), { key: 'stdlib.reveal' });

      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.replacement',
        data: {}
      }), { key: 'stdlib.reveal' });

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(1);
      expect(chainedEvents[0].type).toBe('if.event.replacement');
    });

    it('should not replace chain with different key', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.first',
        data: {}
      }), { key: 'stdlib.reveal' });

      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.second',
        data: {}
      }), { key: 'story.trap' });

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(2);
    });
  });

  describe('priority ordering', () => {
    it('should execute chains in priority order (lower first)', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.high',
        data: {}
      }), { priority: 200 });

      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.low',
        data: {}
      }), { priority: 50 });

      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.default',
        data: {}
      })); // default priority: 100

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(3);
      expect(chainedEvents[0].type).toBe('if.event.low');
      expect(chainedEvents[1].type).toBe('if.event.default');
      expect(chainedEvents[2].type).toBe('if.event.high');
    });
  });

  describe('chain metadata', () => {
    it('should add _chainedFrom to data', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect((chainedEvents[0].data as any)._chainedFrom).toBe('if.event.opened');
    });

    it('should add _chainSourceId to data', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      triggerEvent.id = 'source-event-123';
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect((chainedEvents[0].data as any)._chainSourceId).toBe('source-event-123');
    });

    it('should track _chainDepth', () => {
      world.chainEvent('if.event.first', (event) => ({
        type: 'if.event.second',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.first', {});
      const chainedEvents = invokeHandlers('if.event.first', triggerEvent);

      expect((chainedEvents[0].data as any)._chainDepth).toBe(1);
    });

    it('should increment _chainDepth for nested chains', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      // Simulate an event that's already been chained (depth 3)
      const triggerEvent = createTestEvent('if.event.opened', { _chainDepth: 3 });
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect((chainedEvents[0].data as any)._chainDepth).toBe(4);
    });

    it('should pass through _transactionId from trigger event (ADR-094)', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      // Trigger event has a transactionId (assigned by Engine)
      const triggerEvent = createTestEvent('if.event.opened', { _transactionId: 'txn-abc-123' });
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect((chainedEvents[0].data as any)._transactionId).toBe('txn-abc-123');
    });

    it('should not add _transactionId if trigger event lacks it', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      // Trigger event without transactionId
      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect((chainedEvents[0].data as any)._transactionId).toBeUndefined();
    });
  });

  describe('chain depth limit', () => {
    it('should skip events that exceed max chain depth', () => {
      world.chainEvent('if.event.deep', (event) => ({
        type: 'if.event.deeper',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      // Simulate an event at max depth (10)
      const triggerEvent = createTestEvent('if.event.deep', { _chainDepth: 10 });
      const chainedEvents = invokeHandlers('if.event.deep', triggerEvent);

      // Should be empty because depth would exceed 10
      expect(chainedEvents).toHaveLength(0);
    });

    it('should allow events at depth 9', () => {
      world.chainEvent('if.event.deep', (event) => ({
        type: 'if.event.deeper',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.deep', { _chainDepth: 9 });
      const chainedEvents = invokeHandlers('if.event.deep', triggerEvent);

      expect(chainedEvents).toHaveLength(1);
      expect((chainedEvents[0].data as any)._chainDepth).toBe(10);
    });
  });

  describe('registration before connectEventProcessor', () => {
    it('should wire chains registered before connection', () => {
      // Register chain BEFORE connecting
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      // Then connect
      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(1);
    });
  });

  describe('registration after connectEventProcessor', () => {
    it('should wire chains registered after connection', () => {
      // Connect first
      world.connectEventProcessor(mockWiring);

      // Then register chain
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents).toHaveLength(1);
    });
  });

  describe('world.clear()', () => {
    it('should clear all registered chains', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      world.clear();

      // Re-connect after clear
      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      // Should be empty because chains were cleared
      expect(chainedEvents).toHaveLength(0);
    });
  });

  describe('event enrichment', () => {
    it('should auto-generate id if not provided', () => {
      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
        // No id provided
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents[0].id).toBeDefined();
      expect(chainedEvents[0].id).toMatch(/^chain-/);
    });

    it('should use provided id if given', () => {
      world.chainEvent('if.event.opened', (event) => ({
        id: 'my-custom-id',
        type: 'if.event.revealed',
        timestamp: Date.now(),
        entities: {},
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents[0].id).toBe('my-custom-id');
    });

    it('should auto-generate timestamp if not provided', () => {
      const beforeTime = Date.now();

      world.chainEvent('if.event.opened', (event) => ({
        type: 'if.event.revealed',
        data: {}
      }));

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      const afterTime = Date.now();

      expect(chainedEvents[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(chainedEvents[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('access to world state', () => {
    it('should provide world access in chain handler', () => {
      const room = world.createEntity('Test Room', 'room');

      world.chainEvent('if.event.opened', (event, w) => {
        const entity = w.getEntity(room.id);
        return {
          type: 'if.event.revealed',
          data: { foundEntity: entity?.id }
        };
      });

      world.connectEventProcessor(mockWiring);

      const triggerEvent = createTestEvent('if.event.opened', {});
      const chainedEvents = invokeHandlers('if.event.opened', triggerEvent);

      expect(chainedEvents[0].data.foundEntity).toBe(room.id);
    });
  });
});
