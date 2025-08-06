/**
 * Golden test for closing action - demonstrates testing actions with objects
 * 
 * This shows patterns for testing actions that:
 * - Require a direct object
 * - Check trait-based preconditions
 * - Have different behavior based on entity traits
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { closingAction } from '../../../src/actions/standard/closing/closing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, EntityType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('closingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(closingAction.id).toBe(IFActions.CLOSING);
    });

    test('should declare required messages', () => {
      expect(closingAction.requiredMessages).toContain('no_target');
      expect(closingAction.requiredMessages).toContain('not_closable');
      expect(closingAction.requiredMessages).toContain('already_closed');
      expect(closingAction.requiredMessages).toContain('closed');
    });

    test('should belong to container_manipulation group', () => {
      expect(closingAction.group).toBe('container_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.CLOSING);
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when target is not closable', () => {
      const { world, player, room, object } = TestData.withObject('red ball');
      // Ball has no openable trait
      
      const command = createCommand(IFActions.CLOSING, {
        entity: object
      });
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_closable'),
        params: { item: 'red ball' }
      });
    });

    test('should fail when already closed', () => {
      const { world, player, room, object } = TestData.withObject('wooden box', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: false  // Already closed
        }
      });
      
      const command = createCommand(IFActions.CLOSING, {
        entity: object
      });
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_closed'),
        params: { item: 'wooden box' }
      });
    });
  });

  describe('Successful Closing', () => {
    test('should close an open container', () => {
      const { world, player, room, object } = TestData.withObject('wooden box', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: true  // Currently open
        },
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER,
          capacity: 10
        }
      });
      
      const command = createCommand(IFActions.CLOSING, {
        entity: object
      });
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      // Should emit CLOSED event with our data
      expectEvent(events, 'if.event.closed', {
        targetId: object.id,
        targetName: 'wooden box',
        isContainer: true,
        isDoor: false,
        isSupporter: false,
        hasContents: false,
        contentsCount: 0,
        contentsIds: []
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('closed'),
        params: { item: 'wooden box' }
      });
    });

    test('should include container contents in event', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Create container with items
      const box = world.createEntity('wooden box', EntityType.CONTAINER);
      box.add({
        type: TraitType.OPENABLE,
        isOpen: true
      });
      box.add({
        type: TraitType.CONTAINER
      });
      world.moveEntity(box.id, room.id);
      
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      const gem = world.createEntity('ruby', EntityType.OBJECT);
      world.moveEntity(coin.id, box.id);
      world.moveEntity(gem.id, box.id);
      
      const command = createCommand(IFActions.CLOSING, {
        entity: box
      });
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      expectEvent(events, 'if.event.closed', {
        targetId: box.id,
        targetName: 'wooden box',
        isContainer: true,
        isDoor: false,
        isSupporter: false,
        hasContents: true,
        contentsCount: 2,
        contentsIds: expect.arrayContaining([coin.id, gem.id])
      });
    });

    test('should handle closing a door', () => {
      const { world, player, room, object } = TestData.withObject('oak door', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: true
        },
        [TraitType.DOOR]: {
          type: TraitType.DOOR,
          connectsTo: 'room2'
        }
      });
      
      const command = createCommand(IFActions.CLOSING, {
        entity: object
      });
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      expectEvent(events, 'if.event.closed', {
        targetId: object.id,
        targetName: 'oak door',
        isContainer: false,
        isDoor: true,
        isSupporter: false,
        hasContents: false,
        contentsCount: 0,
        contentsIds: []
      });
    });
  });

  describe('Special Cases', () => {
    test('should handle close requirements', () => {
      const { world, player, room, object } = TestData.withObject('treasure chest', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: true,
          closeRequirements: {
            preventedBy: 'sword handle sticking out'
          }
        }
      });
      
      const command = createCommand(IFActions.CLOSING, {
        entity: object
      });
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('prevents_closing'),
        params: { 
          item: 'treasure chest',
          obstacle: 'sword handle sticking out'
        }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, object } = TestData.withObject('box', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: true
        }
      });
      
      const command = createCommand(IFActions.CLOSING, {
        entity: object
      });
      const context = createRealTestContext(closingAction, world, command);
      
      const events = closingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(object.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples', () => {
  test('pattern: testing container with various states', () => {
    const world = new WorldModel();
    
    // Create containers in different states
    const containers = [
      { name: 'open box', isOpen: true, hasContents: false },
      { name: 'closed box', isOpen: false, hasContents: false },
      { name: 'open chest with items', isOpen: true, hasContents: true },
      { name: 'locked door', isOpen: false, isLocked: true }
    ];
    
    containers.forEach(({ name, isOpen, hasContents, isLocked }) => {
      const container = world.createEntity(name, EntityType.CONTAINER);
      container.add({
        type: TraitType.OPENABLE,
        isOpen
      });
      
      if (isLocked) {
        container.add({
          type: TraitType.LOCKABLE,
          isLocked: true
        });
      }
      
      if (hasContents) {
        container.add({ type: TraitType.CONTAINER });
        const item = world.createEntity('item', EntityType.OBJECT);
        world.moveEntity(item.id, container.id);
      }
    });
  });

  test('pattern: testing close requirements', () => {
    const world = new WorldModel();
    
    // Different scenarios that prevent closing
    const preventionScenarios = [
      {
        name: 'overfilled box',
        closeRequirements: {
          preventedBy: 'items are sticking out'
        }
      },
      {
        name: 'damaged door',
        closeRequirements: {
          preventedBy: 'the hinges are broken'
        }
      },
      {
        name: 'blocked drawer',
        closeRequirements: {
          preventedBy: 'something is jamming it'
        }
      }
    ];
    
    preventionScenarios.forEach(({ name, closeRequirements }) => {
      const obj = world.createEntity(name, EntityType.CONTAINER);
      obj.add({
        type: TraitType.OPENABLE,
        isOpen: true,
        closeRequirements
      });
      
      const openable = obj.getTrait(TraitType.OPENABLE) as any;
      expect(openable.closeRequirements.preventedBy).toBeDefined();
    });
  });
});
