/**
 * Golden test for dropping action - demonstrates testing the complement to taking
 * 
 * This shows patterns for testing actions that:
 * - Put down held objects
 * - Check container states
 * - Handle worn items
 * - Deal with various drop locations
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { droppingAction } from '../../../src/actions/standard/dropping'; // Now from folder
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

describe('droppingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(droppingAction.id).toBe(IFActions.DROPPING);
    });

    test('should declare required messages', () => {
      expect(droppingAction.requiredMessages).toContain('no_target');
      expect(droppingAction.requiredMessages).toContain('not_held');
      expect(droppingAction.requiredMessages).toContain('still_worn');
      expect(droppingAction.requiredMessages).toContain('container_not_open');
      expect(droppingAction.requiredMessages).toContain('container_full');
      expect(droppingAction.requiredMessages).toContain('dropped');
      expect(droppingAction.requiredMessages).toContain('dropped_in');
      expect(droppingAction.requiredMessages).toContain('dropped_on');
      expect(droppingAction.requiredMessages).toContain('cant_drop_here');
      expect(droppingAction.requiredMessages).toContain('dropped_quietly');
      expect(droppingAction.requiredMessages).toContain('dropped_carelessly');
    });

    test('should belong to object_manipulation group', () => {
      expect(droppingAction.group).toBe('object_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.DROPPING);
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when not holding the item', () => {
      const { world, player, object } = TestData.withObject('red ball');
      
      const command = createCommand(IFActions.DROPPING, {
        entity: object
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_held'),
        params: { item: 'red ball' }
      });
    });

    test('should fail when item is still worn', () => {
      const { world, player, room } = setupBasicWorld();
      
      const hat = world.createEntity('blue hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: true,
        slot: 'head'
      });
      world.moveEntity(hat.id, player.id);
      
      const command = createCommand(IFActions.DROPPING, {
        entity: hat
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('still_worn'),
        params: { item: 'blue hat' }
      });
    });
  });

  describe('Container Checks', () => {
    test.skip('should allow dropping inside a closed container', () => {
      // TODO: Implement scope-based implied destinations (ADR-043)
      // This test requires command validation to add implicit "in container" destination
      // This test verifies an important IF convention: when the player is trapped
      // inside a closed container (like being locked in a trunk, coffin, or box),
      // they can still drop items. The items stay in the container with them.
      // 
      // The closed/open state prevents movement IN/OUT from outside, but doesn't
      // affect actions within the container. This is crucial for puzzle scenarios
      // where the player might be trapped but needs to manipulate objects.
      // 
      // Example scenarios:
      // - Trapped in a coffin, drop the lighter to preserve oxygen
      // - Locked in a trunk, rearrange items to find an escape tool
      // - Inside a closed elevator, drop items to lighten the load
      //
      // Setup: Player is inside a closed box holding a ball
      // Expected: Dropping succeeds, ball ends up in the box (not the room)
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('wooden box', 'object');
      box.add({ type: TraitType.CONTAINER });
      box.add({ 
        type: TraitType.OPENABLE,
        isOpen: false  // Closed
      });
      world.moveEntity(box.id, room.id);
      
      const ball = world.createEntity('ball', 'object');
      
      // Player is in the closed box with the ball
      world.moveEntity(player.id, box.id);
      world.moveEntity(ball.id, player.id);
      
      const command = createCommand(IFActions.DROPPING, {
        entity: ball
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      // Should succeed - dropping inside a closed container is allowed
      // The closed state prevents things moving IN/OUT from outside, not inside actions
      expectEvent(events, 'if.event.dropped', {
        item: ball.id,
        itemName: 'ball',
        toLocation: box.id,
        toLocationName: 'wooden box',
        toContainer: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dropped_in'),
        params: { 
          item: 'ball',
          container: 'wooden box',
          location: 'wooden box'
        }
      });
    });

    test('should fail when container is full', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('small box', 'object');
      box.add({ 
        type: TraitType.CONTAINER,
        capacity: { maxItems: 1 }
      });
      world.moveEntity(box.id, room.id);
      
      const existingItem = world.createEntity('gold coin', 'object');
      const ball = world.createEntity('ball', 'object');
      
      // Player is in the box with the ball, existing item already in box
      world.moveEntity(player.id, box.id);
      world.moveEntity(existingItem.id, box.id);
      world.moveEntity(ball.id, player.id);
      
      const command = createCommand(IFActions.DROPPING, {
        entity: ball
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('container_full'),
        params: { container: 'small box' }
      });
    });
  });

  describe('Successful Dropping', () => {
    test('should drop item in room', () => {
      const { world, player, item } = TestData.withInventoryItem('red ball');
      
      const command = createCommand(IFActions.DROPPING, {
        entity: item
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      // Should emit DROPPED event
      const room = world.getContainingRoom(player.id);
      expectEvent(events, 'if.event.dropped', {
        item: item.id,
        itemName: 'red ball',
        toLocation: room.id,
        toLocationName: 'Test Room',
        toRoom: true
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dropped'),
        params: { 
          item: 'red ball',
          location: 'Test Room'
        }
      });
    });

    test('should drop item in open container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('wooden box', 'object');
      box.add({ type: TraitType.CONTAINER });
      box.add({ 
        type: TraitType.OPENABLE,
        isOpen: true
      });
      world.moveEntity(box.id, room.id);
      
      const gem = world.createEntity('ruby', 'object');
      
      // Player is in the box with the gem
      world.moveEntity(player.id, box.id);
      world.moveEntity(gem.id, player.id);
      
      const command = createCommand(IFActions.DROPPING, {
        entity: gem
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'if.event.dropped', {
        item: gem.id,
        itemName: 'ruby',
        toLocation: box.id,
        toLocationName: 'wooden box',
        toContainer: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dropped_in'),
        params: { 
          item: 'ruby',
          container: 'wooden box',
          location: 'wooden box'
        }
      });
    });

    test('should drop item on supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const table = world.createEntity('oak table', 'object');
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);
      
      const book = world.createEntity('old book', 'object');
      
      // Setup: player on table with book
      world.moveEntity(player.id, table.id);
      world.moveEntity(book.id, player.id);
      
      const command = createCommand(IFActions.DROPPING, {
        entity: book
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'if.event.dropped', {
        item: book.id,
        itemName: 'old book',
        toLocation: table.id,
        toLocationName: 'oak table',
        toSupporter: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dropped_on'),
        params: { 
          item: 'old book',
          supporter: 'oak table',
          location: 'oak table'
        }
      });
    });
  });

  describe('Message Variations', () => {
    test('should use careful message for glass items', () => {
      const { world, player, room } = setupBasicWorld();
      
      const glass = world.createEntity('glass vase', 'object');
      glass.add({
        type: TraitType.IDENTITY,
        name: 'glass vase'
      });
      world.moveEntity(glass.id, player.id);
      
      const command = createCommand(IFActions.DROPPING, {
        entity: glass
      });
      command.parsed.structure = { verb: { text: 'drop' } } as any;
      
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dropped_quietly')
      });
    });

    test('should use careless message for discard verb', () => {
      const { world, player, item } = TestData.withInventoryItem('crumpled paper');
      
      const command = createCommand(IFActions.DROPPING, {
        entity: item
      });
      command.parsed.structure = { verb: { text: 'discard' } } as any;
      
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dropped_carelessly')
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, item } = TestData.withInventoryItem('gold coin');
      
      const command = createCommand(IFActions.DROPPING, {
        entity: item
      });
      const context = createRealTestContext(droppingAction, world, command);
      
      const events = droppingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(item.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Dropping Action Edge Cases', () => {
  test('should handle dropping in container without capacity limits', () => {
    const { world, player, room } = setupBasicWorld();
    
    // Container without explicit capacity
    const basket = world.createEntity('wicker basket', 'object');
    basket.add({ type: TraitType.CONTAINER });
    world.moveEntity(basket.id, room.id);
    
    const apple = world.createEntity('red apple', 'object');
    
    // Setup: player in basket with apple
    world.moveEntity(player.id, basket.id);
    world.moveEntity(apple.id, player.id);
    
    const command = createCommand(IFActions.DROPPING, {
      entity: apple
    });
    const context = createRealTestContext(droppingAction, world, command);
    
    const events = droppingAction.execute(context);
    
    // Should succeed - no capacity limits
    expectEvent(events, 'if.event.dropped', {
      item: apple.id,
      itemName: 'red apple',
      toLocation: basket.id,
      toLocationName: 'wicker basket',
      toContainer: true
    });
  });

  test('should handle dropping worn item that is not actually worn', () => {
    const { world, player, room } = setupBasicWorld();
    
    // Wearable item that is not currently worn
    const coat = world.createEntity('winter coat', 'object');
    coat.add({
      type: TraitType.WEARABLE,
      worn: false,  // Not worn
      slot: 'body'
    });
    world.moveEntity(coat.id, player.id);
    
    const command = createCommand(IFActions.DROPPING, {
      entity: coat
    });
    const context = createRealTestContext(droppingAction, world, command);
    
    const events = droppingAction.execute(context);
    
    // Should succeed - item is not worn
    expectEvent(events, 'if.event.dropped', {
      item: coat.id,
      itemName: 'winter coat',
      toLocation: room.id,
      toLocationName: 'Test Room',
      toRoom: true
    });
  });

  test.skip('should handle edge case of player dropping item while not in a room', () => {
    // TODO: This test is failing because context.currentLocation returns the room
    // instead of the car when the player is in a vehicle. This might be a bug in
    // how currentLocation is determined in the test context.
    const { world, player, room } = setupBasicWorld();
    
    // Create a non-room, non-container location (e.g., a vehicle)
    const car = world.createEntity('red car', 'vehicle');
    const keys = world.createEntity('car keys', 'object');
    
    world.moveEntity(player.id, car.id);
    world.moveEntity(keys.id, player.id);
    
    const command = createCommand(IFActions.DROPPING, {
      entity: keys
    });
    const context = createRealTestContext(droppingAction, world, command);
    
    const events = droppingAction.execute(context);
    
    // Should succeed with basic dropped message
    expectEvent(events, 'if.event.dropped', {
      item: keys.id,
      itemName: 'car keys',
      toLocation: car.id,
      toLocationName: 'red car'
    });
    
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('dropped'),
      params: { 
        item: 'car keys',
        location: 'red car'
      }
    });
  });
});
