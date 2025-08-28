import { describe, it, expect, beforeEach } from 'vitest';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../../test-utils';
import { pull } from '../../../../src/actions/standard/pulling/sub-actions/pull';
import { TraitType, WorldModel, IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../../../src/actions/constants';

describe('pull sub-action', () => {
  let world: WorldModel;
  let room: any;
  let player: any;
  let lever: IFEntity;
  let cord: IFEntity;
  let attachedObject: IFEntity;
  let heavyObject: IFEntity;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    room = setup.room;
    player = setup.player;
    
    // Create a lever
    lever = world.createEntity('control lever', 'object');
    lever.add({ type: TraitType.PULLABLE, pullType: 'lever' });
    world.moveEntity(lever.id, room.id);
    
    // Create a cord
    cord = world.createEntity('bell cord', 'object');
    cord.add({ 
      type: TraitType.PULLABLE,
      pullType: 'cord',
      activates: 'bell1' 
    });
    world.moveEntity(cord.id, room.id);
    
    // Create an attached object
    attachedObject = world.createEntity('door handle', 'object');
    attachedObject.add({ 
      type: TraitType.PULLABLE,
      pullType: 'attached',
      detachesOnPull: true 
    });
    world.moveEntity(attachedObject.id, room.id);
    
    // Create a heavy object
    heavyObject = world.createEntity('heavy chain', 'object');
    heavyObject.add({ 
      type: TraitType.PULLABLE,
      pullType: 'heavy',
      requiresStrength: 10 
    });
    world.moveEntity(heavyObject.id, room.id);
  });

  describe('lever pulling', () => {
    it('should pull a lever and change position', () => {
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pulled');
      expect(result.messageParams?.target).toBe('control lever');
      
      const pullable = lever.get(TraitType.PULLABLE) as any;
      expect(pullable.state).toBe('pulled');
      expect(pullable.pullCount).toBe(1);
      
      // Check events
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.activated).toBe(true);
      expect(pulledEvent?.data.oldPosition).toBe('up');
      expect(pulledEvent?.data.newPosition).toBe('down');
    });

    it('should toggle repeatable lever', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      pullable.repeatable = true;
      pullable.state = 'pulled';
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      expect(result.success).toBe(true);
      expect(pullable.state).toBe('default');
      expect(pullable.pullCount).toBe(1);
    });

    it('should activate non-repeatable lever', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      pullable.repeatable = false;
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      expect(result.success).toBe(true);
      expect(pullable.state).toBe('activated');
    });
  });

  describe('cord pulling', () => {
    it('should pull a cord and activate target', () => {
      const command = createCommand(IFActions.PULLING, { entity: cord });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: cord }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pulled');
      
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.activated).toBe(true);
      expect(pulledEvent?.data.activates).toBe('bell1');
      expect(pulledEvent?.data.cordType).toBe('rope');
      expect(pulledEvent?.data.tension).toBe('taut');
    });

    it('should ring bell when cord activates bell', () => {
      // Create a bell entity
      const bell = world.createEntity('brass bell', 'object');
      bell.add({ type: TraitType.BELL });
      world.moveEntity(bell.id, room.id);
      
      // Update cord to activate the bell's actual ID
      const pullable = cord.get(TraitType.PULLABLE) as any;
      pullable.activates = bell.id;
      
      const command = createCommand(IFActions.PULLING, { entity: cord });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: cord }, context);
      
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.rings).toBe(true);
      expect(pulledEvent?.data.ringsBellId).toBe(bell.id);
      expect(pulledEvent?.data.bellSound).toBe('ding');
      expect(pulledEvent?.data.ringCount).toBe(1);
    });

    it('should reset repeatable cord state', () => {
      const pullable = cord.get(TraitType.PULLABLE) as any;
      pullable.repeatable = true;
      
      const command = createCommand(IFActions.PULLING, { entity: cord });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: cord }, context);
      
      expect(pullable.state).toBe('default');
      expect(pullable.pullCount).toBe(1);
    });
  });

  describe('attached object pulling', () => {
    it('should detach object when pulled', () => {
      const command = createCommand(IFActions.PULLING, { entity: attachedObject });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: attachedObject }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pulled');
      
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.willDetach).toBe(true);
      expect(pulledEvent?.data.detached).toBe(true);
      
      const detachEvent = result.events.find(e => e.type === 'if.event.detached');
      expect(detachEvent).toBeDefined();
      expect(detachEvent?.data.item).toBe(attachedObject.id);
    });

    it('should nudge non-detachable attached object', () => {
      const pullable = attachedObject.get(TraitType.PULLABLE) as any;
      pullable.detachesOnPull = false;
      
      const command = createCommand(IFActions.PULLING, { entity: attachedObject });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: attachedObject }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pulled');
      
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.nudged).toBe(true);
      expect(pulledEvent?.data.detached).toBeUndefined();
    });

    it('should emit custom onDetach effect', () => {
      const pullable = attachedObject.get(TraitType.PULLABLE) as any;
      pullable.effects = { onDetach: 'custom.detach.event' };
      
      const command = createCommand(IFActions.PULLING, { entity: attachedObject });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: attachedObject }, context);
      
      const customEvent = result.events.find(e => e.type === 'custom.detach.event');
      expect(customEvent).toBeDefined();
      expect(customEvent?.data.target).toBe(attachedObject.id);
    });
  });

  describe('heavy object pulling', () => {
    it('should pull heavy object with strength requirement', () => {
      const command = createCommand(IFActions.PULLING, { entity: heavyObject });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: heavyObject }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pulled');
      
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.moved).toBe(true);
    });

    it('should nudge heavy object without strength', () => {
      const pullable = heavyObject.get(TraitType.PULLABLE) as any;
      pullable.requiresStrength = undefined;
      
      const command = createCommand(IFActions.PULLING, { entity: heavyObject });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: heavyObject }, context);
      
      expect(result.success).toBe(true);
      
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.nudged).toBe(true);
    });
  });

  describe('max pulls and effects', () => {
    it('should respect max pulls', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      pullable.maxPulls = 2;
      pullable.pullCount = 2;
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      expect(result.success).toBe(false);
      expect(result.messageId).toBe('already_pulled');
    });

    it('should emit onMaxPulls effect when limit reached', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      pullable.maxPulls = 1;
      pullable.pullCount = 0;
      pullable.effects = { onMaxPulls: 'max.pulls.reached' };
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      expect(pullable.pullCount).toBe(1);
      const maxEvent = result.events.find(e => e.type === 'max.pulls.reached');
      expect(maxEvent).toBeDefined();
    });

    it('should activate permanently when max non-repeatable pulls reached', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      pullable.maxPulls = 1;
      pullable.pullCount = 0;
      pullable.repeatable = false;
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      expect(pullable.state).toBe('activated');
    });
  });

  describe('custom effects', () => {
    it('should emit custom onPull effect', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      pullable.effects = { onPull: 'custom.pull.event' };
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      const customEvent = result.events.find(e => e.type === 'custom.pull.event');
      expect(customEvent).toBeDefined();
      expect(customEvent?.data.target).toBe(lever.id);
    });

    it('should emit pull sound', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      pullable.pullSound = 'creak';
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      const pulledEvent = result.events.find(e => e.type === 'if.event.pulled');
      expect(pulledEvent?.data.sound).toBe('creak');
      
      const soundEvent = result.events.find(e => e.type === 'if.event.sound');
      expect(soundEvent).toBeDefined();
      expect(soundEvent?.data.sound).toBe('creak');
    });
  });

  describe('edge cases', () => {
    it('should handle object without pullable trait', () => {
      const nonPullable = world.createEntity('solid wall', 'object');
      
      const command = createCommand(IFActions.PULLING, { entity: nonPullable });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: nonPullable }, context);
      
      expect(result.success).toBe(false);
      expect(result.messageId).toBe('cant_pull_that');
    });

    it('should handle unknown pull type', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      (pullable as any).pullType = 'unknown';
      
      const command = createCommand(IFActions.PULLING, { entity: lever });
      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);
      const result = pull({ target: lever }, context);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('pulled');
    });

    it('should track pull count correctly', () => {
      const pullable = lever.get(TraitType.PULLABLE) as any;
      expect(pullable.pullCount).toBe(0);
      
      const command1 = createCommand(IFActions.PULLING, { entity: lever });
      const context1 = createRealTestContext({ id: IFActions.PULLING }, world, command1);
      pull({ target: lever }, context1);
      expect(pullable.pullCount).toBe(1);
      
      const command2 = createCommand(IFActions.PULLING, { entity: lever });
      const context2 = createRealTestContext({ id: IFActions.PULLING }, world, command2);
      pull({ target: lever }, context2);
      expect(pullable.pullCount).toBe(2);
    });
  });
});