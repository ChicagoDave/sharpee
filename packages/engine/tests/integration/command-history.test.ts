/**
 * Tests for command history tracking in the game engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, createStandardEngine } from '../../src/game-engine';
import { WorldModel, StandardCapabilities } from '@sharpee/world-model';
import { 
  registerStandardCapabilities, 
  CommandHistoryData,
  IFActions 
} from '@sharpee/stdlib';
import { createMockTextService } from '../../src/test-helpers/mock-text-service';
import { Story } from '../../src/story';

describe('Command History Integration', () => {
  let engine: GameEngine;
  let world: WorldModel;
  
  beforeEach(async () => {
    // Create a simple test story
    const story: Story = {
      config: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        language: 'en'
      },
      
      createPlayer: (world: WorldModel) => {
        const player = world.createEntity('player', 'You');
        // Add basic traits
        return player;
      },
      
      initializeWorld: (world: WorldModel) => {
        // Register standard capabilities including command history
        registerStandardCapabilities(world);
        
        // Create a simple test room
        const room = world.createEntity('test-room', 'Test Room');
        const lamp = world.createEntity('lamp', 'brass lamp');
        
        // Place lamp in room
        world.move(lamp.id, room.id);
      }
    };
    
    // Create engine with story
    engine = createStandardEngine();
    world = engine.getWorld();
    
    // Set up the story
    await engine.setStory(story);
    
    // Set text service
    const textService = createMockTextService();
    engine.setTextService(textService);
    
    // Start the engine
    engine.start();
  });
  
  describe('Command History Tracking', () => {
    it('should track successful commands in history', async () => {
      // Execute a command
      const result = await engine.executeTurn('look');
      
      expect(result.success).toBe(true);
      
      // Check command history
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      expect(historyData).toBeDefined();
      expect(historyData.entries).toHaveLength(1);
      
      const entry = historyData.entries[0];
      expect(entry.actionId).toBe(IFActions.LOOKING);
      expect(entry.originalText).toBe('look');
      expect(entry.parsedCommand.verb).toBe('look');
      expect(entry.turnNumber).toBe(1);
    });
    
    it('should not track failed commands', async () => {
      // Execute an invalid command
      const result = await engine.executeTurn('xyzzy');
      
      expect(result.success).toBe(false);
      
      // Check command history
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      expect(historyData.entries).toHaveLength(0);
    });
    
    it('should track multiple commands in order', async () => {
      // Execute several commands
      await engine.executeTurn('look');
      await engine.executeTurn('inventory');
      await engine.executeTurn('examine lamp');
      
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      expect(historyData.entries).toHaveLength(3);
      
      expect(historyData.entries[0].actionId).toBe(IFActions.LOOKING);
      expect(historyData.entries[1].actionId).toBe(IFActions.INVENTORY);
      expect(historyData.entries[2].actionId).toBe(IFActions.EXAMINING);
      
      // Check turn numbers
      expect(historyData.entries[0].turnNumber).toBe(1);
      expect(historyData.entries[1].turnNumber).toBe(2);
      expect(historyData.entries[2].turnNumber).toBe(3);
    });
    
    it('should track complex commands with objects and prepositions', async () => {
      // Create some objects
      const box = world.createEntity('box', 'wooden box');
      const room = world.getEntity('test-room');
      if (room) {
        world.move(box.id, room.id);
      }
      
      // Execute a complex command
      await engine.executeTurn('put lamp in box');
      
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      const lastEntry = historyData.entries[historyData.entries.length - 1];
      
      expect(lastEntry.actionId).toBe(IFActions.PUTTING);
      expect(lastEntry.parsedCommand.verb).toBe('put');
      expect(lastEntry.parsedCommand.directObject).toBeTruthy();
      expect(lastEntry.parsedCommand.preposition).toBeTruthy();
      expect(lastEntry.parsedCommand.indirectObject).toBeTruthy();
    });
    
    it('should not track non-repeatable commands', async () => {
      // Execute non-repeatable commands
      await engine.executeTurn('save');
      await engine.executeTurn('quit');
      
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      // Should be empty because both commands are non-repeatable
      expect(historyData.entries).toHaveLength(0);
    });
    
    it('should respect maxEntries limit', async () => {
      // Set a small limit
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      historyData.maxEntries = 3;
      
      // Execute more commands than the limit
      await engine.executeTurn('look');
      await engine.executeTurn('inventory');
      await engine.executeTurn('wait');
      await engine.executeTurn('examine lamp');
      await engine.executeTurn('look');
      
      // Should only have the last 3 commands
      expect(historyData.entries).toHaveLength(3);
      expect(historyData.entries[0].actionId).toBe(IFActions.WAITING);
      expect(historyData.entries[1].actionId).toBe(IFActions.EXAMINING);
      expect(historyData.entries[2].actionId).toBe(IFActions.LOOKING);
    });
    
    it('should handle AGAIN command by repeating last command', async () => {
      // Execute a command
      await engine.executeTurn('look');
      
      // Execute AGAIN
      const againResult = await engine.executeTurn('again');
      
      // Should find the execute_command event
      const executeEvent = againResult.events.find(e => e.type === 'if.event.execute_command');
      expect(executeEvent).toBeDefined();
      expect(executeEvent?.data.originalText).toBe('look');
      expect(executeEvent?.data.isRepeat).toBe(true);
      
      // The AGAIN command itself should not be in history
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      const againEntries = historyData.entries.filter(e => e.actionId === IFActions.AGAIN);
      expect(againEntries).toHaveLength(0);
    });
    
    it('should handle AGAIN with no history', async () => {
      // Execute AGAIN without any previous commands
      const result = await engine.executeTurn('again');
      
      expect(result.success).toBe(false);
      const errorEvent = result.events.find(e => e.type === 'action.error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.messageId).toBe('no_command_to_repeat');
    });
  });
  
  describe('Command History with Capabilities Not Registered', () => {
    it('should gracefully handle missing command history capability', async () => {
      // Create an engine without registering capabilities
      const bareWorld = new WorldModel();
      const player = bareWorld.createEntity('player', 'You');
      const bareEngine = new GameEngine(bareWorld, player);
      
      // Set up minimal requirements
      await bareEngine.setLanguage('en');
      bareEngine.setTextService(createMockTextService());
      bareEngine.start();
      
      // Execute a command - should work even without command history
      const result = await bareEngine.executeTurn('look');
      expect(result.success).toBe(true);
      
      // No history should exist
      const historyData = bareWorld.getCapability(StandardCapabilities.COMMAND_HISTORY);
      expect(historyData).toBeNull();
    });
  });
});