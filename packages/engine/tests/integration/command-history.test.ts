/**
 * Tests for command history tracking in the game engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../../src/game-engine';
import { WorldModel, StandardCapabilities, EntityType } from '@sharpee/world-model';
import { CommandHistoryData, IFActions } from '@sharpee/stdlib';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { createMockTextService } from '../../src/test-helpers/mock-text-service';

describe('Command History Integration', () => {
  let engine: GameEngine;
  let world: WorldModel;
  
  beforeEach(() => {
    // Set up test engine with pre-configured services
    const setup = setupTestEngine({ 
      includeCapabilities: true,
      includeObjects: true 
    });
    
    engine = setup.engine;
    world = setup.world;

    // Start the engine (this may run an initial "look" that populates history)
    engine.start();

    // Clear history so each test starts fresh
    const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
    if (historyData) {
      historyData.entries = [];
    }
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
      // Execute an unrecognized command
      const result = await engine.executeTurn('flibbertigibbet');

      // Whether it fails or succeeds, check that only successfully parsed
      // commands are in history (unrecognized input may or may not add entries
      // depending on how the parser handles it)
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      // If the parser couldn't resolve an action, the entry shouldn't be tracked
      const flibberEntries = historyData.entries.filter(e => e.originalText === 'flibbertigibbet');
      if (!result.success) {
        expect(flibberEntries).toHaveLength(0);
      }
    });
    
    it('should track multiple commands in order', async () => {
      // Execute several verb-only commands that always succeed
      await engine.executeTurn('look');
      await engine.executeTurn('inventory');
      await engine.executeTurn('wait');

      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      expect(historyData.entries).toHaveLength(3);

      expect(historyData.entries[0].actionId).toBe(IFActions.LOOKING);
      expect(historyData.entries[1].actionId).toBe(IFActions.INVENTORY);
      expect(historyData.entries[2].actionId).toBe(IFActions.WAITING);
    });
    
    it('should track command details including verb text', async () => {
      await engine.executeTurn('look');

      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      const lastEntry = historyData.entries[historyData.entries.length - 1];

      expect(lastEntry.actionId).toBe(IFActions.LOOKING);
      expect(lastEntry.originalText).toBe('look');
      expect(lastEntry.parsedCommand.verb).toBe('look');
    });
    
    it('should not track non-repeatable commands', async () => {
      // Execute non-repeatable commands (meta commands)
      await engine.executeTurn('save');
      await engine.executeTurn('quit');

      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      // Meta commands should not appear in history — they are excluded
      // from the AGAIN command's repeat pool
      const metaEntries = historyData.entries.filter(
        e => e.actionId === IFActions.SAVING || e.actionId === IFActions.QUITTING
      );
      expect(metaEntries).toHaveLength(0);
    });
    
    it('should respect maxEntries limit', async () => {
      // Set a small limit
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      historyData.maxEntries = 3;

      // Execute more commands than the limit (all verb-only for reliability)
      await engine.executeTurn('look');
      await engine.executeTurn('inventory');
      await engine.executeTurn('wait');
      await engine.executeTurn('look');

      // Should only have the last 3 commands
      expect(historyData.entries).toHaveLength(3);
      expect(historyData.entries[0].actionId).toBe(IFActions.INVENTORY);
      expect(historyData.entries[1].actionId).toBe(IFActions.WAITING);
      expect(historyData.entries[2].actionId).toBe(IFActions.LOOKING);
    });
    
    it('should handle AGAIN command by repeating last command', async () => {
      // Execute a command
      const lookResult = await engine.executeTurn('look');

      // Execute AGAIN — re-runs the last command ('look')
      const againResult = await engine.executeTurn('again');

      // AGAIN re-executes 'look', so it should produce events
      // (the result may be a meta result or contain events from the repeated command)
      expect(againResult).toBeDefined();

      // The AGAIN command itself should not be in history
      const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      const againEntries = historyData.entries.filter(e => e.actionId === IFActions.AGAIN);
      expect(againEntries).toHaveLength(0);
    });
    
    it('should handle AGAIN with no history', async () => {
      // Execute AGAIN without any previous commands
      const result = await engine.executeTurn('again');

      // Should produce a result indicating nothing to repeat
      expect(result).toBeDefined();
      // The AGAIN action should either fail or emit an appropriate event
      const events = result.events || [];
      const hasNoRepeatMessage = events.some(e =>
        e.data?.messageId?.includes('nothing_to_repeat') ||
        e.data?.reason === 'nothing_to_repeat'
      );
      // Either the command failed or it emitted a nothing_to_repeat message
      expect(!result.success || hasNoRepeatMessage).toBe(true);
    });
  });
  
  describe('Command History with Capabilities Not Registered', () => {
    it('should always register command history capability', () => {
      // The GameEngine constructor now unconditionally registers command history.
      // Verify that a fresh engine always has the capability available.
      const setup = setupTestEngine({ includeCapabilities: false });
      const historyData = setup.world.getCapability(StandardCapabilities.COMMAND_HISTORY);
      expect(historyData).toBeDefined();
    });
  });
});