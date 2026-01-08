/**
 * Golden test for giving action - demonstrates testing social interactions
 * 
 * This shows patterns for testing actions that:
 * - Transfer objects between actors
 * - Check recipient capacity and preferences
 * - Handle acceptance/refusal logic
 * - Support different acceptance types
 */

import { describe, test, expect, beforeEach } from 'vitest';
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_recipient'),
        reason: 'no_recipient'
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
      
      const events = executeWithValidation(givingAction, context);
      
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
    
    const events = executeWithValidation(givingAction, context);
    
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
    
    const events = executeWithValidation(givingAction, context);
    
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

    const events = executeWithValidation(givingAction, context);

    // Should succeed - item without weight doesn't count
    expectEvent(events, 'if.event.given', {
      accepted: true
    });
  });
});

/**
 * World State Mutation Tests
 *
 * These tests verify that the giving action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually move item from player to recipient', () => {
    const { world, player, room } = setupBasicWorld();

    const coin = world.createEntity('gold coin', 'object');
    const merchant = world.createEntity('merchant', 'actor');
    merchant.add({ type: TraitType.ACTOR });

    world.moveEntity(coin.id, player.id);
    world.moveEntity(merchant.id, room.id);

    // VERIFY PRECONDITION: coin is in player's inventory
    expect(world.getLocation(coin.id)).toBe(player.id);

    const command = createCommand(IFActions.GIVING, {
      entity: coin,
      secondEntity: merchant,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);

    const validation = givingAction.validate(context);
    expect(validation.valid).toBe(true);
    givingAction.execute(context);

    // VERIFY POSTCONDITION: coin is now in merchant's inventory
    expect(world.getLocation(coin.id)).toBe(merchant.id);
  });

  test('should actually move item to NPC with preferences', () => {
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

    // VERIFY PRECONDITION: flower is in player's inventory
    expect(world.getLocation(flower.id)).toBe(player.id);

    const command = createCommand(IFActions.GIVING, {
      entity: flower,
      secondEntity: maiden,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);

    const validation = givingAction.validate(context);
    expect(validation.valid).toBe(true);
    givingAction.execute(context);

    // VERIFY POSTCONDITION: flower is now in maiden's inventory
    expect(world.getLocation(flower.id)).toBe(maiden.id);
  });

  test('should NOT move item when recipient inventory is full', () => {
    const { world, player, room } = setupBasicWorld();

    const newBook = world.createEntity('new book', 'object');
    const librarian = world.createEntity('librarian', 'actor');
    librarian.add({
      type: TraitType.ACTOR,
      inventoryLimit: { maxItems: 2 }
    });

    // Fill librarian's inventory
    const book1 = world.createEntity('old book', 'object');
    const book2 = world.createEntity('ancient book', 'object');
    world.moveEntity(librarian.id, room.id);
    world.moveEntity(book1.id, librarian.id);
    world.moveEntity(book2.id, librarian.id);

    world.moveEntity(newBook.id, player.id);

    // VERIFY PRECONDITION: newBook is in player's inventory
    expect(world.getLocation(newBook.id)).toBe(player.id);

    const command = createCommand(IFActions.GIVING, {
      entity: newBook,
      secondEntity: librarian,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);

    // Validation should fail
    const validation = givingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('inventory_full');

    // VERIFY POSTCONDITION: newBook still in player's inventory (no change)
    expect(world.getLocation(newBook.id)).toBe(player.id);
  });

  test('should NOT move item when recipient refuses it', () => {
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

    // VERIFY PRECONDITION: poison is in player's inventory
    expect(world.getLocation(poison.id)).toBe(player.id);

    const command = createCommand(IFActions.GIVING, {
      entity: poison,
      secondEntity: guard,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);

    // Validation should fail
    const validation = givingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('not_interested');

    // VERIFY POSTCONDITION: poison still in player's inventory (no change)
    expect(world.getLocation(poison.id)).toBe(player.id);
  });

  test('should NOT move item when giving to non-actor', () => {
    const { world, player, room } = setupBasicWorld();

    const coin = world.createEntity('gold coin', 'object');
    const statue = world.createEntity('stone statue', 'object'); // Not an actor

    world.moveEntity(coin.id, player.id);
    world.moveEntity(statue.id, room.id);

    // VERIFY PRECONDITION: coin is in player's inventory
    expect(world.getLocation(coin.id)).toBe(player.id);

    const command = createCommand(IFActions.GIVING, {
      entity: coin,
      secondEntity: statue,
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);

    // Validation should fail
    const validation = givingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('not_actor');

    // VERIFY POSTCONDITION: coin still in player's inventory (no change)
    expect(world.getLocation(coin.id)).toBe(player.id);
  });

  test('should NOT move item when giving to self', () => {
    const { world, player, room } = setupBasicWorld();

    const coin = world.createEntity('gold coin', 'object');
    world.moveEntity(coin.id, player.id);

    // VERIFY PRECONDITION: coin is in player's inventory
    expect(world.getLocation(coin.id)).toBe(player.id);

    const command = createCommand(IFActions.GIVING, {
      entity: coin,
      secondEntity: player, // Giving to self
      preposition: 'to'
    });
    const context = createRealTestContext(givingAction, world, command);

    // Validation should fail
    const validation = givingAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe('self');

    // VERIFY POSTCONDITION: coin still in player's inventory (no change)
    expect(world.getLocation(coin.id)).toBe(player.id);
  });
});
