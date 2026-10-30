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
import { processPlatformOperations } from '../src/turn/platform-operations';
import { processMetaPlatformOperation } from '../src/turn/meta-command';
import {
  SaveRestoreHooks,
  SaveData,
  type IRestoreIdentity,
  type IRestoreReconciliation,
  type ISemanticEvent,
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

/**
 * Removing every hook. Registration MERGES (#229), so `{}` is a no-op and a
 * test that means "nothing is registered" has to say which entries it is
 * dropping — every read site treats absent and undefined alike.
 */
const NO_HOOKS = {
  onSaveRequested: undefined,
  onRestoreRequested: undefined,
  onQuitRequested: undefined,
  onRestartRequested: undefined
};

describe('GameEngine Platform Operations', () => {
  let engine: GameEngine;
  let story: MinimalTestStory;
  let mockHooks: SaveRestoreHooks;
  
  beforeEach(() => {
    // Create engine with static dependencies
    const setup = setupTestEngine();
    engine = setup.engine;
    story = new MinimalTestStory();
    engine.installStory(story);
    
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
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());
      
      const completedEvents = events.filter(e => e.type === 'platform.save_completed');
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].payload.success).toBe(true);
    });

    it('should emit save failed event when hook throws', async () => {
      mockHooks.onSaveRequested = vi.fn().mockRejectedValue(new Error('Save failed'));
      engine.registerSaveRestoreHooks(mockHooks);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const saveEvent = createSaveRequestedEvent({
        saveName: 'test-save',
        timestamp: Date.now()
      });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await processPlatformOperations(engine['turnEngine']());
      
      const failedEvents = events.filter(e => e.type === 'platform.save_failed');
      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].payload.error).toBeDefined();
    });

    it('should emit save failed event when no save hook registered', async () => {
      engine.registerSaveRestoreHooks(NO_HOOKS);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const saveEvent = createSaveRequestedEvent({
        saveName: 'test-save',
        timestamp: Date.now()
      });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());
      
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

      engine.registerSaveRestoreHooks(mockHooks);

      // Move past the save so the restore has somewhere to roll back to.
      await engine.executeTurn('look');
      await engine.executeTurn('look');
      const turnBeforeRestore = engine.getContext().currentTurn;
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test-save' });
      
      engine['pendingPlatformOps'].push(restoreEvent);
      await processPlatformOperations(engine['turnEngine']());
      
      const completedEvents = events.filter(e => e.type === 'platform.restore_completed');
      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].payload.success).toBe(true);

      // The engine actually rolled to the loaded save: the turn counter is
      // the save's turn plus one, not where the two looks left it.
      expect(engine.getContext().currentTurn).toBe(mockSaveData.metadata.turnCount + 1);
      expect(engine.getContext().currentTurn).toBeLessThan(turnBeforeRestore);
    });

    it('should emit restore failed event when no save data available', async () => {
      mockHooks.onRestoreRequested = vi.fn().mockResolvedValue(null);
      engine.registerSaveRestoreHooks(mockHooks);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test-save' });
      
      engine['pendingPlatformOps'].push(restoreEvent);
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());
      
      const confirmedEvents = events.filter(e => e.type === 'platform.quit_confirmed');
      expect(confirmedEvents).toHaveLength(1);
      expect(engine['phase'].name).toBe('stopped');
    });

    it('should emit cancelled event when quit declined', async () => {
      mockHooks.onQuitRequested = vi.fn().mockResolvedValue(false);
      engine.registerSaveRestoreHooks(mockHooks);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const quitEvent = createQuitRequestedEvent({ reason: 'user_requested' });
      
      engine['pendingPlatformOps'].push(quitEvent);
      await processPlatformOperations(engine['turnEngine']());
      
      const cancelledEvents = events.filter(e => e.type === 'platform.quit_cancelled');
      expect(cancelledEvents).toHaveLength(1);
      expect(engine['phase'].name).toBe('playing');
    });

    it('should quit by default when no hook registered', async () => {
      engine.registerSaveRestoreHooks(NO_HOOKS);
      
      const events: any[] = [];
      engine.on('event', (event) => events.push(event));
      
      const quitEvent = createQuitRequestedEvent({ reason: 'user_requested' });
      
      engine['pendingPlatformOps'].push(quitEvent);
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());

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
      expect(engine['phase'].name).toBe('stopped');
      const ended = events.filter(e => e.type === 'game.ended');
      expect(ended).toHaveLength(1);
      expect(ended[0].data?.ending?.type).toBe('restart');

      // The world is NOT cleared — the client reboot owns fresh state
      expect(world.getAllEntities().length).toBe(entityCountBefore);
    });

    it('should emit cancelled event and keep running when restart declined', async () => {
      mockHooks.onRestartRequested = vi.fn().mockResolvedValue(false);
      engine.registerSaveRestoreHooks(mockHooks);

      const events: any[] = [];
      engine.on('event', (event) => events.push(event));

      const world = engine.getWorld();
      const entityCountBefore = world.getAllEntities().length;

      const restartEvent = createRestartRequestedEvent({ reason: 'user_requested' });

      engine['pendingPlatformOps'].push(restartEvent);
      await processPlatformOperations(engine['turnEngine']());

      const cancelledEvents = events.filter(e => e.type === 'platform.restart_cancelled');
      expect(cancelledEvents).toHaveLength(1);
      expect(cancelledEvents[0].payload.success).toBe(false);

      // Declined restart tears nothing down (ADR-248): world intact, engine running
      expect(engine['phase'].name).toBe('playing');
      expect(world.getAllEntities().length).toBe(entityCountBefore);
    });

    it('meta path: confirmed restart returns ack, no completion, and stops the engine (ADR-248)', async () => {
      const restartEvent = createRestartRequestedEvent({ reason: 'user_requested' });

      const completionEvents = await processMetaPlatformOperation(engine['turnEngine'](), restartEvent);

      expect(completionEvents.filter((e: any) => e.type === 'platform.restart_completed')).toHaveLength(0);
      expect(completionEvents.filter((e: any) =>
        e.type === 'game.message' &&
        e.data?.messageId === 'if.action.restarting.game_restarting'
      )).toHaveLength(1);
      expect(engine['phase'].name).toBe('stopped');
    });

    it('meta path: declined restart returns restart_cancelled and keeps the engine running', async () => {
      mockHooks.onRestartRequested = vi.fn().mockResolvedValue(false);
      engine.registerSaveRestoreHooks(mockHooks);

      const restartEvent = createRestartRequestedEvent({ reason: 'user_requested' });

      const completionEvents = await processMetaPlatformOperation(engine['turnEngine'](), restartEvent);

      expect(completionEvents.filter((e: any) => e.type === 'platform.restart_cancelled')).toHaveLength(1);
      expect(engine['phase'].name).toBe('playing');
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
      engine.registerSaveRestoreHooks(mockHooks);
      
      const saveEvent = createSaveRequestedEvent({ saveName: 'test', timestamp: Date.now() });
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test' });
      
      engine['pendingPlatformOps'].push(saveEvent);
      engine['pendingPlatformOps'].push(restoreEvent);
      
      await processPlatformOperations(engine['turnEngine']());
      
      expect(callOrder).toEqual(['save', 'restore']);
    });

    it('should continue processing even if one operation fails', async () => {
      mockHooks.onSaveRequested = vi.fn().mockRejectedValue(new Error('Save failed'));
      engine.registerSaveRestoreHooks(mockHooks);
      mockHooks.onRestoreRequested = vi.fn().mockResolvedValue(null);
      engine.registerSaveRestoreHooks(mockHooks);
      
      const saveEvent = createSaveRequestedEvent({ saveName: 'test', timestamp: Date.now() });
      const restoreEvent = createRestoreRequestedEvent({ saveName: 'test' });
      
      engine['pendingPlatformOps'].push(saveEvent);
      engine['pendingPlatformOps'].push(restoreEvent);
      
      await processPlatformOperations(engine['turnEngine']());
      
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
      await processPlatformOperations(engine['turnEngine']());
      
      const eventsForTurn = turnEvents.get(currentTurn);
      expect(eventsForTurn).toBeDefined();
      expect(eventsForTurn?.some(e => e.type === 'platform.save_completed')).toBe(true);
    });

    it('should emit events through event source', async () => {
      const emittedEvents: any[] = [];
      engine['eventSource'].subscribe((event) => emittedEvents.push(event));
      
      const saveEvent = createSaveRequestedEvent({ saveName: 'test', timestamp: Date.now() });
      
      engine['pendingPlatformOps'].push(saveEvent);
      await processPlatformOperations(engine['turnEngine']());

      expect(emittedEvents.some(e => e.type === 'platform.save_completed')).toBe(true);
    });
  });

  /**
   * ADR-388 D5 — the engine compares stamps and delivers the story's
   * reconciliation report after the completion event: the report always,
   * the player's one line only when something was unmappable.
   */
  describe('Restore reconciliation (ADR-388 D5)', () => {
    class StampedStory extends MinimalTestStory {
      identityHandedOver: IRestoreIdentity | undefined;
      constructor(readonly identityStamp: string, private readonly unmappable: IRestoreReconciliation['unmappable']) {
        super();
      }
      onWorldRestored(_world: WorldModel, _turn: number, identity: IRestoreIdentity): IRestoreReconciliation | undefined {
        this.identityHandedOver = identity;
        if (identity.matches) return undefined;
        return {
          savedStamp: identity.savedStamp,
          currentStamp: this.identityStamp,
          addedEntities: ['attic'],
          addedExits: [],
          droppedKeys: [],
          reseededLandings: [],
          unmappable: this.unmappable,
        };
      }
    }

    /** A save written under one stamp, restored through the dispatcher into a story under another. */
    async function restoreInto(story: StampedStory, savedStamp: string) {
      const source = setupTestEngine();
      source.engine.installStory(new StampedStory(savedStamp, []));
      const save = (source.engine as unknown as { createSaveData(): SaveData }).createSaveData();
      source.engine.stop();

      const target = setupTestEngine();
      target.engine.installStory(story);
      target.engine.registerSaveRestoreHooks({ onRestoreRequested: vi.fn().mockResolvedValue(save) });
      target.engine.start();
      const emitted: ISemanticEvent[] = [];
      target.engine.on('event', (event) => emitted.push(event as ISemanticEvent));
      target.engine['pendingPlatformOps'].push(createRestoreRequestedEvent({ saveName: 'test' }));
      await processPlatformOperations(target.engine['turnEngine']());
      target.engine.stop();
      return { save, emitted };
    }

    it('delivers the report after the completion event, and the player line when something was unmappable', async () => {
      const story = new StampedStory('edited', [{ key: 'chord.chapter.current', saved: 'yard', declared: ['market', 'lane'] }]);
      const { save, emitted } = await restoreInto(story, 'original');
      expect(save.metadata.identityStamp).toBe('original');
      expect(story.identityHandedOver).toEqual({ savedStamp: 'original', currentStamp: 'edited', matches: false });

      const types = emitted.map(e => e.type);
      expect(types.indexOf('platform.save_reconciled')).toBeGreaterThan(types.indexOf('platform.restore_completed'));
      const report = emitted.find(e => e.type === 'platform.save_reconciled') as (ISemanticEvent & { payload: Record<string, unknown> });
      expect(report.payload.addedEntities).toEqual(['attic']);
      expect(report.payload.unmappable).toHaveLength(1);
      const line = emitted.filter(e => e.type === 'game.message' && (e.data as { messageId?: string }).messageId === 'core.save_reconciled');
      expect(line).toHaveLength(1);
    });

    it('says nothing to the player when the reconcile mapped everything', async () => {
      const { emitted } = await restoreInto(new StampedStory('edited', []), 'original');
      expect(emitted.some(e => e.type === 'platform.save_reconciled')).toBe(true);
      expect(emitted.some(e => e.type === 'game.message')).toBe(false);
    });

    it('hands the story a matching verdict and delivers no report when the stamps are equal', async () => {
      const story = new StampedStory('same', []);
      const { emitted } = await restoreInto(story, 'same');
      expect(story.identityHandedOver).toEqual({ savedStamp: 'same', currentStamp: 'same', matches: true });
      expect(emitted.some(e => e.type === 'platform.save_reconciled')).toBe(false);
      expect(emitted.some(e => e.type === 'platform.restore_completed')).toBe(true);
    });
  });
});