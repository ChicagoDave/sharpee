/**
 * Golden test for removing action - demonstrates testing targeted extraction
 * 
 * This shows patterns for testing actions that:
 * - Remove objects from specific containers/supporters
 * - Check container states (open/closed)
 * - Verify object location before removal
 * - Handle both containers and supporters
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { removingAction } from '../../../src/actions/standard/removing';
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
import type { ISemanticEvent } from '@sharpee/core';

// Helper to execute action using the four-phase pattern
function executeAction(action: any, context: ActionContext): ISemanticEvent[] {
  // Four-phase pattern: validate -> execute/blocked -> report
  const validationResult = action.validate(context);

  if (!validationResult.valid) {
    // Use blocked() for validation failures
    return action.blocked(context, validationResult);
  }

  // Execute mutations (returns void)
  action.execute(context);

  // Report generates success events
  return action.report(context);
}

describe('removingAction (Golden Pattern)', () => {
  describe('Three-Phase Pattern Compliance', () => {
    test('should have required methods for three-phase pattern', () => {
      expect(removingAction.validate).toBeDefined();
      expect(removingAction.execute).toBeDefined();
      expect(removingAction.report).toBeDefined();
    });

    test('should use report() for ALL event generation', () => {
      const { world, player, room } = setupBasicWorld();
      const item = world.createEntity('test item', 'object');
      world.moveEntity(item.id, room.id);
      
      const command = createCommand(IFActions.REMOVING, {
        entity: item,
        text: 'test item'
      });
      const context = createRealTestContext(removingAction, world, command);
      
      // The executeAction helper properly tests the three-phase pattern
      const events = executeAction(removingAction, context);
      
      // All events should be generated via report()
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(removingAction.id).toBe(IFActions.REMOVING);
    });

    test('should declare required messages', () => {
      expect(removingAction.requiredMessages).toContain('no_target');
      expect(removingAction.requiredMessages).toContain('no_source');
      expect(removingAction.requiredMessages).toContain('not_in_container');
      expect(removingAction.requiredMessages).toContain('not_on_surface');
      expect(removingAction.requiredMessages).toContain('container_closed');
      expect(removingAction.requiredMessages).toContain('removed_from');
      expect(removingAction.requiredMessages).toContain('removed_from_surface');
      expect(removingAction.requiredMessages).toContain('cant_reach');
      expect(removingAction.requiredMessages).toContain('already_have');
    });

    test('should belong to object_manipulation group', () => {
      expect(removingAction.group).toBe('object_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('no_target')
      });
    });

    test('should fail when no source specified', () => {
      const { world } = setupBasicWorld();
      const ball = world.createEntity('ball', 'object');
      
      const context = createRealTestContext(removingAction, world, createCommand(
        IFActions.REMOVING,
        { entity: ball }
        // No indirect object
      ));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('no_source'),
        params: { item: 'ball' }
      });
    });

    test('should fail when item not in specified container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const coin = world.createEntity('gold coin', 'object');
      const box = world.createEntity('wooden box', 'object');
      box.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(coin.id, room.id);  // Coin on floor
      world.moveEntity(box.id, room.id);
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: coin,
        secondEntity: box,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('not_in_container'),
        params: { 
          item: 'gold coin',
          container: 'wooden box'
        }
      });
    });

    test('should fail when item not on specified supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const book = world.createEntity('old book', 'object');
      const table = world.createEntity('oak table', 'object');
      table.add({ type: TraitType.SUPPORTER });
      
      world.moveEntity(book.id, room.id);  // Book on floor
      world.moveEntity(table.id, room.id);
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: book,
        secondEntity: table,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('not_on_surface'),
        params: { 
          item: 'old book',
          surface: 'oak table'
        }
      });
    });

    test('should fail when player already has item', () => {
      const { world, player } = setupBasicWorld();
      const key = world.createEntity('brass key', 'object');
      world.moveEntity(key.id, player.id);  // Key in inventory
      
      const box = world.createEntity('box', 'object');
      box.add({ type: TraitType.CONTAINER });
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: key,
        secondEntity: box,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('already_have'),
        params: { item: 'brass key' }
      });
    });

    test('should fail when container is closed', () => {
      const { world, player, room } = setupBasicWorld();
      
      const gem = world.createEntity('ruby', 'object');
      const chest = world.createEntity('treasure chest', 'object');
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ 
        type: TraitType.OPENABLE,
        isOpen: true  // Start open to allow placing gem
      });
      
      world.moveEntity(chest.id, room.id);
      world.moveEntity(gem.id, chest.id);  // Gem in chest
      
      // Now close the container
      const openableTrait = chest.get(TraitType.OPENABLE);
      (openableTrait as any).isOpen = false;
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: gem,
        secondEntity: chest,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('container_closed'),
        params: { container: 'treasure chest' }
      });
    });
  });

  describe('Successful Removal', () => {
    test('should remove from open container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const coin = world.createEntity('silver coin', 'object');
      const box = world.createEntity('small box', 'object');
      box.add({ type: TraitType.CONTAINER });
      box.add({ 
        type: TraitType.OPENABLE,
        isOpen: true
      });
      
      world.moveEntity(box.id, room.id);
      world.moveEntity(coin.id, box.id);
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: coin,
        secondEntity: box,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      // Should emit TAKEN event (same as taking)
      expectEvent(events, 'if.event.taken', {
        item: 'silver coin',
        fromLocation: box.id,
        container: 'small box',
        fromContainer: true,
        fromSupporter: false
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('removed_from'),
        params: { 
          item: 'silver coin',
          container: 'small box'
        }
      });
    });

    test('should remove from container without openable trait', () => {
      const { world, player, room } = setupBasicWorld();
      
      const apple = world.createEntity('red apple', 'object');
      const basket = world.createEntity('wicker basket', 'object');
      basket.add({ type: TraitType.CONTAINER });
      // No openable trait - always accessible
      
      world.moveEntity(basket.id, room.id);
      world.moveEntity(apple.id, basket.id);
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: apple,
        secondEntity: basket,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'if.event.taken', {
        item: 'red apple',
        fromLocation: basket.id,
        container: 'wicker basket',
        fromContainer: true
      });
    });

    test('should remove from supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const lamp = world.createEntity('desk lamp', 'object');
      const desk = world.createEntity('wooden desk', 'object');
      desk.add({ type: TraitType.SUPPORTER });
      
      world.moveEntity(desk.id, room.id);
      world.moveEntity(lamp.id, desk.id);
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: lamp,
        secondEntity: desk,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      expectEvent(events, 'if.event.taken', {
        item: 'desk lamp',
        fromLocation: desk.id,
        container: 'wooden desk',
        fromContainer: false,
        fromSupporter: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('removed_from_surface'),
        params: { 
          item: 'desk lamp',
          surface: 'wooden desk'
        }
      });
    });
  });

  describe('Source Type Handling', () => {
    test('should handle source that is neither container nor supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const note = world.createEntity('crumpled note', 'object');
      const statue = world.createEntity('stone statue', 'object');  // Just a thing
      
      world.moveEntity(statue.id, room.id);
      world.moveEntity(note.id, room.id);  // Not actually in statue
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: note,
        secondEntity: statue,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      // Should default to container error message
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('not_in_container'),
        params: { 
          item: 'crumpled note',
          container: 'stone statue'
        }
      });
    });

    test('should handle container that is also a supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const pen = world.createEntity('fountain pen', 'object');
      const desk = world.createEntity('writing desk', 'object');
      desk.add({ type: TraitType.CONTAINER });  // Has drawers
      desk.add({ type: TraitType.SUPPORTER });   // Has surface
      
      world.moveEntity(desk.id, room.id);
      world.moveEntity(pen.id, desk.id);
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: pen,
        secondEntity: desk,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
      // Should treat as container (container takes precedence)
      expectEvent(events, 'if.event.taken', {
        fromContainer: true,
        fromSupporter: false
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('removed_from'),
        params: { 
          item: 'fountain pen',
          container: 'writing desk' 
        }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const ring = world.createEntity('gold ring', 'object');
      const box = world.createEntity('jewelry box', 'object');
      box.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(box.id, room.id);
      world.moveEntity(ring.id, box.id);
      
      const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
        entity: ring,
        secondEntity: box,
        preposition: 'from'
      }));
      
      const events = executeAction(removingAction, context);
      
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

describe('Removing Action Edge Cases', () => {
  test('should handle removing last item from container', () => {
    const { world, player, room } = setupBasicWorld();
    
    const marble = world.createEntity('glass marble', 'object');
    const jar = world.createEntity('empty jar', 'object');
    jar.add({ type: TraitType.CONTAINER });
    
    world.moveEntity(jar.id, room.id);
    world.moveEntity(marble.id, jar.id);
    
    // No need to mock - the marble is actually the only item in the jar
    
    const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
      entity: marble,
      secondEntity: jar,
      preposition: 'from'
    }));
    
    const events = executeAction(removingAction, context);
    
    expectEvent(events, 'if.event.taken', {
      item: 'glass marble',
      fromLocation: jar.id,
      container: 'empty jar',
      fromContainer: true
    });
  });

  test('should handle nested containers', () => {
    const { world, player, room } = setupBasicWorld();
    
    const coin = world.createEntity('silver coin', 'object');
    const pouch = world.createEntity('leather pouch', 'object');
    pouch.add({ type: TraitType.CONTAINER });
    const chest = world.createEntity('treasure chest', 'object');
    chest.add({ type: TraitType.CONTAINER });
    
    world.moveEntity(chest.id, room.id);
    world.moveEntity(pouch.id, chest.id);  // Pouch in chest
    world.moveEntity(coin.id, pouch.id);   // Coin in pouch
    
    const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
      entity: coin,
      secondEntity: pouch,
      preposition: 'from'
    }));
    
    const events = executeAction(removingAction, context);
    
    // Should remove from immediate container (pouch)
    expectEvent(events, 'if.event.taken', {
      item: 'silver coin',
      fromLocation: pouch.id,
      container: 'leather pouch',
      fromContainer: true
    });
    
    expectEvent(events, 'action.success', {
      params: { 
        item: 'silver coin',
        container: 'leather pouch'
      }
    });
  });

  test('should provide specific error for wrong container', () => {
    const { world, player, room } = setupBasicWorld();

    const card = world.createEntity('playing card', 'object');
    const box1 = world.createEntity('red box', 'object');
    box1.add({ type: TraitType.CONTAINER });
    const box2 = world.createEntity('blue box', 'object');
    box2.add({ type: TraitType.CONTAINER });

    world.moveEntity(box1.id, room.id);
    world.moveEntity(box2.id, room.id);
    world.moveEntity(card.id, box1.id);  // Card in red box

    const context = createRealTestContext(removingAction, world, createCommand(IFActions.REMOVING, {
      entity: card,
      secondEntity: box2,
      preposition: 'from'  // Trying to remove from blue box
    }));

    const events = executeAction(removingAction, context);

    expectEvent(events, 'action.blocked', {
      messageId: expect.stringContaining('not_in_container'),
      params: {
        item: 'playing card',
        container: 'blue box'
      }
    });
  });
});

/**
 * World State Mutation Tests
 *
 * These tests verify that the removing action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually move item from container to player inventory', () => {
    const { world, player, room } = setupBasicWorld();

    const gem = world.createEntity('ruby', 'object');
    const box = world.createEntity('velvet box', 'object');
    box.add({ type: TraitType.CONTAINER });

    world.moveEntity(box.id, room.id);
    world.moveEntity(gem.id, box.id);

    // VERIFY PRECONDITION: gem is in the box
    expect(world.getLocation(gem.id)).toBe(box.id);

    const command = createCommand(IFActions.REMOVING, {
      entity: gem,
      secondEntity: box,
      preposition: 'from'
    });
    const context = createRealTestContext(removingAction, world, command);

    const validation = removingAction.validate(context);
    expect(validation.valid).toBe(true);
    removingAction.execute(context);

    // VERIFY POSTCONDITION: gem is now in player's inventory
    expect(world.getLocation(gem.id)).toBe(player.id);
  });

  test('should actually move item from open container to player inventory', () => {
    const { world, player, room } = setupBasicWorld();

    const coin = world.createEntity('gold doubloon', 'object');
    const chest = world.createEntity('pirate chest', 'object');
    chest.add({ type: TraitType.CONTAINER });
    chest.add({ type: TraitType.OPENABLE, isOpen: true });

    world.moveEntity(chest.id, room.id);
    world.moveEntity(coin.id, chest.id);

    // VERIFY PRECONDITION: coin is in the chest
    expect(world.getLocation(coin.id)).toBe(chest.id);

    const command = createCommand(IFActions.REMOVING, {
      entity: coin,
      secondEntity: chest,
      preposition: 'from'
    });
    const context = createRealTestContext(removingAction, world, command);

    const validation = removingAction.validate(context);
    expect(validation.valid).toBe(true);
    removingAction.execute(context);

    // VERIFY POSTCONDITION: coin is now in player's inventory
    expect(world.getLocation(coin.id)).toBe(player.id);
  });

  test('should actually move item from supporter to player inventory', () => {
    const { world, player, room } = setupBasicWorld();

    const lamp = world.createEntity('brass lamp', 'object');
    const table = world.createEntity('oak table', 'object');
    table.add({ type: TraitType.SUPPORTER });

    world.moveEntity(table.id, room.id);
    world.moveEntity(lamp.id, table.id);

    // VERIFY PRECONDITION: lamp is on the table
    expect(world.getLocation(lamp.id)).toBe(table.id);

    const command = createCommand(IFActions.REMOVING, {
      entity: lamp,
      secondEntity: table,
      preposition: 'from'
    });
    const context = createRealTestContext(removingAction, world, command);

    const validation = removingAction.validate(context);
    expect(validation.valid).toBe(true);
    removingAction.execute(context);

    // VERIFY POSTCONDITION: lamp is now in player's inventory
    expect(world.getLocation(lamp.id)).toBe(player.id);
  });

  test('should NOT move item when container is closed', () => {
    const { world, player, room } = setupBasicWorld();

    const ring = world.createEntity('diamond ring', 'object');
    const casket = world.createEntity('jewelry casket', 'object');
    casket.add({ type: TraitType.CONTAINER });
    casket.add({ type: TraitType.OPENABLE, isOpen: true }); // Start open to place item

    world.moveEntity(casket.id, room.id);
    world.moveEntity(ring.id, casket.id);

    // Close the casket
    const openableTrait = casket.get(TraitType.OPENABLE);
    (openableTrait as any).isOpen = false;

    // VERIFY PRECONDITION: ring is in the casket
    expect(world.getLocation(ring.id)).toBe(casket.id);

    const command = createCommand(IFActions.REMOVING, {
      entity: ring,
      secondEntity: casket,
      preposition: 'from'
    });
    const context = createRealTestContext(removingAction, world, command);

    // Validation should fail
    const validation = removingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('container_closed');

    // VERIFY POSTCONDITION: ring still in the casket (no change)
    expect(world.getLocation(ring.id)).toBe(casket.id);
  });

  test('should NOT move item when item is not in the specified container', () => {
    const { world, player, room } = setupBasicWorld();

    const key = world.createEntity('brass key', 'object');
    const box1 = world.createEntity('red box', 'object');
    box1.add({ type: TraitType.CONTAINER });
    const box2 = world.createEntity('blue box', 'object');
    box2.add({ type: TraitType.CONTAINER });

    world.moveEntity(box1.id, room.id);
    world.moveEntity(box2.id, room.id);
    world.moveEntity(key.id, box1.id); // Key is in red box

    // VERIFY PRECONDITION: key is in box1
    expect(world.getLocation(key.id)).toBe(box1.id);

    const command = createCommand(IFActions.REMOVING, {
      entity: key,
      secondEntity: box2, // Try to remove from wrong box
      preposition: 'from'
    });
    const context = createRealTestContext(removingAction, world, command);

    // Validation should fail
    const validation = removingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_in_container');

    // VERIFY POSTCONDITION: key still in box1 (no change)
    expect(world.getLocation(key.id)).toBe(box1.id);
  });

  test('should move item from nested container to player inventory', () => {
    const { world, player, room } = setupBasicWorld();

    const coin = world.createEntity('ancient coin', 'object');
    const pouch = world.createEntity('leather pouch', 'object');
    pouch.add({ type: TraitType.CONTAINER });
    const chest = world.createEntity('treasure chest', 'object');
    chest.add({ type: TraitType.CONTAINER });

    world.moveEntity(chest.id, room.id);
    world.moveEntity(pouch.id, chest.id);
    world.moveEntity(coin.id, pouch.id);

    // VERIFY PRECONDITION: coin is in pouch (which is in chest)
    expect(world.getLocation(coin.id)).toBe(pouch.id);

    const command = createCommand(IFActions.REMOVING, {
      entity: coin,
      secondEntity: pouch,
      preposition: 'from'
    });
    const context = createRealTestContext(removingAction, world, command);

    const validation = removingAction.validate(context);
    expect(validation.valid).toBe(true);
    removingAction.execute(context);

    // VERIFY POSTCONDITION: coin is now in player's inventory
    expect(world.getLocation(coin.id)).toBe(player.id);
  });
});
