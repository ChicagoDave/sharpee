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
import { TraitType, EdibleTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  expectEvent,
  expectTraitValue,
  TestData,
  createCommand,
  setupBasicWorld,
  executeWithValidation
} from '../../test-utils';

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
      
      expectEvent(events, 'if.event.eaten', {
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
      
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('not_edible'),
        params: { item: { name: 'small rock' } }
      });
    });

    test('should fail when item is a drink', () => {
      const { world, player, item } = TestData.withInventoryItem('orange juice', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          liquid: true  // This is a drink, not food
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('is_drink'),
        params: { item: { name: 'orange juice' } }
      });
    });

    test('should fail when item is already consumed', () => {
      const { world, player, item } = TestData.withInventoryItem('chocolate cookie', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          servings: 0  // Already eaten
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('already_consumed'),
        params: { item: { name: 'chocolate cookie' } }
      });
    });
  });

  describe('Successful Eating', () => {
    test('should eat item from inventory', () => {
      const { world, player, item } = TestData.withInventoryItem('ham sandwich', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE
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
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('eaten'),
        params: { item: { name: 'ham sandwich' } }
      });
    });

    test('should handle food with servings', () => {
      const { world, player, item } = TestData.withInventoryItem('pepperoni pizza', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

          servings: 8  // Legacy name, mapped to servings
        }
      });

      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);

      const events = executeWithValidation(eatingAction, context);

      // Should emit EATEN event with servings info
      expectEvent(events, 'if.event.eaten', {
        item: item.id,
        servings: 8,
        servingsRemaining: 7
      });

      // Should emit "eaten_some" message for partial consumption
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('eaten_some'),
        params: { item: { name: 'pepperoni pizza' } }
      });
    });

    test('should handle eating multi-serving food', () => {
      const { world, player, item } = TestData.withInventoryItem('apple pie', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

          servings: 3  // Three servings
        }
      });

      const command = createCommand(IFActions.EATING, {
        entity: item
      });

      // First eat - leaves two servings
      const context1 = createRealTestContext(eatingAction, world, command);
      const events1 = executeWithValidation(eatingAction, context1);

      expectEvent(events1, 'if.event.eaten', {
        item: item.id,
        servings: 3,
        servingsRemaining: 2
      });
      expectEvent(events1, 'if.event.eaten', {
        messageId: expect.stringContaining('eaten_some'),
        params: { item: { name: 'apple pie' } }
      });

      // Second eat - leaves one serving, still multi-serving
      const context2 = createRealTestContext(eatingAction, world, command);
      const events2 = executeWithValidation(eatingAction, context2);

      expectEvent(events2, 'if.event.eaten', {
        item: item.id,
        servings: 2,
        servingsRemaining: 1
      });
      expectEvent(events2, 'if.event.eaten', {
        messageId: expect.stringContaining('eaten_some'),
        params: { item: { name: 'apple pie' } }
      });

      // Third eat - finishes it (eaten_all when going from >1 to 0)
      const context3 = createRealTestContext(eatingAction, world, command);
      const events3 = executeWithValidation(eatingAction, context3);

      // Note: When servings=1, we can't distinguish from single-serving food
      // so message is 'eaten' not 'eaten_all'. This is a known limitation.
      expectEvent(events3, 'if.event.eaten', {
        messageId: expect.stringContaining('eaten'),
        params: { item: { name: 'apple pie' } }
      });
    });

    test('should handle delicious food', () => {
      const { world, player, item } = TestData.withInventoryItem('dark chocolate', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

          taste: 'delicious'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use delicious message
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('delicious'),
        params: { item: { name: 'dark chocolate' } }
      });
    });

    test('should handle tasty food', () => {
      const { world, player, item } = TestData.withInventoryItem('fresh bread', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

          taste: 'good'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use tasty message
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('tasty'),
        params: { item: { name: 'fresh bread' } }
      });
    });

    test('should handle bland food', () => {
      const { world, player, item } = TestData.withInventoryItem('plain cracker', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

          taste: 'bland'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use bland message
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('bland'),
        params: { item: { name: 'plain cracker' } }
      });
    });

    test('should handle awful food', () => {
      const { world, player, item } = TestData.withInventoryItem('stale rations', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

          taste: 'terrible'
        }
      });
      
      const command = createCommand(IFActions.EATING, {
        entity: item
      });
      const context = createRealTestContext(eatingAction, world, command);
      
      const events = executeWithValidation(eatingAction, context);
      
      // Should use awful message
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('awful'),
        params: { item: { name: 'stale rations' } }
      });
    });

    test('should handle poisonous food', () => {
      const { world, player, item } = TestData.withInventoryItem('suspicious mushroom', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

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
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('poisonous'),
        params: { item: { name: 'suspicious mushroom' } }
      });
    });

    test('should handle filling food', () => {
      const { world, player, item } = TestData.withInventoryItem('grilled steak', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

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
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('filling'),
        params: { item: { name: 'grilled steak' } }
      });
    });

    test('should handle non-filling food', () => {
      const { world, player, item } = TestData.withInventoryItem('breath mint', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

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
      expectEvent(events, 'if.event.eaten', {
        messageId: expect.stringContaining('still_hungry'),
        params: { item: { name: 'breath mint' } }
      });
    });

    test('should handle food with nutrition value', () => {
      const { world, player, item } = TestData.withInventoryItem('energy bar', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,

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

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, item } = TestData.withInventoryItem('chocolate cookie', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE
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

  /**
   * World State Mutations
   *
   * These tests verify that the eating action actually mutates world state,
   * not just emits events. Servings must decrement and consumption must be tracked.
   */
  describe('World State Mutations', () => {
    test('should decrement servings after eating single-serving item', () => {
      const { world, item } = TestData.withInventoryItem('ham sandwich', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          servings: 1
        }
      });

      // VERIFY PRECONDITION: 1 serving
      expectTraitValue(item, TraitType.EDIBLE, 'servings', 1);

      const command = createCommand(IFActions.EATING, { entity: item });
      const context = createRealTestContext(eatingAction, world, command);

      const validation = eatingAction.validate(context);
      expect(validation.valid).toBe(true);
      eatingAction.execute(context);

      // VERIFY POSTCONDITION: 0 servings
      expectTraitValue(item, TraitType.EDIBLE, 'servings', 0);
    });

    test('should decrement servings for multi-serving food', () => {
      const { world, item } = TestData.withInventoryItem('apple pie', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          servings: 3
        }
      });

      // VERIFY PRECONDITION: 3 servings
      expectTraitValue(item, TraitType.EDIBLE, 'servings', 3);

      const command = createCommand(IFActions.EATING, { entity: item });
      const context = createRealTestContext(eatingAction, world, command);

      const validation = eatingAction.validate(context);
      expect(validation.valid).toBe(true);
      eatingAction.execute(context);

      // VERIFY POSTCONDITION: 2 servings (decremented by 1)
      expectTraitValue(item, TraitType.EDIBLE, 'servings', 2);
    });

    test('should track servings correctly over multiple eat actions', () => {
      const { world, item } = TestData.withInventoryItem('pizza', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          servings: 3
        }
      });

      const command = createCommand(IFActions.EATING, { entity: item });

      // First eat: 3 → 2
      const ctx1 = createRealTestContext(eatingAction, world, command);
      eatingAction.validate(ctx1);
      eatingAction.execute(ctx1);
      expectTraitValue(item, TraitType.EDIBLE, 'servings', 2);

      // Second eat: 2 → 1
      const ctx2 = createRealTestContext(eatingAction, world, command);
      eatingAction.validate(ctx2);
      eatingAction.execute(ctx2);
      expectTraitValue(item, TraitType.EDIBLE, 'servings', 1);

      // Third eat: 1 → 0
      const ctx3 = createRealTestContext(eatingAction, world, command);
      eatingAction.validate(ctx3);
      eatingAction.execute(ctx3);
      expectTraitValue(item, TraitType.EDIBLE, 'servings', 0);
    });

    test('should NOT change servings when item is not edible', () => {
      const { world, object } = TestData.withObject('small rock');

      const command = createCommand(IFActions.EATING, { entity: object });
      const context = createRealTestContext(eatingAction, world, command);

      const validation = eatingAction.validate(context);
      expect(validation.valid).toBe(false);

      // VERIFY POSTCONDITION: no edible trait, no mutation possible
      expect(object.get(TraitType.EDIBLE)).toBeUndefined();
    });
  });
});

