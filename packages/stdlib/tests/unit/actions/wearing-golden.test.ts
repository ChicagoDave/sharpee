/**
 * Golden test for wearing action - demonstrates testing wearable items
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to wear clothing and equipment
 * - Check wearable traits and body part conflicts
 * - Handle layering rules for clothing
 * - Support implicit taking when item is in room
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
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
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

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
      
      const events = wearingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
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
      
      const events = wearingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_wearable'),
        params: { item: 'red ball' }
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
      
      const events = wearingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_wearing'),
        params: { item: 'wool hat' }
      });
    });

    test('should fail when item not held and not in room', () => {
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
      
      const events = wearingAction.execute(context);
      
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
      
      const events = wearingAction.execute(context);
      
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
      
      const events = wearingAction.execute(context);
      
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
      
      const events = wearingAction.execute(context);
      
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
      
      const events = wearingAction.execute(context);
      
      // Should emit implicit TAKEN event first
      expectEvent(events, 'if.event.taken', {
        implicit: true,
        item: 'silk scarf'
      });
      
      // Should emit WORN event
      expectEvent(events, 'if.event.worn', {
        itemId: scarf.id,
        bodyPart: 'neck'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('worn'),
        params: { item: 'silk scarf' }
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
      
      const events = wearingAction.execute(context);
      
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
      
      const events = wearingAction.execute(context);
      
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
      
      const events = wearingAction.execute(context);
      
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
      
      const events = wearingAction.execute(context);
      
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
