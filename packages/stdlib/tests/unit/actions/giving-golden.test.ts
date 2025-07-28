/**
 * Golden test for giving action - demonstrates testing social interactions
 * 
 * This shows patterns for testing actions that:
 * - Transfer objects between actors
 * - Check recipient capacity and preferences
 * - Handle acceptance/refusal logic
 * - Support different acceptance types
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { givingAction } from '../../../src/actions/standard/giving';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

describe('givingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(givingAction.id).toBe(IFActions.GIVING);
    });

    test('should declare required messages', () => {
      expect(givingAction.requiredMessages).toContain('no_item');
      expect(givingAction.requiredMessages).toContain('no_recipient');
      expect(givingAction.requiredMessages).toContain('not_holding');
      expect(givingAction.requiredMessages).toContain('recipient_not_visible');
      expect(givingAction.requiredMessages).toContain('recipient_not_reachable');
      expect(givingAction.requiredMessages).toContain('not_actor');
      expect(givingAction.requiredMessages).toContain('self');
      expect(givingAction.requiredMessages).toContain('inventory_full');
      expect(givingAction.requiredMessages).toContain('too_heavy');
      expect(givingAction.requiredMessages).toContain('not_interested');
      expect(givingAction.requiredMessages).toContain('refuses');
      expect(givingAction.requiredMessages).toContain('given');
      expect(givingAction.requiredMessages).toContain('accepts');
      expect(givingAction.requiredMessages).toContain('gratefully_accepts');
      expect(givingAction.requiredMessages).toContain('reluctantly_accepts');
    });

    test('should belong to social group', () => {
      expect(givingAction.group).toBe('social');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no item specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.GIVING);
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_item'),
        reason: 'no_item'
      });
    });

    test('should fail when no recipient specified', () => {
      const { world, player } = setupBasicWorld();
      const gift = world.createEntity('small gift', 'object');
      world.moveEntity(gift.id, player.id);
      
      const command = createCommand(
        IFActions.GIVING,
        { entity: gift }
        // No indirect object
      );
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_recipient'),
        reason: 'no_recipient'
      });
    });

    test('should fail when not holding item', () => {
      const { world, player, room } = setupBasicWorld();
      
      const coin = world.createEntity('gold coin', 'object');
      const merchant = world.createEntity('merchant', 'actor');
      merchant.add({ type: TraitType.ACTOR });
      
      world.moveEntity(coin.id, room.id);  // Coin on floor
      world.moveEntity(merchant.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: coin,
        secondEntity: merchant,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_holding'),
        params: { item: 'gold coin' }
      });
    });

    test('should fail when recipient not visible', () => {
      const { world, player, item } = TestData.withInventoryItem('gift');
      
      // Create a second room
      const room2 = world.createEntity('Other Room', 'room');
      room2.add({ type: TraitType.ROOM });
      
      const npc = world.createEntity('shopkeeper', 'actor');
      npc.add({ type: TraitType.ACTOR });
      world.moveEntity(npc.id, room2.id);  // Different room
      
      const command = createCommand(IFActions.GIVING, {
        entity: item,
        secondEntity: npc,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('recipient_not_visible'),
        params: { recipient: 'shopkeeper' }
      });
    });

    test('should fail when recipient not reachable', () => {
      const { world, player, room, item } = TestData.withInventoryItem('red apple');
      
      const guard = world.createEntity('guard', 'actor');
      guard.add({ type: TraitType.ACTOR });
      world.moveEntity(guard.id, room.id);
      
      // Create a glass wall between player and guard
      const wall = world.createEntity('glass wall', 'object');
      wall.add({ 
        type: TraitType.PHYSICAL,
        blocksReach: true 
      });
      world.moveEntity(wall.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: item,
        secondEntity: guard,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      // Override canReach since our test setup doesn't have full spatial logic
      (context as any).canReach = () => false;
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('recipient_not_reachable'),
        params: { recipient: 'guard' }
      });
    });

    test('should fail when recipient is not an actor', () => {
      const { world, player, room, item } = TestData.withInventoryItem('coin');
      
      const statue = world.createEntity('stone statue', 'object');  // Not an actor
      world.moveEntity(statue.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: item,
        secondEntity: statue,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_actor'),
        reason: 'not_actor'
      });
    });

    test('should fail when giving to self', () => {
      const { world, player, item } = TestData.withInventoryItem('gift');
      
      const command = createCommand(IFActions.GIVING, {
        entity: item,
        secondEntity: player,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('self'),
        params: { item: 'gift' }
      });
    });
  });

  describe('Recipient Capacity Checks', () => {
    test('should fail when recipient inventory is full', () => {
      const { world, player, room, item } = TestData.withInventoryItem('book');
      
      const librarian = world.createEntity('librarian', 'actor');
      librarian.add({ 
        type: TraitType.ACTOR,
        inventoryLimit: { maxItems: 2 }
      });
      
      // Create items already held by librarian
      const book1 = world.createEntity('old book', 'object');
      const book2 = world.createEntity('new book', 'object');
      
      world.moveEntity(librarian.id, room.id);
      world.moveEntity(book1.id, librarian.id);
      world.moveEntity(book2.id, librarian.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: item,
        secondEntity: librarian,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('inventory_full'),
        reason: 'inventory_full'
      });
    });

    test('should fail when item too heavy for recipient', () => {
      const { world, player, room } = setupBasicWorld();
      
      const boulder = world.createEntity('heavy boulder', 'object');
      boulder.add({
        type: TraitType.IDENTITY,
        weight: 50
      });
      
      const child = world.createEntity('small child', 'actor');
      child.add({ 
        type: TraitType.ACTOR,
        inventoryLimit: { maxWeight: 10 }
      });
      
      world.moveEntity(boulder.id, player.id);
      world.moveEntity(child.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: boulder,
        secondEntity: child,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('too_heavy'),
        reason: 'too_heavy'
      });
    });
  });

  describe('Recipient Preferences', () => {
    test('should refuse items based on preferences', () => {
      const { world, player, room } = setupBasicWorld();
      
      const poison = world.createEntity('bottle of poison', 'object');
      
      const guard = world.createEntity('cautious guard', 'actor');
      guard.add({ 
        type: TraitType.ACTOR,
        preferences: {
          refuses: ['poison', 'weapon', 'explosive']
        }
      });
      
      world.moveEntity(poison.id, player.id);
      world.moveEntity(guard.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: poison,
        secondEntity: guard,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_interested'),
        reason: 'not_interested'
      });
    });

    test('should gratefully accept liked items', () => {
      const { world, player, room } = setupBasicWorld();
      
      const flower = world.createEntity('beautiful flower', 'object');
      
      const maiden = world.createEntity('young maiden', 'actor');
      maiden.add({ 
        type: TraitType.ACTOR,
        preferences: {
          likes: ['flower', 'jewelry', 'gift']
        }
      });
      
      world.moveEntity(flower.id, player.id);
      world.moveEntity(maiden.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: flower,
        secondEntity: maiden,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'if.event.given', {
        item: flower.id,
        itemName: 'beautiful flower',
        recipient: maiden.id,
        recipientName: 'young maiden',
        accepted: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('gratefully_accepts'),
        params: { 
          item: 'beautiful flower',
          recipient: 'young maiden'
        }
      });
    });

    test('should reluctantly accept disliked items', () => {
      const { world, player, room } = setupBasicWorld();
      
      const garbage = world.createEntity('smelly garbage', 'object');
      
      const janitor = world.createEntity('tired janitor', 'actor');
      janitor.add({ 
        type: TraitType.ACTOR,
        preferences: {
          dislikes: ['garbage', 'trash', 'waste']
        }
      });
      
      world.moveEntity(garbage.id, player.id);
      world.moveEntity(janitor.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: garbage,
        secondEntity: janitor,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'if.event.given', {
        accepted: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('reluctantly_accepts')
      });
    });
  });

  describe('Successful Giving', () => {
    test('should give item normally', () => {
      const { world, player, room } = setupBasicWorld();
      
      const coin = world.createEntity('gold coin', 'object');
      const merchant = world.createEntity('merchant', 'actor');
      merchant.add({ type: TraitType.ACTOR });
      
      world.moveEntity(coin.id, player.id);
      world.moveEntity(merchant.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: coin,
        secondEntity: merchant,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'if.event.given', {
        item: coin.id,
        itemName: 'gold coin',
        recipient: merchant.id,
        recipientName: 'merchant',
        accepted: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('given'),
        params: { 
          item: 'gold coin',
          recipient: 'merchant'
        }
      });
    });

    test('should handle giving to NPC with no special preferences', () => {
      const { world, player, room } = setupBasicWorld();
      
      const book = world.createEntity('interesting book', 'object');
      const scholar = world.createEntity('old scholar', 'actor');
      scholar.add({ type: TraitType.ACTOR });
      // No preferences defined
      
      world.moveEntity(book.id, player.id);
      world.moveEntity(scholar.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: book,
        secondEntity: scholar,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      expectEvent(events, 'if.event.given', {
        accepted: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('given')
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const gem = world.createEntity('ruby', 'object');
      const thief = world.createEntity('thief', 'actor');
      thief.add({ type: TraitType.ACTOR });
      
      world.moveEntity(gem.id, player.id);
      world.moveEntity(thief.id, room.id);
      
      const command = createCommand(IFActions.GIVING, {
        entity: gem,
        secondEntity: thief,
        preposition: 'to'
      });
      const context = createRealTestContext(givingAction, world, command);
      
      const events = givingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(gem.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Giving Action Edge Cases', () => {
  test('should handle giving to NPC with complex preferences', () => {
    const { world, player, room } = setupBasicWorld();
    
    const ring = world.createEntity('golden ring', 'object');
    const dragon = world.createEntity('greedy dragon', 'actor');
    dragon.add({ 
      type: TraitType.ACTOR,
      preferences: {
        likes: ['gold', 'treasure', 'jewel'],
        dislikes: ['food', 'wood'],
        refuses: ['weapon']
      }
    });
    
    world.moveEntity(ring.id, player.id);
    world.moveEntity(dragon.id, room.id);
    
    const command = createCommand(IFActions.GIVING, {
      entity: ring,
      secondEntity: dragon,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);
    
    const events = givingAction.execute(context);
    
    // Should gratefully accept (contains 'gold')
    expectEvent(events, 'action.success', {
      messageId: expect.stringContaining('gratefully_accepts')
    });
  });

  test('should handle recipient with weight limit but current inventory empty', () => {
    const { world, player, room } = setupBasicWorld();
    
    const pkg = world.createEntity('small package', 'object');
    pkg.add({
      type: TraitType.IDENTITY,
      weight: 3
    });
    
    const courier = world.createEntity('courier', 'actor');
    courier.add({ 
      type: TraitType.ACTOR,
      inventoryLimit: { maxWeight: 20 }
    });
    
    world.moveEntity(pkg.id, player.id);
    world.moveEntity(courier.id, room.id);
    
    const command = createCommand(IFActions.GIVING, {
      entity: pkg,
      secondEntity: courier,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);
    
    const events = givingAction.execute(context);
    
    // Should succeed - weight within limit
    expectEvent(events, 'if.event.given', {
      accepted: true
    });
  });

  test('should handle item without weight when recipient has weight limit', () => {
    const { world, player, room } = setupBasicWorld();
    
    const feather = world.createEntity('light feather', 'object');
    // No identity trait with weight
    
    const bird = world.createEntity('small bird', 'actor');
    bird.add({ 
      type: TraitType.ACTOR,
      inventoryLimit: { maxWeight: 1 }
    });
    
    world.moveEntity(feather.id, player.id);
    world.moveEntity(bird.id, room.id);
    
    const command = createCommand(IFActions.GIVING, {
      entity: feather,
      secondEntity: bird,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);
    
    const events = givingAction.execute(context);
    
    // Should succeed - item without weight doesn't count
    expectEvent(events, 'if.event.given', {
      accepted: true
    });
  });
});
