/**
 * Golden test for taking off action - demonstrates testing removal of worn items
 * 
 * This shows patterns for testing actions that:
 * - Remove worn clothing and equipment
 * - Check layering rules (can't remove items under other items)
 * - Handle special cases like cursed items
 * - Validate that items are actually worn
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { takingOffAction } from '../../../src/actions/standard/taking_off';
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

describe('takingOffAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(takingOffAction.id).toBe(IFActions.TAKING_OFF);
    });

    test('should declare required messages', () => {
      expect(takingOffAction.requiredMessages).toContain('no_target');
      expect(takingOffAction.requiredMessages).toContain('not_wearing');
      expect(takingOffAction.requiredMessages).toContain('removed');
      expect(takingOffAction.requiredMessages).toContain('cant_remove');
      expect(takingOffAction.requiredMessages).toContain('prevents_removal');
    });

    test('should belong to wearable_manipulation group', () => {
      expect(takingOffAction.group).toBe('wearable_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when item not on actor', () => {
      const { world, player, room } = setupBasicWorld();
      const hat = world.createEntity('red hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: false
      });
      world.moveEntity(hat.id, room.id); // Hat is in room, not on player
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: hat
      }));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_wearing'),
        params: { item: 'red hat' }
      });
    });

    test('should fail when item is not wearable', () => {
      const { world, player } = setupBasicWorld();
      const ball = world.createEntity('tennis ball', 'object');
      world.moveEntity(ball.id, player.id);
      // Ball has no wearable trait
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: ball
      }));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_wearing'),
        params: { item: 'tennis ball' }
      });
    });

    test('should fail when item not actually worn', () => {
      const { world, player } = setupBasicWorld();
      const shirt = world.createEntity('blue shirt', 'object');
      shirt.add({
        type: TraitType.WEARABLE,
        worn: false  // Not worn, just carried
      });
      world.moveEntity(shirt.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: shirt
      }));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_wearing'),
        params: { item: 'blue shirt' }
      });
    });

    test('should fail when blocked by outer layer', () => {
      const { world, player } = setupBasicWorld();
      
      // Wearing shirt (layer 1)
      const shirt = world.createEntity('dress shirt', 'object');
      shirt.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 1
      });
      
      // Wearing jacket over it (layer 2)
      const jacket = world.createEntity('leather jacket', 'object');
      jacket.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 2
      });
      
      world.moveEntity(shirt.id, player.id);
      world.moveEntity(jacket.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: shirt  // Try to remove shirt while wearing jacket
      }));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('prevents_removal'),
        params: { blocking: 'leather jacket' }
      });
    });

    test('should fail when item is cursed', () => {
      const { world, player } = setupBasicWorld();
      const ring = world.createEntity('cursed ring', 'object');
      ring.add({
        type: TraitType.WEARABLE,
        worn: true,
        cursed: true  // Can't be removed
      });
      world.moveEntity(ring.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: ring
      }));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_remove'),
        params: { item: 'cursed ring' }
      });
    });
  });

  describe('Successful Removal', () => {
    test('should remove worn item', () => {
      const { world, player } = setupBasicWorld();
      const hat = world.createEntity('wool hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'head'
      });
      world.moveEntity(hat.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: hat
      }));
      
      const events = takingOffAction.execute(context);
      
      // Should emit REMOVED event
      expectEvent(events, 'if.event.removed', {
        itemId: hat.id,
        bodyPart: 'head'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('removed'),
        params: { 
          item: 'wool hat',
          bodyPart: 'head'
        }
      });
    });

    test('should remove item without body part', () => {
      const { world, player } = setupBasicWorld();
      const bracelet = world.createEntity('silver bracelet', 'object');
      bracelet.add({
        type: TraitType.WEARABLE,
        worn: true
        // No bodyPart specified
      });
      world.moveEntity(bracelet.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: bracelet
      }));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'if.event.removed', {
        itemId: bracelet.id,
        bodyPart: undefined
      });
    });

    test('should remove outermost layer', () => {
      const { world, player } = setupBasicWorld();
      
      // Wearing multiple layers
      const shirt = world.createEntity('shirt', 'object');
      shirt.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 1
      });
      
      const vest = world.createEntity('vest', 'object');
      vest.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 2
      });
      
      const jacket = world.createEntity('jacket', 'object');
      jacket.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 3
      });
      
      world.moveEntity(shirt.id, player.id);
      world.moveEntity(vest.id, player.id);
      world.moveEntity(jacket.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: jacket  // Remove outermost layer
      }));
      
      const events = takingOffAction.execute(context);
      
      // Should succeed - no items over jacket
      expectEvent(events, 'if.event.removed', {
        itemId: jacket.id,
        layer: 3
      });
    });

    test('should handle items on different body parts', () => {
      const { world, player } = setupBasicWorld();
      
      // Wearing items on different body parts
      const hat = world.createEntity('hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'head',
        layer: 1
      });
      
      const coat = world.createEntity('coat', 'object');
      coat.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 2
      });
      
      world.moveEntity(hat.id, player.id);
      world.moveEntity(coat.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: hat  // Remove hat while wearing coat
      }));
      
      const events = takingOffAction.execute(context);
      
      // Should succeed - different body parts
      expectEvent(events, 'if.event.removed', {
        itemId: hat.id,
        bodyPart: 'head'
      });
    });

    test('should include layer information in events', () => {
      const { world, player } = setupBasicWorld();
      const gloves = world.createEntity('work gloves', 'object');
      gloves.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'hands',
        layer: 1
      });
      world.moveEntity(gloves.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: gloves
      }));
      
      const events = takingOffAction.execute(context);
      
      expectEvent(events, 'if.event.removed', {
        itemId: gloves.id,
        bodyPart: 'hands',
        layer: 1
      });
      
      expectEvent(events, 'action.success', {
        params: {
          item: 'work gloves',
          bodyPart: 'hands',
          layer: 1
        }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const shoes = world.createEntity('running shoes', 'object');
      shoes.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'feet'
      });
      world.moveEntity(shoes.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: shoes
      }));
      
      const events = takingOffAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(shoes.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Taking Off', () => {
  test('pattern: layering removal order', () => {
    // Test that items must be removed in reverse layer order
    const world = new WorldModel();
    const layers = [
      { id: 'underwear', layer: 0 },
      { id: 'shirt', layer: 1 },
      { id: 'sweater', layer: 2 },
      { id: 'jacket', layer: 3 },
      { id: 'coat', layer: 4 }
    ];
    
    // Create items with increasing layers
    const items = layers.map(({ id, layer }) => {
      const item = world.createEntity(id, 'object');
      item.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer
      });
      return item;
    });
    
    // Can only remove items if no higher layer items exist
    const canRemove = (itemIndex: number, allItems: any[]) => {
      const item = allItems[itemIndex];
      const itemLayer = item.get(TraitType.WEARABLE).layer;
      
      return !allItems.some((other, otherIndex) => {
        if (otherIndex === itemIndex) return false;
        const otherWearable = other.get(TraitType.WEARABLE);
        return otherWearable.worn && 
               otherWearable.layer > itemLayer &&
               otherWearable.bodyPart === 'torso';
      });
    };
    
    // Only the outermost layer (coat) can be removed
    expect(canRemove(4, items)).toBe(true);  // coat
    expect(canRemove(3, items)).toBe(false); // jacket (blocked by coat)
    expect(canRemove(0, items)).toBe(false); // underwear (blocked by everything)
  });

  test('pattern: special removal restrictions', () => {
    // Test various reasons items might not be removable
    const world = new WorldModel();
    const restrictedItems = [
      {
        name: 'cursed ring',
        restriction: { cursed: true },
        errorType: 'cant_remove'
      },
      {
        name: 'locked collar',
        restriction: { locked: true },
        errorType: 'cant_remove'
      },
      {
        name: 'magical bond',
        restriction: { magicallyBound: true },
        errorType: 'cant_remove'
      }
    ];
    
    restrictedItems.forEach(({ name, restriction }) => {
      const item = world.createEntity(name, 'object');
      item.add({
        type: TraitType.WEARABLE,
        worn: true,
        ...restriction
      });
      
      const wearable = item.get(TraitType.WEARABLE) as any;
      expect(wearable.cursed || wearable.locked || wearable.magicallyBound).toBeTruthy();
    });
  });
});
