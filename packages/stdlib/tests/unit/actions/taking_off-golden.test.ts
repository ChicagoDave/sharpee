/**
 * Golden test for taking off action - demonstrates testing removal of worn items
 * 
 * This shows patterns for testing actions that:
 * - Remove worn clothing and equipment
 * - Check layering rules (can't remove items under other items)
 * - Handle special cases like cursed items
 * - Validate that items are actually worn
 */

import { describe, test, expect } from 'vitest';
import { takingOffAction } from '../../../src/actions/standard/taking_off';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WearableTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  createCommand
} from '../../test-utils';

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
      
      const events = executeWithValidation(takingOffAction, context);
      
      expectEvent(events, 'if.event.take_off_blocked', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when item not on actor', () => {
      const { world, player, room } = setupBasicWorld();
      const hat = world.createEntity('red hat', 'object');
      hat.add(new WearableTrait({ isWorn: false }));
      world.moveEntity(hat.id, room.id); // Hat is in room, not on player
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: hat
      }));
      
      const events = executeWithValidation(takingOffAction, context);
      
      expectEvent(events, 'if.event.take_off_blocked', {
        messageId: expect.stringContaining('not_wearing'),
        reason: 'not_wearing'
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
      
      const events = executeWithValidation(takingOffAction, context);
      
      expectEvent(events, 'if.event.take_off_blocked', {
        messageId: expect.stringContaining('not_wearing'),
        reason: 'not_wearing'
      });
    });

    test('should fail when item not actually worn', () => {
      const { world, player } = setupBasicWorld();
      const shirt = world.createEntity('blue shirt', 'object');
      shirt.add(new WearableTrait({ isWorn: false })); // Not worn, just carried
      world.moveEntity(shirt.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: shirt
      }));
      
      const events = executeWithValidation(takingOffAction, context);
      
      expectEvent(events, 'if.event.take_off_blocked', {
        messageId: expect.stringContaining('not_wearing'),
        reason: 'not_wearing'
      });
    });

    test('should fail when blocked by outer layer', () => {
      const { world, player } = setupBasicWorld();
      
      // Wearing shirt (layer 1)
      const shirt = world.createEntity('dress shirt', 'object');
      shirt.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 1 } }));
      
      // Wearing jacket over it (layer 2)
      const jacket = world.createEntity('leather jacket', 'object');
      jacket.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 2 } }));
      
      world.moveEntity(shirt.id, player.id);
      world.moveEntity(jacket.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: shirt  // Try to remove shirt while wearing jacket
      }));
      
      const events = executeWithValidation(takingOffAction, context);

      expectEvent(events, 'if.event.take_off_blocked', {
        messageId: expect.stringContaining('prevents_removal'),
        reason: 'prevents_removal'
      });
      // State: both still worn
      expect(shirt.get(WearableTrait)!.worn).toBe(true);
      expect(jacket.get(WearableTrait)!.worn).toBe(true);
    });

    test('should fail when item is cursed', () => {
      const { world, player } = setupBasicWorld();
      const ring = world.createEntity('cursed ring', 'object');
      ring.add(new WearableTrait({ isWorn: true, wornBy: player.id, canRemove: false }));
      world.moveEntity(ring.id, player.id);

      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: ring
      }));

      const events = executeWithValidation(takingOffAction, context);

      expectEvent(events, 'if.event.take_off_blocked', {
        messageId: expect.stringContaining('cant_remove'),
        reason: 'cant_remove'
      });
      // State: the ring stays on, still worn by the player
      const ringAfter = ring.get(WearableTrait)!;
      expect(ringAfter.worn).toBe(true);
      expect(ringAfter.wornBy).toBe(player.id);
    });
  });

  describe('Successful Removal', () => {
    test('should remove worn item', () => {
      const { world, player } = setupBasicWorld();
      const hat = world.createEntity('wool hat', 'object');
      hat.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'head', layer: 1 } }));
      world.moveEntity(hat.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: hat
      }));
      
      const events = executeWithValidation(takingOffAction, context);
      
      // Should emit REMOVED event with messageId and domain data
      expectEvent(events, 'if.event.removed', {
        messageId: expect.stringContaining('removed'),
        itemId: hat.id,
        bodyPart: 'head'
      });
    });

    test('should remove a simple wearable (no placement) and report no body part', () => {
      const { world, player } = setupBasicWorld();
      const bracelet = world.createEntity('silver bracelet', 'object');
      bracelet.add(new WearableTrait({ isWorn: true, wornBy: player.id })); // simple: no placement
      world.moveEntity(bracelet.id, player.id);

      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: bracelet
      }));

      const events = executeWithValidation(takingOffAction, context);

      expectEvent(events, 'if.event.removed', {
        itemId: bracelet.id
      });
      const removed = events.find(e => e.type === 'if.event.removed')!;
      const data = removed.data as { bodyPart?: string; layer?: number };
      expect(data.bodyPart).toBeUndefined();
      expect(data.layer).toBeUndefined();
    });

    test('should remove outermost layer', () => {
      const { world, player } = setupBasicWorld();
      
      // Wearing multiple layers
      const shirt = world.createEntity('shirt', 'object');
      shirt.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 1 } }));
      
      const vest = world.createEntity('vest', 'object');
      vest.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 2 } }));
      
      const jacket = world.createEntity('jacket', 'object');
      jacket.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 3 } }));
      
      world.moveEntity(shirt.id, player.id);
      world.moveEntity(vest.id, player.id);
      world.moveEntity(jacket.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: jacket  // Remove outermost layer
      }));
      
      const events = executeWithValidation(takingOffAction, context);
      
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
      hat.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'head', layer: 1 } }));
      
      const coat = world.createEntity('coat', 'object');
      coat.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 2 } }));
      
      world.moveEntity(hat.id, player.id);
      world.moveEntity(coat.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: hat  // Remove hat while wearing coat
      }));
      
      const events = executeWithValidation(takingOffAction, context);
      
      // Should succeed - different body parts
      expectEvent(events, 'if.event.removed', {
        itemId: hat.id,
        bodyPart: 'head'
      });
    });

    test('should include layer information in events', () => {
      const { world, player } = setupBasicWorld();
      const gloves = world.createEntity('work gloves', 'object');
      gloves.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'hands', layer: 1 } }));
      world.moveEntity(gloves.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: gloves
      }));
      
      const events = executeWithValidation(takingOffAction, context);
      
      expectEvent(events, 'if.event.removed', {
        messageId: expect.stringContaining('removed'),
        itemId: gloves.id,
        bodyPart: 'hands',
        layer: 1
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const shoes = world.createEntity('running shoes', 'object');
      shoes.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'feet', layer: 1 } }));
      world.moveEntity(shoes.id, player.id);
      
      const context = createRealTestContext(takingOffAction, world, createCommand(IFActions.TAKING_OFF, {
        entity: shoes
      }));
      
      const events = executeWithValidation(takingOffAction, context);
      
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

/**
 * World State Mutation Tests
 *
 * These tests verify that the taking_off action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually set worn to false after taking off', () => {
    const { world, player } = setupBasicWorld();
    const hat = world.createEntity('wool hat', 'object');
    hat.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'head', layer: 1 } }));
    world.moveEntity(hat.id, player.id);

    // VERIFY PRECONDITION: hat is worn
    const wearableBefore = hat.get(WearableTrait)!;
    expect(wearableBefore.worn).toBe(true);
    expect(wearableBefore.wornBy).toBe(player.id);

    const command = createCommand(IFActions.TAKING_OFF, {
      entity: hat
    });
    const context = createRealTestContext(takingOffAction, world, command);

    const validation = takingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    takingOffAction.execute(context);

    // VERIFY POSTCONDITION: hat is no longer worn
    const wearableAfter = hat.get(WearableTrait)!;
    expect(wearableAfter.worn).toBe(false);
    expect(wearableAfter.wornBy).toBeUndefined();
  });

  test('should actually set worn to false with body part preserved', () => {
    const { world, player } = setupBasicWorld();
    const gloves = world.createEntity('leather gloves', 'object');
    gloves.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'hands', layer: 1 } }));
    world.moveEntity(gloves.id, player.id);

    // VERIFY PRECONDITION: gloves are worn
    const wearableBefore = gloves.get(WearableTrait)!;
    expect(wearableBefore.worn).toBe(true);
    expect(wearableBefore.placement).toEqual({ bodyPart: 'hands', layer: 1 });

    const command = createCommand(IFActions.TAKING_OFF, {
      entity: gloves
    });
    const context = createRealTestContext(takingOffAction, world, command);

    const validation = takingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    takingOffAction.execute(context);

    // VERIFY POSTCONDITION: gloves are no longer worn, body part and layer preserved
    const wearableAfter = gloves.get(WearableTrait)!;
    expect(wearableAfter.worn).toBe(false);
    expect(wearableAfter.wornBy).toBeUndefined();
    expect(wearableAfter.placement).toEqual({ bodyPart: 'hands', layer: 1 });
  });

  test('should NOT change worn when not wearing', () => {
    const { world, player } = setupBasicWorld();
    const scarf = world.createEntity('silk scarf', 'object');
    scarf.add(new WearableTrait({ isWorn: false, placement: { bodyPart: 'neck', layer: 1 } })); // Not worn
    world.moveEntity(scarf.id, player.id);

    // VERIFY PRECONDITION: scarf is not worn
    const wearableBefore = scarf.get(WearableTrait)!;
    expect(wearableBefore.worn).toBe(false);

    const command = createCommand(IFActions.TAKING_OFF, {
      entity: scarf
    });
    const context = createRealTestContext(takingOffAction, world, command);

    // Validation should fail
    const validation = takingOffAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_wearing');

    // VERIFY POSTCONDITION: scarf is still not worn (no change)
    const wearableAfter = scarf.get(WearableTrait)!;
    expect(wearableAfter.worn).toBe(false);
  });

  test('should NOT change state when target is not wearable', () => {
    const { world, player } = setupBasicWorld();
    const rock = world.createEntity('heavy rock', 'object');
    // No wearable trait
    world.moveEntity(rock.id, player.id);

    const command = createCommand(IFActions.TAKING_OFF, {
      entity: rock
    });
    const context = createRealTestContext(takingOffAction, world, command);

    // Validation should fail
    const validation = takingOffAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_wearing');

    // Object should not have wearable trait at all
    expect(rock.has(TraitType.WEARABLE)).toBe(false);
  });

  test('should take off outermost layer without affecting inner layers', () => {
    const { world, player } = setupBasicWorld();

    // Wearing shirt (layer 1) and jacket (layer 2)
    const shirt = world.createEntity('cotton shirt', 'object');
    shirt.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 1 } }));
    world.moveEntity(shirt.id, player.id);

    const jacket = world.createEntity('leather jacket', 'object');
    jacket.add(new WearableTrait({ isWorn: true, wornBy: player.id, placement: { bodyPart: 'torso', layer: 2 } }));
    world.moveEntity(jacket.id, player.id);

    // VERIFY PRECONDITION: both are worn
    expect((shirt.get(WearableTrait)!).worn).toBe(true);
    expect((jacket.get(WearableTrait)!).worn).toBe(true);

    // Take off the jacket (outermost layer)
    const command = createCommand(IFActions.TAKING_OFF, {
      entity: jacket
    });
    const context = createRealTestContext(takingOffAction, world, command);

    const validation = takingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    takingOffAction.execute(context);

    // VERIFY POSTCONDITION: jacket is no longer worn, shirt still is
    const jacketAfter = jacket.get(WearableTrait)!;
    const shirtAfter = shirt.get(WearableTrait)!;
    expect(jacketAfter.worn).toBe(false);
    expect(jacketAfter.wornBy).toBeUndefined();
    expect(shirtAfter.worn).toBe(true);
    expect(shirtAfter.wornBy).toBe(player.id);
  });

  test('should take off item without bodyPart specified', () => {
    const { world, player } = setupBasicWorld();
    const ring = world.createEntity('gold ring', 'object');
    ring.add(new WearableTrait({ isWorn: true, wornBy: player.id })); // No bodyPart
    world.moveEntity(ring.id, player.id);

    // VERIFY PRECONDITION: ring is worn
    const wearableBefore = ring.get(WearableTrait)!;
    expect(wearableBefore.worn).toBe(true);

    const command = createCommand(IFActions.TAKING_OFF, {
      entity: ring
    });
    const context = createRealTestContext(takingOffAction, world, command);

    const validation = takingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    takingOffAction.execute(context);

    // VERIFY POSTCONDITION: ring is no longer worn
    const wearableAfter = ring.get(WearableTrait)!;
    expect(wearableAfter.worn).toBe(false);
    expect(wearableAfter.wornBy).toBeUndefined();
  });
});
