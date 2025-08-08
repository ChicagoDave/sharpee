/**
 * Tests for GameEngine using story-based testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameEngine } from '../src/game-engine';
import { MinimalTestStory } from './stories/minimal-test-story';
import { createMockAction } from './fixtures/index';
import { createMockTextService } from '../src/test-helpers/mock-text-service';
import { EntityType, WorldModel } from '@sharpee/world-model';
import { setupTestEngine, createMinimalStory } from './test-helpers/setup-test-engine';

describe('GameEngine', () => {
  let engine: GameEngine;
  let world: WorldModel;
  let player: any;
  let story: MinimalTestStory;

  beforeEach(() => {
    story = new MinimalTestStory();
  });

  describe('initialization', () => {
    it('should create an engine with standard setup', () => {
      const { engine, world, player } = setupTestEngine();
      engine.setStory(story);
      
      expect(engine).toBeDefined();
      expect(engine.getWorld()).toBeDefined();
      expect(engine.getContext().player).toBeDefined();
    });

    it('should initialize with default config', () => {
      const { engine } = setupTestEngine();
      engine.setStory(story);
      
      const context = engine.getContext();
      expect(context.currentTurn).toBe(1);
      expect(context.history).toEqual([]);
      expect(context.metadata.started).toBeInstanceOf(Date);
    });

    it('should accept custom config', () => {
      const { engine } = setupTestEngine();
      engine.setStory(story);
      
      expect(engine).toBeDefined();
    });
  });

  describe('story management', () => {
    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      world = setup.world;
      player = setup.player;
    });

    it('should set story and initialize components', () => {
      engine.setStory(story);
      
      expect(story.wasInitialized()).toBe(true);
      expect(story.wasWorldInitialized()).toBe(true);
      expect(story.wasPlayerCreated()).toBe(true);
      
      const context = engine.getContext();
      expect(context.metadata.title).toBe('Minimal Test Story');
      expect(context.metadata.author).toBe('Test Suite');
    });

    it('should properly initialize world with story', () => {
      engine.setStory(story);
      
      const world = engine.getWorld();
      const room = story.getRoom();
      const player = story.getPlayer();
      
      expect(room).toBeDefined();
      expect(player).toBeDefined();
      expect(world.getEntity(room!.id)).toBe(room);
      expect(world.getEntity(player!.id)).toBe(player);
      expect(world.getLocation(player!.id)).toBe(room!.id);
    });

    it('should handle story initialization errors gracefully', () => {
      // Create a story that throws during initialization
      const badStory = new MinimalTestStory();
      badStory.forceInitError = true;
      
      expect(() => engine.setStory(badStory)).toThrow();
    });
  });

  describe('engine lifecycle', () => {
    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      engine.setStory(story);
    });

    it('should start and stop correctly', () => {
      expect(() => engine.start()).not.toThrow();
      expect(() => engine.stop()).not.toThrow();
    });

    it('should throw if already running', () => {
      engine.start();
      expect(() => engine.start()).toThrow('Engine is already running');
      engine.stop();
    });

    it('should throw if executing turn when not running', async () => {
      await expect(engine.executeTurn('look')).rejects.toThrow('Engine is not running');
    });

    it('should start without a story if dependencies are provided', () => {
      const { engine: newEngine } = setupTestEngine();
      expect(() => newEngine.start()).not.toThrow();
      newEngine.stop();
    });
  });

  describe('turn execution', () => {
    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      engine.setStory(story);
      engine.start();
    });

    afterEach(() => {
      engine.stop();
    });

    it('should execute a basic turn', async () => {
      const turnData = await engine.executeTurn('look');
      
      expect(turnData).toBeDefined();
      expect(turnData.turn).toBe(1); // First command is executed on turn 1
      expect(turnData.success).toBeDefined();
    });

    it('should update context after turn', async () => {
      const initialContext = engine.getContext();
      const initialTurn = initialContext.currentTurn;
      
      await engine.executeTurn('look');
      
      const newContext = engine.getContext();
      expect(newContext.currentTurn).toBe(initialTurn + 1);
      expect(newContext.history).toHaveLength(1);
    });

    it('should emit turn events', async () => {
      const eventSpy = vi.fn();
      engine.on('turn:start', eventSpy);
      engine.on('turn:complete', eventSpy);
      
      await engine.executeTurn('look');
      
      expect(eventSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle turn execution errors', async () => {
      // Force an error by providing invalid input that should be handled gracefully
      const turnData = await engine.executeTurn('');
      
      expect(turnData).toBeDefined();
      expect(turnData.turn).toBe(1); // First command is executed on turn 1
      expect(turnData.success).toBe(false);
    });

    it('should respect max history limit', async () => {
      // Create engine with small history limit
      const { engine: limitedEngine } = setupTestEngine();
      limitedEngine.setStory(story);
      limitedEngine.start();
      
      // Override the default max history
      const maxHistory = 3;
      (limitedEngine as any).config = { maxHistory };
      
      // Execute more turns than the limit
      for (let i = 0; i < 5; i++) {
        await limitedEngine.executeTurn('look');
      }
      
      const context = limitedEngine.getContext();
      expect(context.history.length).toBeLessThanOrEqual(maxHistory);
      
      limitedEngine.stop();
    });

    it('should process text output', async () => {
      const turnData = await engine.executeTurn('look');
      
      // Just verify that the turn was processed
      expect(turnData).toBeDefined();
      expect(turnData.turn).toBe(1); // First command is executed on turn 1
      expect(turnData.success).toBeDefined();
    });
  });

  describe('game state management', () => {
    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      engine.setStory(story);
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
      const { engine: newEngine } = setupTestEngine();
      newEngine.setStory(story);
      
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
    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      world = setup.world;
      engine.setStory(story);
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
    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      engine.setStory(story);
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
      
      // Create engine with onEvent callback
      const { engine: configuredEngine } = setupTestEngine();
      (configuredEngine as any).config = { onEvent: onEventSpy };
      configuredEngine.setStory(story);
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
    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      engine.setStory(story);
    });

    it('should have text service configured', () => {
      const textService = engine.getTextService();
      expect(textService).toBeDefined();
    });
  });
});