import { describe, it, expect, beforeEach } from 'vitest';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../../test-utils';
import { IFEntity, TraitType, WorldModel } from '@sharpee/world-model';
import { openSubAction } from '../../../../src/actions/standard/opening/sub-actions/open';
import { IFActions } from '../../../../src/actions/constants';

describe('open sub-action (simple)', () => {
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
    
    // Create a simple container
    container = world.createEntity('box', 'object');
    container.add({ type: TraitType.OPENABLE, isOpen: false });
    world.moveEntity(container.id, room.id);
    
    // Create a door
    door = world.createEntity('door', 'object');
    door.add({ type: TraitType.OPENABLE, isOpen: false });
    world.moveEntity(door.id, room.id);
  });

  describe('validation', () => {
    it('should fail without a target', () => {
      const command = createCommand(IFActions.OPENING, {});
      const context = createRealTestContext(openSubAction, world, command);
      const result = openSubAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    it('should fail for non-openable entities', () => {
      const nonOpenable = world.createEntity('rock', 'object');
      world.moveEntity(nonOpenable.id, room.id);
      
      const command = createCommand(IFActions.OPENING, {
        entity: nonOpenable
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      const result = openSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_openable');
    });

    it('should fail for already open entities', () => {
      const openTrait = container.get(TraitType.OPENABLE);
      openTrait.isOpen = true;
      
      const command = createCommand(IFActions.OPENING, {
        entity: container
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      const result = openSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_open');
    });

    it('should fail for locked entities', () => {
      const lockedContainer = world.createEntity('safe', 'object');
      lockedContainer.add({ type: TraitType.OPENABLE, isOpen: false });
      lockedContainer.add({ type: TraitType.LOCKABLE, isLocked: true });
      world.moveEntity(lockedContainer.id, room.id);
      
      const command = createCommand(IFActions.OPENING, {
        entity: lockedContainer
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      const result = openSubAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('locked');
    });

    it('should pass for valid closed entities', () => {
      const command = createCommand(IFActions.OPENING, {
        entity: container
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      const result = openSubAction.validate(context);
      expect(result.valid).toBe(true);
    });
  });

  describe('execution', () => {
    it('should open a closed container', () => {
      const command = createCommand(IFActions.OPENING, {
        entity: container
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      const openTrait = container.get(TraitType.OPENABLE);
      expect(openTrait.isOpen).toBe(false);
      
      openSubAction.execute(context);
      
      expect(openTrait.isOpen).toBe(true);
    });

    it('should open a closed door', () => {
      const command = createCommand(IFActions.OPENING, {
        entity: door
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      const openTrait = door.get(TraitType.OPENABLE);
      expect(openTrait.isOpen).toBe(false);
      
      openSubAction.execute(context);
      
      expect(openTrait.isOpen).toBe(true);
    });

    it('should store the result in context', () => {
      const command = createCommand(IFActions.OPENING, {
        entity: container
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      openSubAction.execute(context);
      
      expect((context as any)._openResult).toBeDefined();
      expect((context as any)._openResult.success).toBe(true);
      expect((context as any)._openResult.wasClosed).toBe(true);
    });
  });

  describe('reporting', () => {
    it('should generate success events when opening succeeds', () => {
      const command = createCommand(IFActions.OPENING, {
        entity: container
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      openSubAction.execute(context);
      const events = openSubAction.report!(context);
      
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('opened');
      expect(events[1].type).toBe('if.event.opened');
      expect(events[2].type).toBe('action.success');
    });

    it('should generate error event for validation failure', () => {
      const validationResult = {
        valid: false,
        error: 'already_open',
        params: { item: 'box' }
      };
      
      const command = createCommand(IFActions.OPENING, {
        entity: container
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      const events = openSubAction.report!(context, validationResult);
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.error');
      expect(events[0].data.error).toBe('already_open');
    });

    it('should handle empty container specially', () => {
      const emptyContainer = world.createEntity('empty-box', 'object');
      emptyContainer.add({ type: TraitType.OPENABLE, isOpen: false });
      emptyContainer.add({ type: TraitType.CONTAINER });
      world.moveEntity(emptyContainer.id, room.id);
      
      const command = createCommand(IFActions.OPENING, {
        entity: emptyContainer
      });
      const context = createRealTestContext(openSubAction, world, command);
      
      openSubAction.execute(context);
      const events = openSubAction.report!(context);
      
      const successEvent = events.find(e => e.type === 'action.success');
      expect(successEvent?.data.messageId).toBe('its_empty');
    });
  });
});