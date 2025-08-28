/**
 * Basic tests for drink sub-action
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { drinkSubAction } from '../../../../src/actions/standard/drinking/sub-actions/drink';
import { createTestContext, setupBasicWorld, createCommand } from '../../../test-utils';
import { TraitType, IFEntity } from '@sharpee/world-model';

describe('drink sub-action', () => {
  let context: any;
  let water: IFEntity;
  let world: any;
  let player: any;
  let room: any;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    player = setup.player;
    room = setup.room;
    water = world.createEntity('Water', 'item');
    
    // Create command with water as direct object
    const command = createCommand(drinkSubAction.id, {
      verb: 'drink',
      entity: water
    });
    
    // Create context properly
    context = createTestContext(drinkSubAction, world, command);
  });

  describe('structure', () => {
    it('should have correct ID', () => {
      expect(drinkSubAction.id).toBe('if.action.drinking.drink');
    });

    it('should have validate method', () => {
      expect(drinkSubAction.validate).toBeDefined();
      expect(typeof drinkSubAction.validate).toBe('function');
    });

    it('should have execute method', () => {
      expect(drinkSubAction.execute).toBeDefined();
      expect(typeof drinkSubAction.execute).toBe('function');
    });

    it('should have report method', () => {
      expect(drinkSubAction.report).toBeDefined();
      expect(typeof drinkSubAction.report).toBe('function');
    });
  });

  describe('validate', () => {
    it('should fail without an item', () => {
      const command = createCommand(drinkSubAction.id, {
        verb: 'drink'
      });
      context = createTestContext(drinkSubAction, world, command);
      const result = drinkSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_item');
    });

    it('should fail with non-drinkable item', () => {
      // Water has no drinkable traits yet
      const result = drinkSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_drinkable');
    });

    it('should succeed with drink item', () => {
      water.add({ type: TraitType.EDIBLE, isDrink: true });
      const result = drinkSubAction.validate(context);
      expect(result.valid).toBe(true);
    });

    it('should succeed with container containing liquid', () => {
      water.add({ type: TraitType.CONTAINER, containsLiquid: true });
      const result = drinkSubAction.validate(context);
      expect(result.valid).toBe(true);
    });

    it('should fail with consumed drink', () => {
      water.add({ type: TraitType.EDIBLE, isDrink: true, consumed: true });
      const result = drinkSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_consumed');
    });

    it('should fail with closed container', () => {
      water.add({ type: TraitType.CONTAINER, containsLiquid: true });
      water.add({ type: TraitType.OPENABLE, isOpen: false });
      const result = drinkSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('container_closed');
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      water.add({ type: TraitType.EDIBLE, isDrink: true });
    });

    it('should mark drink as consumed', () => {
      const edibleTrait = water.get(TraitType.EDIBLE);
      expect(edibleTrait.consumed).toBeUndefined();
      
      drinkSubAction.execute(context);
      
      expect(edibleTrait.consumed).toBe(true);
    });

    it('should handle liquid amounts in containers', () => {
      water.add({ type: TraitType.CONTAINER, 
        containsLiquid: true,
        liquidAmount: 3
      });
      
      const containerTrait = water.get(TraitType.CONTAINER);
      
      drinkSubAction.execute(context);
      expect(containerTrait.liquidAmount).toBe(2);
      
      drinkSubAction.execute(context);
      expect(containerTrait.liquidAmount).toBe(1);
      
      drinkSubAction.execute(context);
      expect(containerTrait.liquidAmount).toBe(0);
    });

    it('should implicitly take item if not held', () => {
      world.moveEntity(water.id, room.id);
      expect(world.getLocation(water.id)).toBe(room.id);
      
      drinkSubAction.execute(context);
      
      expect(world.getLocation(water.id)).toBe(player.id);
    });

    it('should store state for report phase', () => {
      drinkSubAction.execute(context);
      expect(context._drinkState).toBeDefined();
      expect(context._drinkState.item).toBe(water);
      expect(context._drinkState.eventData.item).toBe(water.id);
    });
  });

  describe('report', () => {
    beforeEach(() => {
      water.add({ type: TraitType.EDIBLE, isDrink: true });
    });

    it('should generate events after successful drinking', () => {
      drinkSubAction.execute(context);
      const events = drinkSubAction.report!(context);
      
      expect(events.length).toBeGreaterThanOrEqual(3);
      
      const drunkEvent = events.find(e => e.type === 'if.event.drunk');
      expect(drunkEvent).toBeDefined();
      
      const domainEvent = events.find(e => e.type === 'drunk');
      expect(domainEvent).toBeDefined();
      
      const successEvent = events.find(e => e.type === 'action.success');
      expect(successEvent).toBeDefined();
    });

    it('should emit implicit take event if not held', () => {
      world.moveEntity(water.id, room.id);
      drinkSubAction.execute(context);
      const events = drinkSubAction.report!(context);
      
      const takeEvent = events.find(e => e.type === 'if.event.taken');
      expect(takeEvent).toBeDefined();
      expect(takeEvent?.data.implicit).toBe(true);
    });

    it('should handle taste messages', () => {
      const edibleTrait = water.get(TraitType.EDIBLE);
      edibleTrait.taste = 'refreshing';
      
      drinkSubAction.execute(context);
      const events = drinkSubAction.report!(context);
      
      const successEvent = events.find(e => e.type === 'action.success');
      expect(successEvent?.data.messageId).toBe('refreshing');
    });

    it('should handle validation errors', () => {
      const validationResult = {
        valid: false,
        error: 'not_drinkable',
        params: { item: 'water' }
      };
      
      const events = drinkSubAction.report!(context, validationResult);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.error');
      expect(events[0].data.error).toBe('not_drinkable');
    });
  });
});