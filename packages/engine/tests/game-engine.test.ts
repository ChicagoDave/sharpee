/**
 * Tests for GameEngine using story-based testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine, createGameEngine, createStandardEngine, createEngineWithStory } from '../src/game-engine';
import { MinimalTestStory } from './stories/minimal-test-story';
import { createMockAction, MockTextChannel } from './fixtures/index';
import { createMockTextService } from '../src/test-helpers/mock-text-service';
import { EntityType } from '@sharpee/world-model';

describe('GameEngine', () => {
  let engine: GameEngine;
  let story: MinimalTestStory;

  beforeEach(() => {
    story = new MinimalTestStory();
  });

  describe('initialization', () => {
    it('should create an engine with standard setup', async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
      
      expect(engine).toBeDefined();
      expect(engine.getWorld()).toBeDefined();
      expect(engine.getContext().player).toBeDefined();
    });

    it('should initialize with default config', async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
      
      const context = engine.getContext();
      expect(context.currentTurn).toBe(1);
      expect(context.history).toEqual([]);
      expect(context.metadata.started).toBeInstanceOf(Date);
    });

    it('should accept custom config', async () => {
      engine = createStandardEngine({
        maxHistory: 50,
        validateEvents: false,
        debug: true
      });
      await engine.setStory(story);
      
      expect(engine).toBeDefined();
    });
  });

  describe('story management', () => {
    beforeEach(() => {
      engine = createStandardEngine();
    });

    it('should set story and initialize components', async () => {
      await engine.setStory(story);
      
      expect(story.wasInitialized()).toBe(true);
      expect(story.wasWorldInitialized()).toBe(true);
      expect(story.wasPlayerCreated()).toBe(true);
      
      const context = engine.getContext();
      expect(context.metadata.title).toBe('Minimal Test Story');
      expect(context.metadata.author).toBe('Test Suite');
    });

    it('should properly initialize world with story', async () => {
      await engine.setStory(story);
      
      const world = engine.getWorld();
      const room = story.getRoom();
      const player = story.getPlayer();
      
      expect(room).toBeDefined();
      expect(player).toBeDefined();
      expect(world.getEntity(room!.id)).toBe(room);
      expect(world.getEntity(player!.id)).toBe(player);
      expect(world.getLocation(player!.id)).toBe(room!.id);
    });

    it('should handle story initialization errors gracefully', async () => {
      // Create a story with invalid language
      const badStory = new MinimalTestStory();
      badStory.config.language = 'invalid-lang';
      
      await expect(engine.setStory(badStory)).rejects.toThrow();
    });
  });

  describe('engine lifecycle', () => {
    beforeEach(async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
    });

    it('should start and stop correctly', () => {
      expect(() => engine.start()).not.toThrow();
      expect(() => engine.stop()).not.toThrow();
    });

    it('should throw if already running', () => {
      engine.start();
      expect(() => engine.start()).toThrow('Engine is already running');
    });

    it('should throw if executing turn when not running', async () => {
      await expect(engine.executeTurn('look')).rejects.toThrow('Engine is not running');
    });

    it('should throw if no story set before starting', () => {
      const newEngine = createStandardEngine();
      expect(() => newEngine.start()).toThrow('Engine must have a story set before starting');
    });
  });

  describe('turn execution', () => {
    let mockChannel: MockTextChannel;

    beforeEach(async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
      engine.start();
      
      // Set up mock text channel
      mockChannel = new MockTextChannel();
      const service = createMockTextService();
      engine.setTextService(service, [mockChannel]);
    });

    afterEach(() => {
      engine.stop();
    });

    it('should execute a basic turn', async () => {
      const result = await engine.executeTurn('look');
      
      expect(result).toBeDefined();
      expect(result.turn).toBe(1);
      expect(result.input).toBe('look');
      expect(result.success).toBeDefined();
    });

    it('should update context after turn', async () => {
      const initialContext = engine.getContext();
      expect(initialContext.currentTurn).toBe(1);
      
      await engine.executeTurn('look');
      
      const updatedContext = engine.getContext();
      expect(updatedContext.currentTurn).toBe(2);
      expect(updatedContext.history).toHaveLength(1);
    });

    it('should emit turn events', async () => {
      const turnStartSpy = vi.fn();
      const turnCompleteSpy = vi.fn();
      
      engine.on('turn:start', turnStartSpy);
      engine.on('turn:complete', turnCompleteSpy);
      
      await engine.executeTurn('look');
      
      expect(turnStartSpy).toHaveBeenCalledWith(1, 'look');
      expect(turnCompleteSpy).toHaveBeenCalled();
    });

    it('should handle turn execution errors', async () => {
      const turnFailedSpy = vi.fn();
      engine.on('turn:failed', turnFailedSpy);
      
      // Force an error by stopping the engine mid-execution
      engine.stop();
      
      // Now try to execute a turn when not running
      await expect(engine.executeTurn('look')).rejects.toThrow('Engine is not running');
      
      // turn:failed should not be called for this type of error
      expect(turnFailedSpy).not.toHaveBeenCalled();
    });

    it('should respect max history limit', async () => {
      // Create engine with small history limit
      const limitedEngine = createStandardEngine({ maxHistory: 3 });
      await limitedEngine.setStory(story);
      limitedEngine.start();
      
      // Execute more turns than the limit
      for (let i = 0; i < 5; i++) {
        await limitedEngine.executeTurn(`look ${i}`);
      }
      
      const history = limitedEngine.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].input).toBe('look 2'); // Oldest kept turn
      
      limitedEngine.stop();
    });

    it('should process text output through channels', async () => {
      await engine.executeTurn('look');
      
      expect(mockChannel.getMessages().length).toBeGreaterThan(0);
    });
  });

  describe('game state management', () => {
    beforeEach(async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
      engine.start();
    });

    afterEach(() => {
      engine.stop();
    });

    it('should save current state', async () => {
      await engine.executeTurn('look');
      
      const state = engine.saveState();
      
      expect(state.version).toBe('1.0.0');
      expect(state.turn).toBe(2);
      expect(state.world).toBeDefined();
      expect(state.context).toBeDefined();
      expect(state.saved).toBeInstanceOf(Date);
    });

    it('should load saved state', async () => {
      // Execute some turns
      await engine.executeTurn('look');
      await engine.executeTurn('inventory');
      
      const savedState = engine.saveState();
      engine.stop();
      
      // Create new engine and load state
      const newEngine = createStandardEngine();
      await newEngine.setStory(story);
      
      newEngine.loadState(savedState);
      newEngine.start();
      
      const loadedContext = newEngine.getContext();
      expect(loadedContext.currentTurn).toBe(savedState.turn);
      expect(loadedContext.history).toHaveLength(2);
      
      newEngine.stop();
    });

    it('should reject incompatible save versions', () => {
      const incompatibleState = {
        version: '2.0.0',
        turn: 1,
        world: {},
        context: engine.getContext(),
        saved: new Date()
      };
      
      expect(() => engine.loadState(incompatibleState)).toThrow('Unsupported save version');
    });
  });

  describe('vocabulary management', () => {
    beforeEach(async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
      engine.start();
    });

    afterEach(() => {
      engine.stop();
    });

    it('should update vocabulary for entities in scope', () => {
      const updateSpy = vi.spyOn(engine, 'updateEntityVocabulary');
      
      engine.updateScopeVocabulary();
      
      expect(updateSpy).toHaveBeenCalled();
      // Should update at least player and room
      expect(updateSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should mark entities correctly as in/out of scope', () => {
      const world = engine.getWorld();
      const entity = world.createEntity('Test Item', EntityType.OBJECT);
      
      // Out of scope initially
      engine.updateEntityVocabulary(entity, false);
      
      // Move to player's location
      const player = story.getPlayer();
      const room = story.getRoom();
      if (player && room) {
        world.moveEntity(entity.id, room.id);
        
        // Now in scope
        engine.updateEntityVocabulary(entity, true);
      }
    });
  });

  describe('event handling', () => {
    beforeEach(async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
      engine.start();
    });

    afterEach(() => {
      engine.stop();
    });

    it('should emit events during turn execution', async () => {
      const eventSpy = vi.fn();
      engine.on('event', eventSpy);
      
      await engine.executeTurn('look');
      
      // Should emit at least one event
      expect(eventSpy).toHaveBeenCalled();
    });

    it('should call onEvent config callback', async () => {
      const onEventSpy = vi.fn();
      
      const configuredEngine = createStandardEngine({ onEvent: onEventSpy });
      await configuredEngine.setStory(story);
      configuredEngine.start();
      
      await configuredEngine.executeTurn('look');
      
      expect(onEventSpy).toHaveBeenCalled();
      
      configuredEngine.stop();
    });

    it('should get recent events', async () => {
      await engine.executeTurn('look');
      await engine.executeTurn('inventory');
      
      const recentEvents = engine.getRecentEvents(5);
      
      expect(recentEvents).toBeDefined();
      expect(Array.isArray(recentEvents)).toBe(true);
      expect(recentEvents.length).toBeGreaterThan(0);
    });
  });

  describe('text service', () => {
    beforeEach(async () => {
      engine = createStandardEngine();
      await engine.setStory(story);
    });

    it('should allow setting custom text service', () => {
      const service = createMockTextService();
      
      expect(() => engine.setTextService(service)).not.toThrow();
    });
  });

  describe('factory functions', () => {
    it('should create standard engine', () => {
      const standardEngine = createStandardEngine({ debug: true });
      
      expect(standardEngine).toBeInstanceOf(GameEngine);
      expect(standardEngine.getContext().player).toBeDefined();
    });

    it('should create engine with story', async () => {
      const engineWithStory = await createEngineWithStory(story, { maxHistory: 20 });
      
      expect(engineWithStory).toBeInstanceOf(GameEngine);
      expect(engineWithStory.getContext().metadata.title).toBe('Minimal Test Story');
    });
  });
});
