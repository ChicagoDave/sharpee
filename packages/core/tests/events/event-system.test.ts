import { createEvent } from '../../src/events/event-system';
import { ISemanticEvent } from '../../src/events/types';

describe('Event System Helpers', () => {
  describe('createEvent', () => {
    it('should create a basic event with required fields', () => {
      const event = createEvent('test.event', { value: 42 });

      expect(event).toMatchObject({
        type: 'test.event',
        payload: { value: 42 }
      });
      expect(event.id).toBeDefined();
      expect(typeof event.id).toBe('string');
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe('number');
      expect(event.entities).toEqual({});
    });

    it('should include entity information', () => {
      const entities = {
        actor: 'player',
        target: 'door',
        location: 'hallway'
      };

      const event = createEvent(
        'action.open',
        { force: true },
        entities
      );

      expect(event.entities).toEqual(entities);
    });

    it('should include metadata', () => {
      const metadata = {
        priority: 5,
        source: 'user-input',
        sessionId: 'abc123'
      };

      const event = createEvent(
        'system.command',
        { command: 'save' },
        {},
        metadata
      );

      expect(event.priority).toBe(5);
      expect(event.metadata).toEqual({
        source: 'user-input',
        sessionId: 'abc123'
      });
    });

    it('should handle empty payload', () => {
      const event = createEvent('heartbeat', {});
      expect(event.payload).toEqual({});
    });

    it('should generate unique IDs', () => {
      const events = Array.from({ length: 100 }, () => 
        createEvent('test', {})
      );

      const ids = events.map(e => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(100);
    });

    it('should generate increasing timestamps', () => {
      const event1 = createEvent('test', {});
      
      // Small delay to ensure different timestamp
      const delay = new Promise(resolve => setTimeout(resolve, 10));
      
      return delay.then(() => {
        const event2 = createEvent('test', {});
        expect(event2.timestamp).toBeGreaterThan(event1.timestamp);
      });
    });

    it('should handle complex payloads', () => {
      const complexPayload = {
        nested: {
          deeply: {
            value: [1, 2, 3],
            map: new Map([['key', 'value']])
          }
        },
        array: ['a', 'b', 'c'],
        number: 42,
        boolean: true,
        nullValue: null
      };

      const event = createEvent('complex.event', complexPayload);
      expect(event.payload).toEqual(complexPayload);
    });

    it('should set narrate flag from metadata', () => {
      const event = createEvent(
        'narrative.event',
        { text: 'Something happened' },
        {},
        { narrate: true }
      );

      expect(event.narrate).toBe(true);
    });

    it('should set tags from metadata', () => {
      const tags = ['important', 'player-action', 'combat'];
      const event = createEvent(
        'combat.hit',
        { damage: 10 },
        {},
        { tags }
      );

      expect(event.tags).toEqual(tags);
    });

    it('should handle all entity types', () => {
      const entities = {
        actor: 'player',
        target: 'enemy',
        instrument: 'sword',
        location: 'arena',
        others: ['witness1', 'witness2']
      };

      const event = createEvent('combat.attack', {}, entities);
      
      expect(event.entities).toEqual(entities);
    });

    it('should support legacy data property', () => {
      const event = createEvent('legacy.event', { old: 'data' });
      
      // Both payload and data should be set
      expect(event.payload).toEqual({ old: 'data' });
      expect(event.data).toEqual({ old: 'data' });
    });

    it('should create events suitable for the semantic event source', () => {
      const event = createEvent(
        'item.taken',
        { itemName: 'Golden Key' },
        { actor: 'player', target: 'key-001', location: 'dungeon' },
        { narrate: true, priority: 10 }
      );

      // Verify it matches SemanticEvent interface
      const semanticEvent: ISemanticEvent = event;
      
      expect(semanticEvent.type).toBe('item.taken');
      expect(semanticEvent.entities.actor).toBe('player');
      expect(semanticEvent.entities.target).toBe('key-001');
      expect(semanticEvent.narrate).toBe(true);
      expect(semanticEvent.priority).toBe(10);
    });
  });

  describe('Event ID Format', () => {
    it('should follow expected ID pattern', () => {
      const event = createEvent('test', {});
      
      // IDs should be like: evt_1234567890123_456
      expect(event.id).toMatch(/^evt_\d+_\d+$/);
      
      const parts = event.id.split('_');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('evt');
      expect(parseInt(parts[1])).toBeGreaterThan(0);
      expect(parseInt(parts[2])).toBeGreaterThan(0);
    });
  });

  describe('Integration with StandardEventTypes', () => {
    it('should create standard narrative events', async () => {
      // Import StandardEventTypes to verify integration
      const { StandardEventTypes } = await import('../../src/events/standard-events');
      
      const event = createEvent(
        StandardEventTypes.NARRATIVE,
        { message: 'The door creaks open.' },
        { location: 'haunted-mansion' }
      );

      expect(event.type).toBe('narrative');
      expect(event.payload?.message).toBe('The door creaks open.');
    });

    it('should create standard error events', async () => {
      const { StandardEventTypes } = await import('../../src/events/standard-events');
      
      const event = createEvent(
        StandardEventTypes.ERROR,
        { 
          code: 'INVALID_TARGET',
          message: 'Cannot find that object.' 
        },
        { actor: 'player' }
      );

      expect(event.type).toBe('error');
      expect(event.payload?.code).toBe('INVALID_TARGET');
    });
  });
});
