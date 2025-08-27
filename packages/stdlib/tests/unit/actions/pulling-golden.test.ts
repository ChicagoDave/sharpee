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
    let world: TestData;
    let context: any;

    beforeEach(() => {
      world = setupBasicWorld();
      context = createRealTestContext(world);
    });

    test('should fail when no target specified', () => {
      const command = createCommand(IFActions.PULLING);
      context.command = command;
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    test('should fail when target is not pullable', () => {
      const command = createCommand(IFActions.PULLING, {
        directObject: { entity: world.box }
      });
      context.command = command;
      
      // Remove PULLABLE trait if present
      if (world.box.has(TraitType.PULLABLE)) {
        world.box.remove(TraitType.PULLABLE);
      }
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('cant_pull_that');
    });

    test('should fail when pulling worn items', () => {
      // Create a wearable item
      const shirt = world.model.createEntity('shirt');
      shirt.add(TraitType.WEARABLE, { isWorn: true });
      shirt.add(TraitType.PULLABLE, { state: 'ready' });
      
      const command = createCommand(IFActions.PULLING, {
        directObject: { entity: shirt }
      });
      context.command = command;
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('worn');
    });

    test('should fail when already pulled', () => {
      const lever = world.model.createEntity('lever');
      lever.add(TraitType.PULLABLE, { state: 'pulled' });
      
      const command = createCommand(IFActions.PULLING, {
        directObject: { entity: lever }
      });
      context.command = command;
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_pulled');
    });
  });

  describe('Basic Execution', () => {
    let world: TestData;
    let context: any;

    beforeEach(() => {
      world = setupBasicWorld();
      context = createRealTestContext(world);
    });

    test('should execute pull successfully', () => {
      const rope = world.model.createEntity('rope');
      rope.add(TraitType.PULLABLE, { state: 'ready', pullCount: 0 });
      
      const command = createCommand(IFActions.PULLING, {
        directObject: { entity: rope }
      });
      context.command = command;
      
      const result = pullingAction.validate(context);
      expect(result.valid).toBe(true);
      
      const events = pullingAction.execute(context);
      expect(events).toHaveLength(2);
      
      // Check pulled event
      expectEvent(events[0], 'if.event.pulled', {
        target: rope.id,
        targetName: 'rope',
        pullCount: 0
      });
      
      // Check success message
      expectEvent(events[1], 'action.success', {
        messageId: 'pulled',
        params: { target: 'rope' }
      });
      
      // Verify state was updated
      const pullable = rope.get(TraitType.PULLABLE) as any;
      expect(pullable.state).toBe('pulled');
      expect(pullable.pullCount).toBe(1);
    });

    test('should track pull count', () => {
      const cord = world.model.createEntity('cord');
      cord.add(TraitType.PULLABLE, { 
        state: 'ready', 
        pullCount: 5,
        pullType: 'cord'
      });
      
      const command = createCommand(IFActions.PULLING, {
        directObject: { entity: cord }
      });
      context.command = command;
      
      const events = pullingAction.execute(context);
      
      // Check event has correct pull count
      expectEvent(events[0], 'if.event.pulled', {
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
      
      const world = setupBasicWorld();
      const context = createRealTestContext(world);
      
      const lever = world.model.createEntity('lever');
      lever.add(TraitType.PULLABLE, { 
        state: 'ready',
        pullType: 'lever'
      });
      
      const command = createCommand(IFActions.PULLING, {
        directObject: { entity: lever }
      });
      context.command = command;
      
      const events = pullingAction.execute(context);
      
      // The action emits a simple pulled event
      expectEvent(events[0], 'if.event.pulled', {
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