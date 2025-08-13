/**
 * Tests for platform event actions (save, restore, quit, restart)
 */

import { describe, test, expect, beforeEach, it } from 'vitest';
import { 
  savingAction,
  restoringAction,
  quittingAction,
  restartingAction
} from '../../src/actions/standard';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../src/actions/constants';
import { 
  PlatformEventType,
  isPlatformEvent,
  isPlatformRequestEvent
} from '@sharpee/core';
import { createRealTestContext, setupBasicWorld, createCommand } from '../test-utils';
import { setupSharedData, getSharedData } from '../platform-test-helpers';

describe.skip('Platform Event Actions', () => {
  let world: WorldModel;
  let player: IFEntity;
  let room: IFEntity;

  beforeEach(() => {
    // Use setupBasicWorld to create a proper world with player
    const setup = setupBasicWorld();
    world = setup.world;
    player = setup.player;
    room = setup.room;
  });

  describe('Saving Action', () => {
    it('should emit platform save requested event', () => {
      const saveName = 'test-save';
      const context = createRealTestContext(savingAction, world,
        createCommand(IFActions.SAVING, undefined, undefined)
      );
      context.command.parsed.extras = { name: saveName };
      
      // Set up shared data
      setupSharedData(world, {
        score: 100,
        moves: 50,
        turnCount: 25,
        lastSaveMove: 40,
        saves: {
          'default': { score: 80, moves: 40, timestamp: Date.now() - 3600000 },
          'quicksave': { score: 90, moves: 45, timestamp: Date.now() - 1800000 }
        }
      });
      
      const events = savingAction.execute(context);
      
      const platformEvent = events.find(e => isPlatformEvent(e));
      expect(platformEvent).toBeDefined();
      expect(platformEvent?.type).toBe(PlatformEventType.SAVE_REQUESTED);
      expect(isPlatformRequestEvent(platformEvent!)).toBe(true);
    });

    it.skip('should include save context with metadata', () => {
      // Set up shared data BEFORE creating context
      setupSharedData(world, {
        score: 100,
        moves: 50,
        turnCount: 25
      });
      
      const context = createRealTestContext(savingAction, world,
        createCommand(IFActions.SAVING, undefined, undefined)
      );
      context.command.parsed.extras = { name: 'my-save' };
      
      const events = savingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.SAVE_REQUESTED);
      
      console.log('Platform event context:', platformEvent?.payload.context);
      
      expect(platformEvent?.payload.context).toMatchObject({
        saveName: 'my-save',
        metadata: {
          score: 100,
          moves: 50,
          turnCount: 25,
          quickSave: undefined
        }
      });
    });

    it('should validate save name', () => {
      const context = createRealTestContext(savingAction, world,
        createCommand(IFActions.SAVING, undefined, undefined)
      );
      context.command.parsed.extras = { name: 'invalid<>name' };
      
      const events = savingAction.execute(context);
      
      const errorEvent = events.find(e => e.type === 'action.error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.messageId).toContain('invalid_save_name');
      expect(errorEvent?.data.params).toEqual({ saveName: 'invalid<>name' });
      expect(events.find(e => isPlatformEvent(e))).toBeUndefined();
    });

    it('should respect save restrictions', () => {
      const context = createRealTestContext(savingAction, world,
        createCommand(IFActions.SAVING, undefined, undefined)
      );
      
      setupSharedData(world, {
        saveRestrictions: { disabled: true }
      });
      
      const events = savingAction.execute(context);
      
      const errorEvent = events.find(e => e.type === 'action.error');
      expect(errorEvent?.data.messageId).toBe('save_not_allowed');
      expect(events.find(e => isPlatformEvent(e))).toBeUndefined();
    });

    it('should handle quick saves', () => {
      const context = createRealTestContext(savingAction, world,
        createCommand(IFActions.SAVING, undefined, undefined)
      );
      context.command.parsed.extras = { quick: true };
      
      // Set up shared data
      setupSharedData(world, {
        score: 100,
        moves: 50,
        turnCount: 25
      });
      
      const events = savingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.SAVE_REQUESTED);
      
      expect(platformEvent?.payload.context.metadata.quickSave).toBe(true);
    });

    it('should emit save requested notification event', () => {
      const context = createRealTestContext(savingAction, world,
        createCommand(IFActions.SAVING, undefined, undefined)
      );
      
      // Set up shared data
      setupSharedData(world, {
        score: 100,
        moves: 50,
        turnCount: 25
      });
      
      const events = savingAction.execute(context);
      
      const notificationEvent = events.find(e => e.type === 'if.event.save_requested');
      expect(notificationEvent).toBeDefined();
      expect(notificationEvent?.data).toMatchObject({
        saveName: 'default'
      });
    });
  });

  describe('Restoring Action', () => {
    it('should emit platform restore requested event', () => {
      const context = createRealTestContext(restoringAction, world,
        createCommand(IFActions.RESTORING, undefined, undefined)
      );
      
      setupSharedData(world, {
        saves: {
          'default': { score: 80, moves: 40, timestamp: Date.now() - 3600000 }
        }
      });
      
      const events = restoringAction.execute(context);
      
      const platformEvent = events.find(e => isPlatformEvent(e));
      expect(platformEvent).toBeDefined();
      expect(platformEvent?.type).toBe(PlatformEventType.RESTORE_REQUESTED);
    });

    it('should include available saves in context', () => {
      const context = createRealTestContext(restoringAction, world,
        createCommand(IFActions.RESTORING, undefined, undefined)
      );
      
      const now = Date.now();
      setupSharedData(world, {
        saves: {
          'default': { score: 80, moves: 40, timestamp: now - 3600000 },
          'quicksave': { score: 90, moves: 45, timestamp: now - 1800000 }
        }
      });
      
      const events = restoringAction.execute(context);
      
      const platformEvent = events.find(e => e.type === PlatformEventType.RESTORE_REQUESTED);
      const restoreContext = platformEvent?.payload.context;
      
      expect(restoreContext?.availableSaves).toHaveLength(2);
      expect(restoreContext?.availableSaves[0]).toMatchObject({
        slot: 'default',
        name: 'default',
        metadata: { score: 80, moves: 40 }
      });
      expect(restoreContext?.availableSaves[1]).toMatchObject({
        slot: 'quicksave',
        name: 'quicksave',
        metadata: { score: 90, moves: 45 }
      });
    });

    it('should handle no saves available', () => {
      const context = createRealTestContext(restoringAction, world,
        createCommand(IFActions.RESTORING, undefined, undefined)
      );
      
      setupSharedData(world, {
        saves: {}
      });
      
      const events = restoringAction.execute(context);
      
      const errorEvent = events.find(e => e.type === 'action.error');
      expect(errorEvent?.data.messageId).toContain('no_saves');
      expect(events.find(e => isPlatformEvent(e))).toBeUndefined();
    });

    it('should respect restore restrictions', () => {
      const context = createRealTestContext(restoringAction, world,
        createCommand(IFActions.RESTORING, undefined, undefined)
      );
      
      setupSharedData(world, {
        saves: {},
        restoreRestrictions: { disabled: true }
      });
      
      const events = restoringAction.execute(context);
      
      const errorEvent = events.find(e => e.type === 'action.error');
      expect(errorEvent?.data.messageId).toBe('restore_not_allowed');
      expect(events.find(e => isPlatformEvent(e))).toBeUndefined();
    });

    it('should identify last save', () => {
      const context = createRealTestContext(restoringAction, world,
        createCommand(IFActions.RESTORING, undefined, undefined)
      );
      
      const now = Date.now();
      setupSharedData(world, {
        saves: {
          'default': { score: 80, moves: 40, timestamp: now - 3600000 },
          'quicksave': { score: 90, moves: 45, timestamp: now - 1800000 }
        }
      });
      
      const events = restoringAction.execute(context);
      
      const platformEvent = events.find(e => e.type === PlatformEventType.RESTORE_REQUESTED);
      const restoreContext = platformEvent?.payload.context;
      
      expect(restoreContext?.lastSave).toMatchObject({
        slot: 'quicksave'
      });
    });
  });

  describe('Quitting Action', () => {
    it('should emit platform quit requested event', () => {
      const context = createRealTestContext(quittingAction, world,
        createCommand(IFActions.QUITTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        score: 100,
        moves: 50
      });
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => isPlatformEvent(e));
      expect(platformEvent).toBeDefined();
      expect(platformEvent?.type).toBe(PlatformEventType.QUIT_REQUESTED);
    });

    it('should include game state in quit context', () => {
      const context = createRealTestContext(quittingAction, world,
        createCommand(IFActions.QUITTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        score: 100,
        moves: 50,
        lastSaveMove: 40
      });
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === PlatformEventType.QUIT_REQUESTED);
      const quitContext = platformEvent?.payload.context;
      
      expect(quitContext).toMatchObject({
        score: 100,
        moves: 50,
        hasUnsavedChanges: true,
        force: false
      });
    });

    it('should detect unsaved changes', () => {
      const context = createRealTestContext(quittingAction, world,
        createCommand(IFActions.QUITTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        score: 100,
        moves: 50,
        lastSaveMove: 50  // No new moves since save
      });
      
      const events = quittingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.QUIT_REQUESTED);
      
      expect(platformEvent?.payload.context.hasUnsavedChanges).toBe(false);
    });

    it('should handle force quit', () => {
      const context = createRealTestContext(quittingAction, world,
        createCommand(IFActions.QUITTING, undefined, undefined)
      );
      context.command.parsed.extras = { force: true };
      
      setupSharedData(world, {
        score: 100,
        moves: 50
      });
      
      const events = quittingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.QUIT_REQUESTED);
      
      expect(platformEvent?.payload.context.force).toBe(true);
    });

    it('should include game statistics', () => {
      const context = createRealTestContext(quittingAction, world,
        createCommand(IFActions.QUITTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        score: 250,
        maxScore: 300,
        moves: 100,
        playTime: 3600000,
        achievements: ['explorer', 'puzzle_solver']
      });
      
      const events = quittingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.QUIT_REQUESTED);
      
      expect(platformEvent?.payload.context.stats).toMatchObject({
        maxScore: 300,
        nearComplete: true,
        playTime: 3600000,
        achievements: ['explorer', 'puzzle_solver']
      });
    });
  });

  describe('Restarting Action', () => {
    it('should emit platform restart requested event', () => {
      const context = createRealTestContext(restartingAction, world,
        createCommand(IFActions.RESTARTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        score: 100,
        moves: 50
      });
      
      const events = restartingAction.execute(context);
      
      const platformEvent = events.find(e => isPlatformEvent(e));
      expect(platformEvent).toBeDefined();
      expect(platformEvent?.type).toBe(PlatformEventType.RESTART_REQUESTED);
    });

    it('should include current progress in context', () => {
      const context = createRealTestContext(restartingAction, world,
        createCommand(IFActions.RESTARTING, undefined, undefined)
      );
      
      // Player is already in 'Test Room' from setupBasicWorld
      
      setupSharedData(world, {
        score: 100,
        moves: 50
      });
      
      const events = restartingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.RESTART_REQUESTED);
      
      expect(platformEvent?.payload.context.currentProgress).toMatchObject({
        score: 100,
        moves: 50,
        location: 'Test Room'
      });
    });

    it('should determine confirmation requirements', () => {
      const context = createRealTestContext(restartingAction, world,
        createCommand(IFActions.RESTARTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        moves: 5,  // Very few moves
        lastSaveMove: 5
      });
      
      const events = restartingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.RESTART_REQUESTED);
      
      expect(platformEvent?.payload.context.confirmationRequired).toBe(false);
    });

    it('should handle force restart', () => {
      const context = createRealTestContext(restartingAction, world,
        createCommand(IFActions.RESTARTING, undefined, undefined)
      );
      context.command.parsed.extras = { now: true };
      
      setupSharedData(world, {
        score: 100,
        moves: 50
      });
      
      const events = restartingAction.execute(context);
      const platformEvent = events.find(e => e.type === PlatformEventType.RESTART_REQUESTED);
      
      expect(platformEvent?.payload.context.force).toBe(true);
    });

    it('should emit restart requested notification', () => {
      const context = createRealTestContext(restartingAction, world,
        createCommand(IFActions.RESTARTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        score: 100,
        moves: 50,
        lastSaveMove: 40
      });
      
      const events = restartingAction.execute(context);
      
      const notificationEvent = events.find(e => e.type === 'if.event.restart_requested');
      expect(notificationEvent).toBeDefined();
      expect(notificationEvent?.data).toMatchObject({
        hasUnsavedChanges: true,
        force: false
      });
    });

    it('should provide hint for significant progress', () => {
      const context = createRealTestContext(restartingAction, world,
        createCommand(IFActions.RESTARTING, undefined, undefined)
      );
      
      setupSharedData(world, {
        score: 100,
        moves: 100,
        lastSaveMove: 50
      });
      
      const events = restartingAction.execute(context);
      
      const successEvent = events.find(e => e.type === 'action.success');
      expect(successEvent?.data.messageId).toContain('restart_requested');
      expect(successEvent?.data.params).toMatchObject({
        hint: 'The game will ask for confirmation before restarting.'
      });
    });
  });
});
