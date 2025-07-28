/**
 * Tests for Types
 */

import {
  GameEvent,
  SequencedEvent,
  TurnResult,
  GameContext,
  EngineConfig,
  GameState,
  TimingData
} from '../src/types';
import { IFEntity, WorldModel, IdentityTrait } from '@sharpee/world-model';

describe('Types', () => {
  describe('GameEvent', () => {
    it('should create valid game event', () => {
      const event: GameEvent = {
        type: 'test.event',
        data: {
          value: 42,
          message: 'Test'
        }
      };
      
      expect(event.type).toBe('test.event');
      expect(event.data).toEqual({ value: 42, message: 'Test' });
    });

    it('should support optional metadata', () => {
      const event: GameEvent = {
        type: 'test.event',
        data: {},
        metadata: {
          source: 'player',
          priority: 'high',
          custom: 'value'
        }
      };
      
      expect(event.metadata).toBeDefined();
      expect(event.metadata?.source).toBe('player');
    });

    it('should handle empty data', () => {
      const event: GameEvent = {
        type: 'empty.event',
        data: {}
      };
      
      expect(event.data).toEqual({});
    });
  });

  describe('SequencedEvent', () => {
    it('should extend GameEvent with sequencing data', () => {
      const event: SequencedEvent = {
        type: 'sequenced.event',
        data: { test: true },
        sequence: 12345,
        timestamp: new Date(),
        turn: 5,
        scope: 'turn'
      };
      
      expect(event.sequence).toBe(12345);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.turn).toBe(5);
      expect(event.scope).toBe('turn');
    });

    it('should support different scopes', () => {
      const scopes: SequencedEvent['scope'][] = ['turn', 'global', 'system'];
      
      scopes.forEach(scope => {
        const event: SequencedEvent = {
          type: 'test',
          data: {},
          sequence: 1,
          timestamp: new Date(),
          turn: 1,
          scope
        };
        
        expect(event.scope).toBe(scope);
      });
    });

    it('should support optional source', () => {
      const event: SequencedEvent = {
        type: 'test',
        data: {},
        sequence: 1,
        timestamp: new Date(),
        turn: 1,
        scope: 'turn',
        source: 'player-action'
      };
      
      expect(event.source).toBe('player-action');
    });
  });

  describe('TurnResult', () => {
    it('should create valid turn result', () => {
      const result: TurnResult = {
        turn: 1,
        input: 'look around',
        success: true,
        events: []
      };
      
      expect(result.turn).toBe(1);
      expect(result.input).toBe('look around');
      expect(result.success).toBe(true);
      expect(result.events).toEqual([]);
    });

    it('should include timing data when provided', () => {
      const timing: TimingData = {
        parsing: 5,
        execution: 15,
        processing: 3,
        total: 23
      };
      
      const result: TurnResult = {
        turn: 2,
        input: 'take key',
        success: true,
        events: [],
        timing
      };
      
      expect(result.timing).toEqual(timing);
    });

    it('should include error for failed turns', () => {
      const result: TurnResult = {
        turn: 3,
        input: 'invalid command',
        success: false,
        events: [],
        error: 'Unknown command: invalid'
      };
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown command: invalid');
    });

    it('should handle events array', () => {
      const events: SequencedEvent[] = [
        {
          type: 'event1',
          data: {},
          sequence: 1,
          timestamp: new Date(),
          turn: 1,
          scope: 'turn'
        },
        {
          type: 'event2',
          data: {},
          sequence: 2,
          timestamp: new Date(),
          turn: 1,
          scope: 'turn'
        }
      ];
      
      const result: TurnResult = {
        turn: 1,
        input: 'test',
        success: true,
        events
      };
      
      expect(result.events).toHaveLength(2);
      expect(result.events).toBe(events);
    });
  });

  describe('GameContext', () => {
    it('should create valid game context', () => {
      const world = new WorldModel();
      const player = world.createEntity('player', 'Player');
      player.add(new IdentityTrait({ name: 'Player' }));
      
      const context: GameContext = {
        currentTurn: 1,
        player,
        history: [],
        metadata: {
          started: new Date(),
          lastPlayed: new Date()
        }
      };
      
      expect(context.currentTurn).toBe(1);
      expect(context.player).toBe(player);
      expect(context.history).toEqual([]);
      expect(context.metadata.started).toBeInstanceOf(Date);
    });

    it('should support optional metadata fields', () => {
      const world = new WorldModel();
      const player = world.createEntity('player', 'Player');
      
      const context: GameContext = {
        currentTurn: 10,
        player,
        history: [],
        metadata: {
          started: new Date(),
          lastPlayed: new Date(),
          title: 'Test Game',
          author: 'Test Author',
          version: '1.0.0',
          custom: 'value'
        }
      };
      
      expect(context.metadata.title).toBe('Test Game');
      expect(context.metadata.author).toBe('Test Author');
      expect(context.metadata.version).toBe('1.0.0');
    });

    it('should maintain turn history', () => {
      const world = new WorldModel();
      const player = world.createEntity('player', 'Player');
      
      const history: TurnResult[] = [
        {
          turn: 1,
          input: 'look',
          success: true,
          events: []
        },
        {
          turn: 2,
          input: 'north',
          success: true,
          events: []
        }
      ];
      
      const context: GameContext = {
        currentTurn: 3,
        player,
        history,
        metadata: {
          started: new Date(),
          lastPlayed: new Date()
        }
      };
      
      expect(context.history).toHaveLength(2);
      expect(context.currentTurn).toBe(3);
    });
  });

  describe('EngineConfig', () => {
    it('should have default values', () => {
      const config: EngineConfig = {};
      
      // All fields are optional
      expect(config.maxHistory).toBeUndefined();
      expect(config.validateEvents).toBeUndefined();
      expect(config.debug).toBeUndefined();
    });

    it('should support all configuration options', () => {
      const onEvent = jest.fn();
      
      const config: EngineConfig = {
        maxHistory: 50,
        validateEvents: true,
        debug: true,
        collectTiming: true,
        onEvent
      };
      
      expect(config.maxHistory).toBe(50);
      expect(config.validateEvents).toBe(true);
      expect(config.debug).toBe(true);
      expect(config.collectTiming).toBe(true);
      expect(config.onEvent).toBe(onEvent);
    });

    it('should handle event callback', () => {
      const events: SequencedEvent[] = [];
      const config: EngineConfig = {
        onEvent: (event) => {
          events.push(event);
        }
      };
      
      const testEvent: SequencedEvent = {
        type: 'test',
        data: {},
        sequence: 1,
        timestamp: new Date(),
        turn: 1,
        scope: 'turn'
      };
      
      config.onEvent!(testEvent);
      expect(events).toHaveLength(1);
      expect(events[0]).toBe(testEvent);
    });
  });

  describe('GameState', () => {
    it('should create valid game state', () => {
      const world = new WorldModel();
      const player = world.createEntity('player', 'Player');
      
      const context: GameContext = {
        currentTurn: 5,
        player,
        history: [],
        metadata: {
          started: new Date(),
          lastPlayed: new Date()
        }
      };
      
      const state: GameState = {
        version: '1.0.0',
        turn: 5,
        world: { serialized: 'world data' },
        context,
        saved: new Date()
      };
      
      expect(state.version).toBe('1.0.0');
      expect(state.turn).toBe(5);
      expect(state.world).toEqual({ serialized: 'world data' });
      expect(state.context).toBe(context);
      expect(state.saved).toBeInstanceOf(Date);
    });

    it('should preserve full context in save state', () => {
      const world = new WorldModel();
      const player = world.createEntity('player', 'Player');
      
      const context: GameContext = {
        currentTurn: 10,
        player,
        history: [
          { turn: 1, input: 'look', success: true, events: [] },
          { turn: 2, input: 'north', success: true, events: [] }
        ],
        metadata: {
          started: new Date(),
          lastPlayed: new Date(),
          title: 'Adventure Game',
          author: 'Game Author'
        }
      };
      
      const state: GameState = {
        version: '1.0.0',
        turn: context.currentTurn,
        world: {},
        context,
        saved: new Date()
      };
      
      expect(state.context.history).toHaveLength(2);
      expect(state.context.metadata.title).toBe('Adventure Game');
    });
  });

  describe('TimingData', () => {
    it('should track execution phases', () => {
      const timing: TimingData = {
        parsing: 2,
        execution: 10,
        processing: 3,
        total: 15
      };
      
      expect(timing.parsing).toBe(2);
      expect(timing.execution).toBe(10);
      expect(timing.processing).toBe(3);
      expect(timing.total).toBe(15);
    });

    it('should support optional custom timings', () => {
      const timing: TimingData = {
        parsing: 1,
        execution: 5,
        total: 10,
        custom: {
          validation: 2,
          rendering: 2
        }
      };
      
      expect(timing.custom).toBeDefined();
      expect(timing.custom?.validation).toBe(2);
    });
  });

  describe('Type relationships', () => {
    it('should maintain consistency between types', () => {
      // GameEvent -> SequencedEvent
      const gameEvent: GameEvent = {
        type: 'test',
        data: { value: 1 }
      };
      
      const sequencedEvent: SequencedEvent = {
        ...gameEvent,
        sequence: 1,
        timestamp: new Date(),
        turn: 1,
        scope: 'turn'
      };
      
      expect(sequencedEvent.type).toBe(gameEvent.type);
      expect(sequencedEvent.data).toEqual(gameEvent.data);
    });

    it('should allow arrays of events in turn results', () => {
      const events: SequencedEvent[] = Array.from({ length: 10 }, (_, i) => ({
        type: `event${i}`,
        data: { index: i },
        sequence: i,
        timestamp: new Date(),
        turn: 1,
        scope: 'turn' as const
      }));
      
      const result: TurnResult = {
        turn: 1,
        input: 'multi-event command',
        success: true,
        events
      };
      
      expect(result.events).toHaveLength(10);
    });
  });
});
