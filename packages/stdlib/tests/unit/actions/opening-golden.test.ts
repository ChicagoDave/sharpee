/**
 * Golden test for opening action - demonstrates testing container/door manipulation
 * 
 * This shows patterns for testing actions that:
 * - Open containers and doors
 * - Check lock status
 * - Reveal contents with atomic events
 * - Handle different openable types
 * 
 * Updated to test ATOMIC EVENT STRUCTURE
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { openingAction } from '../../../src/actions/standard/opening';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, AuthorModel, EntityType, OpenableTrait, LockableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand
} from '../../test-utils';
import type { WorldModel } from '@sharpee/world-model';
import type { ActionContext } from '../../../src/actions/enhanced-types';
import type { ISemanticEvent } from '@sharpee/core';

describe('openingAction (Golden Pattern)', () => {
  describe('Three-Phase Pattern Compliance', () => {
    test('should have required methods for three-phase pattern', () => {
      expect(openingAction.validate).toBeDefined();
      expect(openingAction.execute).toBeDefined();
      expect(openingAction.report).toBeDefined();
    });

    test('should use report() for ALL event generation', () => {
      const { world, player, room } = setupBasicWorld();
      const item = world.createEntity('test item', 'object');
      world.moveEntity(item.id, room.id);
      
      const command = createCommand(IFActions.OPENING, {
        entity: item,
        text: 'test item'
      });
      const context = createRealTestContext(openingAction, world, command);
      
      // The executeAction helper properly tests the three-phase pattern
      const events = executeWithValidation(openingAction, context);
      
      // All events should be generated via report()
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(openingAction.id).toBe(IFActions.OPENING);
    });

    test('should declare required messages', () => {
      expect(openingAction.requiredMessages).toContain('no_target');
      expect(openingAction.requiredMessages).toContain('not_openable');
      expect(openingAction.requiredMessages).toContain('already_open');
      expect(openingAction.requiredMessages).toContain('locked');
      expect(openingAction.requiredMessages).toContain('opened');
      expect(openingAction.requiredMessages).toContain('revealing');
      expect(openingAction.requiredMessages).toContain('its_empty');
      expect(openingAction.requiredMessages).toContain('cant_reach');
    });

    test('should belong to container_manipulation group', () => {
      expect(openingAction.group).toBe('container_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.OPENING);
      const context = createRealTestContext(openingAction, world, command);

      const events = executeWithValidation(openingAction, context);

      expectEvent(events, 'if.event.open_blocked', {
        messageId: 'if.action.opening.no_target'
      });
    });

    test('should fail when target is not openable', () => {
      const { world, object } = TestData.withObject('rock');

      const command = createCommand(
        IFActions.OPENING,
        { entity: object }
      );
      const context = createRealTestContext(openingAction, world, command);

      const events = executeWithValidation(openingAction, context);

      expectEvent(events, 'if.event.open_blocked', {
        messageId: 'if.action.opening.not_openable',
        params: expect.objectContaining({ item: 'rock' })
      });
    });

    test('should fail when already open', () => {
      const { world, object } = TestData.withObject('box', {
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: true  // Already open
        }
      });

      const command = createCommand(
        IFActions.OPENING,
        { entity: object }
      );
      const context = createRealTestContext(openingAction, world, command);

      const events = executeWithValidation(openingAction, context);

      expectEvent(events, 'if.event.open_blocked', {
        messageId: 'if.action.opening.already_open',
        params: expect.objectContaining({ item: 'box' })
      });
    });

    test('should fail when locked', () => {
      const { world, object } = TestData.withObject('treasure chest', {
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: false
        },
        [TraitType.LOCKABLE]: {
          type: TraitType.LOCKABLE,
          isLocked: true,
          keyId: 'golden_key'
        }
      });

      const command = createCommand(
        IFActions.OPENING,
        { entity: object }
      );
      const context = createRealTestContext(openingAction, world, command);

      const events = executeWithValidation(openingAction, context);

      expectEvent(events, 'if.event.open_blocked', {
        messageId: 'if.action.opening.locked',
        params: expect.objectContaining({ item: 'treasure chest' })
      });
    });
  });

  describe('Successful Opening - Atomic Events', () => {
    test('should emit atomic opened event with minimal data', () => {
      const { world, object } = TestData.withObject('simple box', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: false
        }
      });
      
      const command = createCommand(
        IFActions.OPENING,
        { entity: object }
      );
      const context = createRealTestContext(openingAction, world, command);
      
      const events = executeWithValidation(openingAction, context);
      
      // The atomic opened event should only have targetId and targetName
      expectEvent(events, 'if.event.opened', {
        targetId: object.id,
        targetName: 'simple box'
      });
      
      // Should NOT have these old fields
      const openedEvent = events.find(e => e.type === 'if.event.opened');
      expect(openedEvent?.data).not.toHaveProperty('item');
      expect(openedEvent?.data).not.toHaveProperty('containerName');
      expect(openedEvent?.data).not.toHaveProperty('hasContents');
      expect(openedEvent?.data).not.toHaveProperty('contentsCount');
      expect(openedEvent?.data).not.toHaveProperty('revealedItems');
    });

    // SKIP: The opening action delegates if.event.revealed emission to an external
    // event handler (opening.ts:186-187). This is a deliberate design choice so that
    // revealed events fire regardless of which action opens the container.
    // Unskipping requires either moving revealed emission into the action or
    // registering the handler in test setup.
    test.skip('should emit separate revealed events for container contents', () => {
      const { world, player, room } = setupBasicWorld();
      const author = new AuthorModel(world.getDataStore(), world);

      const box = author.createEntity('wooden box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false });
      author.moveEntity(box.id, room.id);

      const coin = author.createEntity('gold coin', EntityType.ITEM);
      const ruby = author.createEntity('ruby', EntityType.ITEM);
      author.moveEntity(coin.id, box.id);
      author.moveEntity(ruby.id, box.id);

      const command = createCommand(IFActions.OPENING, { entity: box });
      const context = createRealTestContext(openingAction, world, command);
      const events = executeWithValidation(openingAction, context);

      expectEvent(events, 'if.event.opened', {
        targetId: box.id,
        targetName: 'wooden box'
      });

      const revealedEvents = events.filter(e => e.type === 'if.event.revealed');
      expect(revealedEvents).toHaveLength(2);
    });

    test('should report empty container with special message', () => {
      const { world, object } = TestData.withObject('empty box', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: false
        },
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER,
          isTransparent: false,
          enterable: false
        }
      });
      
      // Container is empty - no items added
      
      const command = createCommand(
        IFActions.OPENING,
        { entity: object }
      );
      const context = createRealTestContext(openingAction, world, command);
      
      const events = executeWithValidation(openingAction, context);
      
      // Should have opened event with empty-container message
      expectEvent(events, 'if.event.opened', {
        targetId: object.id,
        targetName: 'empty box',
        messageId: expect.stringContaining('its_empty'),
        params: { container: 'empty box' }
      });

      // Should NOT have any revealed events (empty container)
      const revealedEvents = events.filter(e => e.type === 'if.event.revealed');
      expect(revealedEvents).toHaveLength(0);
    });

    test('should open a door', () => {
      const { world, object } = TestData.withObject('oak door', {
        [TraitType.OPENABLE]: { 
          type: TraitType.OPENABLE,
          isOpen: false
        },
        [TraitType.DOOR]: {
          type: TraitType.DOOR,
          connectsTo: 'room2'
        }
      });
      
      const command = createCommand(
        IFActions.OPENING,
        { entity: object }
      );
      const context = createRealTestContext(openingAction, world, command);
      
      const events = executeWithValidation(openingAction, context);
      
      // Should have opened event with messageId and params
      expectEvent(events, 'if.event.opened', {
        targetId: object.id,
        targetName: 'oak door',
        messageId: expect.stringContaining('opened'),
        params: { item: 'oak door' }
      });

      // Note: exit_revealed events would be emitted but require
      // proper room setup with exits, which is complex to test here
    });
  });

  describe('Event Structure Validation', () => {
    // SKIP: Requires if.event.revealed which the opening action delegates to
    // an external handler (opening.ts:186-187). Same root cause as the
    // container-reveals test above.
    test.skip('should include proper atomic events', () => {
      const { world, object } = TestData.withObject('cabinet', {
        [TraitType.OPENABLE]: { type: TraitType.OPENABLE, isOpen: false },
        [TraitType.CONTAINER]: { type: TraitType.CONTAINER }
      });

      const author = new AuthorModel(world.getDataStore(), world);
      const pen = author.createEntity('pen', 'object');
      author.moveEntity(pen.id, object.id);

      const command = createCommand(IFActions.OPENING, { entity: object });
      const context = createRealTestContext(openingAction, world, command);
      const events = executeWithValidation(openingAction, context);

      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('if.event.opened');
      expect(eventTypes).toContain('if.event.revealed');
    });
  });
});

describe('Opening Action Edge Cases', () => {
  test('should handle unlocked but not yet open container', () => {
    const { world, object } = TestData.withObject('wall safe', {
      [TraitType.OPENABLE]: { 
        type: TraitType.OPENABLE,
        isOpen: false
      },
      [TraitType.LOCKABLE]: {
        type: TraitType.LOCKABLE,
        isLocked: false,  // Unlocked but not open
        keyId: 'safe_key'
      },
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER
      }
    });
    
    const command = createCommand(
      IFActions.OPENING,
      { entity: object }
    );
    const context = createRealTestContext(openingAction, world, command);
    
    const events = executeWithValidation(openingAction, context);
    
    // Should succeed - it's unlocked
    expectEvent(events, 'if.event.opened', {
      targetId: object.id,
      targetName: 'wall safe'
    });
  });

  test('should handle non-container openable objects', () => {
    const { world, object } = TestData.withObject('thick book', {
      [TraitType.OPENABLE]: { 
        type: TraitType.OPENABLE,
        isOpen: false
      }
      // Not a container or door, just something that opens
    });
    
    const command = createCommand(
      IFActions.OPENING,
      { entity: object }
    );
    const context = createRealTestContext(openingAction, world, command);
    
    const events = executeWithValidation(openingAction, context);
    
    expectEvent(events, 'if.event.opened', {
      targetId: object.id,
      targetName: 'thick book',
      messageId: expect.stringContaining('opened'),
      params: { item: 'thick book' }
    });
  });

  // SKIP: Same as above — requires if.event.revealed emission from the opening
  // action, which is currently delegated to an external event handler.
  test.skip('should emit multiple revealed events for multiple items', () => {
    const { world, player, room } = setupBasicWorld();
    const author = new AuthorModel(world.getDataStore(), world);

    const chest = author.createEntity('treasure chest', EntityType.CONTAINER);
    chest.add({ type: TraitType.CONTAINER });
    chest.add({ type: TraitType.OPENABLE, isOpen: false });
    author.moveEntity(chest.id, room.id);

    const items = [
      author.createEntity('gold bar', EntityType.ITEM),
      author.createEntity('silver coin', EntityType.ITEM),
      author.createEntity('bronze medal', EntityType.ITEM),
      author.createEntity('ancient scroll', EntityType.ITEM)
    ];
    items.forEach(item => author.moveEntity(item.id, chest.id));

    const command = createCommand(IFActions.OPENING, { entity: chest });
    const context = createRealTestContext(openingAction, world, command);
    const events = executeWithValidation(openingAction, context);

    const revealedEvents = events.filter(e => e.type === 'if.event.revealed');
    expect(revealedEvents).toHaveLength(4);
  });
});

/**
 * World State Mutation Tests
 *
 * These tests verify that the opening action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually set isOpen to true after opening', () => {
    const { world, object } = TestData.withObject('wooden box', {
      [TraitType.OPENABLE]: {
        type: TraitType.OPENABLE,
        isOpen: false
      }
    });

    // VERIFY PRECONDITION: box is closed
    const openableBefore = object.get(OpenableTrait)!;
    expect(openableBefore.isOpen).toBe(false);

    const command = createCommand(IFActions.OPENING, {
      entity: object
    });
    const context = createRealTestContext(openingAction, world, command);

    const validation = openingAction.validate(context);
    expect(validation.valid).toBe(true);
    openingAction.execute(context);

    // VERIFY POSTCONDITION: box is now open
    const openableAfter = object.get(OpenableTrait)!;
    expect(openableAfter.isOpen).toBe(true);
  });

  test('should actually set isOpen to true for container', () => {
    const { world, object } = TestData.withObject('treasure chest', {
      [TraitType.OPENABLE]: {
        type: TraitType.OPENABLE,
        isOpen: false
      },
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER
      }
    });

    // VERIFY PRECONDITION: chest is closed
    const openableBefore = object.get(OpenableTrait)!;
    expect(openableBefore.isOpen).toBe(false);

    const command = createCommand(IFActions.OPENING, {
      entity: object
    });
    const context = createRealTestContext(openingAction, world, command);

    const validation = openingAction.validate(context);
    expect(validation.valid).toBe(true);
    openingAction.execute(context);

    // VERIFY POSTCONDITION: chest is now open
    const openableAfter = object.get(OpenableTrait)!;
    expect(openableAfter.isOpen).toBe(true);
  });

  test('should NOT change isOpen when already open', () => {
    const { world, object } = TestData.withObject('open box', {
      [TraitType.OPENABLE]: {
        type: TraitType.OPENABLE,
        isOpen: true // Already open
      }
    });

    // VERIFY PRECONDITION: box is open
    const openableBefore = object.get(OpenableTrait)!;
    expect(openableBefore.isOpen).toBe(true);

    const command = createCommand(IFActions.OPENING, {
      entity: object
    });
    const context = createRealTestContext(openingAction, world, command);

    // Validation should fail
    const validation = openingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('already_open');

    // VERIFY POSTCONDITION: box is still open (no change)
    const openableAfter = object.get(OpenableTrait)!;
    expect(openableAfter.isOpen).toBe(true);
  });

  test('should NOT change isOpen when locked', () => {
    const { world, object } = TestData.withObject('locked chest', {
      [TraitType.OPENABLE]: {
        type: TraitType.OPENABLE,
        isOpen: false
      },
      [TraitType.LOCKABLE]: {
        type: TraitType.LOCKABLE,
        isLocked: true,
        keyId: 'golden_key'
      }
    });

    // VERIFY PRECONDITION: chest is closed
    const openableBefore = object.get(OpenableTrait)!;
    expect(openableBefore.isOpen).toBe(false);

    const command = createCommand(IFActions.OPENING, {
      entity: object
    });
    const context = createRealTestContext(openingAction, world, command);

    // Validation should fail
    const validation = openingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('locked');

    // VERIFY POSTCONDITION: chest is still closed (no change)
    const openableAfter = object.get(OpenableTrait)!;
    expect(openableAfter.isOpen).toBe(false);
  });

  test('should NOT change state when target is not openable', () => {
    const { world, object } = TestData.withObject('solid rock');
    // No openable trait

    const command = createCommand(IFActions.OPENING, {
      entity: object
    });
    const context = createRealTestContext(openingAction, world, command);

    // Validation should fail
    const validation = openingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_openable');

    // Object should not have openable trait at all
    expect(object.has(TraitType.OPENABLE)).toBe(false);
  });

  test('should actually open unlocked but closed container', () => {
    const { world, object } = TestData.withObject('wall safe', {
      [TraitType.OPENABLE]: {
        type: TraitType.OPENABLE,
        isOpen: false
      },
      [TraitType.LOCKABLE]: {
        type: TraitType.LOCKABLE,
        isLocked: false, // Unlocked
        keyId: 'safe_key'
      },
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER
      }
    });

    // VERIFY PRECONDITION: safe is closed but unlocked
    const openableBefore = object.get(OpenableTrait)!;
    const lockableBefore = object.get(LockableTrait)!;
    expect(openableBefore.isOpen).toBe(false);
    expect(lockableBefore.isLocked).toBe(false);

    const command = createCommand(IFActions.OPENING, {
      entity: object
    });
    const context = createRealTestContext(openingAction, world, command);

    const validation = openingAction.validate(context);
    expect(validation.valid).toBe(true);
    openingAction.execute(context);

    // VERIFY POSTCONDITION: safe is now open
    const openableAfter = object.get(OpenableTrait)!;
    expect(openableAfter.isOpen).toBe(true);
  });
});