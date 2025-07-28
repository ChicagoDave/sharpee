/**
 * Integration tests for Engine package using story-based testing
 */

import { 
  GameEngine, 
  createStandardEngine, 
  createEngineWithStory 
} from '../src/game-engine';
import { MinimalTestStory, ActionTestStory, CompletionTestStory, ComplexWorldTestStory } from './stories';
import { MockTextChannel } from './fixtures';
import { TurnResult } from '../src/types';

describe('Engine Integration Tests', () => {
  describe('Full game flow', () => {
    let engine: GameEngine;
    let story: ActionTestStory;
    let textChannel: MockTextChannel;

    beforeEach(async () => {
      story = new ActionTestStory();
      engine = await createEngineWithStory(story, {
        maxHistory: 10,
        debug: false
      });
      
      textChannel = new MockTextChannel();
      engine.addTextChannel(textChannel);
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
      
      // Check text output
      const messages = textChannel.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      
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
      
      // Create new engine and load state
      const newStory = new ActionTestStory();
      const newEngine = await createEngineWithStory(newStory);
      newEngine.loadState(savedState);
      
      // Context should be restored
      const loadedContext = newEngine.getContext();
      expect(loadedContext.currentTurn).toBe(savedState.turn);
      expect(loadedContext.history).toHaveLength(2);
    });

    it('should handle game completion', async () => {
      // Use completion test story
      const completionStory = new CompletionTestStory();
      const completionEngine = await createEngineWithStory(completionStory);
      
      const gameOverSpy = jest.fn();
      completionEngine.on('game:over', gameOverSpy);
      
      completionEngine.start();
      
      // Manually trigger completion since 'win' isn't a standard verb
      completionStory.setComplete(true, 'Test completion');
      await completionEngine.executeTurn('look');  // Any command to check completion
      
      expect(gameOverSpy).toHaveBeenCalled();
      expect(completionStory.getCompletionStatus().isComplete).toBe(true);
      expect(completionStory.getCompletionStatus().reason).toContain('Test completion');
    });
  });

  describe('Error scenarios', () => {
    it('should handle malformed input gracefully', async () => {
      const engine = createStandardEngine();
      const story = new MinimalTestStory();
      await engine.setStory(story);
      engine.start();
      
      // Various problematic inputs
      const badInputs = [
        '',
        '   ',
        '\n\n\n',
        'a'.repeat(1000),
        '!@#$%^&*()'
      ];
      
      for (const input of badInputs) {
        const result = await engine.executeTurn(input);
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      }
      
      // null/undefined should return error result
      const nullResult = await engine.executeTurn(null as any);
      expect(nullResult.success).toBe(false);
      expect(nullResult.error).toBeDefined();
      
      const undefinedResult = await engine.executeTurn(undefined as any);
      expect(undefinedResult.success).toBe(false);
      expect(undefinedResult.error).toBeDefined();
      
      engine.stop();
    });

    it('should recover from action errors', async () => {
      const story = new ActionTestStory();
      
      // Override a standard action to throw
      story.addCustomAction({
        id: 'if.action.waiting',  // Override the wait action
        patterns: ['wait', 'z'],
        description: 'Broken wait action',
        examples: ['wait'],
        execute: async () => {
          throw new Error('Action failed!');
        }
      });
      
      const engine = await createEngineWithStory(story);
      engine.start();
      
      const result = await engine.executeTurn('wait');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Action failed');
      
      // Should still work for next command
      const nextResult = await engine.executeTurn('look');
      expect(nextResult.success).toBeDefined();
      
      engine.stop();
    });
  });

  describe('Performance', () => {
    it('should handle rapid turn execution', async () => {
      const engine = createStandardEngine();
      const story = new MinimalTestStory();
      await engine.setStory(story);
      engine.start();
      
      const start = Date.now();
      const turnCount = 100;
      
      for (let i = 0; i < turnCount; i++) {
        await engine.executeTurn('look');
      }
      
      const duration = Date.now() - start;
      const avgTurnTime = duration / turnCount;
      
      // Should average less than 10ms per turn
      expect(avgTurnTime).toBeLessThan(10);
      
      // Check history management
      const context = engine.getContext();
      expect(context.history.length).toBeLessThanOrEqual(100); // Default max
      
      engine.stop();
    });
  });

  describe('Event flow', () => {
    it('should maintain event ordering', async () => {
      const engine = createStandardEngine();
      const story = new ActionTestStory();
      await engine.setStory(story);
      
      const collectedEvents: any[] = [];
      engine.on('event', (event) => {
        collectedEvents.push(event);
      });
      
      engine.start();
      await engine.executeTurn('look');
      
      // Events should be in sequence order
      for (let i = 1; i < collectedEvents.length; i++) {
        expect(collectedEvents[i].sequence).toBeGreaterThan(
          collectedEvents[i - 1].sequence
        );
      }
      
      engine.stop();
    });
  });

  describe('Text output integration', () => {
    it('should format complex game output', async () => {
      const story = new ActionTestStory();
      
      // Add custom action with rich output
      story.addCustomAction({
        id: 'examine-detailed',
        patterns: ['examine *', 'x *'],
        description: 'Examine something in detail',
        examples: ['examine key'],
        execute: async (context) => ({
          success: true,
          message: 'Detailed examination',
          events: [
            {
              type: 'object.examined',
              data: {
                name: 'golden key',
                description: 'An ornate golden key with mysterious runes.',
                details: [
                  'The runes glow faintly.',
                  'It feels warm to the touch.',
                  'Small scratches suggest frequent use.'
                ]
              }
            },
            {
              type: 'discovery.made',
              data: {
                fact: 'The key belongs to the ancient vault.'
              }
            }
          ]
        })
      });
      
      const engine = await createEngineWithStory(story);
      const textChannel = new MockTextChannel();
      engine.addTextChannel(textChannel);
      
      engine.start();
      await engine.executeTurn('examine key');
      
      const output = textChannel.getMessages().join('\n');
      expect(output).toBeDefined();
      expect(output.length).toBeGreaterThan(0);
      
      engine.stop();
    });
  });

  describe('Vocabulary integration', () => {
    it('should update vocabulary as player moves', async () => {
      const engine = createStandardEngine();
      const story = new ComplexWorldTestStory();
      await engine.setStory(story);
      
      engine.start();
      
      // Spy on vocabulary update after engine is started
      const vocabSpy = jest.spyOn(engine, 'updateScopeVocabulary');
      vocabSpy.mockClear(); // Clear any previous calls
      
      // Execute turn (which might change scope)
      await engine.executeTurn('look');
      
      // Vocabulary should be updated after turn
      expect(vocabSpy).toHaveBeenCalledTimes(1);
      
      engine.stop();
    });
  });

  describe('Standard engine setup', () => {
    it('should create functional standard engine', async () => {
      const engine = createStandardEngine({
        debug: false,
        maxHistory: 20
      });
      
      expect(engine).toBeDefined();
      
      // Should have player
      const context = engine.getContext();
      expect(context.player).toBeDefined();
      expect(context.player.get('identity')).toBeDefined();
      expect(context.player.get('actor')).toBeDefined();
      expect(context.player.get('container')).toBeDefined();
      
      // Should be able to set story and run
      const story = new MinimalTestStory();
      await engine.setStory(story);
      
      engine.start();
      const result = await engine.executeTurn('look');
      expect(result.success).toBeDefined();
      
      engine.stop();
    });
  });

  describe('Complex world navigation', () => {
    it('should handle multi-room world with objects', async () => {
      const story = new ComplexWorldTestStory();
      const engine = await createEngineWithStory(story);
      const textChannel = new MockTextChannel();
      engine.addTextChannel(textChannel);
      
      engine.start();
      
      // Navigate through rooms
      await engine.executeTurn('look');
      
      // Since rooms aren't connected with exits, movement commands will fail
      // but that's OK for this test
      await engine.executeTurn('north');
      await engine.executeTurn('south');
      
      // Interact with objects
      await engine.executeTurn('take book');
      await engine.executeTurn('inventory');
      
      const messages = textChannel.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      
      // Verify player is still in starting room (main-room)
      const world = engine.getWorld();
      const player = story.getPlayer();
      const mainRoom = story.getRoom('main-room');
      
      expect(world.getLocation(player!.id)).toBe(mainRoom?.id);
      
      engine.stop();
    });
  });

  describe('Turn-based completion', () => {
    it('should complete game after turn limit', async () => {
      const story = new CompletionTestStory();
      story.setTurnLimit(3);
      
      const engine = await createEngineWithStory(story);
      const gameOverSpy = jest.fn();
      engine.on('game:over', gameOverSpy);
      
      engine.start();
      
      // Execute turns up to limit
      for (let i = 0; i < 3; i++) {
        story.incrementTurn();
        await engine.executeTurn('look');
      }
      
      expect(gameOverSpy).toHaveBeenCalled();
      expect(story.getTurnCount()).toBe(3);
      
      engine.stop();
    });

    it('should complete game on score threshold', async () => {
      const story = new CompletionTestStory();
      story.setScoreCompletionThreshold(50);
      
      const engine = await createEngineWithStory(story);
      const gameOverSpy = jest.fn();
      engine.on('game:over', gameOverSpy);
      
      engine.start();
      
      // Add score to reach threshold
      story.addScore(50);
      await engine.executeTurn('look');  // Any command to check completion
      
      expect(gameOverSpy).toHaveBeenCalled();
      expect(story.getScore()).toBe(50);
      
      engine.stop();
    });
  });
});
