/**
 * Golden test for smelling action - demonstrates testing olfactory interactions
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to smell specific objects
 * - Detect general environmental scents
 * - Identify food and drink scents
 * - Detect burning/smoke from lit objects
 * - Check container contents for scents
 * - Handle distance limitations for smelling
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { smellingAction } from '../../../src/actions/standard/smelling';
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

// Helper to execute action with validation (mimics CommandExecutor flow)
// Supports both old two-phase and new three-phase actions
const executeWithValidation = (action: any, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    return [context.event('action.error', {
      actionId: context.action.id,
      messageId: validation.error,
      reason: validation.error,
      params: validation.params || {}
    })];
  }

  // Three-phase pattern: execute returns void, report returns events
  if (action.report) {
    action.execute(context);
    return action.report(context);
  }

  // Old two-phase pattern: execute returns events
  return action.execute(context);
};

describe('smellingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(smellingAction.id).toBe(IFActions.SMELLING);
    });

    test('should declare required messages', () => {
      expect(smellingAction.requiredMessages).toContain('not_visible');
      expect(smellingAction.requiredMessages).toContain('too_far');
      expect(smellingAction.requiredMessages).toContain('no_scent');
      expect(smellingAction.requiredMessages).toContain('room_scents');
      expect(smellingAction.requiredMessages).toContain('food_nearby');
      expect(smellingAction.requiredMessages).toContain('smoke_detected');
      expect(smellingAction.requiredMessages).toContain('no_particular_scent');
      expect(smellingAction.requiredMessages).toContain('food_scent');
      expect(smellingAction.requiredMessages).toContain('drink_scent');
      expect(smellingAction.requiredMessages).toContain('burning_scent');
      expect(smellingAction.requiredMessages).toContain('container_food_scent');
      expect(smellingAction.requiredMessages).toContain('smelled');
    });

    test('should belong to sensory group', () => {
      expect(smellingAction.group).toBe('sensory');
    });
  });

  describe('Smelling Specific Objects', () => {
    test('should detect food scent', () => {
      const { world, player, room } = setupBasicWorld();
      const bread = world.createEntity('fresh bread', 'object');
      bread.add({
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: false
      });
      world.moveEntity(bread.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: bread
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event with scent info
      expectEvent(events, 'if.event.smelled', {
        target: bread.id,
        hasScent: true,
        scentType: 'edible'
      });
      
      // Should emit food_scent message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('food_scent'),
        params: { target: 'fresh bread' }
      });
    });

    test('should detect drink scent', () => {
      const { world, player } = setupBasicWorld();
      const coffee = world.createEntity('hot coffee', 'object');
      coffee.add({
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: true
      });
      world.moveEntity(coffee.id, player.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: coffee
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event with scent info
      expectEvent(events, 'if.event.smelled', {
        target: coffee.id,
        hasScent: true,
        scentType: 'drinkable'
      });
      
      // Should emit drink_scent message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('drink_scent'),
        params: { target: 'hot coffee' }
      });
    });

    test('should detect burning scent from lit objects', () => {
      const { world, player, room } = setupBasicWorld();
      const torch = world.createEntity('burning torch', 'object');
      torch.add({
        type: TraitType.LIGHT_SOURCE,
        isLit: true
      });
      world.moveEntity(torch.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: torch
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event with burning scent
      expectEvent(events, 'if.event.smelled', {
        target: torch.id,
        hasScent: true,
        scentType: 'burning'
      });
      
      // Should emit burning_scent message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('burning_scent'),
        params: { target: 'burning torch' }
      });
    });

    test('should detect no scent from unlit light source', () => {
      const { world, player, room } = setupBasicWorld();
      const candle = world.createEntity('unlit candle', 'object');
      candle.add({
        type: TraitType.LIGHT_SOURCE,
        isLit: false
      });
      world.moveEntity(candle.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: candle
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit no_particular_scent message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_particular_scent'),
        params: { target: 'unlit candle' }
      });
    });

    test('should detect food scent from open container', () => {
      const { world, player } = setupBasicWorld();
      
      const basket = world.createEntity('wicker basket', 'object');
      basket.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      basket.add({
        type: TraitType.OPENABLE,
        isOpen: true
      });
      
      const apple = world.createEntity('red apple', 'object');
      apple.add({
        type: TraitType.EDIBLE,
        consumed: false
      });
      
      world.moveEntity(basket.id, player.id);
      world.moveEntity(apple.id, basket.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: basket
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event with container contents
      expectEvent(events, 'if.event.smelled', {
        target: basket.id,
        hasScent: true,
        scentType: 'container_contents',
        scentSources: [apple.id]
      });
      
      // Should emit container_food_scent message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('container_food_scent'),
        params: { target: 'wicker basket' }
      });
    });

    test('should detect no scent from closed container with food', () => {
      const { world, player } = setupBasicWorld();
      
      const box = world.createEntity('sealed box', 'object');
      box.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      box.add({
        type: TraitType.OPENABLE,
        isOpen: false  // Closed
      });
      
      const cheese = world.createEntity('smelly cheese', 'object');
      cheese.add({
        type: TraitType.EDIBLE,
        consumed: false
      });
      
      world.moveEntity(box.id, player.id);
      world.moveEntity(cheese.id, box.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: box
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit no_particular_scent message (container is closed)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_particular_scent'),
        params: { target: 'sealed box' }
      });
    });

    test('should detect no scent from ordinary objects', () => {
      const { world, player, room } = setupBasicWorld();
      const rock = world.createEntity('ordinary rock', 'object');
      world.moveEntity(rock.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: rock
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event without scent
      expectEvent(events, 'if.event.smelled', {
        target: rock.id
        // No hasScent or scentType
      });
      
      // Should emit no_particular_scent message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_particular_scent'),
        params: { target: 'ordinary rock' }
      });
    });
  });

  describe('Smelling the Environment', () => {
    test('should detect no scents in empty room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING));
      // No command.directObject - smelling environment
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event for environment
      expectEvent(events, 'if.event.smelled', {
        smellingEnvironment: true,
        roomId: room.id
      });
      
      // Should emit no_scent message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_scent')
      });
    });

    test('should detect food in the room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const sandwich = world.createEntity('ham sandwich', 'object');
      sandwich.add({
        type: TraitType.EDIBLE,
        consumed: false
      });
      
      world.moveEntity(sandwich.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event with food sources
      expectEvent(events, 'if.event.smelled', {
        smellingEnvironment: true,
        roomId: room.id,
        scentSources: [sandwich.id]
      });
      
      // Should emit food_nearby message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('food_nearby')
      });
    });

    test('should detect smoke in the room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const fireplace = world.createEntity('stone fireplace', 'object');
      fireplace.add({
        type: TraitType.LIGHT_SOURCE,
        isLit: true
      });
      
      world.moveEntity(fireplace.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event with smoke source
      expectEvent(events, 'if.event.smelled', {
        smellingEnvironment: true,
        roomId: room.id,
        scentSources: [fireplace.id]
      });
      
      // Should emit smoke_detected message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('smoke_detected')
      });
    });

    test('should prioritize smoke over food scents', () => {
      const { world, player, room } = setupBasicWorld();
      
      const candle = world.createEntity('lit candle', 'object');
      candle.add({
        type: TraitType.LIGHT_SOURCE,
        isLit: true
      });
      
      const pie = world.createEntity('apple pie', 'object');
      pie.add({
        type: TraitType.EDIBLE,
        consumed: false
      });
      
      world.moveEntity(candle.id, room.id);
      world.moveEntity(pie.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit SMELLED event with both sources
      expectEvent(events, 'if.event.smelled', {
        smellingEnvironment: true,
        roomId: room.id,
        scentSources: [candle.id, pie.id]
      });
      
      // Should prioritize smoke_detected message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('smoke_detected')
      });
    });

    test('should detect general room scents', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Add an object that contributes to scent but isn't food or smoke
      const flowers = world.createEntity('bouquet of flowers', 'object');
      
      world.moveEntity(flowers.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should emit no_scent message (flowers don't have EDIBLE or lit LIGHT_SOURCE)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_scent')
      });
    });
  });

  describe('Distance and Accessibility', () => {
    test('should allow smelling items in inventory', () => {
      const { world, player } = setupBasicWorld();
      const perfume = world.createEntity('bottle of perfume', 'object');
      perfume.add({
        type: TraitType.EDIBLE,
        consumed: false,
        isDrink: true  // Liquid perfume
      });
      world.moveEntity(perfume.id, player.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: perfume
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should succeed - item is carried
      expectEvent(events, 'if.event.smelled', {
        target: perfume.id,
        hasScent: true,
        scentType: 'drinkable'
      });
    });

    test('should allow smelling items in same room', () => {
      const { world, player, room } = setupBasicWorld();
      const cake = world.createEntity('chocolate cake', 'object');
      cake.add({
        type: TraitType.EDIBLE,
        consumed: false
      });
      world.moveEntity(cake.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: cake
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      // Should succeed - item is in same room
      expectEvent(events, 'if.event.smelled', {
        target: cake.id,
        hasScent: true,
        scentType: 'edible'
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const soup = world.createEntity('hot soup', 'object');
      soup.add({
        type: TraitType.EDIBLE,
        consumed: false
      });
      world.moveEntity(soup.id, room.id);
      
      const context = createRealTestContext(smellingAction, world, createCommand(IFActions.SMELLING, {
        entity: soup
      }));
      
      const events = executeWithValidation(smellingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(soup.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Smelling', () => {
  test('pattern: scent types', () => {
    // Test various scent categories
    const world = new WorldModel();
    const scentObjects = [
      { name: 'steak', scent: 'edible', trait: { type: TraitType.EDIBLE, isDrink: false } },
      { name: 'wine', scent: 'drinkable', trait: { type: TraitType.EDIBLE, isDrink: true } },
      { name: 'campfire', scent: 'burning', trait: { type: TraitType.LIGHT_SOURCE, isLit: true } }
    ];
    
    scentObjects.forEach(({ name, scent, trait }) => {
      const obj = world.createEntity(name, 'object');
      obj.add(trait);
      
      if (scent === 'edible' || scent === 'drinkable') {
        expect(obj.has(TraitType.EDIBLE)).toBe(true);
      } else if (scent === 'burning') {
        expect(obj.has(TraitType.LIGHT_SOURCE)).toBe(true);
        const light = obj.get(TraitType.LIGHT_SOURCE) as any;
        expect(light.isLit).toBe(true);
      }
    });
  });

  test('pattern: complex scent scenarios', () => {
    // Test a picnic basket with multiple scent sources
    const world = new WorldModel();
    const picnicBasket = world.createEntity('picnic basket', 'object');
    picnicBasket.add({
      type: TraitType.CONTAINER,
      capacity: 10
    });
    picnicBasket.add({
      type: TraitType.OPENABLE,
      isOpen: true
    });
    
    const contents = [
      world.createEntity('sandwich', 'object'),
      world.createEntity('juice', 'object'),
      world.createEntity('cookies', 'object')
    ];
    
    // Add edible traits to contents
    contents[0].add({ type: TraitType.EDIBLE, isDrink: false });
    contents[1].add({ type: TraitType.EDIBLE, isDrink: true });
    contents[2].add({ type: TraitType.EDIBLE, isDrink: false });
    
    // All contents should be edible
    contents.forEach(item => {
      expect(item.has(TraitType.EDIBLE)).toBe(true);
    });
  });

  test('pattern: environmental scent detection', () => {
    // Test various room configurations
    const world = new WorldModel();
    const kitchenScents = [
      { item: 'oven', trait: { type: TraitType.LIGHT_SOURCE, isLit: true }, produces: 'smoke' },
      { item: 'bread', trait: { type: TraitType.EDIBLE }, produces: 'food' },
      { item: 'coffee_maker', trait: { type: TraitType.EDIBLE, isDrink: true }, produces: 'food' }
    ];
    
    kitchenScents.forEach(({ item, trait, produces }) => {
      const obj = world.createEntity(item, 'object');
      obj.add(trait);
      
      if (produces === 'smoke') {
        expect(obj.has(TraitType.LIGHT_SOURCE)).toBe(true);
      } else if (produces === 'food') {
        expect(obj.has(TraitType.EDIBLE)).toBe(true);
      }
    });
  });
});
