/**
 * Integration tests for Engine package using story-based testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine } from '../src/game-engine';
import { MinimalTestStory, ActionTestStory, CompletionTestStory, ComplexWorldTestStory } from './stories';
import { TurnResult } from '../src/types';
import { setupTestEngine } from './test-helpers/setup-test-engine';

describe('Engine Integration Tests', () => {
  describe('Full game flow', () => {
    let engine: GameEngine;
    let story: ActionTestStory;

    beforeEach(() => {
      story = new ActionTestStory();
      const setup = setupTestEngine();
      engine = setup.engine;
      engine.setStory(story);
    });

    it('should complete a full game session', async () => {
      // Start the engine
      engine.start();
      
      // Execute several turns
      const turns = [
        'look',
        'inventory',
        'wait',
        'examine room'
      ];
      
      const results: TurnResult[] = [];
      
      for (const input of turns) {
        const result = await engine.executeTurn(input);
        results.push(result);
        
        expect(result.success).toBeDefined();
        expect(result.turn).toBe(results.length);
        expect(result.input).toBe(input);
      }
      
      // Check context
      const context = engine.getContext();
      expect(context.currentTurn).toBe(turns.length + 1);
      expect(context.history).toHaveLength(turns.length);
      
      // Stop engine
      engine.stop();
    });

    it('should handle save and restore', async () => {
      engine.start();
      
      // Execute some turns
      await engine.executeTurn('look');
      await engine.executeTurn('test');
      
      // Save state
      const savedState = engine.saveState();
      expect(savedState.turn).toBe(3);
      
      engine.stop();
      
      // Create new engine and restore
      const newSetup = setupTestEngine();
      const newEngine = newSetup.engine;
      newEngine.setStory(story);
      
      newEngine.loadState(savedState);
      newEngine.start();
      
      expect(newEngine.getContext().currentTurn).toBe(3);
      expect(newEngine.getContext().history).toHaveLength(2);
      
      newEngine.stop();
    });

    it.skip('should handle game completion', async () => {
      // TODO: Implement engine.isComplete() method
      const completionStory = new CompletionTestStory();
      engine.setStory(completionStory);
      engine.start();
      
      // Play through to completion
      await engine.executeTurn('complete');
      
      // expect(engine.isComplete()).toBe(true); // Method doesn't exist
      
      engine.stop();
    });
  });

  describe('Error scenarios', () => {
    let engine: GameEngine;

    beforeEach(() => {
      const setup = setupTestEngine();
      engine = setup.engine;
      const story = new MinimalTestStory();
      engine.setStory(story);
      engine.start();
    });

    it('should handle malformed input gracefully', async () => {
      const result = await engine.executeTurn('');
      
      expect(result.success).toBeDefined();
      expect(result.turn).toBe(1);
      
      engine.stop();
    });

    it('should recover from action errors', async () => {
      const story = new ActionTestStory();
      engine.setStory(story);
      
      // Execute action that might fail
      const result = await engine.executeTurn('error test');
      
      expect(result).toBeDefined();
      expect(result.turn).toBe(1);
      
      // Should be able to continue
      const nextResult = await engine.executeTurn('look');
      expect(nextResult.turn).toBe(2);
      
      engine.stop();
    });
  });

  describe('Performance', () => {
    it('should handle rapid turn execution', async () => {
      const setup = setupTestEngine();
      const engine = setup.engine;
      const story = new MinimalTestStory();
      engine.setStory(story);
      engine.start();
      
      const startTime = Date.now();
      const turnCount = 10;
      
      for (let i = 0; i < turnCount; i++) {
        await engine.executeTurn('look');
      }
      
      const elapsed = Date.now() - startTime;
      
      // Should complete 10 turns in under 1 second
      expect(elapsed).toBeLessThan(1000);
      
      engine.stop();
    });
  });

  describe('Event flow', () => {
    it('should maintain event ordering', async () => {
      const setup = setupTestEngine();
      const engine = setup.engine;
      const story = new ActionTestStory();
      engine.setStory(story);
      engine.start();
      
      const events: any[] = [];
      
      engine.on('event', (event: any) => {
        events.push(event);
      });
      
      await engine.executeTurn('look');
      
      // Check that events have proper sequence numbers
      expect(events.length).toBeGreaterThan(0);
      
      // All events should have sequence numbers
      for (const event of events) {
        expect(event.sequence).toBeDefined();
        expect(typeof event.sequence).toBe('number');
      }
      
      // Sequence numbers should be in order
      for (let i = 1; i < events.length; i++) {
        expect(events[i].sequence).toBeGreaterThan(events[i - 1].sequence);
      }
      
      engine.stop();
    });
  });

  describe('Text output integration', () => {
    it('should format complex game output', async () => {
      const story = new ComplexWorldTestStory();
      const setup = setupTestEngine();
      const engine = setup.engine;
      engine.setStory(story);
      engine.start();
      
      const result = await engine.executeTurn('look');
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      
      engine.stop();
    });
  });

  describe('Vocabulary integration', () => {
    it('should update vocabulary as player moves', async () => {
      const setup = setupTestEngine();
      const engine = setup.engine;
      const story = new ComplexWorldTestStory();
      engine.setStory(story);
      engine.start();
      
      // Initial vocabulary update
      const updateSpy = vi.spyOn(engine, 'updateScopeVocabulary');
      
      await engine.executeTurn('go north');
      
      expect(updateSpy).toHaveBeenCalled();
      
      engine.stop();
    });
  });

  describe('Standard engine setup', () => {
    it('should create functional standard engine', () => {
      const { engine, world, player } = setupTestEngine({ 
        includeCapabilities: true 
      });
      
      expect(engine).toBeDefined();
      expect(world).toBeDefined();
      expect(player).toBeDefined();
      
      // Should be able to start without story
      expect(() => engine.start()).not.toThrow();
      engine.stop();
    });
  });

  describe('Complex world navigation', () => {
    it('should handle multi-room world with objects', async () => {
      const story = new ComplexWorldTestStory();
      const setup = setupTestEngine();
      const engine = setup.engine;
      engine.setStory(story);
      engine.start();
      
      // Navigate through rooms
      await engine.executeTurn('look');
      await engine.executeTurn('go north');
      await engine.executeTurn('look');
      await engine.executeTurn('go south');
      
      const context = engine.getContext();
      expect(context.history).toHaveLength(4);
      
      engine.stop();
    });
  });

  describe('Turn-based completion', () => {
    it.skip('should complete game after turn limit', async () => {
      // TODO: Implement setMaxTurns on Story
      const story = new CompletionTestStory();
      // story.setMaxTurns(5); // Method doesn't exist
      
      const setup = setupTestEngine();
      const engine = setup.engine;
      engine.setStory(story);
      engine.start();
      
      // Execute turns until completion
      for (let i = 0; i < 5; i++) {
        await engine.executeTurn('wait');
      }
      
      // expect(engine.isComplete()).toBe(true); // Method doesn't exist
      
      engine.stop();
    });

    it.skip('should complete game on score threshold', async () => {
      // TODO: Implement setScoreThreshold on Story
      const story = new CompletionTestStory();
      // story.setScoreThreshold(100); // Method doesn't exist
      
      const setup = setupTestEngine();
      const engine = setup.engine;
      engine.setStory(story);
      engine.start();
      
      // Execute action that gives score
      await engine.executeTurn('score');
      
      // expect(engine.isComplete()).toBe(true); // Method doesn't exist
      
      engine.stop();
    });
  });
});