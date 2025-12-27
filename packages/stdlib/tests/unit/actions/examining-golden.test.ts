/**
 * Golden test for examining action - demonstrates testing observation actions
 * 
 * This shows patterns for testing actions that:
 * - Provide information without changing state
 * - Handle multiple trait combinations
 * - Generate different messages based on object type
 * - Check visibility requirements
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { examiningAction } from '../../../src/actions/standard/examining'; // Now from folder
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';
import { SemanticEvent } from '@sharpee/core';

// Helper to execute action using the four-phase pattern
function executeAction(action: any, context: ActionContext): SemanticEvent[] {
  // Four-phase pattern: validate -> execute/blocked -> report
  const validationResult = action.validate(context);

  if (!validationResult.valid) {
    // Use blocked() for validation failures
    return action.blocked(context, validationResult);
  }

  // Execute mutations (returns void)
  action.execute(context);

  // Report generates success events
  return action.report(context);
}

describe('examiningAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(examiningAction.id).toBe(IFActions.EXAMINING);
    });

    test('should declare required messages', () => {
      expect(examiningAction.requiredMessages).toContain('no_target');
      expect(examiningAction.requiredMessages).toContain('not_visible');
      expect(examiningAction.requiredMessages).toContain('examined');
      expect(examiningAction.requiredMessages).toContain('examined_self');
      expect(examiningAction.requiredMessages).toContain('examined_container');
      expect(examiningAction.requiredMessages).toContain('examined_supporter');
      expect(examiningAction.requiredMessages).toContain('examined_readable');
      expect(examiningAction.requiredMessages).toContain('examined_switchable');
      expect(examiningAction.requiredMessages).toContain('examined_wearable');
      expect(examiningAction.requiredMessages).toContain('examined_door');
      expect(examiningAction.requiredMessages).toContain('nothing_special');
      expect(examiningAction.requiredMessages).toContain('description');
      expect(examiningAction.requiredMessages).toContain('brief_description');
    });

    test('should belong to observation group', () => {
      expect(examiningAction.group).toBe('observation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.EXAMINING);
      const context = createRealTestContext(examiningAction, world, command);

      const events = executeAction(examiningAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_target'
      });
    });

    test('should fail when target not visible', () => {
      const { world, player, room, object } = TestData.withObject('red ball');

      // Move object to a different room so it's not visible
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      world.moveEntity(object.id, otherRoom.id);

      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);

      const events = executeAction(examiningAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'not_visible',
        params: expect.objectContaining({
          target: 'red ball'
        })
      });
    });

    test('should always allow examining self even if not visible', () => {
      const { world, player } = setupBasicWorld();
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: player
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        targetId: player.id,
        targetName: 'yourself',
        self: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_self'),
        params: {}
      });
    });
  });

  describe('Basic Examining', () => {
    test('should examine simple object', () => {
      const { world, player, object } = TestData.withObject('red ball');
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        targetId: object.id,
        targetName: 'red ball'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined'),
        params: { target: 'red ball' }
      });
    });

    test('should include description from identity trait', () => {
      const { world, player, object } = TestData.withObject('old painting', {
        [TraitType.IDENTITY]: {
          type: TraitType.IDENTITY,
          description: 'A faded landscape painting in a golden frame.',
          brief: 'A landscape painting.'
        }
      });
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        hasDescription: true,
        hasBrief: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined'),
        params: { 
          target: 'old painting',
          description: 'A faded landscape painting in a golden frame.'
        }
      });
    });
  });

  describe('Container Examining', () => {
    test('should examine open container with contents', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('wooden box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ 
        type: TraitType.OPENABLE,
        isOpen: true
      });
      world.moveEntity(box.id, room.id);
      
      const coin = world.createEntity('gold coin', 'object');
      const gem = world.createEntity('ruby', 'object');
      world.moveEntity(coin.id, box.id);
      world.moveEntity(gem.id, box.id);
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: box
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        isContainer: true,
        isOpenable: true,
        isOpen: true,
        hasContents: true,
        contentCount: 2,
        contents: [
          { id: coin.id, name: 'gold coin' },
          { id: gem.id, name: 'ruby' }
        ]
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_container'),
        params: { 
          isOpen: true
        }
      });
    });

    test('should examine closed container', () => {
      const { world, player, object } = TestData.withObject('treasure chest', {
        [TraitType.CONTAINER]: { type: TraitType.CONTAINER },
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: false
        }
      });
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        targetId: object.id,
        targetName: 'treasure chest',
        isContainer: true,
        isOpenable: true,
        isOpen: false,
        hasContents: false,
        contentCount: 0,
        contents: []
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_container'),
        params: {
          isOpen: false
        }
      });
    });

    test('should handle container without openable trait as always open', () => {
      const { world, player, object } = TestData.withObject('wicker basket', {
        [TraitType.CONTAINER]: { type: TraitType.CONTAINER }
      });
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        targetId: object.id,
        targetName: 'wicker basket',
        isContainer: true,
        isOpen: true,  // Default to open
        hasContents: false,
        contentCount: 0,
        contents: []
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_container'),
        params: {
          isOpen: true
        }
      });
    });
  });

  describe('Supporter Examining', () => {
    test('should examine supporter with objects', () => {
      const { world, player, room } = setupBasicWorld();
      
      const table = world.createEntity('oak table', 'supporter');
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);
      
      const book = world.createEntity('old book', 'object');
      const lamp = world.createEntity('brass lamp', 'object');
      world.moveEntity(book.id, table.id);
      world.moveEntity(lamp.id, table.id);
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: table
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        isSupporter: true,
        hasContents: true,
        contentCount: 2
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_supporter'),
        params: {}
      });
    });
  });

  describe('Special Object Types', () => {
    test('should examine switchable device', () => {
      const { world, player, object } = TestData.withObject('desk lamp', {
        [TraitType.SWITCHABLE]: {
          type: TraitType.SWITCHABLE,
          isOn: true
        }
      });
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        isSwitchable: true,
        isOn: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_switchable'),
        params: { 
          isOn: true
        }
      });
    });

    test('should examine readable object', () => {
      const { world, player, object } = TestData.withObject('crumpled note', {
        [TraitType.READABLE]: {
          type: TraitType.READABLE,
          text: 'Meet me at midnight by the old oak tree.'
        }
      });
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        isReadable: true,
        hasText: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_readable'),
        params: { 
          text: 'Meet me at midnight by the old oak tree.'
        }
      });
    });

    test('should examine wearable object', () => {
      const { world, player, object } = TestData.withObject('red hat', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: false,
          slot: 'head'
        }
      });
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        isWearable: true,
        isWorn: false
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_wearable'),
        params: { 
          isWorn: false
        }
      });
    });

    test('should examine locked door', () => {
      const { world, player, object } = TestData.withObject('oak door', {
        [TraitType.DOOR]: {
          type: TraitType.DOOR,
          connectsTo: 'room2'
        },
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: false
        },
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyId: 'brass_key'
        }
      });
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        isDoor: true,
        isOpenable: true,
        isOpen: false,
        isLockable: true,
        isLocked: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_door'),
        params: { 
          isLocked: true
        }
      });
    });
  });

  describe('Complex Objects', () => {
    test('should handle object with multiple traits', () => {
      const { world, player, room } = setupBasicWorld();
      
      // A container that is also a supporter and switchable (e.g., a display case with lights)
      const displayCase = world.createEntity('display case', 'container');
      displayCase.add({ type: TraitType.CONTAINER });
      displayCase.add({ type: TraitType.SUPPORTER });
      displayCase.add({ 
        type: TraitType.OPENABLE,
        isOpen: true
      });
      displayCase.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      world.moveEntity(displayCase.id, room.id);
      
      const trophy = world.createEntity('golden trophy', 'object');
      world.moveEntity(trophy.id, displayCase.id);
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: displayCase
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      expectEvent(events, 'if.event.examined', {
        isContainer: true,
        isSupporter: true,
        isSwitchable: true,
        isOpen: true,
        isOn: true,
        hasContents: true,
        contentCount: 1
      });
      
      // Container message takes precedence
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examined_container'),
        params: {
          isOpen: true
        }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, object } = TestData.withObject('ornate mirror');
      
      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);
      
      const events = executeAction(examiningAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(object.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });

  describe('Three-Phase Pattern Compliance', () => {
    test('should use report() to create all events', () => {
      const { world, player, room, object } = TestData.withObject('test object');

      const command = createCommand(IFActions.EXAMINING, {
        entity: object
      });
      const context = createRealTestContext(examiningAction, world, command);

      // Verify the action has the report and blocked methods (four-phase pattern)
      expect(examiningAction.report).toBeDefined();
      expect(examiningAction.blocked).toBeDefined();
      expect(typeof examiningAction.report).toBe('function');
      expect(typeof examiningAction.blocked).toBe('function');

      // Spy on the action methods to ensure correct pattern
      const validateSpy = vi.spyOn(examiningAction, 'validate');
      const executeSpy = vi.spyOn(examiningAction, 'execute');
      const reportSpy = vi.spyOn(examiningAction as any, 'report');

      const events = executeAction(examiningAction, context);

      // Verify four-phase pattern was followed (report called with context only)
      expect(validateSpy).toHaveBeenCalledWith(context);
      expect(executeSpy).toHaveBeenCalledWith(context);
      expect(reportSpy).toHaveBeenCalledWith(context);

      // Verify execute returns void (no events)
      const executeResult = examiningAction.execute(context);
      expect(executeResult).toBeUndefined();

      // Verify report creates events
      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.type && e.data)).toBe(true);
    });

    test('should use blocked() to handle validation errors', () => {
      const { world } = setupBasicWorld();

      const command = createCommand(IFActions.EXAMINING);
      const context = createRealTestContext(examiningAction, world, command);

      // Mock validation failure
      const mockValidationResult = {
        valid: false,
        error: 'test_error',
        params: { test: 'value' }
      };

      // Call blocked() with validation result
      const events = examiningAction.blocked!(context, mockValidationResult);

      // Should create blocked event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.blocked');
      expect(events[0].data).toMatchObject({
        actionId: IFActions.EXAMINING,
        messageId: 'test_error',
        params: expect.objectContaining({ test: 'value' })
      });
    });
  });
});

describe('Examining Action Edge Cases', () => {
  test('should handle readable object without text', () => {
    const { world, player, object } = TestData.withObject('blank book', {
      [TraitType.READABLE]: {
        type: TraitType.READABLE
        // No text property
      }
    });
    
    const command = createCommand(IFActions.EXAMINING, {
      entity: object
    });
    const context = createRealTestContext(examiningAction, world, command);
    
    const events = executeAction(examiningAction, context);
    
    expectEvent(events, 'if.event.examined', {
      isReadable: true,
      hasText: false
    });
    
    // Should use basic examined message, not examined_readable
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('examined'),
      params: {
        target: 'blank book'
      }
    });
  });

  test('should handle container and supporter priority', () => {
    const { world, player, object } = TestData.withObject('writing desk', {
      [TraitType.CONTAINER]: { type: TraitType.CONTAINER },
      [TraitType.SUPPORTER]: { type: TraitType.SUPPORTER }
    });
    
    const command = createCommand(IFActions.EXAMINING, {
      entity: object
    });
    const context = createRealTestContext(examiningAction, world, command);
    
    const events = executeAction(examiningAction, context);
    
    expectEvent(events, 'if.event.examined', {
      isContainer: true,
      isSupporter: true
    });
    
    // Container message takes precedence over supporter
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('examined_container'),
      params: {
        isOpen: true
      }
    });
  });
});
