/**
 * Golden test for taking action - demonstrates testing the most fundamental object manipulation
 * 
 * This shows patterns for testing actions that:
 * - Pick up objects from various locations
 * - Check carrying capacity
 * - Handle special object types
 * - Deal with container interactions
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { takingAction } from '../../../src/actions/standard/taking'; // Now from folder
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('takingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(takingAction.id).toBe(IFActions.TAKING);
    });

    test('should declare required messages', () => {
      expect(takingAction.requiredMessages).toContain('no_target');
      expect(takingAction.requiredMessages).toContain('cant_take_self');
      expect(takingAction.requiredMessages).toContain('already_have');
      expect(takingAction.requiredMessages).toContain('cant_take_room');
      expect(takingAction.requiredMessages).toContain('fixed_in_place');
      expect(takingAction.requiredMessages).toContain('container_full');
      expect(takingAction.requiredMessages).toContain('too_heavy');
      expect(takingAction.requiredMessages).toContain('taken');
      expect(takingAction.requiredMessages).toContain('taken_from');
    });

    test('should belong to object_manipulation group', () => {
      expect(takingAction.group).toBe('object_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING)
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when trying to take yourself', () => {
      const { world, player } = setupBasicWorld();
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: player })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_take_self'),
        reason: 'cant_take_self'
      });
    });

    test('should fail when already holding the item', () => {
      const { world, player } = setupBasicWorld();
      const ball = world.createEntity('red ball', 'object');
      world.moveEntity(ball.id, player.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: ball })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_have'),
        params: { item: 'red ball' }
      });
    });

    test('should fail when trying to take a room', () => {
      const { world, player } = setupBasicWorld();
      const otherRoom = world.createEntity('Another Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: otherRoom })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_take_room'),
        params: { item: 'Another Room' }
      });
    });

    test('should fail when object is scenery', () => {
      const { world, player, room } = setupBasicWorld();
      const scenery = world.createEntity('ornate fountain', 'object');
      scenery.add({ type: TraitType.SCENERY });
      world.moveEntity(scenery.id, room.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: scenery })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('fixed_in_place'),
        params: { item: 'ornate fountain' }
      });
    });
  });

  describe('Container Capacity Checks', () => {
    test('should fail when container is full', () => {
      const world = new WorldModel();
      const room = world.createEntity('Test Room', 'room');
      room.add({ type: TraitType.ROOM });
      
      // Create player with limited container capacity
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR });
      player.add({
        type: TraitType.CONTAINER,
        capacity: { maxItems: 2 }
      });
      world.setPlayer(player.id);
      
      // Add items already in inventory
      const item1 = world.createEntity('first item', 'object');
      const item2 = world.createEntity('second item', 'object');
      const newItem = world.createEntity('new item', 'object');
      
      world.moveEntity(player.id, room.id);
      world.moveEntity(item1.id, player.id);
      world.moveEntity(item2.id, player.id);
      world.moveEntity(newItem.id, room.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: newItem })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('container_full')
      });
    });

    test('should not count worn items toward capacity', () => {
      const world = new WorldModel();
      const room = world.createEntity('Test Room', 'room');
      room.add({ type: TraitType.ROOM });
      
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR });
      player.add({
        type: TraitType.CONTAINER,
        capacity: { maxItems: 1 }
      });
      world.setPlayer(player.id);
      
      // Add a worn item
      const hat = world.createEntity('red hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: true,
        slot: 'head'
      });
      
      const newItem = world.createEntity('ball', 'object');
      
      world.moveEntity(player.id, room.id);
      world.moveEntity(hat.id, player.id);
      world.moveEntity(newItem.id, room.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: newItem })
      );
      
      const events = takingAction.execute(context);
      
      // Should succeed because worn items don't count
      expectEvent(events, 'if.event.taken', {
        item: newItem.name
      });
    });

    test.skip('should fail when too heavy', () => {
      const world = new WorldModel();
      const room = world.createEntity('Test Room', 'room');
      room.add({ type: TraitType.ROOM });
      
      const player = world.createEntity('yourself', 'actor');
      player.add({
        type: TraitType.ACTOR,
        inventoryLimit: { maxWeight: 10 }
      });
      player.add({ type: TraitType.CONTAINER });
      world.setPlayer(player.id);
      
      const heavyItem = world.createEntity('heavy boulder', 'object');
      // The test expects weight to be handled by the world model
      // Let's just create the item without a PORTABLE trait for now
      
      world.moveEntity(player.id, room.id);
      world.moveEntity(heavyItem.id, room.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: heavyItem })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('too_heavy'),
        params: { item: 'heavy boulder' }
      });
    });
  });

  describe('Successful Taking', () => {
    test('should take object from room', () => {
      const { world, player, room } = setupBasicWorld();
      const ball = world.createEntity('red ball', 'object');
      world.moveEntity(ball.id, room.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: ball })
      );
      
      const events = takingAction.execute(context);
      
      // Should emit TAKEN event
      // Note: When taking from a room, fromLocation is NOT set (only set for containers/supporters)
      expectEvent(events, 'if.event.taken', {
        item: 'red ball'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('taken'),
        params: { item: 'red ball' }
      });
    });

    test('should take object from container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('wooden box', 'object');
      box.add({ type: TraitType.CONTAINER });
      const coin = world.createEntity('gold coin', 'object');
      
      world.moveEntity(box.id, room.id);
      world.moveEntity(coin.id, box.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: coin })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'if.event.taken', {
        item: 'gold coin',
        container: 'wooden box',
        fromContainer: true,
        fromLocation: box.id
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('taken_from'),
        params: { 
          item: 'gold coin',
          container: 'wooden box',
          fromContainer: true,
          fromLocation: box.id
        }
      });
    });

    test('should take object from supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const table = world.createEntity('wooden table', 'object');
      table.add({ type: TraitType.SUPPORTER });
      const book = world.createEntity('old book', 'object');
      
      world.moveEntity(table.id, room.id);
      world.moveEntity(book.id, table.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: book })
      );
      
      const events = takingAction.execute(context);
      
      expectEvent(events, 'if.event.taken', {
        item: 'old book',
        container: 'wooden table',
        fromSupporter: true,
        fromLocation: table.id
      });
    });

    test('should implicitly remove worn item before taking', () => {
      const { world, player, room } = setupBasicWorld();
      
      const npc = world.createEntity('guard', 'actor');
      npc.add({ type: TraitType.ACTOR });
      const hat = world.createEntity('fancy hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: true,
        slot: 'head'
      });
      
      world.moveEntity(npc.id, room.id);
      world.moveEntity(hat.id, npc.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: hat })
      );
      
      const events = takingAction.execute(context);
      
      // Should emit REMOVED event first
      expectEvent(events, 'if.event.removed', {
        implicit: true,
        item: 'fancy hat'
      });
      
      // Then TAKEN event
      expectEvent(events, 'if.event.taken', {
        item: 'fancy hat',
        container: 'guard',
        fromLocation: npc.id
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const gem = world.createEntity('ruby', 'object');
      world.moveEntity(gem.id, room.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: gem })
      );
      
      const events = takingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(gem.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });

    test('should not include container info when taking from room', () => {
      const { world, player, room } = setupBasicWorld();
      const pen = world.createEntity('blue pen', 'object');
      world.moveEntity(pen.id, room.id);
      
      const context = createRealTestContext(
        takingAction, 
        world, 
        createCommand(IFActions.TAKING, { entity: pen })
      );
      
      const events = takingAction.execute(context);
      
      const takenEvent = events.find(e => e.type === 'if.event.taken');
      // Check the event payload data (where the typed event data lives)
      expect(takenEvent?.payload?.data?.container).toBeUndefined();
      expect(takenEvent?.payload?.data?.fromContainer).toBeUndefined();
      expect(takenEvent?.payload?.data?.fromSupporter).toBeUndefined();
      expect(takenEvent?.payload?.data?.fromLocation).toBeUndefined();
    });
  });
});

describe('Taking Action Edge Cases', () => {
  test('should handle taking from nested containers', () => {
    const { world, player, room } = setupBasicWorld();
    
    const chest = world.createEntity('treasure chest', 'object');
    chest.add({ type: TraitType.CONTAINER });
    const box = world.createEntity('small box', 'object');
    box.add({ type: TraitType.CONTAINER });
    const gem = world.createEntity('diamond', 'object');
    
    world.moveEntity(chest.id, room.id);
    world.moveEntity(box.id, chest.id);
    world.moveEntity(gem.id, box.id);
    
    const context = createRealTestContext(
      takingAction, 
      world, 
      createCommand(IFActions.TAKING, { entity: gem })
    );
    
    const events = takingAction.execute(context);
    
    // Should take from immediate container (box), not the outer container
    expectEvent(events, 'if.event.taken', {
      item: 'diamond',
      container: 'small box',
      fromContainer: true,
      fromLocation: box.id
    });
  });

  test('should handle empty player without container trait', () => {
    const world = new WorldModel();
    const room = world.createEntity('Test Room', 'room');
    room.add({ type: TraitType.ROOM });
    
    // Player without container trait
    const player = world.createEntity('yourself', 'actor');
    player.add({ type: TraitType.ACTOR });
    world.setPlayer(player.id);
    const ball = world.createEntity('ball', 'object');
    
    world.moveEntity(player.id, room.id);
    world.moveEntity(ball.id, room.id);
    
    const context = createRealTestContext(
      takingAction, 
      world, 
      createCommand(IFActions.TAKING, { entity: ball })
    );
    
    const events = takingAction.execute(context);
    
    // Should succeed - no container limits
    expectEvent(events, 'if.event.taken', {
      item: 'ball'
    });
  });
});
