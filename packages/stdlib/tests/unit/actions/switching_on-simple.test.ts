/**
 * Simple tests for switching_on action
 * Tests the refactored action that delegates to SwitchableBehavior
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { switchingOnAction } from '../../../src/actions/standard/switching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';

describe('switchingOnAction (Refactored)', () => {
  let world: WorldModel;
  let room: any;
  let player: any;

  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    room = setup.room;
    player = setup.player;
  });

  describe('Metadata', () => {
    test('should have correct action ID', () => {
      expect(switchingOnAction.id).toBe(IFActions.SWITCHING_ON);
    });

    test('should have required messages', () => {
      expect(switchingOnAction.requiredMessages).toContain('no_target');
      expect(switchingOnAction.requiredMessages).toContain('not_switchable');
      expect(switchingOnAction.requiredMessages).toContain('already_on');
      expect(switchingOnAction.requiredMessages).toContain('switched_on');
    });
  });

  describe('Validation', () => {
    test('should fail without target', () => {
      const command = createCommand(IFActions.SWITCHING_ON, {});
      const context = createRealTestContext(switchingOnAction, world, command);
      
      const result = switchingOnAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    test('should fail for non-switchable entity', () => {
      const rock = world.createEntity('rock', 'object');
      world.moveEntity(rock.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_ON, { entity: rock });
      const context = createRealTestContext(switchingOnAction, world, command);
      
      const result = switchingOnAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_switchable');
    });

    test('should fail if already on', () => {
      const lamp = world.createEntity('lamp', 'object');
      lamp.add({ type: TraitType.SWITCHABLE, isOn: true });
      world.moveEntity(lamp.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_ON, { entity: lamp });
      const context = createRealTestContext(switchingOnAction, world, command);
      
      const result = switchingOnAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_on');
    });

    test('should fail if no power available', () => {
      const device = world.createEntity('device', 'object');
      device.add({ 
        type: TraitType.SWITCHABLE, 
        isOn: false,
        requiresPower: true,
        hasPower: false
      });
      world.moveEntity(device.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_ON, { entity: device });
      const context = createRealTestContext(switchingOnAction, world, command);
      
      const result = switchingOnAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_power');
    });

    test('should pass for valid switchable device', () => {
      const lamp = world.createEntity('lamp', 'object');
      lamp.add({ type: TraitType.SWITCHABLE, isOn: false });
      world.moveEntity(lamp.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_ON, { entity: lamp });
      const context = createRealTestContext(switchingOnAction, world, command);
      
      const result = switchingOnAction.validate(context);
      expect(result.valid).toBe(true);
    });
  });

  describe('Execution', () => {
    test('should turn device on', () => {
      const lamp = world.createEntity('lamp', 'object');
      lamp.add({ type: TraitType.SWITCHABLE, isOn: false });
      world.moveEntity(lamp.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_ON, { entity: lamp });
      const context = createRealTestContext(switchingOnAction, world, command);
      
      const events = switchingOnAction.execute(context);
      
      // Check device state changed
      const switchable = lamp.get(TraitType.SWITCHABLE) as any;
      expect(switchable.isOn).toBe(true);
      
      // Check events
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('if.event.switched_on');
      expect(events[0].data).toEqual({
        target: lamp.id,
        targetName: 'lamp'
      });
      expect(events[1].type).toBe('action.success');
    });

    test('should work with power requirements', () => {
      const device = world.createEntity('device', 'object');
      device.add({ 
        type: TraitType.SWITCHABLE, 
        isOn: false,
        requiresPower: true,
        hasPower: true
      });
      world.moveEntity(device.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_ON, { entity: device });
      const context = createRealTestContext(switchingOnAction, world, command);
      
      const events = switchingOnAction.execute(context);
      
      const switchable = device.get(TraitType.SWITCHABLE) as any;
      expect(switchable.isOn).toBe(true);
      expect(events[0].type).toBe('if.event.switched_on');
    });
  });
});