import { describe, it, expect, beforeEach } from 'vitest';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../../test-utils';
import { push } from '../../../../src/actions/standard/pushing/sub-actions/push';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../../../src/actions/constants';

describe('push sub-action', () => {
  let world: WorldModel;
  let room: any;
  let player: any;
  let button: IFEntity;
  let heavyObject: IFEntity;
  let moveableObject: IFEntity;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    room = setup.room;
    player = setup.player;
    
    // Create a button
    button = world.createEntity('test button', 'object');
    button.add({ type: TraitType.PUSHABLE, pushType: 'button' });
    world.moveEntity(button.id, room.id);
    
    // Create a heavy object
    heavyObject = world.createEntity('heavy crate', 'object');
    heavyObject.add({ 
      type: TraitType.PUSHABLE,
      pushType: 'heavy',
      requiresStrength: 10 
    });
    world.moveEntity(heavyObject.id, room.id);
    
    // Create a moveable object
    moveableObject = world.createEntity('stone statue', 'object');
    moveableObject.add({ 
      type: TraitType.PUSHABLE,
      pushType: 'moveable',
      revealsPassage: true 
    });
    world.moveEntity(moveableObject.id, room.id);
  });

  describe('button pushing', () => {
    it('should push a simple button', () => {
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('button_pushed');
      expect(result.messageParams?.target).toBe('test button');
      
      const pushable = button.get(TraitType.PUSHABLE) as any;
      expect(pushable.state).toBe('activated');
      expect(pushable.pushCount).toBe(1);
      
      // Check events
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.activated).toBe(true);
      expect(pushedEvent?.data.pushType).toBe('button');
    });

    it('should toggle a switchable button', () => {
      button.add({ type: TraitType.SWITCHABLE, isOn: false });
      button.add({ type: TraitType.BUTTON });
      
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('button_clicks');
      
      const switchable = button.get(TraitType.SWITCHABLE) as any;
      expect(switchable.isOn).toBe(true);
      
      // Check event data
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.willToggle).toBe(true);
      expect(pushedEvent?.data.currentState).toBe(false);
      expect(pushedEvent?.data.newState).toBe(true);
    });

    it('should respect max pushes', () => {
      const pushable = button.get(TraitType.PUSHABLE) as any;
      pushable.maxPushes = 2;
      pushable.pushCount = 2;
      
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      expect(result.success).toBe(false);
      expect(result.messageId).toBe('wont_budge');
    });

    it('should handle non-repeatable buttons', () => {
      const pushable = button.get(TraitType.PUSHABLE) as any;
      pushable.repeatable = false;
      
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      expect(result.success).toBe(true);
      expect(pushable.state).toBe('pushed');
    });
  });

  describe('heavy object pushing', () => {
    it('should push heavy object with direction', () => {
      const command = createCommand(IFActions.PUSHING, { entity: heavyObject });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: heavyObject, direction: 'north' }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pushed_with_effort');
      expect(result.messageParams?.direction).toBe('north');
      
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.moved).toBe(true);
      expect(pushedEvent?.data.moveDirection).toBe('north');
    });

    it('should nudge heavy object without direction', () => {
      const command = createCommand(IFActions.PUSHING, { entity: heavyObject });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: heavyObject }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('wont_budge');
      
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.moved).toBe(false);
      expect(pushedEvent?.data.nudged).toBe(true);
    });

    it('should include strength requirement in event', () => {
      const command = createCommand(IFActions.PUSHING, { entity: heavyObject });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: heavyObject, direction: 'north' }, context);
      
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.requiresStrength).toBe(10);
    });
  });

  describe('moveable object pushing', () => {
    it('should push moveable object with direction', () => {
      const pushable = moveableObject.get(TraitType.PUSHABLE) as any;
      pushable.revealsPassage = false;
      
      const command = createCommand(IFActions.PUSHING, { entity: moveableObject });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: moveableObject, direction: 'east' }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pushed_direction');
      expect(result.messageParams?.direction).toBe('east');
      
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.moved).toBe(true);
    });

    it('should reveal passage when pushed', () => {
      const command = createCommand(IFActions.PUSHING, { entity: moveableObject });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: moveableObject, direction: 'west' }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('reveals_passage');
      
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.revealsPassage).toBe(true);
    });

    it('should nudge moveable object without direction', () => {
      const command = createCommand(IFActions.PUSHING, { entity: moveableObject });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: moveableObject }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pushed_nudged');
      
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.nudged).toBe(true);
    });
  });

  describe('custom effects', () => {
    it('should emit custom onPush effect', () => {
      const pushable = button.get(TraitType.PUSHABLE) as any;
      pushable.effects = { onPush: 'custom.push.event' };
      
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      const customEvent = result.events.find(e => e.type === 'custom.push.event');
      expect(customEvent).toBeDefined();
      // The event data might be in the root of the event, not in a data property
      expect(customEvent?.target || customEvent?.data?.target).toBe(button.id);
    });

    it('should emit onMaxPushes effect when limit reached', () => {
      const pushable = button.get(TraitType.PUSHABLE) as any;
      pushable.maxPushes = 1;
      pushable.pushCount = 0;
      pushable.effects = { onMaxPushes: 'max.pushes.reached' };
      
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      expect(pushable.pushCount).toBe(1);
      const maxEvent = result.events.find(e => e.type === 'max.pushes.reached');
      expect(maxEvent).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle object without pushable trait', () => {
      const nonPushable = world.createEntity('solid wall', 'object');
      
      const command = createCommand(IFActions.PUSHING, { entity: nonPushable });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: nonPushable }, context);
      
      expect(result.success).toBe(false);
      expect(result.messageId).toBe('pushing_does_nothing');
    });

    it('should handle push sound', () => {
      const pushable = button.get(TraitType.PUSHABLE) as any;
      pushable.pushSound = 'click';
      
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      const pushedEvent = result.events.find(e => e.type === 'if.event.pushed');
      expect(pushedEvent?.data.sound).toBe('click');
    });

    it('should handle unknown push type', () => {
      const pushable = button.get(TraitType.PUSHABLE) as any;
      (pushable as any).pushType = 'unknown';
      
      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext({ id: IFActions.PUSHING }, world, command);
      const result = push({ target: button }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pushing_does_nothing');
    });
  });
});