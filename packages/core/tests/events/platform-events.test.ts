/**
 * Tests for platform events system
 */

import {
  PlatformEventType,
  IPlatformEvent,
  ISaveContext,
  IRestoreContext,
  IQuitContext,
  IRestartContext,
  isPlatformEvent,
  isPlatformRequestEvent,
  isPlatformCompletionEvent,
  createPlatformEvent,
  createSaveRequestedEvent,
  createRestoreRequestedEvent,
  createQuitRequestedEvent,
  createRestartRequestedEvent,
  createSaveCompletedEvent,
  createRestoreCompletedEvent,
  createQuitConfirmedEvent,
  createQuitCancelledEvent,
  createRestartCompletedEvent
} from '../../src/events/platform-events';

describe('Platform Events', () => {
  describe('Event Types', () => {
    it('should have all required event types', () => {
      expect(PlatformEventType.SAVE_REQUESTED).toBe('platform.save_requested');
      expect(PlatformEventType.RESTORE_REQUESTED).toBe('platform.restore_requested');
      expect(PlatformEventType.QUIT_REQUESTED).toBe('platform.quit_requested');
      expect(PlatformEventType.RESTART_REQUESTED).toBe('platform.restart_requested');
      
      expect(PlatformEventType.SAVE_COMPLETED).toBe('platform.save_completed');
      expect(PlatformEventType.RESTORE_COMPLETED).toBe('platform.restore_completed');
      expect(PlatformEventType.QUIT_CONFIRMED).toBe('platform.quit_confirmed');
      expect(PlatformEventType.RESTART_COMPLETED).toBe('platform.restart_completed');
      
      expect(PlatformEventType.SAVE_FAILED).toBe('platform.save_failed');
      expect(PlatformEventType.RESTORE_FAILED).toBe('platform.restore_failed');
      expect(PlatformEventType.QUIT_CANCELLED).toBe('platform.quit_cancelled');
      expect(PlatformEventType.RESTART_CANCELLED).toBe('platform.restart_cancelled');
    });
  });

  describe('Type Guards', () => {
    it('should identify platform events', () => {
      const platformEvent = createPlatformEvent(PlatformEventType.SAVE_REQUESTED, {});
      const nonPlatformEvent = {
        id: 'test',
        type: 'other.event',
        timestamp: Date.now(),
        entities: {}
      };
      
      expect(isPlatformEvent(platformEvent)).toBe(true);
      expect(isPlatformEvent(nonPlatformEvent)).toBe(false);
    });

    it('should identify platform request events', () => {
      const saveRequest = createSaveRequestedEvent({ timestamp: Date.now() });
      const saveComplete = createSaveCompletedEvent(true);
      
      expect(isPlatformRequestEvent(saveRequest)).toBe(true);
      expect(isPlatformRequestEvent(saveComplete)).toBe(false);
    });

    it('should identify platform completion events', () => {
      const saveRequest = createSaveRequestedEvent({ timestamp: Date.now() });
      const saveComplete = createSaveCompletedEvent(true);
      const saveFailed = createSaveCompletedEvent(false, 'Test error');
      
      expect(isPlatformCompletionEvent(saveRequest)).toBe(false);
      expect(isPlatformCompletionEvent(saveComplete)).toBe(true);
      expect(isPlatformCompletionEvent(saveFailed)).toBe(true);
    });
  });

  describe('Save Events', () => {
    it('should create save requested event with context', () => {
      const context: ISaveContext = {
        saveName: 'test-save',
        slot: 1,
        autosave: false,
        timestamp: Date.now(),
        metadata: {
          score: 100,
          moves: 50
        }
      };
      
      const event = createSaveRequestedEvent(context);
      
      expect(event.type).toBe(PlatformEventType.SAVE_REQUESTED);
      expect(event.requiresClientAction).toBe(true);
      expect(event.payload.context).toEqual(context);
    });

    it('should create save completed event', () => {
      const event = createSaveCompletedEvent(true);
      
      expect(event.type).toBe(PlatformEventType.SAVE_COMPLETED);
      expect(event.payload.success).toBe(true);
      expect(event.payload.error).toBeUndefined();
    });

    it('should create save failed event with error', () => {
      const event = createSaveCompletedEvent(false, 'Disk full');
      
      expect(event.type).toBe(PlatformEventType.SAVE_FAILED);
      expect(event.payload.success).toBe(false);
      expect(event.payload.error).toBe('Disk full');
    });
  });

  describe('Restore Events', () => {
    it('should create restore requested event with context', () => {
      const context: IRestoreContext = {
        slot: 'quicksave',
        availableSaves: [
          { slot: 'quicksave', name: 'Quick Save', timestamp: Date.now() },
          { slot: 1, name: 'Manual Save', timestamp: Date.now() - 3600000 }
        ],
        lastSave: { slot: 'quicksave', timestamp: Date.now() }
      };
      
      const event = createRestoreRequestedEvent(context);
      
      expect(event.type).toBe(PlatformEventType.RESTORE_REQUESTED);
      expect(event.requiresClientAction).toBe(true);
      expect(event.payload.context).toEqual(context);
    });

    it('should create restore completed event', () => {
      const event = createRestoreCompletedEvent(true);
      
      expect(event.type).toBe(PlatformEventType.RESTORE_COMPLETED);
      expect(event.payload.success).toBe(true);
    });

    it('should create restore failed event', () => {
      const event = createRestoreCompletedEvent(false, 'Save file corrupted');
      
      expect(event.type).toBe(PlatformEventType.RESTORE_FAILED);
      expect(event.payload.success).toBe(false);
      expect(event.payload.error).toBe('Save file corrupted');
    });
  });

  describe('Quit Events', () => {
    it('should create quit requested event with context', () => {
      const context: IQuitContext = {
        score: 250,
        moves: 100,
        hasUnsavedChanges: true,
        force: false,
        stats: {
          maxScore: 300,
          achievements: ['first_room', 'found_key']
        }
      };
      
      const event = createQuitRequestedEvent(context);
      
      expect(event.type).toBe(PlatformEventType.QUIT_REQUESTED);
      expect(event.requiresClientAction).toBe(true);
      expect(event.payload.context).toEqual(context);
    });

    it('should create quit confirmed event', () => {
      const event = createQuitConfirmedEvent();
      
      expect(event.type).toBe(PlatformEventType.QUIT_CONFIRMED);
      expect(event.payload.success).toBe(true);
    });

    it('should create quit cancelled event', () => {
      const event = createQuitCancelledEvent();
      
      expect(event.type).toBe(PlatformEventType.QUIT_CANCELLED);
      expect(event.payload.success).toBe(false);
    });
  });

  describe('Restart Events', () => {
    it('should create restart requested event with context', () => {
      const context: IRestartContext = {
        currentProgress: {
          score: 150,
          moves: 75,
          location: 'throne_room'
        },
        confirmationRequired: true,
        hasUnsavedChanges: true,
        force: false
      };
      
      const event = createRestartRequestedEvent(context);
      
      expect(event.type).toBe(PlatformEventType.RESTART_REQUESTED);
      expect(event.requiresClientAction).toBe(true);
      expect(event.payload.context).toEqual(context);
    });

    it('should create restart completed event', () => {
      const event = createRestartCompletedEvent(true);
      
      expect(event.type).toBe(PlatformEventType.RESTART_COMPLETED);
      expect(event.payload.success).toBe(true);
    });

    it('should create restart cancelled event', () => {
      const event = createRestartCompletedEvent(false);
      
      expect(event.type).toBe(PlatformEventType.RESTART_CANCELLED);
      expect(event.payload.success).toBe(false);
    });
  });

  describe('Generic Platform Event Creation', () => {
    it('should create platform event with custom data', () => {
      const customData = { foo: 'bar', baz: 42 };
      const event = createPlatformEvent(
        PlatformEventType.SAVE_REQUESTED,
        { saveName: 'test' },
        customData
      );
      
      expect(event.type).toBe(PlatformEventType.SAVE_REQUESTED);
      expect(event.requiresClientAction).toBe(true);
      expect(event.payload.context).toEqual({ saveName: 'test' });
      expect(event.payload.foo).toBe('bar');
      expect(event.payload.baz).toBe(42);
    });

    it('should generate unique event IDs', () => {
      const event1 = createPlatformEvent(PlatformEventType.SAVE_REQUESTED);
      const event2 = createPlatformEvent(PlatformEventType.SAVE_REQUESTED);
      
      expect(event1.id).not.toBe(event2.id);
      expect(event1.id).toMatch(/^platform-\d+-[a-z0-9]+$/);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const event = createPlatformEvent(PlatformEventType.SAVE_REQUESTED);
      const after = Date.now();
      
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
      expect(event.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
