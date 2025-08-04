/**
 * Unit tests for quitting action
 * 
 * Note: The quitting action emits platform events that will be processed after turn completion.
 * The actual quit confirmation and handling is done by the platform/engine, not by this action.
 * These tests verify that the correct events are emitted with the right context.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { quittingAction } from '../../../src/actions/standard/quitting';
import { IFActions } from '../../../src/actions/constants';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  createCommand
} from '../../test-utils';
import type { WorldModel } from '@sharpee/world-model';

describe('quittingAction', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(quittingAction.id).toBe(IFActions.QUITTING);
    });

    test('should declare required messages', () => {
      expect(quittingAction.requiredMessages).toContain('quit_confirm_query');
      expect(quittingAction.requiredMessages).toContain('quit_save_query');
      expect(quittingAction.requiredMessages).toContain('quit_unsaved_query');
      expect(quittingAction.requiredMessages).toContain('quit_requested');
      expect(quittingAction.requiredMessages).toContain('game_ending');
    });

    test('should belong to meta group', () => {
      expect(quittingAction.group).toBe('meta');
    });
  });

  describe('Basic Quit Behavior', () => {
    test('should emit platform quit requested event', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Mock shared data capability
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            score: 10,
            maxScore: 100,
            moves: 5,
            lastSaveMove: 5, // No unsaved progress
            playTime: 3600,
            achievements: ['first_steps']
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      expect(platformEvent!.payload.context).toEqual({
        score: 10,
        moves: 5,
        hasUnsavedChanges: false,
        force: false,
        stats: {
          maxScore: 100,
          nearComplete: false,
          playTime: 3600,
          achievements: ['first_steps']
        }
      });
    });

    test('should emit if.event.quit_requested notification', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            score: 25,
            moves: 15,
            lastSaveMove: 15
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      // Should emit if.event.quit_requested
      expectEvent(events, 'if.event.quit_requested', {
        timestamp: expect.any(Number),
        hasUnsavedChanges: false,
        force: false,
        score: 25,
        moves: 15
      });
    });
  });

  describe('Unsaved Progress Detection', () => {
    test('should detect unsaved progress', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            score: 50,
            maxScore: 100,
            moves: 30,
            lastSaveMove: 20 // 10 moves since last save
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.hasUnsavedChanges).toBe(true);
      expect(quitContext.force).toBe(false);
      
      // Should emit success message with hint about unsaved progress
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('quit_requested'),
        params: {
          hint: 'You have unsaved progress. The game will ask for confirmation.'
        }
      });
    });

    test('should not show hint when no unsaved progress', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            moves: 10,
            lastSaveMove: 10 // Same as current moves
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      // Should not have the success message with hint
      const successEvents = events.filter(e => e.type === 'action.success');
      expect(successEvents).toHaveLength(0);
    });
  });

  describe('Force Quit', () => {
    test('should handle force quit with extras.force', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            moves: 50,
            lastSaveMove: 30 // Has unsaved progress
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      command.parsed.extras = { force: true };
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.hasUnsavedChanges).toBe(true);
      expect(quitContext.force).toBe(true); // Force quit despite unsaved changes
      
      // Should not show hint when force quitting
      const successEvents = events.filter(e => e.type === 'action.success');
      expect(successEvents).toHaveLength(0);
    });

    test('should handle force quit with extras.now', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.QUITTING);
      command.parsed.extras = { now: true };
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.force).toBe(true);
    });

    test('should handle force quit with exit action', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.QUITTING);
      command.parsed.action = 'exit';
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.force).toBe(true);
    });
  });

  describe('Near Completion Detection', () => {
    test('should detect near completion at 85%', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            score: 85,
            maxScore: 100,
            moves: 100
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.stats.maxScore).toBe(100);
      expect(quitContext.stats.nearComplete).toBe(true);
    });

    test('should not detect near completion at 75%', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            score: 75,
            maxScore: 100
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.stats.maxScore).toBe(100);
      expect(quitContext.stats.nearComplete).toBe(false);
    });

    test('should handle zero max score', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            score: 50,
            maxScore: 0
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.stats.maxScore).toBe(0);
      expect(quitContext.stats.nearComplete).toBe(false);
    });
  });

  describe('Missing Shared Data', () => {
    test('should handle missing getSharedData method', () => {
      const { world, player, room } = setupBasicWorld();
      // Don't add getCapability method - let it return undefined
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.score).toBe(0);
      expect(quitContext.moves).toBe(0);
      expect(quitContext.hasUnsavedChanges).toBe(false);
      expect(quitContext.force).toBe(false);
      expect(quitContext.stats).toEqual({
        maxScore: 0,
        nearComplete: false,
        playTime: 0,
        achievements: []
      });
    });

    test('should handle empty shared data', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {};
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      const quitContext = platformEvent!.payload.context as any;
      expect(quitContext.score).toBe(0);
      expect(quitContext.moves).toBe(0);
      expect(quitContext.hasUnsavedChanges).toBe(false);
    });
  });

  describe('Complete Quit Context', () => {
    test('should include all context fields', () => {
      const { world, player, room } = setupBasicWorld();
      
      world.getCapability = (name: string) => {
        if (name === 'sharedData') {
          return {
            score: 42,
            maxScore: 100,
            moves: 75,
            lastSaveMove: 70,
            playTime: 7200,
            achievements: ['explorer', 'puzzle_solver']
          };
        }
        return undefined;
      };
      
      const command = createCommand(IFActions.QUITTING);
      const context = createRealTestContext(quittingAction, world, command);
      
      const events = quittingAction.execute(context);
      
      const platformEvent = events.find(e => e.type === 'platform.quit_requested');
      expect(platformEvent).toBeDefined();
      expect(platformEvent!.payload.context).toEqual({
        score: 42,
        moves: 75,
        hasUnsavedChanges: true,
        force: false,
        stats: {
          maxScore: 100,
          nearComplete: false,
          playTime: 7200,
          achievements: ['explorer', 'puzzle_solver']
        }
      });
    });
  });
});

describe('Quitting Action Integration Notes', () => {
  test('platform handles actual quit confirmation', () => {
    // Note: The quitting action only emits events to request a quit.
    // The actual quit confirmation dialog, save prompts, and game termination
    // are handled by the platform/engine after turn completion.
    // This separation allows the platform to:
    // - Show native dialogs
    // - Handle save operations
    // - Clean up resources
    // - Provide platform-specific quit behavior
    expect(true).toBe(true);
  });

  test('query messages are for platform use', () => {
    // The requiredMessages like 'quit_confirm_query' are declared so they
    // can be used by the platform when showing quit dialogs.
    // The action itself doesn't use these messages directly.
    expect(quittingAction.requiredMessages).toContain('quit_confirm_query');
    expect(quittingAction.requiredMessages).toContain('quit_save_query');
  });
});
