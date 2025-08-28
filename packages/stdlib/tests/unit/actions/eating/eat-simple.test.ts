/**
 * Basic tests for eat sub-action
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { eatSubAction } from '../../../../src/actions/standard/eating/sub-actions/eat';
import { createTestContext, setupBasicWorld, createCommand } from '../../../test-utils';
import { TraitType, IFEntity } from '@sharpee/world-model';

describe('eat sub-action', () => {
  let context: any;
  let apple: IFEntity;
  let world: any;
  let player: any;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    player = setup.player;
    apple = world.createEntity('Apple', 'item');
    
    // Create command with the apple as direct object
    const command = createCommand(eatSubAction.id, {
      verb: 'eat',
      entity: apple
    });
    
    // Create context properly
    context = createTestContext(eatSubAction, world, command);
  });

  describe('structure', () => {
    it('should have correct ID', () => {
      expect(eatSubAction.id).toBe('if.action.eating.eat');
    });

    it('should have validate method', () => {
      expect(eatSubAction.validate).toBeDefined();
      expect(typeof eatSubAction.validate).toBe('function');
    });

    it('should have execute method', () => {
      expect(eatSubAction.execute).toBeDefined();
      expect(typeof eatSubAction.execute).toBe('function');
    });

    it('should have report method', () => {
      expect(eatSubAction.report).toBeDefined();
      expect(typeof eatSubAction.report).toBe('function');
    });
  });

  describe('validate', () => {
    it('should fail without an item', () => {
      const command = createCommand(eatSubAction.id, {
        verb: 'eat'
      });
      context = createTestContext(eatSubAction, world, command);
      const result = eatSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_item');
    });

    it('should fail with non-edible item', () => {
      // Apple has no EDIBLE trait yet
      const result = eatSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_edible');
    });

    it('should fail with drink item', () => {
      apple.add({ type: TraitType.EDIBLE, isDrink: true });
      const result = eatSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('is_drink');
    });

    it('should fail with consumed item', () => {
      apple.add({ type: TraitType.EDIBLE, consumed: true });
      const result = eatSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_consumed');
    });

    it('should succeed with edible item', () => {
      apple.add({ type: TraitType.EDIBLE });
      const result = eatSubAction.validate(context);
      expect(result.valid).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      apple.add({ type: TraitType.EDIBLE });
    });

    it('should mark item as consumed', () => {
      const edibleTrait = apple.get(TraitType.EDIBLE);
      expect(edibleTrait.consumed).toBeUndefined();
      
      eatSubAction.execute(context);
      
      expect(edibleTrait.consumed).toBe(true);
    });

    it('should handle portions correctly', () => {
      const edibleTrait = apple.get(TraitType.EDIBLE);
      edibleTrait.portions = 3;
      
      eatSubAction.execute(context);
      
      expect(edibleTrait.portions).toBe(2);
      expect(edibleTrait.consumed).toBeUndefined();
      
      eatSubAction.execute(context);
      expect(edibleTrait.portions).toBe(1);
      
      eatSubAction.execute(context);
      expect(edibleTrait.portions).toBe(0);
      expect(edibleTrait.consumed).toBe(true);
    });

    it('should store state for report phase', () => {
      eatSubAction.execute(context);
      expect(context._eatState).toBeDefined();
      expect(context._eatState.item).toBe(apple);
      expect(context._eatState.eventData.item).toBe(apple.id);
    });
  });

  describe('report', () => {
    beforeEach(() => {
      apple.add({ type: TraitType.EDIBLE });
    });

    it('should generate events after successful eating', () => {
      eatSubAction.execute(context);
      const events = eatSubAction.report!(context);
      
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('if.event.eaten');
      expect(events[1].type).toBe('eaten');
      expect(events[2].type).toBe('action.success');
    });

    it('should include taste in message', () => {
      const edibleTrait = apple.get(TraitType.EDIBLE);
      edibleTrait.taste = 'delicious';
      
      eatSubAction.execute(context);
      const events = eatSubAction.report!(context);
      
      const successEvent = events.find(e => e.type === 'action.success');
      expect(successEvent?.data.messageId).toBe('delicious');
    });

    it('should handle validation errors', () => {
      const validationResult = {
        valid: false,
        error: 'not_edible',
        params: { item: 'apple' }
      };
      
      const events = eatSubAction.report!(context, validationResult);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.error');
      expect(events[0].data.error).toBe('not_edible');
    });
  });
});