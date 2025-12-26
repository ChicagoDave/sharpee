/**
 * Golden test for waiting action - simple signal pattern
 *
 * Waiting is a signal action that:
 * - Always validates successfully (no preconditions)
 * - Has no world mutations
 * - Emits if.event.waited for engine/daemons to process
 *
 * Story customization (vehicle messages, consecutive waits, etc.)
 * should be handled via event handlers, not in the core action.
 */

import { describe, test, expect, vi } from 'vitest';
import { waitingAction } from '../../../src/actions/standard/waiting';
import { IFActions } from '../../../src/actions/constants';
import {
  createRealTestContext,
  expectEvent,
  createCommand,
  setupBasicWorld
} from '../../test-utils';

describe('waitingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(waitingAction.id).toBe(IFActions.WAITING);
    });

    test('should declare required messages', () => {
      expect(waitingAction.requiredMessages).toBeDefined();
      expect(waitingAction.requiredMessages).toContain('time_passes');
    });

    test('should belong to meta group', () => {
      expect(waitingAction.group).toBe('meta');
    });

    test('should not require objects', () => {
      expect(waitingAction.metadata.requiresDirectObject).toBe(false);
      expect(waitingAction.metadata.requiresIndirectObject).toBe(false);
    });
  });

  describe('Three-Phase Pattern', () => {
    test('should have validate, execute, and report functions', () => {
      expect(typeof waitingAction.validate).toBe('function');
      expect(typeof waitingAction.execute).toBe('function');
      expect(typeof waitingAction.report).toBe('function');
    });

    test('validate should always return valid', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      const result = waitingAction.validate(context);

      expect(result.valid).toBe(true);
    });

    test('execute should return void (not events)', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      const result = waitingAction.execute(context);

      expect(result).toBeUndefined();
    });

    test('execute should store location in sharedData', () => {
      const { world, room } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      waitingAction.execute(context);

      expect(context.sharedData.locationId).toBe(room.id);
      expect(context.sharedData.locationName).toBe('Test Room');
    });

    test('report should return events array', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      waitingAction.execute(context);
      const events = waitingAction.report!(context);

      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Event Emission', () => {
    test('should emit if.event.waited with turnsPassed', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      waitingAction.execute(context);
      const events = waitingAction.report!(context);

      expectEvent(events, 'if.event.waited', {
        turnsPassed: 1
      });
    });

    test('should emit if.event.waited with location info', () => {
      const { world, room } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      waitingAction.execute(context);
      const events = waitingAction.report!(context);

      expectEvent(events, 'if.event.waited', {
        location: room.id,
        locationName: 'Test Room'
      });
    });

    test('should emit action.success with time_passes message', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      waitingAction.execute(context);
      const events = waitingAction.report!(context);

      expectEvent(events, 'action.success', {
        actionId: IFActions.WAITING,
        messageId: 'time_passes'
      });
    });
  });

  describe('No State Mutation', () => {
    test('should not modify world state', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      const moveEntitySpy = vi.spyOn(world, 'moveEntity');
      const setStateSpy = vi.spyOn(world, 'setState');

      waitingAction.execute(context);

      expect(moveEntitySpy).not.toHaveBeenCalled();
      expect(setStateSpy).not.toHaveBeenCalled();

      moveEntitySpy.mockRestore();
      setStateSpy.mockRestore();
    });

    test('should not modify entity traits', () => {
      const { world, player, room } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      const playerAddSpy = vi.spyOn(player, 'add');
      const playerRemoveSpy = vi.spyOn(player, 'remove');

      waitingAction.execute(context);

      expect(playerAddSpy).not.toHaveBeenCalled();
      expect(playerRemoveSpy).not.toHaveBeenCalled();

      playerAddSpy.mockRestore();
      playerRemoveSpy.mockRestore();
    });
  });

  describe('Signal Action Pattern', () => {
    test('should be a minimal signal action', () => {
      // Waiting is intentionally simple:
      // - No preconditions (always valid)
      // - No world mutations
      // - Single deterministic message
      // - Stories customize via event handlers

      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);

      // Validate always succeeds
      expect(waitingAction.validate(context).valid).toBe(true);

      // Execute has no side effects
      waitingAction.execute(context);

      // Report emits exactly 2 events
      const events = waitingAction.report!(context);
      expect(events.length).toBe(2);

      // One world event, one success message
      expect(events[0].type).toBe('if.event.waited');
      expect(events[1].type).toBe('action.success');
    });
  });
});

/**
 * Documentation: Story Customization Patterns
 *
 * The waiting action is intentionally minimal. Stories can customize
 * behavior by listening to the if.event.waited event and emitting
 * additional events that the report service will render.
 *
 * @example
 * // Vary messages based on consecutive waits
 * let waitCount = 0;
 * story.on('if.event.waited', (event, context) => {
 *   waitCount++;
 *   if (waitCount > 5) {
 *     // Emit event with custom messageId - report service renders it
 *     context.emit('action.info', { messageId: 'grows_restless' });
 *   }
 * });
 *
 * @example
 * // Vehicle-specific messages
 * story.on('if.event.waited', (event, context) => {
 *   if (context.currentLocation.has('vehicle')) {
 *     // Override the default message via event data
 *     event.data.messageOverride = 'waited_in_vehicle';
 *   }
 * });
 */
