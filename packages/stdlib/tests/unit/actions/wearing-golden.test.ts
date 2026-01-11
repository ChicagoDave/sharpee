/**
 * Golden test for wearing action - demonstrates testing wearable items
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to wear clothing and equipment
 * - Check wearable traits and body part conflicts
 * - Handle layering rules for clothing
 * - Support implicit taking when item is in room
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { wearingAction } from '../../../src/actions/standard/wearing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
createRealTestContext,
expectEvent,
TestData,
createCommand,
setupBasicWorld,
  findEntityByName
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

// Helper to execute action with four-phase pattern (mimics CommandExecutor flow)
const executeWithValidation = (action: any, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    // Use blocked() method for validation failures
    return action.blocked(context, validation);
  }
  // Execute mutations (returns void)
  action.execute(context);
  // Report generates events
  return action.report(context);
};

describe('wearingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(wearingAction.id).toBe(IFActions.WEARING);
    });

    test('should declare required messages', () => {
      expect(wearingAction.requiredMessages).toContain('no_target');
      expect(wearingAction.requiredMessages).toContain('not_wearable');
      expect(wearingAction.requiredMessages).toContain('not_held');
      expect(wearingAction.requiredMessages).toContain('already_wearing');
      expect(wearingAction.requiredMessages).toContain('worn');
      expect(wearingAction.requiredMessages).toContain('cant_wear_that');
      expect(wearingAction.requiredMessages).toContain('hands_full');
    });

    test('should belong to wearable_manipulation group', () => {
      expect(wearingAction.group).toBe('wearable_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WEARING);
      const context = createRealTestContext(wearingAction, world, command);

      const events = executeWithValidation(wearingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_target'
      });
    });

    test('should fail when item is not wearable', () => {
      const { world, player, room } = TestData.withObject('red ball');
      // Ball has no wearable trait

      const ball = findEntityByName(world, 'red ball')!;
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: ball
        })
      );

      const events = executeWithValidation(wearingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'not_wearable'
      });
    });

    test('should fail when already wearing item', () => {
      const { world, player, item } = TestData.withInventoryItem('wool hat', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: true,  // Already worn
          bodyPart: 'head'
        }
      });

      const hat = findEntityByName(world, 'wool hat')!;
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: hat
        })
      );

      const events = executeWithValidation(wearingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'already_wearing'
      });
    });

    test.skip('should fail when item not held and not in room', () => {
      const { world, player } = setupBasicWorld();
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      
      const shirt = world.createEntity('blue shirt', 'object');
      shirt.add({
        type: TraitType.WEARABLE,
        worn: false
      });
      
      world.moveEntity(shirt.id, otherRoom.id); // In different room
      
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: shirt
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_held'),
        params: { item: 'blue shirt' }
      });
    });

    test('should fail when body part conflict exists', () => {
      const { world, player } = setupBasicWorld();
      
      // Already wearing a hat
      const oldHat = world.createEntity('old hat', 'object');
      oldHat.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'head'
      });
      
      // Trying to wear another hat
      const newHat = world.createEntity('new hat', 'object');
      newHat.add({
        type: TraitType.WEARABLE,
        worn: false,
        bodyPart: 'head'
      });
      
      world.moveEntity(oldHat.id, player.id);
      world.moveEntity(newHat.id, player.id);
      
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: newHat
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_wearing'),
        params: { item: 'old hat' }
      });
    });

    test('should fail when layer conflict exists', () => {
      const { world, player } = setupBasicWorld();
      
      // Already wearing a coat (outer layer)
      const coat = world.createEntity('winter coat', 'object');
      coat.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 2  // Outer layer
      });
      
      // Trying to wear a shirt (inner layer) while coat is on
      const shirt = world.createEntity('cotton shirt', 'object');
      shirt.add({
        type: TraitType.WEARABLE,
        worn: false,
        bodyPart: 'torso',
        layer: 1  // Inner layer
      });
      
      world.moveEntity(coat.id, player.id);
      world.moveEntity(shirt.id, player.id);
      
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: shirt
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('hands_full') // Used as proxy for layer conflicts
      });
    });
  });

  describe('Successful Wearing', () => {
    test('should wear item from inventory', () => {
      const { world, player, item } = TestData.withInventoryItem('leather gloves', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: false,
          bodyPart: 'hands'
        }
      });
      
      const gloves = findEntityByName(world, 'leather gloves')!;
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: gloves
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      // Should emit WORN event
      expectEvent(events, 'if.event.worn', {
        itemId: gloves.id,
        bodyPart: 'hands'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('worn'),
        params: { 
          item: 'leather gloves',
          bodyPart: 'hands'
        }
      });
    });

    test('should implicitly take and wear item from room', () => {
      const { world, player, room } = TestData.withObject('silk scarf', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: false,
          bodyPart: 'neck'
        }
      });
      
      const scarf = findEntityByName(world, 'silk scarf')!;
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: scarf
        })
      );
      
      const events = executeWithValidation(wearingAction, context);

      // Should emit implicit take event first (from requireCarriedOrImplicitTake)
      expectEvent(events, 'if.event.implicit_take', {
        item: scarf.id,
        itemName: 'silk scarf'
      });

      // Should emit WORN event
      expectEvent(events, 'if.event.worn', {
        itemId: scarf.id,
        bodyPart: 'neck'
      });

      // Should emit success message for wearing (not the implicit take success)
      // Find the wearing success event specifically (after the implicit take success)
      const wearingSuccess = events.filter(e => e.type === 'action.success')
        .find(e => (e.data as any).messageId === 'worn' ||
                   ((e.data as any).messageId && (e.data as any).messageId.includes('worn')));
      expect(wearingSuccess).toBeDefined();
      expect((wearingSuccess!.data as any).params).toMatchObject({
        item: 'silk scarf',
        bodyPart: 'neck'
      });
    });

    test('should wear item without body part specified', () => {
      const { world, player, item } = TestData.withInventoryItem('gold ring', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: false
          // No bodyPart specified
        }
      });
      
      const ring = findEntityByName(world, 'gold ring')!;
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: ring
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      // Should emit WORN event without bodyPart
      expectEvent(events, 'if.event.worn', {
        itemId: ring.id,
        bodyPart: undefined
      });
    });

    test('should handle layered clothing correctly', () => {
      const { world, player } = setupBasicWorld();
      
      // Already wearing underwear (layer 0)
      const underwear = world.createEntity('underwear', 'object');
      underwear.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'torso',
        layer: 0
      });
      
      // Wearing shirt (layer 1) - should succeed
      const shirt = world.createEntity('dress shirt', 'object');
      shirt.add({
        type: TraitType.WEARABLE,
        worn: false,
        bodyPart: 'torso',
        layer: 1
      });
      
      world.moveEntity(underwear.id, player.id);
      world.moveEntity(shirt.id, player.id);
      
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: shirt
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      // Should succeed - wearing over lower layer
      expectEvent(events, 'if.event.worn', {
        itemId: shirt.id,
        layer: 1
      });
    });

    test('should wear multiple items on different body parts', () => {
      const { world, player } = setupBasicWorld();
      
      // Already wearing hat
      const hat = world.createEntity('hat', 'object');
      hat.add({
        type: TraitType.WEARABLE,
        worn: true,
        bodyPart: 'head'
      });
      
      // Wearing gloves - different body part
      const gloves = world.createEntity('gloves', 'object');
      gloves.add({
        type: TraitType.WEARABLE,
        worn: false,
        bodyPart: 'hands'
      });
      
      world.moveEntity(hat.id, player.id);
      world.moveEntity(gloves.id, player.id);
      
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: gloves
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      // Should succeed - different body parts
      expectEvent(events, 'if.event.worn', {
        itemId: gloves.id,
        bodyPart: 'hands'
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, item } = TestData.withInventoryItem('boots', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: false,
          bodyPart: 'feet'
        }
      });
      
      const boots = findEntityByName(world, 'boots')!;
      const context = createRealTestContext(wearingAction, world,
        createCommand(IFActions.WEARING, {
          entity: boots
        })
      );
      
      const events = executeWithValidation(wearingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(boots.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Wearing', () => {
  test('pattern: complete outfit system', () => {
    // Test a full clothing system with layers
    const outfit = [
      { name: 'underwear', bodyPart: 'torso', layer: 0 },
      { name: 'undershirt', bodyPart: 'torso', layer: 1 },
      { name: 'shirt', bodyPart: 'torso', layer: 2 },
      { name: 'vest', bodyPart: 'torso', layer: 3 },
      { name: 'jacket', bodyPart: 'torso', layer: 4 },
      { name: 'coat', bodyPart: 'torso', layer: 5 }
    ];
    
    const world = new WorldModel();
    const items = outfit.map(({ name, bodyPart, layer }) => {
      const item = world.createEntity(name, 'object');
      item.add({
        type: TraitType.WEARABLE,
        worn: false,
        bodyPart,
        layer
      });
      return item;
    });
    
    // Verify layers are sequential
    items.forEach((item, index) => {
      const wearable = item.get(TraitType.WEARABLE) as any;
      expect(wearable.layer).toBe(index);
    });
  });

  test('pattern: body part coverage', () => {
    // Test various body parts that can be covered
    const bodyParts = [
      { item: 'hat', bodyPart: 'head' },
      { item: 'glasses', bodyPart: 'eyes' },
      { item: 'scarf', bodyPart: 'neck' },
      { item: 'shirt', bodyPart: 'torso' },
      { item: 'gloves', bodyPart: 'hands' },
      { item: 'ring', bodyPart: 'finger' },
      { item: 'belt', bodyPart: 'waist' },
      { item: 'pants', bodyPart: 'legs' },
      { item: 'socks', bodyPart: 'feet' },
      { item: 'shoes', bodyPart: 'feet' }
    ];

    const world = new WorldModel();
    bodyParts.forEach(({ item, bodyPart }) => {
      const wearable = world.createEntity(item, 'object');
      wearable.add({
        type: TraitType.WEARABLE,
        worn: false,
        bodyPart
      });

      const trait = wearable.get(TraitType.WEARABLE) as any;
      expect(trait.bodyPart).toBe(bodyPart);
    });

    // Note: Multiple items can share the same body part (e.g., socks and shoes on feet)
  });
});

/**
 * World State Mutation Tests
 *
 * These tests verify that the wearing action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually set worn to true after wearing', () => {
    const { world, player } = setupBasicWorld();
    const hat = world.createEntity('wool hat', 'object');
    hat.add({
      type: TraitType.WEARABLE,
      worn: false,
      bodyPart: 'head'
    });
    world.moveEntity(hat.id, player.id);

    // VERIFY PRECONDITION: hat is not worn
    const wearableBefore = hat.get(TraitType.WEARABLE) as any;
    expect(wearableBefore.worn).toBe(false);
    expect(wearableBefore.wornBy).toBeUndefined();

    const command = createCommand(IFActions.WEARING, {
      entity: hat
    });
    const context = createRealTestContext(wearingAction, world, command);

    const validation = wearingAction.validate(context);
    expect(validation.valid).toBe(true);
    wearingAction.execute(context);

    // VERIFY POSTCONDITION: hat is now worn by player
    const wearableAfter = hat.get(TraitType.WEARABLE) as any;
    expect(wearableAfter.worn).toBe(true);
    expect(wearableAfter.wornBy).toBe(player.id);
  });

  test('should actually set worn to true with body part preserved', () => {
    const { world, player } = setupBasicWorld();
    const gloves = world.createEntity('leather gloves', 'object');
    gloves.add({
      type: TraitType.WEARABLE,
      worn: false,
      bodyPart: 'hands',
      layer: 1
    });
    world.moveEntity(gloves.id, player.id);

    // VERIFY PRECONDITION: gloves are not worn
    const wearableBefore = gloves.get(TraitType.WEARABLE) as any;
    expect(wearableBefore.worn).toBe(false);
    expect(wearableBefore.bodyPart).toBe('hands');
    expect(wearableBefore.layer).toBe(1);

    const command = createCommand(IFActions.WEARING, {
      entity: gloves
    });
    const context = createRealTestContext(wearingAction, world, command);

    const validation = wearingAction.validate(context);
    expect(validation.valid).toBe(true);
    wearingAction.execute(context);

    // VERIFY POSTCONDITION: gloves are now worn, preserving body part and layer
    const wearableAfter = gloves.get(TraitType.WEARABLE) as any;
    expect(wearableAfter.worn).toBe(true);
    expect(wearableAfter.wornBy).toBe(player.id);
    expect(wearableAfter.bodyPart).toBe('hands');
    expect(wearableAfter.layer).toBe(1);
  });

  test('should NOT change worn when already wearing', () => {
    const { world, player } = setupBasicWorld();
    const scarf = world.createEntity('silk scarf', 'object');
    scarf.add({
      type: TraitType.WEARABLE,
      worn: true, // Already worn
      wornBy: player.id,
      bodyPart: 'neck'
    });
    world.moveEntity(scarf.id, player.id);

    // VERIFY PRECONDITION: scarf is worn
    const wearableBefore = scarf.get(TraitType.WEARABLE) as any;
    expect(wearableBefore.worn).toBe(true);
    expect(wearableBefore.wornBy).toBe(player.id);

    const command = createCommand(IFActions.WEARING, {
      entity: scarf
    });
    const context = createRealTestContext(wearingAction, world, command);

    // Validation should fail
    const validation = wearingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('already_wearing');

    // VERIFY POSTCONDITION: scarf is still worn (no change)
    const wearableAfter = scarf.get(TraitType.WEARABLE) as any;
    expect(wearableAfter.worn).toBe(true);
    expect(wearableAfter.wornBy).toBe(player.id);
  });

  test('should NOT change state when target is not wearable', () => {
    const { world, player, room } = setupBasicWorld();
    const rock = world.createEntity('heavy rock', 'object');
    // No wearable trait
    world.moveEntity(rock.id, room.id);

    const command = createCommand(IFActions.WEARING, {
      entity: rock
    });
    const context = createRealTestContext(wearingAction, world, command);

    // Validation should fail
    const validation = wearingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_wearable');

    // Object should not have wearable trait at all
    expect(rock.has(TraitType.WEARABLE)).toBe(false);
  });

  test('should wear item with layering system', () => {
    const { world, player } = setupBasicWorld();

    // Already wearing underwear (layer 0)
    const underwear = world.createEntity('underwear', 'object');
    underwear.add({
      type: TraitType.WEARABLE,
      worn: true,
      wornBy: player.id,
      bodyPart: 'torso',
      layer: 0
    });
    world.moveEntity(underwear.id, player.id);

    // Trying to wear shirt (layer 1)
    const shirt = world.createEntity('cotton shirt', 'object');
    shirt.add({
      type: TraitType.WEARABLE,
      worn: false,
      bodyPart: 'torso',
      layer: 1
    });
    world.moveEntity(shirt.id, player.id);

    // VERIFY PRECONDITION: shirt is not worn
    const shirtBefore = shirt.get(TraitType.WEARABLE) as any;
    expect(shirtBefore.worn).toBe(false);

    const command = createCommand(IFActions.WEARING, {
      entity: shirt
    });
    const context = createRealTestContext(wearingAction, world, command);

    const validation = wearingAction.validate(context);
    expect(validation.valid).toBe(true);
    wearingAction.execute(context);

    // VERIFY POSTCONDITION: shirt is now worn
    const shirtAfter = shirt.get(TraitType.WEARABLE) as any;
    expect(shirtAfter.worn).toBe(true);
    expect(shirtAfter.wornBy).toBe(player.id);

    // Underwear should still be worn
    const underwearAfter = underwear.get(TraitType.WEARABLE) as any;
    expect(underwearAfter.worn).toBe(true);
  });

  test('should wear item without bodyPart specified', () => {
    const { world, player } = setupBasicWorld();
    const ring = world.createEntity('gold ring', 'object');
    ring.add({
      type: TraitType.WEARABLE,
      worn: false
      // No bodyPart
    });
    world.moveEntity(ring.id, player.id);

    // VERIFY PRECONDITION: ring is not worn
    const wearableBefore = ring.get(TraitType.WEARABLE) as any;
    expect(wearableBefore.worn).toBe(false);

    const command = createCommand(IFActions.WEARING, {
      entity: ring
    });
    const context = createRealTestContext(wearingAction, world, command);

    const validation = wearingAction.validate(context);
    expect(validation.valid).toBe(true);
    wearingAction.execute(context);

    // VERIFY POSTCONDITION: ring is now worn
    const wearableAfter = ring.get(TraitType.WEARABLE) as any;
    expect(wearableAfter.worn).toBe(true);
    expect(wearableAfter.wornBy).toBe(player.id);
  });
});
