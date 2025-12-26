/**
 * Golden test for inventory action - demonstrates testing player inventory display
 * 
 * This shows patterns for testing actions that:
 * - Fire inventory check events
 * - Include inventory data in the event
 * - Are observable by NPCs
 * 
 * Note: All text formatting is handled by the text service after the turn loop,
 * not by the action itself.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { inventoryAction } from '../../../src/actions/standard/inventory';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext, Action } from '../../../src/actions/enhanced-types';

/**
 * Helper to execute action with proper three-phase pattern support
 */
const executeWithValidation = (action: Action, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    return [context.event('action.error', {
      actionId: action.id,
      error: validation.error,
      messageId: validation.error
    })];
  }

  // Three-phase pattern: execute returns void, report returns events
  if (action.report) {
    action.execute(context);
    return action.report(context);
  }

  // Old two-phase pattern: execute returns events
  return action.execute(context);
};

describe('inventoryAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(inventoryAction.id).toBe(IFActions.INVENTORY);
    });

    test('should declare required messages', () => {
      // Since the action just fires an event, it might not need any messages
      // or it might have a basic set
      expect(inventoryAction.requiredMessages).toBeDefined();
    });

    test('should belong to meta group', () => {
      expect(inventoryAction.group).toBe('meta');
    });
  });

  describe('Empty Inventory', () => {
    test('should fire event for completely empty inventory', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Player has no items
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should emit inventory event
      expectEvent(events, 'if.action.inventory', {
        actorId: player.id,
        locationId: room.id,
        isEmpty: true,
        carried: [],
        worn: []
      });
    });
  });

  describe('Held Items Only', () => {
    test('should include carried items in event', () => {
      const { world, player, room } = setupBasicWorld();
      
      const sword = world.createEntity('steel sword', 'object');
      const torch = world.createEntity('burning torch', 'object');
      
      world.moveEntity(sword.id, player.id);
      world.moveEntity(torch.id, player.id);
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should emit inventory event with items
      expectEvent(events, 'if.action.inventory', {
        actorId: player.id,
        locationId: room.id,
        isEmpty: false
      });
      
      // Event should contain item data
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data.items).toHaveLength(2);
      expect(invEvent?.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: sword.id, name: 'steel sword' }),
          expect.objectContaining({ id: torch.id, name: 'burning torch' })
        ])
      );
    });
  });

  describe('Worn Items', () => {
    test('should include worn items in event', () => {
      const { world, player, room } = setupBasicWorld();
      
      const cloak = world.createEntity('dark cloak', 'object');
      cloak.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyParts: ['torso']
      });
      
      const boots = world.createEntity('leather boots', 'object');
      boots.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyParts: ['feet']
      });
      
      world.moveEntity(cloak.id, player.id);
      world.moveEntity(boots.id, player.id);
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should emit inventory event
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent).toBeDefined();
      
      // Items should be marked as worn
      expect(invEvent?.data.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            id: cloak.id, 
            name: 'dark cloak',
            worn: true 
          }),
          expect.objectContaining({ 
            id: boots.id, 
            name: 'leather boots',
            worn: true 
          })
        ])
      );
    });
  });

  describe('Mixed Inventory', () => {
    test('should include both held and worn items', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Held items
      const key = world.createEntity('brass key', 'object');
      const coin = world.createEntity('gold coin', 'object');
      
      // Worn items
      const hat = world.createEntity('wizard hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyParts: ['head']
      });
      
      // Wearable but not currently worn
      const gloves = world.createEntity('silk gloves', 'object');
      gloves.add({
        type: TraitType.WEARABLE,
        worn: false,
        bodyParts: ['hands']
      });
      
      world.moveEntity(key.id, player.id);
      world.moveEntity(coin.id, player.id);
      world.moveEntity(hat.id, player.id);
      world.moveEntity(gloves.id, player.id);
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should emit inventory event with all items
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data.items).toHaveLength(4);
      
      // Should differentiate worn vs held
      const wornItems = invEvent?.data.items.filter((i: any) => i.worn);
      const heldItems = invEvent?.data.items.filter((i: any) => !i.worn);
      
      expect(wornItems).toHaveLength(1); // just the hat
      expect(heldItems).toHaveLength(3); // key, coin, gloves
    });
  });

  describe('Weight Information', () => {
    test('should include weight data when player has weight limit', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Add inventory limit to player
      const actorTrait = player.getTrait(TraitType.ACTOR);
      if (actorTrait) {
        actorTrait.inventoryLimit = { maxWeight: 100 };
      }
      
      const book = world.createEntity('heavy book', 'object');
      book.add({
        type: TraitType.IDENTITY,
        weight: 20
      });
      
      world.moveEntity(book.id, player.id);
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should include weight data in event
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data.totalWeight).toBeDefined();
      expect(invEvent?.data.maxWeight).toBe(100);
    });

    test('should not include weight data when no weight limit', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Player has no inventory limit
      const item = world.createEntity('mysterious item', 'object');
      world.moveEntity(item.id, player.id);
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should not include weight data
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data.totalWeight).toBeUndefined();
      expect(invEvent?.data.maxWeight).toBeUndefined();
    });
  });

  describe('Brief Format Detection', () => {
    test('should detect brief format from "i" command', () => {
      const { world, player, room } = setupBasicWorld();
      
      const item = world.createEntity('brass lamp', 'object');
      world.moveEntity(item.id, player.id);
      
      const command = createCommand(IFActions.INVENTORY);
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'i',
        head: 'i'
      };
      
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should mark as brief in event
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data.brief).toBe(true);
    });

    test('should detect brief format from "inv" command', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.INVENTORY);
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'inv',
        head: 'inv'
      };
      
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should mark as brief
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data.brief).toBe(true);
    });

    test('should use full format for "inventory" command', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.INVENTORY);
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'inventory',
        head: 'inventory'
      };
      
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should not mark as brief
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data.brief).toBeFalsy();
    });
  });

  describe('Observable Action', () => {
    test('should be observable by NPCs in the room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const guard = world.createEntity('suspicious guard', 'actor');
      guard.add({ type: TraitType.ACTOR });
      world.moveEntity(guard.id, room.id);
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      // Should emit observable event
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent).toBeDefined();
      expect(invEvent?.observable).not.toBe(false); // Default is observable
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.location).toBe(room.id);
          // No target for inventory check
          expect(event.entities.target).toBeUndefined();
        }
      });
    });

    test('should include complete inventory data in event', () => {
      const { world, player, room } = setupBasicWorld();
      
      const sword = world.createEntity('silver sword', 'object');
      const armor = world.createEntity('plate armor', 'object');
      armor.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyParts: ['torso']
      });
      
      world.moveEntity(sword.id, player.id);
      world.moveEntity(armor.id, player.id);
      
      const command = createCommand(IFActions.INVENTORY);
      const context = createRealTestContext(inventoryAction, world, command);
      
      const events = executeWithValidation(inventoryAction, context);
      
      const invEvent = events.find(e => e.type === 'if.action.inventory');
      expect(invEvent?.data).toMatchObject({
        actorId: player.id,
        locationId: room.id,
        isEmpty: false
      });
      
      expect(invEvent?.data.items).toHaveLength(2);
    });
  });
});

describe('Testing Pattern Examples for Inventory', () => {
  test('pattern: inventory with various item types', () => {
    const { world, player } = setupBasicWorld();
    
    // Create various item types
    const items = [
      { name: 'sword', wearable: false },
      { name: 'helmet', wearable: true, bodyParts: ['head'], worn: true },
      { name: 'potion', wearable: false },
      { name: 'cloak', wearable: true, bodyParts: ['torso'], worn: false }
    ];
    
    items.forEach(itemData => {
      const item = world.createEntity(itemData.name, 'object');
      if (itemData.wearable) {
        item.add({
          type: TraitType.WEARABLE,
          worn: itemData.worn || false,
          bodyParts: itemData.bodyParts
        });
      }
      world.moveEntity(item.id, player.id);
    });
    
    const command = createCommand(IFActions.INVENTORY);
    const context = createRealTestContext(inventoryAction, world, command);
    const events = executeWithValidation(inventoryAction, context);
    
    const invEvent = events.find(e => e.type === 'if.action.inventory');
    expect(invEvent?.data.items).toHaveLength(4);
  });

  test('pattern: weight calculation', () => {
    const { world, player } = setupBasicWorld();
    
    // Set player weight limit
    const actorTrait = player.getTrait(TraitType.ACTOR);
    if (actorTrait) {
      actorTrait.inventoryLimit = { maxWeight: 50 };
    }
    
    // Create items with different weights
    const lightItem = world.createEntity('feather', 'object');
    lightItem.add({ type: TraitType.IDENTITY, weight: 1 });
    
    const mediumItem = world.createEntity('book', 'object');
    mediumItem.add({ type: TraitType.IDENTITY, weight: 10 });
    
    const heavyItem = world.createEntity('anvil', 'object');
    heavyItem.add({ type: TraitType.IDENTITY, weight: 30 });
    
    world.moveEntity(lightItem.id, player.id);
    world.moveEntity(mediumItem.id, player.id);
    world.moveEntity(heavyItem.id, player.id);
    
    const command = createCommand(IFActions.INVENTORY);
    const context = createRealTestContext(inventoryAction, world, command);
    const events = executeWithValidation(inventoryAction, context);
    
    const invEvent = events.find(e => e.type === 'if.action.inventory');
    // Total weight should be 41 (1 + 10 + 30)
    expect(invEvent?.data.totalWeight).toBe(41);
    expect(invEvent?.data.maxWeight).toBe(50);
  });

  test('pattern: empty inventory variations', () => {
    const { world, player } = setupBasicWorld();
    
    const command = createCommand(IFActions.INVENTORY);
    const context = createRealTestContext(inventoryAction, world, command);
    const events = executeWithValidation(inventoryAction, context);
    
    const invEvent = events.find(e => e.type === 'if.action.inventory');
    expect(invEvent?.data.isEmpty).toBe(true);
    expect(invEvent?.data.items).toHaveLength(0);
  });
});
