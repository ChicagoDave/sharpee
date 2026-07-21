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
import { GameEngine } from '../src/game-engine';
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
import { setupTestEngine } from './test-helpers/setup-test-engine';

describe('GameEngine Platform Operations', () => {
  let engine: GameEngine;
  let story: MinimalTestStory;
  let mockHooks: SaveRestoreHooks;
  
  beforeEach(() => {
    // Create engine with static dependencies
    const setup = setupTestEngine();
    engine = setup.engine;
    story = new MinimalTestStory();
    engine.setStory(story);
    
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
    beforeEach(() => {
      engine.start();
    });

    it('should process save requested event and call save hook', async () => {
      const saveContext: SaveContext = {
        saveName: 'test-save',
        timestamp: Date.now()
      };
      
      const saveEvent = createSaveRequestedEvent(saveContext);
      
      // Queue the event
      engine['pendingPlatformOps'].push(saveEvent);
      
      // Process operations
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
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const saveEvent = createSaveRequestedEvent({
        saveName: 'test-save',
        timestamp: Date.now()
      });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await engine['processPlatformOperations']();
      
      const completedEvents = events.filter(e => e.type === 'platform.save_completed');
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].payload.success).toBe(true);
    });

    it('should emit save failed event when hook throws', async () => {
      mockHooks.onSaveRequested = vi.fn().mockRejectedValue(new Error('Save failed'));
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const saveEvent = createSaveRequestedEvent({
        saveName: 'test-save',
        timestamp: Date.now()
      });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await engine['processPlatformOperations']();
      
      const failedEvents = events.filter(e => e.type === 'platform.save_failed');
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].payload.error).toBeDefined();
    });

    it('should emit save failed event when no save hook registered', async () => {
      engine.registerSaveRestoreHooks({});
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const saveEvent = createSaveRequestedEvent({
        saveName: 'test-save',
        timestamp: Date.now()
      });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await engine['processPlatformOperations']();
      
      const failedEvents = events.filter(e => e.type === 'platform.save_failed');
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].payload.error).toBeDefined();
    });
  });

  describe('Restore Operations', () => {
    beforeEach(() => {
      engine.start();
    });

    it('should process restore requested event and call restore hook', async () => {
      const restoreContext: RestoreContext = {
        saveName: 'test-save'
      };
      
      const restoreEvent = createRestoreRequestedEvent(restoreContext);
      
      engine['pendingPlatformOps'].push(restoreEvent);
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onRestoreRequested).toHaveBeenCalled();
    });

    it('should load save data and emit completion event', async () => {
      // Produce a real save from the live engine so the mock matches
      // the current `SAVE_FORMAT_VERSION` and `worldSnapshot` shape.
      // Hand-crafted v1 blobs were rejected after the format bump.
      const mockSaveData: SaveData = (
        engine as unknown as { createSaveData(): SaveData }
      ).createSaveData();

      mockHooks.onRestoreRequested = vi.fn().mockResolvedValue(mockSaveData);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test-save' });
      
      engine['pendingPlatformOps'].push(restoreEvent);
      await engine['processPlatformOperations']();
      
      const completedEvents = events.filter(e => e.type === 'platform.restore_completed');
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].payload.success).toBe(true);
    });

    it('should emit restore failed event when no save data available', async () => {
      mockHooks.onRestoreRequested = vi.fn().mockResolvedValue(null);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test-save' });
      
      engine['pendingPlatformOps'].push(restoreEvent);
      await engine['processPlatformOperations']();
      
      const failedEvents = events.filter(e => e.type === 'platform.restore_failed');
      expect(failedEvents).toHaveLength(1);
    });
  });

  describe('Quit Operations', () => {
    beforeEach(() => {
      engine.start();
    });

    it('should process quit requested event and call quit hook', async () => {
      const quitContext: QuitContext = {
        reason: 'user_requested'
      };
      
      const quitEvent = createQuitRequestedEvent(quitContext);
      
      engine['pendingPlatformOps'].push(quitEvent);
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onQuitRequested).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'user_requested'
        })
      );
    });

    it('should stop engine and emit confirmation when quit confirmed', async () => {
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const quitEvent = createQuitRequestedEvent({ reason: 'user_requested' });
      
      engine['pendingPlatformOps'].push(quitEvent);
      await engine['processPlatformOperations']();
      
      const confirmedEvents = events.filter(e => e.type === 'platform.quit_confirmed');
      expect(confirmedEvents).toHaveLength(1);
      expect(engine['running']).toBe(false);
    });

    it('should emit cancelled event when quit declined', async () => {
      mockHooks.onQuitRequested = vi.fn().mockResolvedValue(false);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const quitEvent = createQuitRequestedEvent({ reason: 'user_requested' });
      
      engine['pendingPlatformOps'].push(quitEvent);
      await engine['processPlatformOperations']();
      
      const cancelledEvents = events.filter(e => e.type === 'platform.quit_cancelled');
      expect(cancelledEvents).toHaveLength(1);
      expect(engine['running']).toBe(true);
    });

    it('should quit by default when no hook registered', async () => {
      engine.registerSaveRestoreHooks({});
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const quitEvent = createQuitRequestedEvent({ reason: 'user_requested' });
      
      engine['pendingPlatformOps'].push(quitEvent);
      await engine['processPlatformOperations']();
      
      const confirmedEvents = events.filter(e => e.type === 'platform.quit_confirmed');
      expect(confirmedEvents).toHaveLength(1);
    });
  });

  describe('Restart Operations', () => {
    beforeEach(() => {
      engine.start();
    });

    it('should process restart requested event and call restart hook', async () => {
      const restartContext: RestartContext = {
        reason: 'user_requested'
      };
      
      const restartEvent = createRestartRequestedEvent(restartContext);
      
      engine['pendingPlatformOps'].push(restartEvent);
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onRestartRequested).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'user_requested'
        })
      );
    });

    it('should ack, stop with reason restart, and leave the world untouched when confirmed (ADR-248)', async () => {
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));

      const world = engine.getWorld();
      const entityCountBefore = world.getAllEntities().length;
      expect(entityCountBefore).toBeGreaterThan(0);

      const restartEvent = createRestartRequestedEvent({ reason: 'user_requested' });

      engine['pendingPlatformOps'].push(restartEvent);
      await engine['processPlatformOperations']();

      // No pre-emptive success claim — the client's reboot banner is the
      // success signal (ADR-248 decision 1)
      expect(events.filter(e => e.type === 'platform.restart_completed')).toHaveLength(0);

      // The ack renders in the final packet via game.message
      const acks = events.filter(
        e => e.type === 'game.message' &&
             e.data?.messageId === 'if.action.restarting.game_restarting'
      );
      expect(acks).toHaveLength(1);

      // Engine stopped with reason 'restart'; game.ended carries it
      expect(engine['running']).toBe(false);
      const ended = events.filter(e => e.type === 'game.ended');
      expect(ended).toHaveLength(1);
      expect(ended[0].data?.ending?.type).toBe('restart');

      // The world is NOT cleared — the client reboot owns fresh state
      expect(world.getAllEntities().length).toBe(entityCountBefore);
    });

    it('should emit cancelled event and keep running when restart declined', async () => {
      mockHooks.onRestartRequested = vi.fn().mockResolvedValue(false);

      const events: any[] = [];
      engine.on('event', (event) => events.push(event));

      const world = engine.getWorld();
      const entityCountBefore = world.getAllEntities().length;

      const restartEvent = createRestartRequestedEvent({ reason: 'user_requested' });

      engine['pendingPlatformOps'].push(restartEvent);
      await engine['processPlatformOperations']();

      const cancelledEvents = events.filter(e => e.type === 'platform.restart_cancelled');
      expect(cancelledEvents).toHaveLength(1);
      expect(cancelledEvents[0].payload.success).toBe(false);

      // Declined restart tears nothing down (ADR-248): world intact, engine running
      expect(engine['running']).toBe(true);
      expect(world.getAllEntities().length).toBe(entityCountBefore);
    });

    it('meta path: confirmed restart returns ack, no completion, and stops the engine (ADR-248)', async () => {
      const restartEvent = createRestartRequestedEvent({ reason: 'user_requested' });

      const completionEvents = await engine['processMetaPlatformOperation'](restartEvent);

      expect(completionEvents.filter((e: any) => e.type === 'platform.restart_completed')).toHaveLength(0);
      expect(completionEvents.filter((e: any) =>
        e.type === 'game.message' &&
        e.data?.messageId === 'if.action.restarting.game_restarting'
      )).toHaveLength(1);
      expect(engine['running']).toBe(false);
    });

    it('meta path: declined restart returns restart_cancelled and keeps the engine running', async () => {
      mockHooks.onRestartRequested = vi.fn().mockResolvedValue(false);

      const restartEvent = createRestartRequestedEvent({ reason: 'user_requested' });

      const completionEvents = await engine['processMetaPlatformOperation'](restartEvent);

      expect(completionEvents.filter((e: any) => e.type === 'platform.restart_cancelled')).toHaveLength(1);
      expect(engine['running']).toBe(true);
    });
  });

  describe('Multiple Platform Operations', () => {
    beforeEach(() => {
      engine.start();
    });

    it('should process multiple platform operations in order', async () => {
      const callOrder: string[] = [];
      
      mockHooks.onSaveRequested = vi.fn().mockImplementation(async () => {
        callOrder.push('save');
      });
      
      mockHooks.onRestoreRequested = vi.fn().mockImplementation(async () => {
        callOrder.push('restore');
        return null;
      });
      
      const saveEvent = createSaveRequestedEvent({ saveName: 'test', timestamp: Date.now() });
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test' });
      
      engine['pendingPlatformOps'].push(saveEvent);
      engine['pendingPlatformOps'].push(restoreEvent);
      
      await engine['processPlatformOperations']();
      
      expect(callOrder).toEqual(['save', 'restore']);
    });

    it('should continue processing even if one operation fails', async () => {
      mockHooks.onSaveRequested = vi.fn().mockRejectedValue(new Error('Save failed'));
      mockHooks.onRestoreRequested = vi.fn().mockResolvedValue(null);
      
      const saveEvent = createSaveRequestedEvent({ saveName: 'test', timestamp: Date.now() });
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test' });
      
      engine['pendingPlatformOps'].push(saveEvent);
      engine['pendingPlatformOps'].push(restoreEvent);
      
      await engine['processPlatformOperations']();
      
      expect(mockHooks.onSaveRequested).toHaveBeenCalled();
      expect(mockHooks.onRestoreRequested).toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    beforeEach(() => {
      engine.start();
    });

    it('should add completion events to current turn events', async () => {
      const turnEvents = engine['turnEvents'];
      const currentTurn = engine.getContext().currentTurn;
      
      const saveEvent = createSaveRequestedEvent({ saveName: 'test', timestamp: Date.now() });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await engine['processPlatformOperations']();
      
      const eventsForTurn = turnEvents.get(currentTurn);
      expect(eventsForTurn).toBeDefined();
      expect(eventsForTurn?.some(e => e.type === 'platform.save_completed')).toBe(true);
    });

    it('should emit events through event source', async () => {
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe((event) => emittedEvents.push(event));
      
      const saveEvent = createSaveRequestedEvent({ saveName: 'test', timestamp: Date.now() });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await engine['processPlatformOperations']();
      
      expect(emittedEvents.some(e => e.type === 'platform.save_completed')).toBe(true);
    });
  });
});