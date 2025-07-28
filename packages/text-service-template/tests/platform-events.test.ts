/**
 * Tests for text service platform event handling
 */

import { TemplateTextService } from '../src';
import { 
  TextServiceContext,
  LanguageProvider,
  Message
} from '@sharpee/if-domain';
import { 
  SemanticEvent,
  PlatformEventType,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createRestartCompletedEvent
} from '@sharpee/core';

describe('TemplateTextService Platform Events', () => {
  let textService: TemplateTextService;
  let mockContext: TextServiceContext;
  let mockLanguageProvider: LanguageProvider;
  let currentTurnEvents: SemanticEvent[];
  
  beforeEach(() => {
    currentTurnEvents = [];
    
    mockContext = {
      currentTurn: 1,
      getCurrentTurnEvents: () => currentTurnEvents,
      getEventsByType: (type: string) => currentTurnEvents.filter(e => e.type === type),
      getAllEvents: () => currentTurnEvents,
      world: {} as any,
      getPlayer: () => ({ id: 'player' }) as any,
      getContents: () => [],
      getLocation: () => null
    };
    
    mockLanguageProvider = {
      getMessage: jest.fn((id: string): Message | null => {
        const messages: Record<string, Message> = {
          'game_saved': { id: 'game_saved', template: 'Game saved successfully.' },
          'save_failed': { id: 'save_failed', template: 'Save failed: {error}' },
          'game_restored': { id: 'game_restored', template: 'Game restored successfully.' },
          'restore_failed': { id: 'restore_failed', template: 'Restore failed: {error}' },
          'quit_confirmed': { id: 'quit_confirmed', template: 'Thanks for playing!' },
          'quit_cancelled': { id: 'quit_cancelled', template: 'Quit cancelled.' },
          'game_restarted': { id: 'game_restarted', template: 'Game restarted.' },
          'restart_cancelled': { id: 'restart_cancelled', template: 'Restart cancelled.' }
        };
        return messages[id] || null;
      })
    } as any;
    
    textService = new TemplateTextService();
    textService.setLanguageProvider(mockLanguageProvider);
    textService.initialize(mockContext);
  });

  describe('Save Events', () => {
    it('should display save completed message', () => {
      const saveEvent = createSaveCompletedEvent(true);
      currentTurnEvents.push(saveEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Game saved successfully.');
    });

    it('should display save failed message with error', () => {
      const saveEvent = createSaveCompletedEvent(false, 'Disk full');
      currentTurnEvents.push(saveEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Save failed: Disk full');
    });

    it('should not display message for save requested events', () => {
      const saveRequestEvent: SemanticEvent = {
        id: 'evt1',
        type: PlatformEventType.SAVE_REQUESTED,
        timestamp: Date.now(),
        entities: {},
        requiresClientAction: true,
        payload: {}
      } as any;
      currentTurnEvents.push(saveRequestEvent);
      
      const output = textService.processTurn();
      
      expect(output).toBe('');
    });
  });

  describe('Restore Events', () => {
    it('should display restore completed message', () => {
      const restoreEvent = createRestoreCompletedEvent(true);
      currentTurnEvents.push(restoreEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Game restored successfully.');
    });

    it('should display restore failed message with error', () => {
      const restoreEvent = createRestoreCompletedEvent(false, 'Corrupted save file');
      currentTurnEvents.push(restoreEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Restore failed: Corrupted save file');
    });
  });

  describe('Quit Events', () => {
    it('should display quit confirmed message', () => {
      const quitEvent = createQuitConfirmedEvent();
      currentTurnEvents.push(quitEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Thanks for playing!');
    });

    it('should display quit cancelled message', () => {
      const quitCancelledEvent: SemanticEvent = {
        id: 'evt1',
        type: PlatformEventType.QUIT_CANCELLED,
        timestamp: Date.now(),
        entities: {},
        requiresClientAction: true,
        payload: { success: false }
      } as any;
      currentTurnEvents.push(quitCancelledEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Quit cancelled.');
    });
  });

  describe('Restart Events', () => {
    it('should display restart completed message', () => {
      const restartEvent = createRestartCompletedEvent(true);
      currentTurnEvents.push(restartEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Game restarted.');
    });

    it('should display restart cancelled message', () => {
      const restartEvent = createRestartCompletedEvent(false);
      currentTurnEvents.push(restartEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Restart cancelled.');
    });
  });

  describe('Fallback Messages', () => {
    it('should use fallback messages when no language provider', () => {
      textService.setLanguageProvider(null as any);
      
      const saveEvent = createSaveCompletedEvent(true);
      currentTurnEvents.push(saveEvent);
      
      const output = textService.processTurn();
      
      expect(output).toContain('Game saved.');
    });

    it('should handle unknown platform events gracefully', () => {
      const unknownEvent: SemanticEvent = {
        id: 'evt1',
        type: 'platform.unknown_event',
        timestamp: Date.now(),
        entities: {},
        payload: {}
      };
      currentTurnEvents.push(unknownEvent);
      
      const output = textService.processTurn();
      
      expect(output).toBe('');
    });
  });

  describe('Multiple Events', () => {
    it('should handle multiple platform events in a turn', () => {
      // Simulate save then quit
      currentTurnEvents.push(createSaveCompletedEvent(true));
      currentTurnEvents.push(createQuitConfirmedEvent());
      
      const output = textService.processTurn();
      
      expect(output).toContain('Game saved successfully.');
      expect(output).toContain('Thanks for playing!');
    });

    it('should combine platform events with other events', () => {
      // Regular message event
      currentTurnEvents.push({
        id: 'evt1',
        type: 'message.success',
        timestamp: Date.now(),
        entities: {},
        data: { messageId: 'test_message' }
      });
      
      // Platform event
      currentTurnEvents.push(createSaveCompletedEvent(true));
      
      mockLanguageProvider.getMessage = jest.fn((id: string) => {
        if (id === 'test_message') return { id, template: 'Test message.' };
        if (id === 'game_saved') return { id, template: 'Game saved successfully.' };
        return null;
      });
      
      const output = textService.processTurn();
      
      expect(output).toContain('Test message.');
      expect(output).toContain('Game saved successfully.');
    });
  });

  describe('Event Parameters', () => {
    it('should extract save name from context', () => {
      const saveEvent: SemanticEvent = {
        id: 'evt1',
        type: PlatformEventType.SAVE_COMPLETED,
        timestamp: Date.now(),
        entities: {},
        requiresClientAction: true,
        payload: {
          success: true,
          context: {
            saveName: 'my-save',
            timestamp: Date.now()
          }
        }
      } as any;
      
      mockLanguageProvider.getMessage = jest.fn((id: string) => {
        if (id === 'game_saved') {
          return { id, template: 'Game saved as "{saveName}".' };
        }
        return null;
      });
      
      currentTurnEvents.push(saveEvent);
      const output = textService.processTurn();
      
      expect(output).toContain('Game saved as "my-save".');
    });

    it('should format timestamp in save context', () => {
      const timestamp = Date.now();
      const saveEvent: SemanticEvent = {
        id: 'evt1',
        type: PlatformEventType.SAVE_COMPLETED,
        timestamp: Date.now(),
        entities: {},
        requiresClientAction: true,
        payload: {
          success: true,
          context: {
            timestamp
          }
        }
      } as any;
      
      mockLanguageProvider.getMessage = jest.fn((id: string) => {
        if (id === 'game_saved') {
          return { id, template: 'Game saved at {timestamp}.' };
        }
        return null;
      });
      
      currentTurnEvents.push(saveEvent);
      const output = textService.processTurn();
      
      const expectedTime = new Date(timestamp).toLocaleString();
      expect(output).toContain(`Game saved at ${expectedTime}.`);
    });
  });
});
