import { 
  SemanticEventSource, 
  createSemanticEventSource,
  SemanticEvent 
} from '../../src/events';

describe('SemanticEventSource', () => {
  let eventSource: SemanticEventSource;
  
  beforeEach(() => {
    eventSource = createSemanticEventSource();
  });

  describe('Event Storage', () => {
    it('should store and retrieve events', () => {
      const event1: SemanticEvent = {
        id: 'evt1',
        type: 'action.take',
        timestamp: Date.now(),
        entities: { actor: 'player', target: 'item1' }
      };
      
      const event2: SemanticEvent = {
        id: 'evt2',
        type: 'action.move',
        timestamp: Date.now(),
        entities: { actor: 'player', location: 'room2' }
      };
      
      eventSource.addEvent(event1);
      eventSource.addEvent(event2);
      
      const allEvents = eventSource.getAllEvents();
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0]).toEqual(event1);
      expect(allEvents[1]).toEqual(event2);
    });

    it('should clear all events', () => {
      eventSource.addEvent({
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      });
      
      expect(eventSource.getAllEvents()).toHaveLength(1);
      
      eventSource.clearEvents();
      
      expect(eventSource.getAllEvents()).toHaveLength(0);
    });
  });

  describe('Event Queries', () => {
    const testEvents: SemanticEvent[] = [
      {
        id: 'evt1',
        type: 'action.take',
        timestamp: Date.now(),
        entities: { actor: 'player', target: 'sword' },
        tags: ['item', 'action']
      },
      {
        id: 'evt2',
        type: 'action.move',
        timestamp: Date.now(),
        entities: { actor: 'player', location: 'castle' },
        tags: ['movement']
      },
      {
        id: 'evt3',
        type: 'action.take',
        timestamp: Date.now(),
        entities: { actor: 'npc1', target: 'key' },
        tags: ['item', 'action']
      },
      {
        id: 'evt4',
        type: 'system.save',
        timestamp: Date.now(),
        entities: {},
        tags: ['system']
      }
    ];
    
    beforeEach(() => {
      testEvents.forEach(event => eventSource.addEvent(event));
    });

    it('should filter events by type', () => {
      const takeEvents = eventSource.getEventsByType('action.take');
      expect(takeEvents).toHaveLength(2);
      expect(takeEvents[0].id).toBe('evt1');
      expect(takeEvents[1].id).toBe('evt3');
    });

    it('should filter events by entity', () => {
      const playerEvents = eventSource.getEventsByEntity('player');
      expect(playerEvents).toHaveLength(2);
      expect(playerEvents[0].id).toBe('evt1');
      expect(playerEvents[1].id).toBe('evt2');
      
      const swordEvents = eventSource.getEventsByEntity('sword');
      expect(swordEvents).toHaveLength(1);
      expect(swordEvents[0].id).toBe('evt1');
    });

    it('should filter events by tag', () => {
      const itemEvents = eventSource.getEventsByTag('item');
      expect(itemEvents).toHaveLength(2);
      expect(itemEvents[0].id).toBe('evt1');
      expect(itemEvents[1].id).toBe('evt3');
      
      const systemEvents = eventSource.getEventsByTag('system');
      expect(systemEvents).toHaveLength(1);
      expect(systemEvents[0].id).toBe('evt4');
    });

    it('should support custom filters', () => {
      const recentEvents = eventSource.filter(
        event => event.timestamp > Date.now() - 1000
      );
      expect(recentEvents).toHaveLength(4); // All should be recent
      
      const npcEvents = eventSource.filter(
        event => event.entities.actor?.startsWith('npc')
      );
      expect(npcEvents).toHaveLength(1);
      expect(npcEvents[0].id).toBe('evt3');
    });
  });

  describe('Event Emission', () => {
    it('should emit events to subscribers', () => {
      const receivedEvents: SemanticEvent[] = [];
      
      eventSource.subscribe(event => receivedEvents.push(event));
      
      const event: SemanticEvent = {
        id: 'test1',
        type: 'test.event',
        timestamp: Date.now(),
        entities: {}
      };
      
      eventSource.addEvent(event);
      
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toEqual(event);
    });

    it('should support EventEmitter interface', () => {
      const emitter = eventSource.getEmitter();
      const takeEvents: SemanticEvent[] = [];
      const allEvents: SemanticEvent[] = [];
      
      // Listen for specific event type
      emitter.on('action.take', event => takeEvents.push(event));
      
      // Listen for all events
      emitter.on('*', event => allEvents.push(event));
      
      eventSource.addEvent({
        id: 'evt1',
        type: 'action.take',
        timestamp: Date.now(),
        entities: {}
      });
      
      eventSource.addEvent({
        id: 'evt2',
        type: 'action.move',
        timestamp: Date.now(),
        entities: {}
      });
      
      expect(takeEvents).toHaveLength(1);
      expect(takeEvents[0].id).toBe('evt1');
      
      expect(allEvents).toHaveLength(2);
    });

    it('should handle emitter unsubscribe', () => {
      const emitter = eventSource.getEmitter();
      const events: SemanticEvent[] = [];
      const listener = (event: SemanticEvent) => events.push(event);
      
      emitter.on('test', listener);
      
      eventSource.addEvent({
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      });
      
      expect(events).toHaveLength(1);
      
      emitter.off('test', listener);
      
      eventSource.addEvent({
        id: 'evt2',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      });
      
      expect(events).toHaveLength(1); // Should not receive second event
    });
  });

  describe('Event Processing', () => {
    it('should track unprocessed events', () => {
      eventSource.addEvent({
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      });
      
      eventSource.addEvent({
        id: 'evt2',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      });
      
      const unprocessed1 = eventSource.getUnprocessedEvents();
      expect(unprocessed1).toHaveLength(2);
      
      eventSource.addEvent({
        id: 'evt3',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      });
      
      const unprocessed2 = eventSource.getUnprocessedEvents();
      expect(unprocessed2).toHaveLength(1);
      expect(unprocessed2[0].id).toBe('evt3');
    });

    it('should get events since a specific event', () => {
      const events: SemanticEvent[] = [
        { id: 'evt1', type: 'test', timestamp: 1, entities: {} },
        { id: 'evt2', type: 'test', timestamp: 2, entities: {} },
        { id: 'evt3', type: 'test', timestamp: 3, entities: {} },
        { id: 'evt4', type: 'test', timestamp: 4, entities: {} }
      ];
      
      events.forEach(e => eventSource.addEvent(e));
      
      const sinceEvt2 = eventSource.getEventsSince('evt2');
      expect(sinceEvt2).toHaveLength(2);
      expect(sinceEvt2[0].id).toBe('evt3');
      expect(sinceEvt2[1].id).toBe('evt4');
      
      // Non-existent event ID returns all
      const sinceUnknown = eventSource.getEventsSince('unknown');
      expect(sinceUnknown).toHaveLength(4);
      
      // No event ID returns all
      const sinceNone = eventSource.getEventsSince();
      expect(sinceNone).toHaveLength(4);
    });
  });

  describe('Entity Relationships', () => {
    it('should find events by any entity role', () => {
      const complexEvent: SemanticEvent = {
        id: 'complex1',
        type: 'action.give',
        timestamp: Date.now(),
        entities: {
          actor: 'player',
          target: 'npc1',
          instrument: 'gold',
          location: 'tavern',
          others: ['witness1', 'witness2']
        }
      };
      
      eventSource.addEvent(complexEvent);
      
      // Should find by each entity role
      expect(eventSource.getEventsByEntity('player')).toHaveLength(1);
      expect(eventSource.getEventsByEntity('npc1')).toHaveLength(1);
      expect(eventSource.getEventsByEntity('gold')).toHaveLength(1);
      expect(eventSource.getEventsByEntity('tavern')).toHaveLength(1);
      expect(eventSource.getEventsByEntity('witness1')).toHaveLength(1);
      expect(eventSource.getEventsByEntity('witness2')).toHaveLength(1);
      
      // Should not find non-existent entity
      expect(eventSource.getEventsByEntity('unknown')).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    // Mock console.error for these tests
    const originalConsoleError = console.error;
    let consoleErrorMock: jest.Mock;
    
    beforeEach(() => {
      consoleErrorMock = jest.fn();
      console.error = consoleErrorMock;
    });
    
    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('should handle errors in event emitter listeners', () => {
      const emitter = eventSource.getEmitter();
      
      emitter.on('test', () => {
        throw new Error('Listener error');
      });
      
      emitter.on('test', () => {
        // This should still run
      });
      
      expect(() => {
        eventSource.addEvent({
          id: 'evt1',
          type: 'test',
          timestamp: Date.now(),
          entities: {}
        });
      }).not.toThrow();
      
      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Error in event listener for test:',
        expect.any(Error)
      );
    });
  });
});
