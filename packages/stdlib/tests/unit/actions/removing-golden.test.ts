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

describe('removingAction (Golden Pattern)', () => {
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
      
      const events = removingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
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
      
      const events = removingAction.execute(context);
      
      expectEvent(events, 'action.error', {
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
      
      const events = removingAction.execute(context);
      
      expectEvent(events, 'action.error', {
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
      
      const events = removingAction.execute(context);
      
      expectEvent(events, 'action.error', {
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
      
      const events = removingAction.execute(context);
      
      expectEvent(events, 'action.error', {
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
      
      const events = removingAction.execute(context);
      
      expectEvent(events, 'action.error', {
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
      
      const events = removingAction.execute(context);
      
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
      
      const events = removingAction.execute(context);
      
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
      
      const events = removingAction.execute(context);
      
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
      
      const events = removingAction.execute(context);
      
      // Should default to container error message
      expectEvent(events, 'action.error', {
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
      
      const events = removingAction.execute(context);
      
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
      
      const events = removingAction.execute(context);
      
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
    
    const events = removingAction.execute(context);
    
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
    
    const events = removingAction.execute(context);
    
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
    
    const events = removingAction.execute(context);
    
    expectEvent(events, 'action.error', {
      messageId: expect.stringContaining('not_in_container'),
      params: { 
        item: 'playing card',
        container: 'blue box'
      }
    });
  });
});
