/**
 * Golden test for drinking action - demonstrates testing drinkable items
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to consume liquids and beverages
 * - Check drinkable traits (liquid property)
 * - Handle containers with liquids
 * - Track servings and liquid amounts
 * - Support implicit taking when item is in room
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { drinkingAction } from '../../../src/actions/standard/drinking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, EdibleTrait, ContainerTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand,
  setupBasicWorld
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('drinkingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(drinkingAction.id).toBe(IFActions.DRINKING);
    });

    test('should declare required messages', () => {
      expect(drinkingAction.requiredMessages).toContain('no_item');
      expect(drinkingAction.requiredMessages).toContain('not_visible');
      expect(drinkingAction.requiredMessages).toContain('not_reachable');
      expect(drinkingAction.requiredMessages).toContain('not_drinkable');
      expect(drinkingAction.requiredMessages).toContain('already_consumed');
      expect(drinkingAction.requiredMessages).toContain('container_closed');
      expect(drinkingAction.requiredMessages).toContain('drunk');
      expect(drinkingAction.requiredMessages).toContain('drunk_all');
      expect(drinkingAction.requiredMessages).toContain('drunk_some');
      expect(drinkingAction.requiredMessages).toContain('refreshing');
      expect(drinkingAction.requiredMessages).toContain('thirst_quenched');
      expect(drinkingAction.requiredMessages).toContain('still_thirsty');
    });

    test('should belong to interaction group', () => {
      expect(drinkingAction.group).toBe('interaction');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no item specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.DRINKING);
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      expectEvent(events, 'if.event.drunk', {
        blocked: true,
        messageId: expect.stringContaining('no_item'),
        reason: 'no_item'
      });
    });

    test('should fail when item is not drinkable', () => {
      const { world, player, room, object } = TestData.withObject('loaf of bread', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: false  // This is food, not a drink
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: object
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      expectEvent(events, 'if.event.drunk', {
        blocked: true,
        messageId: expect.stringContaining('not_drinkable'),
        params: { item: { name: 'loaf of bread' } }
      });
    });

    test('should fail when drink is already consumed', () => {
      const { world, player, item } = TestData.withInventoryItem('empty potion', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          servings: 0  // Already drunk
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      expectEvent(events, 'if.event.drunk', {
        blocked: true,
        messageId: expect.stringContaining('already_consumed'),
        params: { item: { name: 'empty potion' } }
      });
    });

    test('should fail when container is closed', () => {
      const { world, player, item } = TestData.withInventoryItem('water bottle', {
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER,
          containsLiquid: true,
          liquidType: 'water'
        },
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: false  // Closed
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      expectEvent(events, 'if.event.drunk', {
        blocked: true,
        messageId: expect.stringContaining('container_closed'),
        params: { item: { name: 'water bottle' } }
      });
    });
  });

  describe('Successful Drinking', () => {
    test('should drink item from inventory', () => {
      const { world, player, item } = TestData.withInventoryItem('cup of coffee', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit DRUNK event
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        itemName: 'cup of coffee'
      });
      
      // Should emit success message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('drunk'),
        params: { item: { name: 'cup of coffee' } }
      });
    });

    test('should implicitly take and drink item from room', () => {
      const { world, player, room, object } = TestData.withObject('can of soda', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: object
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit implicit TAKEN event first
      expectEvent(events, 'if.event.taken', {
        implicit: true,
        item: object.id,
        itemName: 'can of soda'
      });
      
      // Should emit DRUNK event
      expectEvent(events, 'if.event.drunk', {
        item: object.id,
        itemName: 'can of soda'
      });
      
      // Should emit success message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('drunk'),
        params: { item: { name: 'can of soda' } }
      });
    });

    test('should handle drink with portions', () => {
      const { world, player, item } = TestData.withInventoryItem('pot of tea', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          servings: 4
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit DRUNK event with portion info
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        portions: 4,
        portionsRemaining: 3
      });
      
      // Should emit "drunk_some" message for partial consumption
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('drunk_some'),
        params: { item: { name: 'pot of tea' } }
      });
    });

    test('should handle drinking last portion of multi-serving drink', () => {
      const { world, player, item } = TestData.withInventoryItem('glass of wine', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          servings: 2  // Two sips left
        }
      });

      // Drink the first serving
      const command1 = createCommand(IFActions.DRINKING, { entity: item });
      const context1 = createRealTestContext(drinkingAction, world, command1);
      drinkingAction.validate(context1);
      drinkingAction.execute(context1);

      // Now drink the last one
      const command2 = createCommand(IFActions.DRINKING, { entity: item });
      const context2 = createRealTestContext(drinkingAction, world, command2);
      const events = executeWithValidation(drinkingAction, context2);

      // Single serving remaining doesn't emit portions info — just the base drunk event
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        messageId: expect.stringContaining('drunk')
      });
    });

    test('should handle refreshing drink', () => {
      const { world, player, item } = TestData.withInventoryItem('cold lemonade', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          taste: 'refreshing'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use refreshing message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('refreshing'),
        params: { item: { name: 'cold lemonade' } }
      });
    });

    test('should handle bitter drink', () => {
      const { world, player, item } = TestData.withInventoryItem('bitter medicine', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          taste: 'bitter'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use bitter message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('bitter'),
        params: { item: { name: 'bitter medicine' } }
      });
    });

    test('should handle sweet drink', () => {
      const { world, player, item } = TestData.withInventoryItem('hot cocoa', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          taste: 'sweet'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use sweet message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('sweet'),
        params: { item: { name: 'hot cocoa' } }
      });
    });

    test('should handle strong/alcoholic drink', () => {
      const { world, player, item } = TestData.withInventoryItem('glass of whiskey', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          taste: 'alcoholic'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use strong message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('strong'),
        params: { item: { name: 'glass of whiskey' } }
      });
    });

    test('should handle magical drink', () => {
      const { world, player, item } = TestData.withInventoryItem('glowing potion', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          effects: ['magic', 'levitation']
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit DRUNK event with effects
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        effects: ['magic', 'levitation']
      });
      
      // Should use magical_effects message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('magical_effects'),
        params: { item: { name: 'glowing potion' } }
      });
    });

    test('should handle healing drink', () => {
      const { world, player, item } = TestData.withInventoryItem('healing elixir', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          effects: ['healing', 'restore_health']
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use healing message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('healing'),
        params: { item: { name: 'healing elixir' } }
      });
    });

    test('should handle thirst-quenching drink', () => {
      const { world, player, item } = TestData.withInventoryItem('fresh water', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          satisfiesThirst: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit DRUNK event with thirst satisfaction
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        satisfiesThirst: true
      });
      
      // Should use thirst_quenched message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('thirst_quenched'),
        params: { item: { name: 'fresh water' } }
      });
    });

    test('should handle non-thirst-quenching drink', () => {
      const { world, player, item } = TestData.withInventoryItem('strong alcohol', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          satisfiesThirst: false
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use still_thirsty message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('still_thirsty'),
        params: { item: { name: 'strong alcohol' } }
      });
    });

    test('should handle drinking from container', () => {
      const { world, player, item } = TestData.withInventoryItem('metal flask', {
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER,
          containsLiquid: true,
          liquidType: 'water',
          liquidAmount: 5
        },
        [TraitType.OPENABLE]: {
          type: TraitType.OPENABLE,
          isOpen: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit DRUNK event with container info
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        fromContainer: true,
        liquidType: 'water',
        liquidAmount: 5,
        liquidRemaining: 4
      });
      
      // Should use from_container message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('from_container'),
        params: {
          item: { name: 'metal flask' },
          liquidType: 'water'
        }
      });
    });

    test('should handle emptying container', () => {
      const { world, player, item } = TestData.withInventoryItem('small cup', {
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER,
          containsLiquid: true,
          liquidType: 'tea',
          liquidAmount: 1  // Last sip
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit DRUNK event
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        fromContainer: true,
        liquidAmount: 1,
        liquidRemaining: 0
      });
      
      // Should use empty_now message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('empty_now'),
        params: { item: { name: 'small cup' } }
      });
    });

    test('should handle container without tracked amount', () => {
      const { world, player, item } = TestData.withInventoryItem('water fountain', {
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER,
          containsLiquid: true,
          liquidType: 'water'
          // No liquidAmount - infinite source
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use drunk_from message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('drunk_from'),
        params: { item: { name: 'water fountain' } }
      });
    });

    test('should handle drink with nutrition value', () => {
      const { world, player, item } = TestData.withInventoryItem('protein shake', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true,
          nutrition: 300
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should emit DRUNK event with nutrition
      expectEvent(events, 'if.event.drunk', {
        item: item.id,
        nutrition: 300
      });
    });
  });

  describe('Verb Variations', () => {
    test('should handle sip verb', () => {
      const { world, player, item } = TestData.withInventoryItem('hot tea', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      // Override verb in parsed structure
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'sip', 
        head: 'sip' 
      };
      
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use sipped message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('sipped'),
        params: { item: { name: 'hot tea' } }
      });
    });

    test('should handle quaff verb', () => {
      const { world, player, item } = TestData.withInventoryItem('mug of ale', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'quaff', 
        head: 'quaff' 
      };
      
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use quaffed message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('quaffed'),
        params: { item: { name: 'mug of ale' } }
      });
    });

    test('should handle swallow/gulp verb', () => {
      const { world, player, item } = TestData.withInventoryItem('small potion', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'swallow', 
        head: 'swallow' 
      };
      
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use gulped message
      expectEvent(events, 'if.event.drunk', {
        messageId: expect.stringContaining('gulped'),
        params: { item: { name: 'small potion' } }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, item } = TestData.withInventoryItem('glass of milk', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
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

import { EdibleBehavior } from '@sharpee/world-model';

/**
 * CRITICAL: World State Mutation Verification Tests
 *
 * These tests verify that the drinking action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually move item to inventory on implicit take', () => {
    // Item in room, not held. Two servings, so it is still there to be
    // looked for after the one sip this test takes.
    const { world, player, room, object } = TestData.withObject('can of soda', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 2
      }
    });

    // VERIFY PRECONDITION: item is in room, not player's inventory
    expect(world.getLocation(object.id)).toBe(room.id);
    expect(world.getLocation(object.id)).not.toBe(player.id);

    const command = createCommand(IFActions.DRINKING, {
      entity: object
    });
    const context = createRealTestContext(drinkingAction, world, command);

    // Execute the action
    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: item is now in player's inventory
    expect(world.getLocation(object.id)).toBe(player.id);
  });

  test('should not move item that is already held', () => {
    // Two servings, so it is still held after the one sip this test takes.
    const { world, player, item } = TestData.withInventoryItem('cup of coffee', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 2
      }
    });

    // VERIFY PRECONDITION: item is already in player's inventory
    expect(world.getLocation(item.id)).toBe(player.id);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: item is still in player's inventory
    expect(world.getLocation(item.id)).toBe(player.id);
  });

  test('should actually consume drinkable item (set consumed flag)', () => {
    const { world, player, item } = TestData.withInventoryItem('glass of water', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 1
      }
    });

    // VERIFY PRECONDITION: item is not consumed
    const edibleBefore = item.getTrait(EdibleTrait)!;
    expect(edibleBefore.servings).toBe(1);
    expect(EdibleBehavior.canConsume(item)).toBe(true);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: item is now consumed, and has left the world
    const edibleAfter = item.getTrait(EdibleTrait)!;
    expect(edibleAfter.servings).toBe(0);
    expect(EdibleBehavior.canConsume(item)).toBe(false);
    expect(world.hasEntity(item.id)).toBe(false);
  });

  test('should decrement servings when drinking multi-serving item', () => {
    const { world, player, item } = TestData.withInventoryItem('pot of tea', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 4
      }
    });

    // VERIFY PRECONDITION: 4 servings remaining
    expect(EdibleBehavior.getServings(item)).toBe(4);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: 3 servings remaining
    expect(EdibleBehavior.getServings(item)).toBe(3);
    expect(EdibleBehavior.canConsume(item)).toBe(true); // Still drinkable
  });

  test('should actually decrement liquidAmount for containers', () => {
    const { world, player, item } = TestData.withInventoryItem('metal flask', {
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER,
        containsLiquid: true,
        liquidType: 'water',
        liquidAmount: 5
      },
      [TraitType.OPENABLE]: {
        type: TraitType.OPENABLE,
        isOpen: true
      }
    });

    // VERIFY PRECONDITION: 5 units of liquid
    const containerBefore = item.getTrait(ContainerTrait)!;
    expect(containerBefore.liquidAmount).toBe(5);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: 4 units of liquid remaining
    const containerAfter = item.getTrait(ContainerTrait)!;
    expect(containerAfter.liquidAmount).toBe(4);
  });

  test('should set liquidAmount to 0 when emptying container', () => {
    const { world, player, item } = TestData.withInventoryItem('small cup', {
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER,
        containsLiquid: true,
        liquidType: 'tea',
        liquidAmount: 1  // Last sip
      }
    });

    // VERIFY PRECONDITION: 1 unit remaining
    const containerBefore = item.getTrait(ContainerTrait)!;
    expect(containerBefore.liquidAmount).toBe(1);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: container is now empty
    const containerAfter = item.getTrait(ContainerTrait)!;
    expect(containerAfter.liquidAmount).toBe(0);
  });
});

/**
 * A drink that is itself the item leaves the world with its last serving.
 * A vessel that holds liquid never does. Every test runs the action through
 * the phase runner on a real world and asserts on the world afterwards.
 */
describe('A finished drink leaves the world', () => {
  const drink = (world: ReturnType<typeof setupBasicWorld>['world'], target: Parameters<typeof createCommand>[1]) =>
    executeWithValidation(
      drinkingAction,
      createRealTestContext(drinkingAction, world, createCommand(IFActions.DRINKING, target))
    );

  test('a one-serving drink is gone from the world and from the drinker', () => {
    const { world, player, item } = TestData.withInventoryItem('glass of cordial', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 1,
        nutrition: 2
      }
    });

    // VERIFY PRECONDITION: one serving, in the world, held by the player
    expect(EdibleBehavior.getServings(item)).toBe(1);
    expect(world.hasEntity(item.id)).toBe(true);
    expect(world.getContents(player.id).map((e) => e.id)).toContain(item.id);

    const events = drink(world, { entity: item });

    // VERIFY POSTCONDITION: no serving left, and the item has left the world
    expect(EdibleBehavior.getServings(item)).toBe(0);
    expect(world.hasEntity(item.id)).toBe(false);
    expect(world.getContents(player.id).map((e) => e.id)).not.toContain(item.id);

    // The drunk event still reports the item it was, by id, name and nutrition
    const drunk = events.find((e) => e.type === 'if.event.drunk');
    expect(drunk).toBeDefined();
    expect(drunk!.data).toMatchObject({
      item: item.id,
      itemName: 'glass of cordial',
      nutrition: 2,
      messageId: 'if.action.drinking.drunk'
    });
  });

  test('a multi-serving drink stays until its last serving is drunk', () => {
    const { world, player, item } = TestData.withInventoryItem('jug of cider', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 2
      }
    });
    const held = () => world.getContents(player.id).map((e) => e.id);

    drink(world, { entity: item });
    expect(EdibleBehavior.getServings(item)).toBe(1);
    expect(world.hasEntity(item.id)).toBe(true);
    expect(held()).toContain(item.id);

    drink(world, { entity: item });
    expect(EdibleBehavior.getServings(item)).toBe(0);
    expect(world.hasEntity(item.id)).toBe(false);
    expect(held()).not.toContain(item.id);
  });

  test('a drink picked up by the drinking itself is gone from the room and the drinker', () => {
    const { world, player, room, object } = TestData.withObject('cup of milk', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true
      }
    });

    // VERIFY PRECONDITION: on the floor of the room
    expect(world.getLocation(object.id)).toBe(room.id);

    const events = drink(world, { entity: object });

    // VERIFY POSTCONDITION: in neither place, and not in the world
    expect(world.hasEntity(object.id)).toBe(false);
    expect(world.getContents(room.id).map((e) => e.id)).not.toContain(object.id);
    expect(world.getContents(player.id).map((e) => e.id)).not.toContain(object.id);

    // The pick-up and the drink are both still reported
    expect(events.find((e) => e.type === 'if.event.taken')).toBeDefined();
    expect(events.find((e) => e.type === 'if.event.drunk')).toBeDefined();
  });

  test('a vessel that holds liquid survives being emptied', () => {
    const { world, player, item } = TestData.withInventoryItem('tin cup', {
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER,
        containsLiquid: true,
        liquidType: 'tea',
        liquidAmount: 1
      }
    });

    drink(world, { entity: item });

    // VERIFY POSTCONDITION: empty, still in the world, still held
    expect(item.getTrait(ContainerTrait)!.liquidAmount).toBe(0);
    expect(world.hasEntity(item.id)).toBe(true);
    expect(world.getLocation(item.id)).toBe(player.id);
  });

  test('a vessel that is also a drink of its own survives its last serving', () => {
    const { world, player, item } = TestData.withInventoryItem('wineskin', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 1
      },
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER,
        containsLiquid: true,
        liquidType: 'wine',
        liquidAmount: 3
      }
    });

    drink(world, { entity: item });

    // VERIFY POSTCONDITION: the serving is spent and the skin is still held
    expect(EdibleBehavior.getServings(item)).toBe(0);
    expect(item.getTrait(ContainerTrait)!.liquidAmount).toBe(2);
    expect(world.hasEntity(item.id)).toBe(true);
    expect(world.getLocation(item.id)).toBe(player.id);
  });

  test('a refused drink removes nothing', () => {
    // Each case checks that the refusal was actually reported, so the
    // "still there" assertions are about a drink that was attempted.
    const refusal = (events: ReturnType<typeof drink>) =>
      events.find((e) => e.type === 'if.event.drunk')?.data;

    const undrinkable = TestData.withInventoryItem('brass key', {});
    const undrinkableEvents = drink(undrinkable.world, { entity: undrinkable.item });
    expect(refusal(undrinkableEvents)).toMatchObject({ blocked: true, reason: 'not_drinkable' });
    expect(undrinkable.world.hasEntity(undrinkable.item.id)).toBe(true);
    expect(undrinkable.world.getLocation(undrinkable.item.id)).toBe(undrinkable.player.id);

    const spent = TestData.withInventoryItem('empty glass', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        liquid: true,
        servings: 0
      }
    });
    const spentEvents = drink(spent.world, { entity: spent.item });
    expect(refusal(spentEvents)).toMatchObject({ blocked: true, reason: 'already_consumed' });
    expect(EdibleBehavior.getServings(spent.item)).toBe(0);
    expect(spent.world.hasEntity(spent.item.id)).toBe(true);
    expect(spent.world.getLocation(spent.item.id)).toBe(spent.player.id);

    const stoppered = TestData.withInventoryItem('stoppered flask', {
      [TraitType.CONTAINER]: {
        type: TraitType.CONTAINER,
        containsLiquid: true,
        liquidType: 'water',
        liquidAmount: 2
      },
      [TraitType.OPENABLE]: {
        type: TraitType.OPENABLE,
        isOpen: false
      }
    });
    const stopperedEvents = drink(stoppered.world, { entity: stoppered.item });
    expect(refusal(stopperedEvents)).toMatchObject({ blocked: true, reason: 'container_closed' });
    expect(stoppered.item.getTrait(ContainerTrait)!.liquidAmount).toBe(2);
    expect(stoppered.world.hasEntity(stoppered.item.id)).toBe(true);
    expect(stoppered.world.getLocation(stoppered.item.id)).toBe(stoppered.player.id);
  });
});
