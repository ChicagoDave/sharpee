/**
 * Golden test for eating action - demonstrates testing consumable items
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to consume edible items
 * - Check edible traits and food properties
 * - Handle different food qualities and effects
 * - Support implicit taking when item is in room
 * - Track portions and consumption state
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { eatingAction } from '../../../src/actions/standard/eating';
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

describe('eatingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(eatingAction.id).toBe(IFActions.EATING);
    });

    test('should declare required messages', () => {
      expect(eatingAction.requiredMessages).toContain('no_item');
      expect(eatingAction.requiredMessages).toContain('not_edible');
      expect(eatingAction.requiredMessages).toContain('is_drink');
      expect(eatingAction.requiredMessages).toContain('already_consumed');
      expect(eatingAction.requiredMessages).toContain('eaten');
      expect(eatingAction.requiredMessages).toContain('eaten_all');
      expect(eatingAction.requiredMessages).toContain('eaten_some');
      expect(eatingAction.requiredMessages).toContain('delicious');
      expect(eatingAction.requiredMessages).toContain('tasty');
      expect(eatingAction.requiredMessages).toContain('bland');
      expect(eatingAction.requiredMessages).toContain('awful');
      expect(eatingAction.requiredMessages).toContain('filling');
      expect(eatingAction.requiredMessages).toContain('still_hungry');
      expect(eatingAction.requiredMessages).toContain('poisonous');
    });

    test('should belong to interaction group', () => {
      expect(eatingAction.group).toBe('interaction');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no item specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.EATING);
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_item'),
        reason: 'no_item'
      });
    });


    test('should fail when item is not edible', () => {
      const { world, player, object } = TestData.withObject('small rock');
      // Rock has no edible trait
      
      const command = createCommand(IFActions.EATING, {
        entity: object
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_edible'),
        params: { item: 'small rock' }
      });
    });

    test('should fail when item is a drink', () => {
      const { world, player, item } = TestData.withInventoryItem('orange juice', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          isDrink: true  // This is a drink, not food
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('is_drink'),
        params: { item: 'orange juice' }
      });
    });

    test('should fail when item is already consumed', () => {
      const { world, player, item } = TestData.withInventoryItem('chocolate cookie', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: true  // Already eaten
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_consumed'),
        params: { item: 'chocolate cookie' }
      });
    });
  });

  describe('Successful Eating', () => {
    test('should eat item from inventory', () => {
      const { world, player, item } = TestData.withInventoryItem('ham sandwich', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit EATEN event
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        itemName: 'ham sandwich'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('eaten'),
        params: { item: 'ham sandwich' }
      });
    });

    test.skip('should implicitly take and eat item from room', () => {
      // SKIPPED: Implicit take was removed for simplification
      const { world, player, room, object } = TestData.withObject('yellow banana', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: object
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit implicit TAKEN event first
      expectEvent(events, 'if.event.taken', {
        implicit: true,
        item: object.id,
        itemName: 'yellow banana'
      });
      
      // Should emit EATEN event
      expectEvent(events, 'if.event.eaten', {
        item: object.id,
        itemName: 'yellow banana'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('eaten'),
        params: { item: 'yellow banana' }
      });
    });

    test('should handle food with portions', () => {
      const { world, player, item } = TestData.withInventoryItem('pepperoni pizza', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          portions: 8
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit EATEN event with portion info
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        portions: 8,
        portionsRemaining: 7
      });
      
      // Should emit "eaten_some" message for partial consumption
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('eaten_some'),
        params: { item: 'pepperoni pizza' }
      });
    });

    test('should handle eating last portion', () => {
      const { world, player, item } = TestData.withInventoryItem('apple pie', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          portions: 1  // Last piece
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit EATEN event
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        portions: 1,
        portionsRemaining: 0
      });
      
      // Should emit "eaten_all" message for final portion
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('eaten_all'),
        params: { item: 'apple pie' }
      });
    });

    test('should handle delicious food', () => {
      const { world, player, item } = TestData.withInventoryItem('dark chocolate', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          taste: 'delicious'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use delicious message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('delicious'),
        params: { item: 'dark chocolate' }
      });
    });

    test('should handle tasty food', () => {
      const { world, player, item } = TestData.withInventoryItem('fresh bread', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          taste: 'good'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use tasty message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('tasty'),
        params: { item: 'fresh bread' }
      });
    });

    test('should handle bland food', () => {
      const { world, player, item } = TestData.withInventoryItem('plain cracker', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          taste: 'bland'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use bland message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('bland'),
        params: { item: 'plain cracker' }
      });
    });

    test('should handle awful food', () => {
      const { world, player, item } = TestData.withInventoryItem('stale rations', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          taste: 'terrible'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use awful message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('awful'),
        params: { item: 'stale rations' }
      });
    });

    test('should handle poisonous food', () => {
      const { world, player, item } = TestData.withInventoryItem('suspicious mushroom', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          effects: ['poison']
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit EATEN event with effects
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        effects: ['poison']
      });
      
      // Should use poisonous message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('poisonous'),
        params: { item: 'suspicious mushroom' }
      });
    });

    test('should handle filling food', () => {
      const { world, player, item } = TestData.withInventoryItem('grilled steak', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          satisfiesHunger: true
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit EATEN event with hunger satisfaction
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        satisfiesHunger: true
      });
      
      // Should use filling message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('filling'),
        params: { item: 'grilled steak' }
      });
    });

    test('should handle non-filling food', () => {
      const { world, player, item } = TestData.withInventoryItem('breath mint', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          satisfiesHunger: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit EATEN event
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        satisfiesHunger: false
      });
      
      // Should use still_hungry message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('still_hungry'),
        params: { item: 'breath mint' }
      });
    });

    test('should handle food with nutrition value', () => {
      const { world, player, item } = TestData.withInventoryItem('energy bar', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false,
          nutrition: 250  // calories or arbitrary nutrition units
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should emit EATEN event with nutrition
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        nutrition: 250
      });
    });
  });

  describe.skip('Verb Variations', () => {
    // SKIPPED: Verb variations removed for simplification
    test.skip('should handle nibble verb', () => {
      const { world, player, item } = TestData.withInventoryItem('swiss cheese', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      // Override verb in parsed structure
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'nibble', 
        head: 'nibble' 
      };
      
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use nibbled message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('nibbled'),
        params: { item: 'swiss cheese' }
      });
    });

    test.skip('should handle taste verb', () => {
      const { world, player, item } = TestData.withInventoryItem('tomato soup', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'taste', 
        head: 'taste' 
      };
      
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use tasted message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('tasted'),
        params: { item: 'tomato soup' }
      });
    });

    test.skip('should handle devour verb', () => {
      const { world, player, item } = TestData.withInventoryItem('double burger', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'devour', 
        head: 'devour' 
      };
      
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use devoured message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('devoured'),
        params: { item: 'double burger' }
      });
    });

    test.skip('should handle munch verb', () => {
      const { world, player, item } = TestData.withInventoryItem('potato chips', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'munch', 
        head: 'munch' 
      };
      
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use munched message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('munched'),
        params: { item: 'potato chips' }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, item } = TestData.withInventoryItem('chocolate cookie', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          consumed: false
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
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

import { WorldModel } from '@sharpee/world-model';

describe('Testing Pattern Examples for Eating', () => {
  test('pattern: complex food system with multiple properties', () => {
    // Test a complete food with all possible properties
    const world = new WorldModel();
    const gourmetMeal = world.createEntity('gourmet meal', 'object');
    gourmetMeal.add({
      type: TraitType.EDIBLE,
      consumed: false,
      portions: 3,
      taste: 'delicious',
      nutrition: 800,
      satisfiesHunger: true,
      effects: ['well-fed', 'happy']
    });
    
    const edible = gourmetMeal.getTrait(TraitType.EDIBLE) as any;
    expect(edible.portions).toBe(3);
    expect(edible.taste).toBe('delicious');
    expect(edible.nutrition).toBe(800);
    expect(edible.satisfiesHunger).toBe(true);
    expect(edible.effects).toContain('well-fed');
  });

  test('pattern: food with special effects', () => {
    // Test various food effects
    const world = new WorldModel();
    const specialFoods = [
      { name: 'poison_apple', effects: ['poison'] },
      { name: 'healing_potion', effects: ['heal', 'restore_health'] },
      { name: 'magic_mushroom', effects: ['hallucination', 'confusion'] },
      { name: 'energy_drink', effects: ['speed_boost', 'jittery'] },
      { name: 'sleeping_pill', effects: ['drowsy', 'sleep'] }
    ];
    
    specialFoods.forEach(({ name, effects }) => {
      const food = world.createEntity(name, 'object');
      food.add({
        type: TraitType.EDIBLE,
        consumed: false,
        effects
      });
      
      const edible = food.getTrait(TraitType.EDIBLE) as any;
      expect(edible.effects).toEqual(effects);
    });
  });

  test('pattern: food quality spectrum', () => {
    // Test the full range of food qualities
    const world = new WorldModel();
    const qualityLevels = [
      { item: 'gourmet_chocolate', taste: 'delicious' },
      { item: 'homemade_cookies', taste: 'tasty' },
      { item: 'cafeteria_food', taste: 'plain' },
      { item: 'hardtack', taste: 'bland' },
      { item: 'spoiled_milk', taste: 'awful' }
    ];
    
    qualityLevels.forEach(({ item, taste }) => {
      const food = world.createEntity(item, 'object');
      food.add({
        type: TraitType.EDIBLE,
        consumed: false,
        taste
      });
      
      const edible = food.getTrait(TraitType.EDIBLE) as any;
      expect(edible.taste).toBe(taste);
    });
  });

  test('pattern: multi-portion foods', () => {
    // Test foods that can be eaten in multiple portions
    const world = new WorldModel();
    const portionedFoods = [
      { item: 'whole_pizza', portions: 8 },
      { item: 'birthday_cake', portions: 12 },
      { item: 'loaf_of_bread', portions: 10 },
      { item: 'bag_of_chips', portions: 20 },
      { item: 'half_sandwich', portions: 2 }
    ];
    
    portionedFoods.forEach(({ item, portions }) => {
      const food = world.createEntity(item, 'object');
      food.add({
        type: TraitType.EDIBLE,
        consumed: false,
        portions
      });
      
      const edible = food.getTrait(TraitType.EDIBLE) as any;
      expect(edible.portions).toBe(portions);
    });
  });
});
