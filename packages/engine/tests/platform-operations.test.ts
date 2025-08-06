/**
 * Tests for GameEngine platform operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  EntityType
} from '@sharpee/world-model';
import { 
  GameEngine,
  createStandardEngine
} from '../src/game-engine';
import {
  SaveRestoreHooks,
  SaveData,
  PlatformEventType,
  createSaveRequestedEvent,
  createRestoreRequestedEvent,
  createQuitRequestedEvent,
  createRestartRequestedEvent,
  SaveContext,
  RestoreContext,
  QuitContext,
  RestartContext
} from '@sharpee/core';
import { MinimalTestStory } from './stories';

describe('GameEngine Platform Operations', () => {
  let engine: GameEngine;
  let story: MinimalTestStory;
  let mockHooks: SaveRestoreHooks;
  
  beforeEach(async () => {
    // Create engine with story
    engine = createStandardEngine();
    story = new MinimalTestStory();
    await engine.setStory(story);
    
    // Create mock hooks
    mockHooks = {
      onSaveRequested: vi.fn().mockResolvedValue(undefined),
      onRestoreRequested: vi.fn().mockResolvedValue(null),
      onQuitRequested: vi.fn().mockResolvedValue(true),
      onRestartRequested: vi.fn().mockResolvedValue(true)
    };
    
    engine.registerSaveRestoreHooks(mockHooks);
  });

  describe('Platform Event Detection', () => {
    it('should detect and queue platform events during turn execution', async () => {
      // Start engine
      engine.start();
      
      // Create a save requested event
      const saveEvent = createSaveRequestedEvent({
        saveName: 'test-save',
        timestamp: Date.now()
      });
      
      // Emit the event during turn
      const turnResult = await engine.executeTurn('look');
      
      // Manually emit platform event (simulating an action doing this)
      engine['eventSource'].emit(saveEvent);
      engine['pendingPlatformOps'].push(saveEvent);
      
      // Process platform operations
      await engine['processPlatformOperations']();
      
      // Verify save hook was called
      expect(mockHooks.onSaveRequested).toHaveBeenCalled();
    });
  });

  describe('Save Operations', () => {
    it('should process save requested event and call save hook', async () => {
      const saveContext: SaveContext = {
        saveName: 'test-save',
        timestamp: Date.now(),
        metadata: { score: 100 }
      };
      
      const saveEvent = createSaveRequestedEvent(saveContext);
      engine['pendingPlatformOps'].push(saveEvent);
      
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onSaveRequested).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            description: 'test-save'
          })
        })
      );
    });

    it('should emit save completed event on success', async () => {
      const saveEvent = createSaveRequestedEvent({ timestamp: Date.now() });
      engine['pendingPlatformOps'].push(saveEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      const completionEvent = emittedEvents.find(
        e => e.type === PlatformEventType.SAVE_COMPLETED
      );
      expect(completionEvent).toBeDefined();
      expect(completionEvent.payload.success).toBe(true);
    });

    it('should emit save failed event when hook throws', async () => {
      mockHooks.onSaveRequested = vi.fn().mockRejectedValue(new Error('Disk full'));
      
      const saveEvent = createSaveRequestedEvent({ timestamp: Date.now() });
      engine['pendingPlatformOps'].push(saveEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      const errorEvent = emittedEvents.find(
        e => e.type === PlatformEventType.SAVE_FAILED
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent.payload.success).toBe(false);
      expect(errorEvent.payload.error).toBe('Disk full');
    });

    it('should emit error event when no save hook registered', async () => {
      engine.registerSaveRestoreHooks({
        onSaveRequested: undefined as any,
        onRestoreRequested: vi.fn()
      });
      
      const saveEvent = createSaveRequestedEvent({ timestamp: Date.now() });
      engine['pendingPlatformOps'].push(saveEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      const errorEvent = emittedEvents.find(
        e => e.type === PlatformEventType.SAVE_FAILED
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent.payload.error).toBe('No save handler registered');
    });
  });

  describe('Restore Operations', () => {
    it('should process restore requested event and call restore hook', async () => {
      const restoreContext: RestoreContext = {
        slot: 'quicksave'
      };
      
      const restoreEvent = createRestoreRequestedEvent(restoreContext);
      engine['pendingPlatformOps'].push(restoreEvent);
      
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onRestoreRequested).toHaveBeenCalled();
    });

    it('should load save data and emit completion event', async () => {
      const mockSaveData: SaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        metadata: {
          storyId: 'test-story',
          storyVersion: '1.0.0',
          turnCount: 5
        },
        engineState: {
          eventSource: [],
          spatialIndex: { entities: {}, locations: {}, relationships: {} },
          turnHistory: []
        },
        storyConfig: {
          id: 'test-story',
          version: '1.0.0',
          title: 'Test Story',
          author: 'Test Author'
        }
      };
      
      // Set story config to match save
      engine['story'] = {
        config: {
          id: 'test-story',
          version: '1.0.0',
          title: 'Test Story',
          author: 'Test Author'
        }
      } as any;
      
      mockHooks.onRestoreRequested = vi.fn().mockResolvedValue(mockSaveData);
      
      const restoreEvent = createRestoreRequestedEvent({});
      engine['pendingPlatformOps'].push(restoreEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      const completionEvent = emittedEvents.find(
        e => e.type === PlatformEventType.RESTORE_COMPLETED
      );
      expect(completionEvent).toBeDefined();
      expect(completionEvent.payload.success).toBe(true);
    });

    it('should emit restore failed event when no save data available', async () => {
      mockHooks.onRestoreRequested = vi.fn().mockResolvedValue(null);
      
      const restoreEvent = createRestoreRequestedEvent({});
      engine['pendingPlatformOps'].push(restoreEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      const errorEvent = emittedEvents.find(
        e => e.type === PlatformEventType.RESTORE_FAILED
      );
      expect(errorEvent).toBeDefined();
      expect(errorEvent.payload.error).toContain('No save data available');
    });
  });

  describe('Quit Operations', () => {
    it('should process quit requested event and call quit hook', async () => {
      const quitContext: QuitContext = {
        score: 100,
        moves: 50,
        hasUnsavedChanges: true
      };
      
      const quitEvent = createQuitRequestedEvent(quitContext);
      engine['pendingPlatformOps'].push(quitEvent);
      
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onQuitRequested).toHaveBeenCalledWith(quitContext);
    });

    it('should stop engine and emit confirmation when quit confirmed', async () => {
      mockHooks.onQuitRequested = vi.fn().mockResolvedValue(true);
      
      const quitEvent = createQuitRequestedEvent({});
      engine['pendingPlatformOps'].push(quitEvent);
      
      engine.start();
      expect(engine['running']).toBe(true);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      expect(engine['running']).toBe(false);
      
      const confirmEvent = emittedEvents.find(
        e => e.type === PlatformEventType.QUIT_CONFIRMED
      );
      expect(confirmEvent).toBeDefined();
    });

    it('should emit cancelled event when quit declined', async () => {
      mockHooks.onQuitRequested = vi.fn().mockResolvedValue(false);
      
      const quitEvent = createQuitRequestedEvent({});
      engine['pendingPlatformOps'].push(quitEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      const cancelEvent = emittedEvents.find(
        e => e.type === PlatformEventType.QUIT_CANCELLED
      );
      expect(cancelEvent).toBeDefined();
    });

    it('should quit by default when no hook registered', async () => {
      engine.registerSaveRestoreHooks({
        onSaveRequested: vi.fn(),
        onRestoreRequested: vi.fn(),
        onQuitRequested: undefined
      });
      
      const quitEvent = createQuitRequestedEvent({});
      engine['pendingPlatformOps'].push(quitEvent);
      
      engine.start();
      
      await engine['processPlatformOperations']();
      
      expect(engine['running']).toBe(false);
    });
  });

  describe('Restart Operations', () => {
    it('should process restart requested event and call restart hook', async () => {
      const restartContext: RestartContext = {
        currentProgress: { score: 100, moves: 50 },
        hasUnsavedChanges: true
      };
      
      const restartEvent = createRestartRequestedEvent(restartContext);
      engine['pendingPlatformOps'].push(restartEvent);
      
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onRestartRequested).toHaveBeenCalledWith(restartContext);
    });

    it('should reinitialize story and emit completion when restart confirmed', async () => {
      mockHooks.onRestartRequested = vi.fn().mockResolvedValue(true);
      
      // Mock story
      const mockStory = {
        config: {
          id: 'test-story',
          version: '1.0.0',
          title: 'Test Story',
          author: 'Test Author',
          language: 'en-US'
        },
        initializeWorld: vi.fn(),
        createPlayer: vi.fn().mockReturnValue(story.getPlayer())
      };
      
      engine['story'] = mockStory as any;
      engine.setStory = vi.fn();
      
      const restartEvent = createRestartRequestedEvent({});
      engine['pendingPlatformOps'].push(restartEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      expect(engine.setStory).toHaveBeenCalledWith(mockStory);
      
      const completionEvent = emittedEvents.find(
        e => e.type === PlatformEventType.RESTART_COMPLETED
      );
      expect(completionEvent).toBeDefined();
      expect(completionEvent.payload.success).toBe(true);
    });

    it('should emit cancelled event when restart declined', async () => {
      mockHooks.onRestartRequested = vi.fn().mockResolvedValue(false);
      
      const restartEvent = createRestartRequestedEvent({});
      engine['pendingPlatformOps'].push(restartEvent);
      
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      await engine['processPlatformOperations']();
      
      const cancelEvent = emittedEvents.find(
        e => e.type === PlatformEventType.RESTART_CANCELLED
      );
      expect(cancelEvent).toBeDefined();
      expect(cancelEvent.payload.success).toBe(false);
    });
  });

  describe('Multiple Platform Operations', () => {
    it('should process multiple platform operations in order', async () => {
      const saveEvent = createSaveRequestedEvent({ 
        saveName: 'before-quit',
        timestamp: Date.now() 
      });
      const quitEvent = createQuitRequestedEvent({});
      
      engine['pendingPlatformOps'].push(saveEvent);
      engine['pendingPlatformOps'].push(quitEvent);
      
      const callOrder: string[] = [];
      mockHooks.onSaveRequested = vi.fn().mockImplementation(() => {
        callOrder.push('save');
        return Promise.resolve();
      });
      mockHooks.onQuitRequested = vi.fn().mockImplementation(() => {
        callOrder.push('quit');
        return Promise.resolve(true);
      });
      
      await engine['processPlatformOperations']();
      
      expect(callOrder).toEqual(['save', 'quit']);
      expect(engine['pendingPlatformOps']).toHaveLength(0);
    });

    it('should continue processing even if one operation fails', async () => {
      mockHooks.onSaveRequested = vi.fn().mockRejectedValue(new Error('Save failed'));
      mockHooks.onQuitRequested = vi.fn().mockResolvedValue(true);
      
      const saveEvent = createSaveRequestedEvent({ timestamp: Date.now() });
      const quitEvent = createQuitRequestedEvent({});
      
      engine['pendingPlatformOps'].push(saveEvent);
      engine['pendingPlatformOps'].push(quitEvent);
      
      engine.start();
      
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onQuitRequested).toHaveBeenCalled();
      expect(engine['running']).toBe(false);
    });
  });

  describe('Event Emission', () => {
    it('should add completion events to current turn events', async () => {
      const currentTurn = engine.getContext().currentTurn;
      engine['turnEvents'].set(currentTurn, []);
      
      const saveEvent = createSaveRequestedEvent({ timestamp: Date.now() });
      engine['pendingPlatformOps'].push(saveEvent);
      
      await engine['processPlatformOperations']();
      
      const turnEvents = engine['turnEvents'].get(currentTurn);
      expect(turnEvents).toBeDefined();
      expect(turnEvents!.some(e => e.type === PlatformEventType.SAVE_COMPLETED)).toBe(true);
    });

    it('should emit events through event source', async () => {
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe(event => emittedEvents.push(event));
      
      const quitEvent = createQuitRequestedEvent({});
      engine['pendingPlatformOps'].push(quitEvent);
      
      await engine['processPlatformOperations']();
      
      expect(emittedEvents.some(e => e.type === PlatformEventType.QUIT_CONFIRMED)).toBe(true);
    });
  });
});
