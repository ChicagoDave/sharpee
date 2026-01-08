/**
 * Golden test for drinking action - demonstrates testing drinkable items
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to consume liquids and beverages
 * - Check drinkable traits (isDrink property)
 * - Handle containers with liquids
 * - Track portions and liquid amounts
 * - Support implicit taking when item is in room
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { drinkingAction } from '../../../src/actions/standard/drinking';
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
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_item'),
        reason: 'no_item'
      });
    });

    test('should fail when item is not drinkable', () => {
      const { world, player, room, object } = TestData.withObject('loaf of bread', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: false  // This is food, not a drink
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: object
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_drinkable'),
        params: { item: 'loaf of bread' }
      });
    });

    test('should fail when drink is already consumed', () => {
      const { world, player, item } = TestData.withInventoryItem('empty potion', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: true,  // Already drunk
          isDrink: true
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_consumed'),
        params: { item: 'empty potion' }
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
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('container_closed'),
        params: { item: 'water bottle' }
      });
    });
  });

  describe('Successful Drinking', () => {
    test('should drink item from inventory', () => {
      const { world, player, item } = TestData.withInventoryItem('cup of coffee', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('drunk'),
        params: { item: 'cup of coffee' }
      });
    });

    test('should implicitly take and drink item from room', () => {
      const { world, player, room, object } = TestData.withObject('can of soda', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('drunk'),
        params: { item: 'can of soda' }
      });
    });

    test('should handle drink with portions', () => {
      const { world, player, item } = TestData.withInventoryItem('pot of tea', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          portions: 4
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('drunk_some'),
        params: { item: 'pot of tea' }
      });
    });

    test('should handle drinking last portion', () => {
      const { world, player, item } = TestData.withInventoryItem('glass of wine', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          portions: 1  // Last sip
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
        portions: 1,
        portionsRemaining: 0
      });
      
      // Should emit "drunk_all" message for final portion
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('drunk_all'),
        params: { item: 'glass of wine' }
      });
    });

    test('should handle refreshing drink', () => {
      const { world, player, item } = TestData.withInventoryItem('cold lemonade', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          taste: 'refreshing'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use refreshing message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('refreshing'),
        params: { item: 'cold lemonade' }
      });
    });

    test('should handle bitter drink', () => {
      const { world, player, item } = TestData.withInventoryItem('bitter medicine', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          taste: 'bitter'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use bitter message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('bitter'),
        params: { item: 'bitter medicine' }
      });
    });

    test('should handle sweet drink', () => {
      const { world, player, item } = TestData.withInventoryItem('hot cocoa', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          taste: 'sweet'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use sweet message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('sweet'),
        params: { item: 'hot cocoa' }
      });
    });

    test('should handle strong/alcoholic drink', () => {
      const { world, player, item } = TestData.withInventoryItem('glass of whiskey', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          taste: 'alcoholic'
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use strong message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('strong'),
        params: { item: 'glass of whiskey' }
      });
    });

    test('should handle magical drink', () => {
      const { world, player, item } = TestData.withInventoryItem('glowing potion', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('magical_effects'),
        params: { item: 'glowing potion' }
      });
    });

    test('should handle healing drink', () => {
      const { world, player, item } = TestData.withInventoryItem('healing elixir', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          effects: ['healing', 'restore_health']
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use healing message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('healing'),
        params: { item: 'healing elixir' }
      });
    });

    test('should handle thirst-quenching drink', () => {
      const { world, player, item } = TestData.withInventoryItem('fresh water', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('thirst_quenched'),
        params: { item: 'fresh water' }
      });
    });

    test('should handle non-thirst-quenching drink', () => {
      const { world, player, item } = TestData.withInventoryItem('strong alcohol', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
          satisfiesThirst: false
        }
      });
      
      const command = createCommand(IFActions.DRINKING, {
        entity: item
      });
      const context = createRealTestContext(drinkingAction, world, command);
      
      const events = executeWithValidation(drinkingAction, context);
      
      // Should use still_thirsty message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('still_thirsty'),
        params: { item: 'strong alcohol' }
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('from_container'),
        params: { 
          item: 'metal flask',
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('empty_now'),
        params: { item: 'small cup' }
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('drunk_from'),
        params: { item: 'water fountain' }
      });
    });

    test('should handle drink with nutrition value', () => {
      const { world, player, item } = TestData.withInventoryItem('protein shake', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true,
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
          consumed: false,
          isDrink: true
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('sipped'),
        params: { item: 'hot tea' }
      });
    });

    test('should handle quaff verb', () => {
      const { world, player, item } = TestData.withInventoryItem('mug of ale', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('quaffed'),
        params: { item: 'mug of ale' }
      });
    });

    test('should handle swallow/gulp verb', () => {
      const { world, player, item } = TestData.withInventoryItem('small potion', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true
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
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('gulped'),
        params: { item: 'small potion' }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, item } = TestData.withInventoryItem('glass of milk', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true
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

import { WorldModel, EdibleBehavior } from '@sharpee/world-model';

/**
 * CRITICAL: World State Mutation Verification Tests
 *
 * These tests verify that the drinking action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually move item to inventory on implicit take', () => {
    // Item in room, not held
    const { world, player, room, object } = TestData.withObject('can of soda', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: true
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
    const { world, player, item } = TestData.withInventoryItem('cup of coffee', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: true
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
        consumed: false,
        isDrink: true,
        servings: 1
      }
    });

    // VERIFY PRECONDITION: item is not consumed
    const edibleBefore = item.getTrait(TraitType.EDIBLE) as any;
    expect(edibleBefore.consumed).toBe(false);
    expect(EdibleBehavior.canConsume(item)).toBe(true);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: item is now consumed
    const edibleAfter = item.getTrait(TraitType.EDIBLE) as any;
    expect(edibleAfter.consumed).toBe(true);
    expect(EdibleBehavior.canConsume(item)).toBe(false);
  });

  test('should decrement servings when drinking multi-serving item', () => {
    const { world, player, item } = TestData.withInventoryItem('pot of tea', {
      [TraitType.EDIBLE]: {
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: true,
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
    const containerBefore = item.getTrait(TraitType.CONTAINER) as any;
    expect(containerBefore.liquidAmount).toBe(5);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: 4 units of liquid remaining
    const containerAfter = item.getTrait(TraitType.CONTAINER) as any;
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
    const containerBefore = item.getTrait(TraitType.CONTAINER) as any;
    expect(containerBefore.liquidAmount).toBe(1);

    const command = createCommand(IFActions.DRINKING, {
      entity: item
    });
    const context = createRealTestContext(drinkingAction, world, command);

    const validation = drinkingAction.validate(context);
    expect(validation.valid).toBe(true);
    drinkingAction.execute(context);

    // VERIFY POSTCONDITION: container is now empty
    const containerAfter = item.getTrait(TraitType.CONTAINER) as any;
    expect(containerAfter.liquidAmount).toBe(0);
  });
});

describe('Testing Pattern Examples for Drinking', () => {
  test('pattern: complex beverage system with multiple properties', () => {
    // Test a complete drink with all possible properties
    const world = new WorldModel();
    const complexDrink = world.createEntity('magical cocktail', 'object');
    complexDrink.add({
      type: TraitType.EDIBLE,
      consumed: false,
      isDrink: true,
      portions: 3,
      taste: 'sweet',
      nutrition: 150,
      satisfiesThirst: true,
      effects: ['magic', 'strength_boost', 'glowing']
    });
    
    const edible = complexDrink.getTrait(TraitType.EDIBLE) as any;
    expect(edible.isDrink).toBe(true);
    expect(edible.portions).toBe(3);
    expect(edible.taste).toBe('sweet');
    expect(edible.nutrition).toBe(150);
    expect(edible.satisfiesThirst).toBe(true);
    expect(edible.effects).toContain('magic');
  });

  test('pattern: container liquid system', () => {
    // Test various containers with liquids
    const world = new WorldModel();
    const containers = [
      { name: 'bottle', liquidType: 'wine', liquidAmount: 10 },
      { name: 'flask', liquidType: 'water', liquidAmount: 5 },
      { name: 'cup', liquidType: 'coffee', liquidAmount: 1 },
      { name: 'fountain', liquidType: 'water' }, // Infinite source
      { name: 'cauldron', liquidType: 'potion', liquidAmount: 20 }
    ];
    
    containers.forEach(({ name, liquidType, liquidAmount }) => {
      const container = world.createEntity(name, 'container');
      container.add({
        type: TraitType.CONTAINER,
        containsLiquid: true,
        liquidType,
        liquidAmount
      });
      
      const trait = container.getTrait(TraitType.CONTAINER) as any;
      expect(trait.containsLiquid).toBe(true);
      expect(trait.liquidType).toBe(liquidType);
      if (liquidAmount !== undefined) {
        expect(trait.liquidAmount).toBe(liquidAmount);
      }
    });
  });

  test('pattern: drink effects spectrum', () => {
    // Test various drink effects
    const world = new WorldModel();
    const effectDrinks = [
      { name: 'health_potion', effects: ['healing', 'restore_health'] },
      { name: 'poison', effects: ['poison', 'damage'] },
      { name: 'invisibility_potion', effects: ['invisibility'] },
      { name: 'strength_elixir', effects: ['strength_boost', 'combat_bonus'] },
      { name: 'sleeping_draught', effects: ['sleep', 'drowsy'] }
    ];
    
    effectDrinks.forEach(({ name, effects }) => {
      const drink = world.createEntity(name, 'object');
      drink.add({
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: true,
        effects
      });
      
      const edible = drink.getTrait(TraitType.EDIBLE) as any;
      expect(edible.effects).toEqual(effects);
    });
  });

  test('pattern: beverage taste spectrum', () => {
    // Test the full range of drink tastes
    const world = new WorldModel();
    const tasteLevels = [
      { item: 'spring_water', taste: 'refreshing' },
      { item: 'fruit_juice', taste: 'sweet' },
      { item: 'black_coffee', taste: 'bitter' },
      { item: 'whiskey', taste: 'strong' },
      { item: 'herbal_tea', taste: 'satisfying' }
    ];
    
    tasteLevels.forEach(({ item, taste }) => {
      const drink = world.createEntity(item, 'object');
      drink.add({
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: true,
        taste
      });
      
      const edible = drink.getTrait(TraitType.EDIBLE) as any;
      expect(edible.taste).toBe(taste);
    });
  });
});
