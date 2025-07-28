/**
 * Tests for the AGAIN action
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { againAction } from '../../../src/actions/standard/again';
import { IFActions } from '../../../src/actions/constants';
import { StandardCapabilities, WorldModel, IFEntity } from '@sharpee/world-model';
import { CommandHistoryData, registerStandardCapabilities } from '../../../src/capabilities';
import { createTestContext, createCommand } from '../../test-utils';

describe('AGAIN Action', () => {
  let world: WorldModel;
  let player: IFEntity;

  beforeEach(() => {
    // Create world with command history capability
    world = new WorldModel();
    registerStandardCapabilities(world, [StandardCapabilities.COMMAND_HISTORY]);
    
    // Create basic entities for context
    player = world.createEntity('Player', 'actor');
    world.setPlayer(player.id);
  });

  const setCommandHistory = (historyData: CommandHistoryData) => {
    world.updateCapability(StandardCapabilities.COMMAND_HISTORY, historyData);
  };

  describe('basic functionality', () => {
    test('should have correct action ID', () => {
      expect(againAction.id).toBe(IFActions.AGAIN);
    });

    test('should define required messages', () => {
      expect(againAction.requiredMessages).toContain('no_command_to_repeat');
      expect(againAction.requiredMessages).toContain('cant_repeat_that');
      expect(againAction.requiredMessages).toContain('cant_repeat_again');
      expect(againAction.requiredMessages).toContain('cant_repeat_meta');
    });

    test('should be in meta group', () => {
      expect(againAction.group).toBe('meta');
    });
  });

  describe('execute', () => {
    test('should fail when no command history exists', () => {
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.messageId).toBe('no_command_to_repeat');
    });

    test('should fail when command history is empty', () => {
      const historyData: CommandHistoryData = {
        entries: []
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('no_command_to_repeat');
    });

    // Test repeatable actions
    test('should repeat TAKING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.TAKING,
          originalText: 'take the lamp',
          parsedCommand: { verb: 'take', directObject: 'lamp' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      // Should emit 3 events: repeating_command, success message, execute_command
      expect(events).toHaveLength(3);
      
      const executeEvent = events.find(e => e.type === 'if.event.execute_command');
      expect(executeEvent).toBeDefined();
      expect(executeEvent?.data).toMatchObject({
        command: { verb: 'take', directObject: 'lamp' },
        originalText: 'take the lamp',
        isRepeat: true
      });
    });

    test('should repeat GOING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.GOING,
          originalText: 'go north',
          parsedCommand: { verb: 'go', directObject: 'north' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(3);
      const executeEvent = events.find(e => e.type === 'if.event.execute_command');
      expect(executeEvent?.data.originalText).toBe('go north');
    });

    test('should repeat EXAMINING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.EXAMINING,
          originalText: 'examine the box',
          parsedCommand: { verb: 'examine', directObject: 'box' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(3);
      const executeEvent = events.find(e => e.type === 'if.event.execute_command');
      expect(executeEvent?.data.originalText).toBe('examine the box');
    });

    // Test non-repeatable actions
    test('should not repeat AGAIN itself', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.AGAIN,
          originalText: 'again',
          parsedCommand: { verb: 'again' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('cant_repeat_again');
    });

    test('should not repeat SAVING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.SAVING,
          originalText: 'save',
          parsedCommand: { verb: 'save' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('cant_repeat_meta');
      expect(errorEvent?.data.params).toEqual({ action: 'save' });
    });

    test('should not repeat RESTORING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.RESTORING,
          originalText: 'restore',
          parsedCommand: { verb: 'restore' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('cant_repeat_meta');
      expect(errorEvent?.data.params).toEqual({ action: 'restore' });
    });

    test('should not repeat QUITTING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.QUITTING,
          originalText: 'quit',
          parsedCommand: { verb: 'quit' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('cant_repeat_meta');
      expect(errorEvent?.data.params).toEqual({ action: 'quit' });
    });

    test('should not repeat RESTARTING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.RESTARTING,
          originalText: 'restart',
          parsedCommand: { verb: 'restart' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('cant_repeat_meta');
      expect(errorEvent?.data.params).toEqual({ action: 'restart' });
    });

    test('should not repeat VERSION command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.VERSION,
          originalText: 'version',
          parsedCommand: { verb: 'version' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('cant_repeat_meta');
      expect(errorEvent?.data.params).toEqual({ action: 'version' });
    });

    test('should not repeat VERIFYING command', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.VERIFYING,
          originalText: 'verify',
          parsedCommand: { verb: 'verify' },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      expect(events).toHaveLength(1);
      const errorEvent = events.find(e => e.type === 'message.error');
      expect(errorEvent?.data.messageId).toBe('cant_repeat_meta');
      expect(errorEvent?.data.params).toEqual({ action: 'verify' });
    });

    test('should repeat the most recent command when multiple exist', () => {
      const historyData: CommandHistoryData = {
        entries: [
          {
            actionId: IFActions.GOING,
            originalText: 'go north',
            parsedCommand: { verb: 'go', directObject: 'north' },
            turnNumber: 3,
            timestamp: Date.now() - 1000
          },
          {
            actionId: IFActions.TAKING,
            originalText: 'take the key',
            parsedCommand: { verb: 'take', directObject: 'key' },
            turnNumber: 4,
            timestamp: Date.now()
          }
        ]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      // Should repeat the "take the key" command
      const executeEvent = events.find(e => e.type === 'if.event.execute_command');
      expect(executeEvent?.data.originalText).toBe('take the key');
      expect(executeEvent?.data.command).toEqual({ verb: 'take', directObject: 'key' });
    });

    test('should handle complex commands with all parts', () => {
      const historyData: CommandHistoryData = {
        entries: [{
          actionId: IFActions.PUTTING,
          originalText: 'put the book on the table',
          parsedCommand: {
            verb: 'put',
            directObject: 'book',
            preposition: 'on',
            indirectObject: 'table'
          },
          turnNumber: 5,
          timestamp: Date.now()
        }]
      };
      setCommandHistory(historyData);
      
      const command = createCommand({ action: 'again' });
      const context = createTestContext(againAction, world, command);
      
      const events = againAction.execute(context);
      
      const executeEvent = events.find(e => e.type === 'if.event.execute_command');
      expect(executeEvent?.data).toMatchObject({
        command: {
          verb: 'put',
          directObject: 'book',
          preposition: 'on',
          indirectObject: 'table'
        },
        originalText: 'put the book on the table',
        isRepeat: true
      });
    });
  });
});
