import { describe, it, expect, beforeEach } from 'vitest';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../../test-utils';
import { IFEntity, TraitType, WorldModel } from '@sharpee/world-model';
import { closeSubAction } from '../../../../src/actions/standard/closing/sub-actions/close';
import { IFActions } from '../../../../src/actions/constants';

describe('close sub-action (simple)', () => {
  let world: WorldModel;
  let room: any;
  let player: any;
  let container: IFEntity;
  let door: IFEntity;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    room = setup.room;
    player = setup.player;
    
    // Create a simple container (starts open)
    container = world.createEntity('box', 'object');
    container.add({ type: TraitType.OPENABLE, isOpen: true, canClose: true });
    world.moveEntity(container.id, room.id);
    
    // Create a door (starts open)
    door = world.createEntity('door', 'object');
    door.add({ type: TraitType.OPENABLE, isOpen: true, canClose: true });
    world.moveEntity(door.id, room.id);
  });

  describe('validation', () => {
    it('should fail without a target', () => {
      const command = createCommand(IFActions.CLOSING, {});
      const context = createRealTestContext(closeSubAction, world, command);
      const result = closeSubAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    it('should fail for non-openable entities', () => {
      const nonOpenable = world.createEntity('rock', 'object');
      world.moveEntity(nonOpenable.id, room.id);
      
      const command = createCommand(IFActions.CLOSING, {
        entity: nonOpenable
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      const result = closeSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_closable');
    });

    it('should fail for already closed entities', () => {
      const closeTrait = container.get(TraitType.OPENABLE);
      closeTrait.isOpen = false;
      
      const command = createCommand(IFActions.CLOSING, {
        entity: container
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      const result = closeSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_closed');
    });

    it('should fail for entities that cannot be closed', () => {
      const unclosable = world.createEntity('gate', 'object');
      unclosable.add({ type: TraitType.OPENABLE, isOpen: true, canClose: false });
      world.moveEntity(unclosable.id, room.id);
      
      const command = createCommand(IFActions.CLOSING, {
        entity: unclosable
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      const result = closeSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('prevents_closing');
    });

    it('should pass for valid open entities', () => {
      const command = createCommand(IFActions.CLOSING, {
        entity: container
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      const result = closeSubAction.validate(context);
      expect(result.valid).toBe(true);
    });
  });

  describe('execution', () => {
    it('should close an open container', () => {
      const command = createCommand(IFActions.CLOSING, {
        entity: container
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      const closeTrait = container.get(TraitType.OPENABLE);
      expect(closeTrait.isOpen).toBe(true);
      
      closeSubAction.execute(context);
      
      expect(closeTrait.isOpen).toBe(false);
    });

    it('should close an open door', () => {
      const command = createCommand(IFActions.CLOSING, {
        entity: door
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      const closeTrait = door.get(TraitType.OPENABLE);
      expect(closeTrait.isOpen).toBe(true);
      
      closeSubAction.execute(context);
      
      expect(closeTrait.isOpen).toBe(false);
    });

    it('should store the result in context', () => {
      const command = createCommand(IFActions.CLOSING, {
        entity: container
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      closeSubAction.execute(context);
      
      expect((context as any)._closeResult).toBeDefined();
      expect((context as any)._closeResult.success).toBe(true);
      expect((context as any)._closeResult.wasOpen).toBe(true);
    });
  });

  describe('reporting', () => {
    it('should generate success events when closing succeeds', () => {
      const command = createCommand(IFActions.CLOSING, {
        entity: container
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      closeSubAction.execute(context);
      const events = closeSubAction.report!(context);
      
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('closed');
      expect(events[1].type).toBe('if.event.closed');
      expect(events[2].type).toBe('action.success');
    });

    it('should generate error event for validation failure', () => {
      const validationResult = {
        valid: false,
        error: 'already_closed',
        params: { item: 'box' }
      };
      
      const command = createCommand(IFActions.CLOSING, {
        entity: container
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      const events = closeSubAction.report!(context, validationResult);
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.error');
      expect(events[0].data.error).toBe('already_closed');
    });

    it('should include container information in events', () => {
      const containerWithContents = world.createEntity('chest', 'object');
      containerWithContents.add({ type: TraitType.OPENABLE, isOpen: true, canClose: true });
      containerWithContents.add({ type: TraitType.CONTAINER });
      world.moveEntity(containerWithContents.id, room.id);
      
      // Add some contents
      const item = world.createEntity('coin', 'object');
      world.moveEntity(item.id, containerWithContents.id);
      
      const command = createCommand(IFActions.CLOSING, {
        entity: containerWithContents
      });
      const context = createRealTestContext(closeSubAction, world, command);
      
      closeSubAction.execute(context);
      const events = closeSubAction.report!(context);
      
      const actionEvent = events.find(e => e.type === 'if.event.closed');
      expect(actionEvent?.data.isContainer).toBe(true);
      expect(actionEvent?.data.hasContents).toBe(true);
      expect(actionEvent?.data.contentsCount).toBe(1);
    });
  });
});