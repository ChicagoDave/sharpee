/**
 * Simple tests for switching_off action
 * Tests the refactored action that delegates to SwitchableBehavior
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { switchingOffAction } from '../../../src/actions/standard/switching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';

describe('switchingOffAction (Refactored)', () => {
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
      expect(switchingOffAction.id).toBe(IFActions.SWITCHING_OFF);
    });

    test('should have required messages', () => {
      expect(switchingOffAction.requiredMessages).toContain('no_target');
      expect(switchingOffAction.requiredMessages).toContain('not_switchable');
      expect(switchingOffAction.requiredMessages).toContain('already_off');
      expect(switchingOffAction.requiredMessages).toContain('switched_off');
    });
  });

  describe('Validation', () => {
    test('should fail without target', () => {
      const command = createCommand(IFActions.SWITCHING_OFF, {});
      const context = createRealTestContext(switchingOffAction, world, command);
      
      const result = switchingOffAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_target');
    });

    test('should fail for non-switchable entity', () => {
      const rock = world.createEntity('rock', 'object');
      world.moveEntity(rock.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_OFF, { entity: rock });
      const context = createRealTestContext(switchingOffAction, world, command);
      
      const result = switchingOffAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('not_switchable');
    });

    test('should fail if already off', () => {
      const lamp = world.createEntity('lamp', 'object');
      lamp.add({ type: TraitType.SWITCHABLE, isOn: false });
      world.moveEntity(lamp.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_OFF, { entity: lamp });
      const context = createRealTestContext(switchingOffAction, world, command);
      
      const result = switchingOffAction.validate(context);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_off');
    });

    test('should pass for valid on device', () => {
      const lamp = world.createEntity('lamp', 'object');
      lamp.add({ type: TraitType.SWITCHABLE, isOn: true });
      world.moveEntity(lamp.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_OFF, { entity: lamp });
      const context = createRealTestContext(switchingOffAction, world, command);
      
      const result = switchingOffAction.validate(context);
      expect(result.valid).toBe(true);
    });
  });

  describe('Execution', () => {
    test('should turn device off', () => {
      const lamp = world.createEntity('lamp', 'object');
      lamp.add({ type: TraitType.SWITCHABLE, isOn: true });
      world.moveEntity(lamp.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_OFF, { entity: lamp });
      const context = createRealTestContext(switchingOffAction, world, command);
      
      const events = switchingOffAction.execute(context);
      
      // Check device state changed
      const switchable = lamp.get(TraitType.SWITCHABLE) as any;
      expect(switchable.isOn).toBe(false);
      
      // Check events
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('if.event.switched_off');
      expect(events[0].data).toEqual({
        target: lamp.id,
        targetName: 'lamp'
      });
      expect(events[1].type).toBe('action.success');
    });

    test('should work regardless of power state', () => {
      const device = world.createEntity('device', 'object');
      device.add({ 
        type: TraitType.SWITCHABLE, 
        isOn: true,
        requiresPower: true,
        hasPower: false  // No power but can still turn off
      });
      world.moveEntity(device.id, room.id);
      
      const command = createCommand(IFActions.SWITCHING_OFF, { entity: device });
      const context = createRealTestContext(switchingOffAction, world, command);
      
      const events = switchingOffAction.execute(context);
      
      const switchable = device.get(TraitType.SWITCHABLE) as any;
      expect(switchable.isOn).toBe(false);
      expect(events[0].type).toBe('if.event.switched_off');
    });
  });
});