import {
  createSystemEvent,
  isSystemEvent,
  Subsystems,
  SystemEvent
} from '../system-event';

describe('SystemEvent', () => {
  describe('createSystemEvent', () => {
    test('should create a basic system event', () => {
      const event = createSystemEvent(
        Subsystems.PARSER,
        'parse_attempt',
        { input: 'take ball' }
      );

      expect(event.subsystem).toBe('parser');
      expect(event.type).toBe('parse_attempt');
      expect(event.data).toEqual({ input: 'take ball' });
      expect(event.id).toMatch(/^sys_\d+_\d+$/);
      expect(event.timestamp).toBeCloseTo(Date.now(), -2);
    });

    test('should include optional fields', () => {
      const event = createSystemEvent(
        Subsystems.VALIDATOR,
        'validation_error',
        { error: 'Entity not found' },
        {
          severity: 'error',
          correlationId: 'cmd_123'
        }
      );

      expect(event.severity).toBe('error');
      expect(event.correlationId).toBe('cmd_123');
    });

    test('should generate unique IDs', () => {
      const event1 = createSystemEvent('test', 'type', {});
      const event2 = createSystemEvent('test', 'type', {});
      
      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('isSystemEvent', () => {
    test('should identify valid system events', () => {
      const validEvent: SystemEvent = {
        id: 'test_123',
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'test',
        data: {}
      };

      expect(isSystemEvent(validEvent)).toBe(true);
    });

    test('should reject invalid objects', () => {
      expect(isSystemEvent(null)).toBe(false);
      expect(isSystemEvent(undefined)).toBe(false);
      expect(isSystemEvent({})).toBe(false);
      expect(isSystemEvent({ id: 'test' })).toBe(false);
      expect(isSystemEvent({
        id: 'test',
        timestamp: Date.now(),
        // missing subsystem, type, data
      })).toBe(false);
    });

    test('should reject objects with wrong types', () => {
      expect(isSystemEvent({
        id: 123, // should be string
        timestamp: Date.now(),
        subsystem: 'test',
        type: 'test',
        data: {}
      })).toBe(false);
    });
  });

  describe('Subsystems constant', () => {
    test('should contain all expected subsystems', () => {
      expect(Subsystems.PARSER).toBe('parser');
      expect(Subsystems.VALIDATOR).toBe('validator');
      expect(Subsystems.EXECUTOR).toBe('executor');
      expect(Subsystems.WORLD_MODEL).toBe('world-model');
      expect(Subsystems.TEXT_SERVICE).toBe('text-service');
      expect(Subsystems.EVENT_PROCESSOR).toBe('event-processor');
      expect(Subsystems.RULE_ENGINE).toBe('rule-engine');
    });
  });

  describe('SystemEvent with GenericEventSource', () => {
    test('should work with event source', async () => {
      const { createEventSource } = await import('../event-source');
      const source = createEventSource<SystemEvent>();
      const handler = jest.fn();

      source.subscribe(handler);

      const event = createSystemEvent(
        Subsystems.PARSER,
        'test',
        { value: 42 }
      );

      source.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });
  });
});
