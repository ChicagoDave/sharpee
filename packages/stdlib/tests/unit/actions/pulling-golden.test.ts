/**
 * Golden test for pulling action - simplified version
 * 
 * The pulling action was dramatically simplified in Phase 1 from 617 lines to ~100 lines.
 * It now only validates that something can be pulled and emits events.
 * Complex pull mechanics (levers, cords, bells) should be handled by story event handlers.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { pullingAction } from '../../../src/actions/standard/pulling';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

// Helper to execute action with three-phase pattern (mimics CommandExecutor flow)
const executeWithValidation = (action: any, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    return [context.event('action.error', {
      actionId: action.id,
      messageId: validation.error || 'validation_failed',
      reason: validation.error || 'validation_failed',
      params: validation.params || {}
    })];
  }
  // Execute mutations (returns void)
  action.execute(context);
  // Report generates events
  return action.report(context);
};

describe('pullingAction (Golden Pattern - Simplified)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(pullingAction.id).toBe(IFActions.PULLING);
    });

    test('should declare required messages', () => {
      expect(pullingAction.requiredMessages).toContain('no_target');
      expect(pullingAction.requiredMessages).toContain('not_visible');
      expect(pullingAction.requiredMessages).toContain('not_reachable');
      expect(pullingAction.requiredMessages).toContain('cant_pull_that');
      expect(pullingAction.requiredMessages).toContain('worn');
      expect(pullingAction.requiredMessages).toContain('pulled');
      expect(pullingAction.requiredMessages).toContain('nothing_happens');
      expect(pullingAction.requiredMessages).toContain('already_pulled');
    });

    test('should belong to interaction group', () => {
      expect(pullingAction.group).toBe('interaction');
    });
  });

  describe('Basic Validation', () => {
    let world: any;
    let player: any;
    let room: any;

    beforeEach(() => {
      const setup = setupBasicWorld();
      world = setup.world;
      player = setup.player;
      room = setup.room;
    });

    test('should fail when no target specified', () => {
      const command = createCommand(IFActions.PULLING);
      const context = createRealTestContext(pullingAction, world, command);
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    test('should fail when target is not pullable', () => {
      const box = world.createEntity('box', 'object');
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.PULLING, {
        entity: box
      });
      const context = createRealTestContext(pullingAction, world, command);
      
      // Remove PULLABLE trait if present
      if (box.has(TraitType.PULLABLE)) {
        box.remove(TraitType.PULLABLE);
      }
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('cant_pull_that');
    });

    test('should fail when pulling worn items', () => {
      // Create a wearable item
      const shirt = world.createEntity('shirt', 'object');
      shirt.add({ type: TraitType.WEARABLE, isWorn: true });
      shirt.add({ type: TraitType.PULLABLE, state: 'ready' });
      world.moveEntity(shirt.id, player.id);
      
      const command = createCommand(IFActions.PULLING, {
        entity: shirt
      });
      const context = createRealTestContext(pullingAction, world, command);
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('worn');
    });

    test('should fail when already pulled', () => {
      const lever = world.createEntity('lever', 'object');
      lever.add({ type: TraitType.PULLABLE, state: 'pulled' });
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(IFActions.PULLING, {
        entity: lever
      });
      const context = createRealTestContext(pullingAction, world, command);
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_pulled');
    });
  });

  describe('Basic Execution', () => {
    let world: any;
    let player: any;
    let room: any;

    beforeEach(() => {
      const setup = setupBasicWorld();
      world = setup.world;
      player = setup.player;
      room = setup.room;
    });

    test('should execute pull successfully', () => {
      const rope = world.createEntity('rope', 'object');
      rope.add({ type: TraitType.PULLABLE, state: 'ready', pullCount: 0 });
      world.moveEntity(rope.id, room.id);
      
      const command = createCommand(IFActions.PULLING, {
        entity: rope
      });
      const context = createRealTestContext(pullingAction, world, command);
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(true);

      const events = executeWithValidation(pullingAction, context);
      expect(events).toHaveLength(2);

      // Check pulled event
      expectEvent(events, 'if.event.pulled', {
        target: rope.id,
        targetName: 'rope',
        pullCount: 0
      });

      // Check success message
      expectEvent(events, 'action.success', {
        messageId: 'pulled',
        params: { target: 'rope' }
      });

      // Verify state was updated
      const pullable = rope.get(TraitType.PULLABLE) as any;
      expect(pullable.state).toBe('pulled');
      expect(pullable.pullCount).toBe(1);
    });

    test('should track pull count', () => {
      const cord = world.createEntity('cord', 'object');
      cord.add({ 
        type: TraitType.PULLABLE,
        state: 'ready', 
        pullCount: 5,
        pullType: 'cord'
      });
      world.moveEntity(cord.id, room.id);
      
      const command = createCommand(IFActions.PULLING, {
        entity: cord
      });
      const context = createRealTestContext(pullingAction, world, command);
      
      const result = pullingAction.validate(context);
      const events = executeWithValidation(pullingAction, context);

      // Check event has correct pull count
      expectEvent(events, 'if.event.pulled', {
        target: cord.id,
        targetName: 'cord',
        pullCount: 5,
        pullType: 'cord'
      });

      // Verify count incremented
      const pullable = cord.get(TraitType.PULLABLE) as any;
      expect(pullable.pullCount).toBe(6);
    });
  });

  describe('Event Handler Integration', () => {
    test('story authors can handle complex pull mechanics via events', () => {
      // This test documents how story authors should handle complex pulling
      // The action just emits events; story handlers do the actual mechanics
      
      const setup = setupBasicWorld();
      const world = setup.world;
      const room = setup.room;
      
      const lever = world.createEntity('lever', 'object');
      lever.add({ 
        type: TraitType.PULLABLE,
        state: 'ready',
        pullType: 'lever'
      });
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(IFActions.PULLING, {
        entity: lever
      });
      const context = createRealTestContext(pullingAction, world, command);
      
      const result = pullingAction.validate(context);
      const events = executeWithValidation(pullingAction, context);

      // The action emits a simple pulled event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'lever'
      });
      
      // Story authors would register handlers like:
      // eventHandler.on('if.event.pulled', (event) => {
      //   if (event.data.pullType === 'lever') {
      //     // Open secret door, activate mechanism, etc.
      //   }
      // });
    });
  });
});