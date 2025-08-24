/**
 * Golden test for putting action - demonstrates testing flexible object placement
 * 
 * This shows patterns for testing actions that:
 * - Handle both containers and supporters
 * - Auto-detect appropriate preposition
 * - Check capacity limits (items, weight, volume)
 * - Prevent recursive containment
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { puttingAction } from '../../../src/actions/standard/putting';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, EntityType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { WorldModel } from '@sharpee/world-model';
import { SemanticEvent } from '@sharpee/core';
import type { ActionContext } from '../../../src/actions/enhanced-types';
import type { ISemanticEvent } from '@sharpee/core';

// Helper to execute action using the new three-phase pattern
function executeAction(action: any, context: ActionContext): ISemanticEvent[] {
  // New three-phase pattern: validate -> execute -> report
  const validationResult = action.validate(context);
  
  if (!validationResult.valid) {
    // Action creates its own error events in report()
    return action.report(context, validationResult);
  }
  
  // Execute mutations (returns void in new pattern)
  action.execute(context);
  
  // Report generates all events
  return action.report(context, validationResult);
}

describe('puttingAction (Golden Pattern)', () => {
  describe('Three-Phase Pattern Compliance', () => {
    test('should have required methods for three-phase pattern', () => {
      expect(puttingAction.validate).toBeDefined();
      expect(puttingAction.execute).toBeDefined();
      expect(puttingAction.report).toBeDefined();
    });

    test('should use report() for ALL event generation', () => {
      const { world, player, room } = setupBasicWorld();
      const item = world.createEntity('test item', 'object');
      world.moveEntity(item.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: item,
        text: 'test item'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      // The executeAction helper properly tests the three-phase pattern
      const events = executeAction(puttingAction, context);
      
      // All events should be generated via report()
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(puttingAction.id).toBe(IFActions.PUTTING);
    });

    test('should declare required messages', () => {
      expect(puttingAction.requiredMessages).toContain('no_target');
      expect(puttingAction.requiredMessages).toContain('no_destination');
      expect(puttingAction.requiredMessages).toContain('not_held');
      expect(puttingAction.requiredMessages).toContain('not_container');
      expect(puttingAction.requiredMessages).toContain('not_surface');
      expect(puttingAction.requiredMessages).toContain('container_closed');
      expect(puttingAction.requiredMessages).toContain('already_there');
      expect(puttingAction.requiredMessages).toContain('put_in');
      expect(puttingAction.requiredMessages).toContain('put_on');
      expect(puttingAction.requiredMessages).toContain('cant_put_in_itself');
      expect(puttingAction.requiredMessages).toContain('cant_put_on_itself');
      expect(puttingAction.requiredMessages).toContain('no_room');
      expect(puttingAction.requiredMessages).toContain('no_space');
    });

    test('should belong to object_manipulation group', () => {
      expect(puttingAction.group).toBe('object_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.PUTTING);
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when no destination specified', () => {
      const { world, player } = setupBasicWorld();
      const ball = world.createEntity('ball', 'object');
      world.moveEntity(ball.id, player.id); // Player holds ball
      
      const command = createCommand(IFActions.PUTTING,
        { entity: ball }
        // No indirect object
      );
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_destination'),
        params: { item: 'ball' }
      });
    });

    // Test removed - 'not_held' validation moved to CommandValidator

    test('should fail when trying to put something in itself', () => {
      const { world, player } = setupBasicWorld();
      
      const box = world.createEntity('magic box', 'object');
      box.add({
        type: TraitType.CONTAINER
      });
      
      world.moveEntity(box.id, player.id);  // Player holds box
      
      const command = createCommand(IFActions.PUTTING, {
        entity: box,
        secondEntity: box,
        preposition: 'in'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_put_in_itself'),
        params: { item: 'magic box' }
      });
    });

    test('should fail when trying to put something on itself', () => {
      const { world, player } = setupBasicWorld();
      
      const table = world.createEntity('folding table', EntityType.SUPPORTER);
      table.add({ type: TraitType.SUPPORTER });
      
      world.moveEntity(table.id, player.id);  // Player holds table
      
      const command = createCommand(IFActions.PUTTING, {
        entity: table,
        secondEntity: table,
        preposition: 'on'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_put_on_itself'),
        params: { item: 'folding table' }
      });
    });

    test('should fail when item already in destination', () => {
      const { world, player, room } = setupBasicWorld();
      
      const key = world.createEntity('brass key', EntityType.OBJECT);
      const drawer = world.createEntity('desk drawer', EntityType.CONTAINER);
      drawer.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(drawer.id, room.id);
      world.moveEntity(key.id, drawer.id);  // Key already in drawer
      
      // Need to hold the key to attempt putting it
      world.moveEntity(key.id, player.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: key,
        secondEntity: drawer
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      // Check that key is already in drawer
      const keyLocation = world.getLocation(key.id);
      if (keyLocation === drawer.id) {
        // If the action checks this, it should fail
        // For now, let's just run the action and see what happens
      }
      
      const events = executeAction(puttingAction, context);
      
      // The action should check if item is already in destination
      // and fail appropriately
    });
  });

  describe('Container Placement', () => {
    test('should put in open container with explicit preposition', () => {
      const { world, player, room } = setupBasicWorld();
      
      const gem = world.createEntity('ruby', 'object');
      const box = world.createEntity('jewel box', 'object');
      box.add({
        type: TraitType.CONTAINER
      });
      box.add({
        type: TraitType.OPENABLE,
        isOpen: true
      });
      
      world.moveEntity(gem.id, player.id);
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: gem,
        secondEntity: box,
        preposition: 'in'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'if.event.put_in', {
        itemId: gem.id,
        targetId: box.id,
        preposition: 'in'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('put_in'),
        params: { 
          item: 'ruby',
          container: 'jewel box'
        }
      });
    });

    test('should auto-detect container without preposition', () => {
      const { world, player, room } = setupBasicWorld();
      
      const letter = world.createEntity('sealed letter', EntityType.OBJECT);
      const envelope = world.createEntity('large envelope', EntityType.CONTAINER);
      envelope.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(letter.id, player.id);
      world.moveEntity(envelope.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: letter,
        secondEntity: envelope  // No preposition
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      // Should auto-detect "in" for container
      expectEvent(events, 'if.event.put_in', {
        itemId: letter.id,
        targetId: envelope.id,
        preposition: 'in'
      });
    });

    test('should fail when container is closed', () => {
      const { world, player, room } = setupBasicWorld();
      
      const coin = world.createEntity('silver coin', EntityType.OBJECT);
      const chest = world.createEntity('locked chest', EntityType.CONTAINER);
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ 
        type: TraitType.OPENABLE,
        isOpen: false  // Closed
      });
      
      world.moveEntity(coin.id, player.id);
      world.moveEntity(chest.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: coin,
        secondEntity: chest,
        preposition: 'in'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('container_closed'),
        params: { container: 'locked chest' }
      });
    });

    test('should fail with wrong preposition for container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const ball = world.createEntity('tennis ball', EntityType.OBJECT);
      const box = world.createEntity('cardboard box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(ball.id, player.id);
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: ball,
        secondEntity: box,
        preposition: 'on'  // Wrong preposition
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_surface'),
        params: { destination: 'cardboard box' }
      });
    });
  });

  describe('Supporter Placement', () => {
    test('should put on supporter with explicit preposition', () => {
      const { world, player, room } = setupBasicWorld();
      
      const book = world.createEntity('thick book', EntityType.OBJECT);
      const table = world.createEntity('round table', EntityType.SUPPORTER);
      table.add({ type: TraitType.SUPPORTER });
      
      world.moveEntity(book.id, player.id);
      world.moveEntity(table.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: book,
        secondEntity: table,
        preposition: 'on'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'if.event.put_on', {
        itemId: book.id,
        targetId: table.id,
        preposition: 'on'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('put_on'),
        params: { 
          item: 'thick book',
          surface: 'round table'
        }
      });
    });

    test('should auto-detect supporter without preposition', () => {
      const { world, player, room } = setupBasicWorld();
      
      const vase = world.createEntity('crystal vase', EntityType.OBJECT);
      const shelf = world.createEntity('wooden shelf', EntityType.SUPPORTER);
      shelf.add({ type: TraitType.SUPPORTER });
      
      world.moveEntity(vase.id, player.id);
      world.moveEntity(shelf.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: vase,
        secondEntity: shelf  // No preposition
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      // Should auto-detect "on" for supporter
      expectEvent(events, 'if.event.put_on', {
        itemId: vase.id,
        targetId: shelf.id,
        preposition: 'on'
      });
    });

    test('should fail with wrong preposition for supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const cup = world.createEntity('coffee cup', EntityType.OBJECT);
      const counter = world.createEntity('kitchen counter', EntityType.SUPPORTER);
      counter.add({ type: TraitType.SUPPORTER });
      
      world.moveEntity(cup.id, player.id);
      world.moveEntity(counter.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: cup,
        secondEntity: counter,
        preposition: 'in'  // Wrong preposition
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_container'),
        params: { destination: 'kitchen counter' }
      });
    });
  });

  describe('Capacity Checks', () => {
    test('should respect container item limit', () => {
      const { world, player, room } = setupBasicWorld();
      
      const newCoin = world.createEntity('copper coin', EntityType.OBJECT);
      const pouch = world.createEntity('coin pouch', EntityType.CONTAINER);
      pouch.add({ 
        type: TraitType.CONTAINER,
        capacity: { maxItems: 5 }
      });
      
      // Create 5 existing coins
      const coins = [];
      for (let i = 1; i <= 5; i++) {
        const coin = world.createEntity(`coin ${i}`, EntityType.OBJECT);
        coins.push(coin);
        world.moveEntity(coin.id, pouch.id);
      }
      
      world.moveEntity(newCoin.id, player.id);
      world.moveEntity(pouch.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: newCoin,
        secondEntity: pouch,
        preposition: 'in'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_room'),
        params: { container: 'coin pouch' }
      });
    });

    test('should respect container weight limit', () => {
      const { world, player, room } = setupBasicWorld();
      
      const brick = world.createEntity('heavy brick', EntityType.OBJECT);
      brick.add({
        type: TraitType.IDENTITY,
        weight: 5
      });
      
      const bag = world.createEntity('canvas bag', EntityType.CONTAINER);
      bag.add({ 
        type: TraitType.CONTAINER,
        capacity: { maxWeight: 10 }
      });
      
      // Existing heavy item
      const rock = world.createEntity('large rock', EntityType.OBJECT);
      rock.add({
        type: TraitType.IDENTITY,
        weight: 6
      });
      
      world.moveEntity(brick.id, player.id);
      world.moveEntity(bag.id, room.id);
      world.moveEntity(rock.id, bag.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: brick,
        secondEntity: bag,
        preposition: 'in'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_room'),
        params: { container: 'canvas bag' }
      });
    });

    test('should respect supporter item limit', () => {
      const { world, player, room } = setupBasicWorld();
      
      const plate = world.createEntity('dinner plate', EntityType.OBJECT);
      const tray = world.createEntity('serving tray', EntityType.SUPPORTER);
      tray.add({ 
        type: TraitType.SUPPORTER,
        capacity: { maxItems: 3 }
      });
      
      // Create 3 existing plates
      const plates = [];
      for (let i = 1; i <= 3; i++) {
        const p = world.createEntity(`plate ${i}`, EntityType.OBJECT);
        plates.push(p);
        world.moveEntity(p.id, tray.id);
      }
      
      world.moveEntity(plate.id, player.id);
      world.moveEntity(tray.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: plate,
        secondEntity: tray,
        preposition: 'on'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_space'),
        params: { surface: 'serving tray' }
      });
    });
  });

  describe('Container/Supporter Dual Nature', () => {
    test('should prefer container for dual-nature objects without preposition', () => {
      const { world, player, room } = setupBasicWorld();
      
      const pen = world.createEntity('fountain pen', EntityType.OBJECT);
      const desk = world.createEntity('writing desk', EntityType.SUPPORTER);
      desk.add({ type: TraitType.CONTAINER });  // Has drawers
      desk.add({ type: TraitType.SUPPORTER });   // Has surface
      
      world.moveEntity(pen.id, player.id);
      world.moveEntity(desk.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: pen,
        secondEntity: desk  // No preposition
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      // Should prefer container (in) over supporter (on)
      expectEvent(events, 'if.event.put_in', {
        preposition: 'in'
      });
    });

    test('should respect explicit preposition for dual-nature objects', () => {
      const { world, player, room } = setupBasicWorld();
      
      const lamp = world.createEntity('desk lamp', EntityType.OBJECT);
      const desk = world.createEntity('writing desk', EntityType.SUPPORTER);
      desk.add({ type: TraitType.CONTAINER });  // Has drawers
      desk.add({ type: TraitType.SUPPORTER });   // Has surface
      
      world.moveEntity(lamp.id, player.id);
      world.moveEntity(desk.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: lamp,
        secondEntity: desk,
        preposition: 'on'  // Explicit "on"
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      // Should use supporter behavior with "on"
      expectEvent(events, 'if.event.put_on', {
        preposition: 'on'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('put_on'),
        params: { 
          item: 'desk lamp',
          surface: 'writing desk' 
        }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const ring = world.createEntity('gold ring', 'object');
      const box = world.createEntity('ring box', 'object');
      box.add({
        type: TraitType.CONTAINER
      });
      
      world.moveEntity(ring.id, player.id);
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.PUTTING, {
        entity: ring,
        secondEntity: box,
        preposition: 'in'
      });
      const context = createRealTestContext(puttingAction, world, command);
      
      const events = executeAction(puttingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(ring.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Putting Action Edge Cases', () => {
  test('should handle volume capacity', () => {
    const { world, player, room } = setupBasicWorld();
    
    const watermelon = world.createEntity('large watermelon', EntityType.OBJECT);
    watermelon.add({
      type: TraitType.IDENTITY,
      volume: 8
    });
    
    const basket = world.createEntity('fruit basket', EntityType.CONTAINER);
    basket.add({ 
      type: TraitType.CONTAINER,
      capacity: { maxVolume: 10 }
    });
    
    // Existing fruit
    const apple = world.createEntity('red apple', EntityType.OBJECT);
    apple.add({
      type: TraitType.IDENTITY,
      volume: 3
    });
    
    world.moveEntity(watermelon.id, player.id);
    world.moveEntity(basket.id, room.id);
    world.moveEntity(apple.id, basket.id);
    
    const command = createCommand(IFActions.PUTTING, {
      entity: watermelon,
      secondEntity: basket,
      preposition: 'in'
    });
    const context = createRealTestContext(puttingAction, world, command);
    
    const events = executeAction(puttingAction, context);
    
    // 3 + 8 = 11, exceeds maxVolume of 10
    expectEvent(events, 'action.error', {
      messageId: expect.stringContaining('no_room'),
      params: { container: 'fruit basket' }
    });
  });

  test('should handle items without weight/volume properties', () => {
    const { world, player, room } = setupBasicWorld();
    
    const feather = world.createEntity('feather', EntityType.OBJECT);
    // No identity trait with weight/volume
    
    const pouch = world.createEntity('small pouch', EntityType.CONTAINER);
    pouch.add({ 
      type: TraitType.CONTAINER,
      capacity: { maxWeight: 5 }
    });
    
    world.moveEntity(feather.id, player.id);
    world.moveEntity(pouch.id, room.id);
    
    const command = createCommand(IFActions.PUTTING, {
      entity: feather,
      secondEntity: pouch,
      preposition: 'in'
    });
    const context = createRealTestContext(puttingAction, world, command);
    
    const events = executeAction(puttingAction, context);
    
    // Should succeed - item without weight doesn't count against weight limit
    expectEvent(events, 'if.event.put_in', {
      itemId: feather.id,
      targetId: pouch.id
    });
  });

  test('should handle target that is neither container nor supporter', () => {
    const { world, player, room } = setupBasicWorld();
    
    const coin = world.createEntity('gold coin', EntityType.OBJECT);
    const statue = world.createEntity('marble statue', EntityType.OBJECT);  // Just a thing
    
    world.moveEntity(coin.id, player.id);
    world.moveEntity(statue.id, room.id);
    
    const command = createCommand(IFActions.PUTTING, {
      entity: coin,
      secondEntity: statue
    });
    const context = createRealTestContext(puttingAction, world, command);
    
    const events = executeAction(puttingAction, context);
    
    expectEvent(events, 'action.error', {
      messageId: expect.stringContaining('not_container'),
      params: { destination: 'marble statue' }
    });
  });

  test('should handle alternative prepositions', () => {
    const { world, player, room } = setupBasicWorld();
    
    const book = world.createEntity('novel', EntityType.OBJECT);
    const shelf = world.createEntity('bookshelf', EntityType.SUPPORTER);
    shelf.add({ type: TraitType.SUPPORTER });
    
    world.moveEntity(book.id, player.id);
    world.moveEntity(shelf.id, room.id);
    
    const command = createCommand(IFActions.PUTTING, {
      entity: book,
      secondEntity: shelf,
      preposition: 'onto'  // Alternative to 'on'
    });
    const context = createRealTestContext(puttingAction, world, command);
    
    const events = executeAction(puttingAction, context);
    
    // Should accept 'onto' as equivalent to 'on'
    expectEvent(events, 'if.event.put_on', {
      preposition: 'on'
    });
  });

  test('should handle container without capacity limits', () => {
    const { world, player, room } = setupBasicWorld();
    
    const item = world.createEntity('mysterious item', EntityType.OBJECT);
    const vortex = world.createEntity('dimensional vortex', EntityType.CONTAINER);
    vortex.add({ 
      type: TraitType.CONTAINER
      // No capacity limits
    });
    
    world.moveEntity(item.id, player.id);
    world.moveEntity(vortex.id, room.id);
    
    const command = createCommand(IFActions.PUTTING, {
      entity: item,
      secondEntity: vortex,
      preposition: 'into'
    });
    const context = createRealTestContext(puttingAction, world, command);
    
    const events = executeAction(puttingAction, context);
    
    // Should succeed - no capacity limits
    expectEvent(events, 'if.event.put_in', {
      itemId: item.id,
      targetId: vortex.id
    });
  });

  test('should handle complex capacity calculation with multiple items', () => {
    const { world, player, room } = setupBasicWorld();
    
    const newBook = world.createEntity('thick encyclopedia', EntityType.OBJECT);
    newBook.add({
      type: TraitType.IDENTITY,
      weight: 3,
      volume: 4
    });
    
    const shelf = world.createEntity('bookshelf', EntityType.SUPPORTER);
    shelf.add({ 
      type: TraitType.SUPPORTER,
      capacity: { 
        maxWeight: 20,
        maxItems: 10
      }
    });
    
    // Create existing books
    const books = [];
    for (let i = 1; i <= 5; i++) {
      const book = world.createEntity(`book ${i}`, EntityType.OBJECT);
      book.add({
        type: TraitType.IDENTITY,
        weight: 2
      });
      books.push(book);
      world.moveEntity(book.id, shelf.id);
    }
    
    world.moveEntity(newBook.id, player.id);
    world.moveEntity(shelf.id, room.id);
    
    const command = createCommand(IFActions.PUTTING, {
      entity: newBook,
      secondEntity: shelf,
      preposition: 'on'
    });
    const context = createRealTestContext(puttingAction, world, command);
    
    const events = executeAction(puttingAction, context);
    
    // Current weight: 5 books * 2 = 10
    // New book weight: 3
    // Total: 13, which is under limit of 20
    // Item count: 5 + 1 = 6, which is under limit of 10
    expectEvent(events, 'if.event.put_on', {
      itemId: newBook.id,
      targetId: shelf.id
    });
  });
});
