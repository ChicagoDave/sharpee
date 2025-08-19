import { 
  IDebugEvent, 
  IDebugContext, 
  DebugEventTypes,
  DebugEventCallback 
} from '../../src/debug/types';
import { vi } from 'vitest';

describe('Debug Types', () => {
  describe('DebugEvent Structure', () => {
    it('should define correct debug event structure', () => {
      const debugEvent: IDebugEvent = {
        id: 'debug_123',
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'token_analysis',
        data: { tokens: ['take', 'sword'] }
      };

      expect(debugEvent.id).toBe('debug_123');
      expect(debugEvent.subsystem).toBe('parser');
      expect(debugEvent.type).toBe('token_analysis');
      expect(debugEvent.data).toEqual({ tokens: ['take', 'sword'] });
    });

    it('should support all subsystem types', () => {
      const subsystems: IDebugEvent['subsystem'][] = [
        'parser',
        'validator', 
        'executor',
        'world-model',
        'text-service'
      ];

      subsystems.forEach(subsystem => {
        const event: IDebugEvent = {
          id: `test_${subsystem}`,
          timestamp: Date.now(),
          subsystem,
          type: 'test',
          data: {}
        };

        expect(event.subsystem).toBe(subsystem);
      });
    });
  });

  describe('DebugContext', () => {
    it('should define debug context with optional emit', () => {
      const contextWithoutEmit: IDebugContext = {
        enabled: true
      };

      expect(contextWithoutEmit.enabled).toBe(true);
      expect(contextWithoutEmit.emit).toBeUndefined();
    });

    it('should support debug callback', () => {
      const events: IDebugEvent[] = [];
      const callback: DebugEventCallback = (event) => {
        events.push(event);
      };

      const context: IDebugContext = {
        enabled: true,
        emit: callback
      };

      // Simulate emitting a debug event
      const testEvent: IDebugEvent = {
        id: 'test_001',
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'test',
        data: { test: true }
      };

      context.emit!(testEvent);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toBe(testEvent);
    });

    it('should handle disabled context', () => {
      const context: IDebugContext = {
        enabled: false,
        emit: vi.fn()
      };

      // Component would check enabled flag before emitting
      if (context.enabled && context.emit) {
        context.emit({} as IDebugEvent);
      }

      expect(context.emit).not.toHaveBeenCalled();
    });
  });

  describe('DebugEventTypes Constants', () => {
    it('should define parser debug event types', () => {
      expect(DebugEventTypes.parser).toEqual({
        TOKEN_ANALYSIS: 'token_analysis',
        PATTERN_MATCH: 'pattern_match',
        CANDIDATE_SCORING: 'candidate_scoring'
      });
    });

    it('should define validator debug event types', () => {
      expect(DebugEventTypes.validator).toEqual({
        ENTITY_RESOLUTION: 'entity_resolution',
        SCOPE_CHECK: 'scope_check',
        AMBIGUITY_RESOLUTION: 'ambiguity_resolution',
        VALIDATION_ERROR: 'validation_error'
      });
    });

    it('should define executor debug event types', () => {
      expect(DebugEventTypes.executor).toEqual({
        ACTION_START: 'action_start',
        ACTION_COMPLETE: 'action_complete',
        ACTION_ERROR: 'action_error'
      });
    });

    it('should define world model debug event types', () => {
      expect(DebugEventTypes.worldModel).toEqual({
        ENTITY_CHANGE: 'entity_change',
        RELATION_CHANGE: 'relation_change',
        PROPERTY_CHANGE: 'property_change'
      });
    });

    it('should define text service debug event types', () => {
      expect(DebugEventTypes.textService).toEqual({
        TEMPLATE_SELECTION: 'template_selection',
        TEXT_GENERATION: 'text_generation',
        CHANNEL_ROUTING: 'channel_routing'
      });
    });
  });

  describe('Debug Event Usage Patterns', () => {
    it('should support parser debug flow', () => {
      const debugEvents: IDebugEvent[] = [];
      const context: IDebugContext = {
        enabled: true,
        emit: (event) => debugEvents.push(event)
      };

      // Simulate parser debug flow
      if (context.enabled && context.emit) {
        // Token analysis
        context.emit({
          id: 'parse_001',
          timestamp: Date.now(),
          subsystem: 'parser',
          type: DebugEventTypes.parser.TOKEN_ANALYSIS,
          data: {
            input: 'take the sword',
            tokens: ['take', 'the', 'sword']
          }
        });

        // Pattern matching
        context.emit({
          id: 'parse_002',
          timestamp: Date.now(),
          subsystem: 'parser',
          type: DebugEventTypes.parser.PATTERN_MATCH,
          data: {
            pattern: 'VERB ARTICLE NOUN',
            matched: true
          }
        });

        // Candidate scoring
        context.emit({
          id: 'parse_003',
          timestamp: Date.now(),
          subsystem: 'parser',
          type: DebugEventTypes.parser.CANDIDATE_SCORING,
          data: {
            candidates: [
              { action: 'take', score: 0.9 },
              { action: 'get', score: 0.7 }
            ]
          }
        });
      }

      expect(debugEvents).toHaveLength(3);
      expect(debugEvents[0].type).toBe('token_analysis');
      expect(debugEvents[1].type).toBe('pattern_match');
      expect(debugEvents[2].type).toBe('candidate_scoring');
    });

    it('should support collecting debug events from multiple subsystems', () => {
      const allEvents: IDebugEvent[] = [];
      const context: IDebugContext = {
        enabled: true,
        emit: (event) => allEvents.push(event)
      };

      // Parser event
      context.emit!({
        id: '001',
        timestamp: 1,
        subsystem: 'parser',
        type: 'parse_start',
        data: { input: 'test' }
      });

      // Validator event
      context.emit!({
        id: '002',
        timestamp: 2,
        subsystem: 'validator',
        type: DebugEventTypes.validator.ENTITY_RESOLUTION,
        data: { resolved: 'sword' }
      });

      // Executor event
      context.emit!({
        id: '003',
        timestamp: 3,
        subsystem: 'executor',
        type: DebugEventTypes.executor.ACTION_START,
        data: { action: 'take' }
      });

      // Can filter by subsystem
      const parserEvents = allEvents.filter(e => e.subsystem === 'parser');
      expect(parserEvents).toHaveLength(1);

      const validatorEvents = allEvents.filter(e => e.subsystem === 'validator');
      expect(validatorEvents).toHaveLength(1);
    });

    it('should generate debug event IDs', () => {
      // Example ID generator (not part of types, but shows usage)
      let counter = 0;
      const generateDebugId = (subsystem: string): string => {
        return `${subsystem}_${Date.now()}_${++counter}`;
      };

      const id1 = generateDebugId('parser');
      const id2 = generateDebugId('parser');
      
      expect(id1).toMatch(/^parser_\d+_1$/);
      expect(id2).toMatch(/^parser_\d+_2$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Type Safety', () => {
    it('should enforce subsystem types', () => {
      const validEvent: IDebugEvent = {
        id: 'test',
        timestamp: Date.now(),
        subsystem: 'parser',
        type: 'test',
        data: {}
      };

      // TypeScript would catch invalid subsystem at compile time
      // This test verifies the valid values work
      const subsystems: IDebugEvent['subsystem'][] = [
        'parser',
        'validator',
        'executor', 
        'world-model',
        'text-service'
      ];

      subsystems.forEach(subsystem => {
        const event: IDebugEvent = { ...validEvent, subsystem };
        expect(event.subsystem).toBe(subsystem);
      });
    });

    it('should allow any data type', () => {
      const stringData: IDebugEvent = {
        id: '1',
        timestamp: 1,
        subsystem: 'parser',
        type: 'test',
        data: 'simple string'
      };

      const objectData: IDebugEvent = {
        id: '2',
        timestamp: 2,
        subsystem: 'parser',
        type: 'test',
        data: { complex: { nested: true } }
      };

      const arrayData: IDebugEvent = {
        id: '3',
        timestamp: 3,
        subsystem: 'parser',
        type: 'test',
        data: [1, 2, 3]
      };

      expect(stringData.data).toBe('simple string');
      expect(objectData.data).toEqual({ complex: { nested: true } });
      expect(arrayData.data).toEqual([1, 2, 3]);
    });
  });
});
